import { GAME_CONFIG, STRUCTURES, PALMS } from './config.js';
import { ROAD, intersectsRoad, insideRoad, nearestRoad } from './road.js';
import { UTILITIES } from './constants.js';
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function lerpAngle(current, target, t) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * t;
}
export function canDeploy(point, units, mines = [], isMine = false) {
  return placementError(point, units, mines, isMine ? 'mine' : 'defender') === null;
}
export function placementError(point, units = [], mines = [], type = 'defender') {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return 'Choose a position inside the battlefield.';
  if (type === 'airstrike') {
    const a = GAME_CONFIG.combatArea;
    return point.x >= a.left && point.x <= a.right && point.y >= a.top && point.y <= a.bottom ? null : 'Choose a target inside the battlefield.';
  }
  const mine = type === 'mine', radius = mine ? GAME_CONFIG.mineRadius : GAME_CONFIG.defenderRadius;
  const f = GAME_CONFIG.field;
  if (point.x - radius < f.left || point.x + radius > f.right || point.y - radius < f.top || point.y + radius > f.bottom) return 'Keep the entire deployment inside the battlefield.';
  if (STRUCTURES.some(s => Math.hypot(point.x - clamp(point.x, s.x, s.x + s.width), point.y - clamp(point.y, s.y, s.y + s.height)) <= radius)
    || PALMS.some(([x, y, scale]) => distance(point, { x, y: y - 23 * scale }) < radius + 36 * scale)) return 'Permanent structures block this position.';
  if (mine) {
    if (!insideRoad(point, radius)) return 'Landmines must be planted on the road.';
    if (mines.some(other => distance(point, other) < 30)) return 'Leave more space between landmines.';
    const road = nearestRoad(point);
    if (!ROAD.lanes.some(offset => Math.abs(offset - road.offset) < UTILITIES.mine.triggerRadius)) return 'Plant the mine closer to a traffic lane.';
  } else {
    if (intersectsRoad(point, radius)) return 'Defenders must be deployed off the road.';
    if (units.some(unit => distance(point, unit) < GAME_CONFIG.defenderSpacing)) return 'Leave more space between defenders.';
  }
  return null;
}
export const sellValue = unit => Math.floor(unit.invested * 0.65);
