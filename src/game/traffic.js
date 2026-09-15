import { ROAD, sampleRoad } from './road.js';

// Explicit gameplay footprints cover the painted units (including barrels).
// Longitudinal and lateral extents let infantry pass a tank's narrow sides;
// the conservative radius guarantees that rotated artwork stays on the road.
export const GROUND_PROFILES = Object.freeze({
  infantry: { radius: 24, halfLength: 24, halfWidth: 14, gap: 7, laneRate: 30, laneDelay: 2.4, turnRate: 3.5 },
  heavy: { radius: 28, halfLength: 28, halfWidth: 17, gap: 10, laneRate: 24, laneDelay: 3, turnRate: 3 },
  juggernaut: { radius: 33, halfLength: 33, halfWidth: 20, gap: 13, laneRate: 20, laneDelay: 3.8, turnRate: 2.5 },
  tank: { radius: 55, halfLength: 48, halfWidth: 26, gap: 18, laneRate: 10, laneDelay: 7, turnRate: .8 },
});
export const GROUND_ENTRY_DISTANCE = 55;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const laneAllowed = (e, lane) => Math.abs(ROAD.lanes[lane]) + e.radius + 2 <= ROAD.halfWidth;
const separation = (a, b) => a.halfLength + b.halfLength + Math.max(a.gap, b.gap);
const overlapsLaterally = (a, b, offset = a.lateralOffset) => {
  const lowA = Math.min(offset, a.targetOffset), highA = Math.max(offset, a.targetOffset);
  const lowB = Math.min(b.lateralOffset, b.targetOffset), highB = Math.max(b.lateralOffset, b.targetOffset);
  return lowA - highB < a.halfWidth + b.halfWidth + 3 && lowB - highA < a.halfWidth + b.halfWidth + 3;
};

export function initializeGround(enemy, index = 0, lane) {
  const profile = GROUND_PROFILES[enemy.type] || GROUND_PROFILES.infantry;
  Object.assign(enemy, profile, { roadDistance: GROUND_ENTRY_DISTANCE, preferredSpeed: enemy.speed, currentSpeed: enemy.speed,
    trafficId: index, laneCooldown: 0, pending: true });
  const preferred = enemy.type === 'tank' ? 2 : [0, 4, 2, 1, 3][index % 5];
  enemy.subLane = lane ?? (laneAllowed(enemy, preferred) ? preferred : 2);
  enemy.lateralOffset = enemy.targetOffset = ROAD.lanes[enemy.subLane];
  const p = sampleRoad(GROUND_ENTRY_DISTANCE, enemy.lateralOffset);
  enemy.x = p.x; enemy.y = p.y; enemy.heading = p.angle;
  return enemy;
}

// Destination checks reserve the complete swept lateral band, including an
// in-progress lane change. Relative-speed headroom prevents cutting off a faster
// follower. Lane changes are committed; there is no automatic return-to-center.
export function canChangeLane(enemy, lane, enemies) {
  if (Math.abs(lane - enemy.subLane) !== 1 || !laneAllowed(enemy, lane)) return false;
  const target = ROAD.lanes[lane];
  const low = Math.min(enemy.lateralOffset, target), high = Math.max(enemy.lateralOffset, target);
  for (const other of enemies) {
    if (other === enemy || other.airborne || !other.alive || other.pending) continue;
    const width = enemy.halfWidth + other.halfWidth + 3;
    if (low - Math.max(other.lateralOffset, other.targetOffset) >= width || Math.min(other.lateralOffset, other.targetOffset) - high >= width) continue;
    const ahead = other.roadDistance - enemy.roadDistance;
    const closing = ahead >= 0 ? Math.max(0, enemy.currentSpeed - other.currentSpeed) : Math.max(0, other.currentSpeed - enemy.currentSpeed);
    if (Math.abs(ahead) < separation(enemy, other) + closing * .65 + 4) return false;
  }
  return true;
}

// Oriented box SAT is a final geometric guard on curves and during lane changes.
// It uses explicit physical extents, not Phaser's transparent texture bounds.
export function groundOverlap(a, b, ax = a.x, ay = a.y, heading = a.heading, padding = 1) {
  const ca = Math.cos(heading), sa = Math.sin(heading), cb = Math.cos(b.heading), sb = Math.sin(b.heading);
  const dx = b.x - ax, dy = b.y - ay;
  for (let axis = 0; axis < 4; axis++) {
    const x = axis === 0 ? ca : axis === 1 ? -sa : axis === 2 ? cb : -sb;
    const y = axis === 0 ? sa : axis === 1 ? ca : axis === 2 ? sb : cb;
    const ra = a.halfLength * Math.abs(x * ca + y * sa) + a.halfWidth * Math.abs(-x * sa + y * ca);
    const rb = b.halfLength * Math.abs(x * cb + y * sb) + b.halfWidth * Math.abs(-x * sb + y * cb);
    if (Math.abs(dx * x + dy * y) >= ra + rb + padding) return false;
  }
  return true;
}

export class GroundTraffic {
  constructor() { this.active = []; this.point = {}; }
  update(enemies, delta) {
    if (!(delta > 0) || !Number.isFinite(delta)) return;
    const active = this.active; active.length = 0;
    for (const enemy of enemies) if (!enemy.airborne && enemy.alive) active.push(enemy);
    // Front-to-back processing and bounded simulation steps prevent tunnelling,
    // even when callers supply seconds of elapsed time in one update.
    let remaining = delta;
    while (remaining > 1e-8) {
      const dt = Math.min(remaining, 1 / 60); remaining -= dt;
      active.sort((a, b) => Number(a.pending) - Number(b.pending) || b.roadDistance - a.roadDistance || a.trafficId - b.trafficId);
      for (const e of active) {
        if (e.pending) {
          const initial = e.subLane;
          for (let attempt = 0; attempt < ROAD.lanes.length; attempt++) {
            const lane = (initial + attempt) % ROAD.lanes.length;
            if (!laneAllowed(e, lane)) continue;
            const offset = ROAD.lanes[lane]; sampleRoad(GROUND_ENTRY_DISTANCE, offset, this.point);
            let clear = true;
            for (const b of active) if (b !== e && !b.pending && (groundOverlap(e, b, this.point.x, this.point.y, this.point.angle, e.gap)
              || (Math.abs(offset - b.lateralOffset) < e.halfWidth + b.halfWidth + 3 && b.roadDistance - GROUND_ENTRY_DISTANCE < separation(e, b)))) { clear = false; break; }
            if (clear) {
              e.pending = false; e.subLane = lane; e.lateralOffset = e.targetOffset = offset;
              e.x = this.point.x; e.y = this.point.y; e.heading = this.point.angle; break;
            }
          }
          if (e.pending) continue;
        }
        if (e.roadDistance >= ROAD.length) continue;
        e.laneCooldown = Math.max(0, e.laneCooldown - dt);
        let leader = null, free = Infinity;
        for (const b of active) {
          if (b === e || b.pending || b.roadDistance < e.roadDistance || (b.roadDistance === e.roadDistance && b.trafficId > e.trafficId) || !overlapsLaterally(e, b)) continue;
          const gap = b.roadDistance - e.roadDistance - separation(e, b);
          if (gap < free) { free = gap; leader = b; }
        }
        if (leader && e.preferredSpeed > leader.currentSpeed + 2 && free < 35 + e.currentSpeed * 1.2
          && e.laneCooldown === 0 && Math.abs(e.lateralOffset - e.targetOffset) < .5) {
          const first = e.trafficId % 2 ? 1 : -1;
          for (let attempt = 0; attempt < 2; attempt++) {
            const direction = attempt ? -first : first;
            const lane = e.subLane + direction;
            if (lane >= 0 && lane < ROAD.lanes.length && canChangeLane(e, lane, active)) {
              e.subLane = lane; e.targetOffset = ROAD.lanes[lane]; e.laneCooldown = e.laneDelay; break;
            }
          }
        }
        const desired = leader ? Math.min(e.preferredSpeed, Math.max(0, leader.currentSpeed + (free - 8) * 1.6)) : e.preferredSpeed;
        e.currentSpeed += (desired - e.currentSpeed) * (1 - Math.exp(-dt * (desired < e.currentSpeed ? 8 : 3)));
        sampleRoad(e.roadDistance, e.lateralOffset, this.point);
        // Offset curves are longer/shorter than their centerline on bends.
        const metric = Math.max(.65, 1 - this.point.curvature * e.lateralOffset);
        const travel = Math.max(0, Math.min(e.currentSpeed * dt / metric, free));
        const nextDistance = Math.min(ROAD.length, e.roadDistance + travel);
        const change = clamp((e.targetOffset - e.lateralOffset) * (1 - Math.exp(-dt * 4)), -e.laneRate * dt, e.laneRate * dt);
        const offset = e.lateralOffset + change;
        sampleRoad(nextDistance, offset, this.point);
        const heading = e.heading + clamp(angleDelta(e.heading, this.point.angle) * (1 - Math.exp(-dt * 5)), -e.turnRate * dt, e.turnRate * dt);
        let blocked = false;
        // Only traffic ahead may veto forward travel. Letting a trailing unit
        // block its leader can pin both forever after a tight merge or turn.
        for (const b of active) if (b !== e && !b.pending
          && (b.roadDistance > e.roadDistance || b.roadDistance === e.roadDistance && b.trafficId < e.trafficId)
          && Math.abs(b.roadDistance - nextDistance) < e.radius + b.radius + 10
          && groundOverlap(e, b, this.point.x, this.point.y, heading)) { blocked = true; break; }
        if (blocked) { e.currentSpeed = 0; continue; }
        e.roadDistance = nextDistance; e.lateralOffset = offset; e.heading = heading;
        e.x = this.point.x; e.y = this.point.y;
      }
    }
    const admitted = active.filter(enemy => !enemy.pending);
    const hasVisibleGround = admitted.some(enemy => enemy.x >= -24);
    if (!hasVisibleGround && admitted.length) {
      const lead = admitted.reduce((front, enemy) => enemy.roadDistance > front.roadDistance ? enemy : front);
      lead.ingressStall = Number.isFinite(lead.ingressLastDistance) && lead.roadDistance - lead.ingressLastDistance < .01 ? (lead.ingressStall || 0) + delta : 0;
      lead.ingressLastDistance = lead.roadDistance;
      if (lead.ingressStall > 2) {
        lead.roadDistance = Math.min(ROAD.length, lead.roadDistance + Math.max(6, lead.preferredSpeed * Math.min(delta, .25)));
        sampleRoad(lead.roadDistance, lead.lateralOffset, this.point);
        lead.x = this.point.x; lead.y = this.point.y; lead.heading = this.point.angle;
        lead.currentSpeed = Math.max(lead.currentSpeed, lead.preferredSpeed * .5); lead.ingressStall = 0;
      }
    } else for (const enemy of admitted) { enemy.ingressStall = 0; enemy.ingressLastDistance = enemy.roadDistance; }
  }
}

