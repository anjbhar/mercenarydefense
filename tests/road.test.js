import test from 'node:test';
import assert from 'node:assert/strict';
import { ROAD, sampleRoad, sampleRoadProgress, nearestRoad, insideRoad, intersectsRoad } from '../src/game/road.js';
import { GroundTraffic, initializeGround, groundOverlap, canChangeLane, GROUND_PROFILES } from '../src/game/traffic.js';
import { placementError, canDeploy, distance } from '../src/game/utils.js';
import { GAME_CONFIG } from '../src/game/config.js';
import { SOLDIER_TYPES, UTILITIES } from '../src/game/constants.js';
import { getWavePlan } from '../src/game/wave-manager.js';

let serial = 0;
function enemy(type = 'infantry', progress = 200, lane = 2, speed = 40) {
  const e = initializeGround({ type, alive: true, speed, airborne: false }, serial++, lane);
  e.pending = false; e.roadDistance = progress;
  const p = sampleRoad(progress, e.lateralOffset); e.x = p.x; e.y = p.y; e.heading = p.angle;
  return e;
}
function advance(traffic, enemies, seconds, check = () => {}) {
  for (let t = 0; t < seconds; t += .05) { traffic.update(enemies, .05); check(); }
}
function separated(enemies) {
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    if (!enemies[i].pending && !enemies[j].pending) assert.equal(groundOverlap(enemies[i], enemies[j], undefined, undefined, undefined, 0), false, `${i}/${j} overlap`);
  }
}

test('shared road starts west, ends at the base, and has stable finite orthonormal samples', () => {
  assert.equal(sampleRoad(0).x, -70); assert.ok(Math.abs(sampleRoad(Infinity).x - 1045) < .001);
  assert.ok(ROAD.length > 1115 && ROAD.length < 1250);
  for (const d of [-100, 0, NaN, ...ROAD.points.map(p => p.distance), Infinity]) {
    const p = sampleRoad(d);
    assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(Math.abs(p.tx * p.nx + p.ty * p.ny) < 1e-10);
    assert.ok(Math.abs(Math.hypot(p.tx, p.ty) - 1) < 1e-10);
    assert.ok(Math.abs(Math.hypot(p.nx, p.ny) - 1) < 1e-10);
  }
  const p = sampleRoadProgress(.5), offset = sampleRoadProgress(.5, 30);
  assert.ok(Math.abs(distance(p, offset) - 30) < .001);
  assert.ok(Math.abs(nearestRoad(offset).distance - 30) < .05);
  assert.equal(intersectsRoad(offset, 46), true);
});

test('arc-length travel remains constant through straight sections and curves', () => {
  for (let d = 0; d < ROAD.length - 5; d += 5) assert.ok(Math.abs(distance(sampleRoad(d), sampleRoad(d + 5)) - 5) < .025);
  for (const lane of [0, 2, 4]) {
    const e = enemy('infantry', 100, lane, 40), traffic = new GroundTraffic();
    for (let i = 0; i < 400; i++) {
      const p = { x: e.x, y: e.y }; traffic.update([e], .05);
      assert.ok(Math.abs(distance(p, e) - 2) < .14, `offset speed at ${e.roadDistance}`);
    }
  }
});

test('all ground footprints stay inside the corridor; tanks turn smoothly at both bends', () => {
  for (const type of Object.keys(GROUND_PROFILES)) for (const lane of type === 'tank' || type === 'juggernaut' ? [1, 2, 3] : [0, 2, 4]) {
    const e = enemy(type, 0, lane, 55), traffic = new GroundTraffic(); let heading = e.heading;
    advance(traffic, [e], ROAD.length / 55 + 2, () => {
      assert.ok(insideRoad(e, e.radius), `${type}, lane ${lane} outside road`);
      assert.ok(Math.abs(e.heading - heading) <= e.turnRate * .05 + .00001); heading = e.heading;
    });
    assert.equal(e.roadDistance, ROAD.length);
  }
});

test('placement includes footprints, road shoulders, structures, boundaries and defender spacing', () => {
  const road = sampleRoad(600), shoulder = sampleRoad(600, ROAD.halfWidth + GAME_CONFIG.defenderRadius + 5);
  assert.equal(canDeploy(road, []), false);
  assert.equal(canDeploy(shoulder, []), true);
  assert.equal(canDeploy(sampleRoad(600, ROAD.halfWidth + 10), []), false);
  assert.equal(canDeploy(shoulder, [shoulder]), false);
  assert.equal(placementError({ x: 542, y: 190 }, [{ x: 500, y: 190 }]), null);
  assert.match(placementError({ x: 541, y: 190 }, [{ x: 500, y: 190 }]), /more space/);
  assert.equal(canDeploy({ x: 70, y: 200 }, []), false);
  assert.equal(canDeploy({ x: 1000, y: 220 }, []), false); // vertical sandbags
  assert.equal(canDeploy({ x: 1100, y: 250 }, []), false);
  assert.equal(canDeploy({ x: 500, y: 590 }, []), false);
  assert.equal(canDeploy({ x: NaN, y: 200 }, []), false);
  assert.equal(canDeploy(road, [], [], true), true);
  assert.equal(canDeploy(shoulder, [], [], true), false);
  assert.equal(canDeploy(road, [], [road], true), false);
  assert.equal(placementError({ x: 1049, y: 604 }, [], [], 'airstrike'), null);
  assert.notEqual(placementError({ x: 1051, y: 350 }, [], [], 'airstrike'), null);
});

test('starter defenders are legal, separated and cover the road with unchanged ranges', () => {
  const placed = [];
  for (const u of GAME_CONFIG.starterDefenders) {
    assert.equal(placementError(u, placed), null, `${u.type} ${u.x}/${u.y}`);
    assert.ok(nearestRoad(u).distance < SOLDIER_TYPES[u.type].range);
    placed.push(u);
  }
  for (const def of Object.values(SOLDIER_TYPES)) assert.ok(def.range > ROAD.width + GAME_CONFIG.defenderRadius);
});

test('faster infantry overtakes a tank through a clear adjacent lane without merging', () => {
  const slow = enemy('tank', 340, 2, 15), fast = enemy('infantry', 180, 2, 45), traffic = new GroundTraffic();
  const enemies = [fast, slow]; let changes = 0, previous = fast.subLane;
  advance(traffic, enemies, 20, () => {
    separated(enemies);
    if (fast.subLane !== previous) { changes++; previous = fast.subLane; }
  });
  assert.ok(fast.roadDistance > slow.roadDistance + 60, `failed to pass: ${fast.roadDistance}/${slow.roadDistance}, lane ${fast.subLane}`);
  assert.ok(changes <= 2, `oscillated ${changes} times`);
});

test('lane changes need both front and rear clearance, including faster rear traffic', () => {
  const e = enemy('infantry', 300, 1, 40);
  const front = enemy('infantry', 345, 0, 20), rear = enemy('infantry', 250, 0, 60);
  assert.equal(canChangeLane(e, 0, [e]), true);
  assert.equal(canChangeLane(e, 0, [e, front]), false);
  assert.equal(canChangeLane(e, 0, [e, rear]), false);
  assert.equal(canChangeLane(e, 4, [e]), false);
  assert.equal(canChangeLane(enemy('tank', 300, 1, 20), 0, []), false);
});

test('blocked faster traffic follows safely, including a large elapsed step', () => {
  const left = enemy('heavy', 360, 0, 0), center = enemy('tank', 360, 2, 0), right = enemy('heavy', 360, 4, 0);
  const fast = enemy('infantry', 210, 2, 60), enemies = [fast, left, center, right], traffic = new GroundTraffic();
  advance(traffic, enemies, 8, () => separated(enemies));
  assert.ok(fast.roadDistance < center.roadDistance);
  assert.ok(fast.currentSpeed < 20);
  traffic.update(enemies, 5); separated(enemies);
  assert.ok(fast.roadDistance < center.roadDistance);
});

test('a trailing overlap cannot pin the lead vehicle in a permanent deadlock', () => {
  const lead = enemy('infantry', 300, 2, 40), trailing = enemy('infantry', 270, 2, 40);
  const traffic = new GroundTraffic(), start = lead.roadDistance;
  advance(traffic, [lead, trailing], 1);
  assert.ok(lead.roadDistance > start + 30);
  assert.equal(groundOverlap(lead, trailing), false);
});

test('congested spawning waits offscreen, admits units safely, and ignores aircraft', () => {
  const traffic = new GroundTraffic(), enemies = [];
  for (let i = 0; i < 18; i++) enemies.push(initializeGround({ type: i % 5 === 0 ? 'tank' : 'infantry', speed: 35, alive: true }, i));
  const air = { airborne: true, alive: true, x: 10, y: 20, speed: 40 };
  enemies.push(air); traffic.update(enemies, .05);
  assert.ok(enemies.some(e => e.pending)); assert.equal(air.x, 10); assert.equal(air.y, 20);
  const ground = enemies.slice(0, -1);
  advance(traffic, enemies, 30, () => separated(ground));
  assert.ok(ground.every(e => !e.pending));
  assert.ok(new Set(ground.map(e => e.subLane)).size >= 3);
});

test('a complete late-wave ground convoy clears both bends without deadlock or overlap', () => {
  const traffic = new GroundTraffic(), plan = getWavePlan(25);
  let enemies = [], spawned = 0, cleared = 0, timer = 0;
  const queue = plan.enemies.filter(e => !e.airborne), count = queue.length;
  for (let step = 0; step < 3600 && cleared < count; step++) {
    timer -= .05;
    if (spawned < count && timer <= 0) {
      enemies.push(initializeGround({ ...queue[spawned], alive: true }, spawned++)); timer += plan.interval;
    }
    traffic.update(enemies, .05);
    separated(enemies);
    if (step % 20 === 0) for (const e of enemies) if (!e.pending) assert.ok(insideRoad(e, e.radius));
    enemies = enemies.filter(e => { if (e.roadDistance < ROAD.length) return true; cleared++; return false; });
  }
  assert.equal(cleared, count, `stuck: ${JSON.stringify(enemies.map(e => [e.type, e.roadDistance, e.subLane]))}`);
});

test('valid road mines can be reached by ground traffic across both road shoulders', () => {
  assert.equal(UTILITIES.mine.triggerRadius, 35);
  for (let s = 180; s < ROAD.length - 130; s += 90) for (const offset of [-66, -30, 0, 30, 66]) {
    const mine = sampleRoad(s, offset);
    assert.equal(canDeploy(mine, [], [], true), true);
    assert.ok(ROAD.lanes.some(lane => distance(mine, sampleRoad(s, lane)) < UTILITIES.mine.triggerRadius));
  }
});
