import test from 'node:test';
import assert from 'node:assert/strict';
import { getWavePlan, WaveManager } from '../src/game/wave-manager.js';
import { GAME_CONFIG } from '../src/game/config.js';
import { SOLDIER_TYPES } from '../src/game/constants.js';
import { canDeploy, sellValue } from '../src/game/utils.js';
import { createUnit, createEnemy } from '../src/game/models.js';
import { CombatEffects } from '../src/game/effects.js';
import { ROAD, nearestRoad, sampleRoad } from '../src/game/road.js';
import { GroundTraffic } from '../src/game/traffic.js';

// Scene integration tests run the actual combat methods with lightweight display
// objects. Browser playtesting separately verifies Phaser rendering and input.
globalThis.window = { Phaser: { Scene: class {} } };
const elements = new Map();
globalThis.document = {
  querySelector: () => null,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, { textContent: '', classList: { add() {}, remove() {}, toggle() {} }, showModal() {}, close() {} });
    return elements.get(id);
  },
};
const { Battlefield } = await import('../src/game/game.js');
function display(x = 0, y = 0) {
  return { x, y, alpha: 1, scaleX: 1, rotation: 0, visible: true, destroyed: false,
    setScale(value) { this.scaleX = value; return this; }, setDepth(value) { this.depth = value; return this; },
    setRotation(value) { this.rotation = value; return this; }, setAlpha(value) { this.alpha = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; }, setText(value) { this.text = value; return this; },
    setTint(value) { this.tint = value; return this; }, clearTint() { this.tint = null; return this; }, setVisible(value) { this.visible = value; return this; },
    setTexture(value) { this.texture = value; return this; },
    setOrigin() { return this; }, setStrokeStyle() { return this; }, clear() { return this; },
    destroy() { this.destroyed = true; },
  };
}
function game() {
  const g = new Battlefield();
  Object.assign(g, {
    money: 350, health: 20, units: [], enemies: [], mines: [], projectiles: [], strikes: [], dust: [],
    paused: false, gameOver: false, speed: 1, kills: 0, elapsed: 0, spawnIndex: 0, hudTimer: 0,
    selectedType: null, selectedUnit: null, ghost: display(), rangeGraphics: display(),
    add: { image: display, rectangle: display, circle: display, text: display },
    soundEvents: [],
    updateHUD() {}, renderSelection() {}, updateIntel() {}, drawOverlays() {}, hint() {},
  });
  g.sfx = Object.fromEntries(['shot', 'explosion', 'waveStart', 'hit', 'kill', 'ui', 'play', 'setPaused'].map(method => [method, (...args) => g.soundEvents.push({ method, args })]));
  g.effects = new CombatEffects(g);
  g.waveManager = new WaveManager(g);
  g.traffic = new GroundTraffic();
  return g;
}
function enemy(g, type = 'infantry', x = 400, y = 350) {
  const e = createEnemy(g, { type, health: 100, speed: 30, reward: 10, airborne: type === 'helicopter' }, 0);
  const road = nearestRoad({ x, y });
  Object.assign(e, { x, y, airLane: y, phase: 0, pending: false,
    roadDistance: road.progress, lateralOffset: road.offset, targetOffset: road.offset });
  g.enemies.push(e); return e;
}
function unit(g, type = 'rifleman', x = 500, y = 350, starter = false) {
  const u = createUnit(g, type, x, y, starter); g.units.push(u); return u;
}

test('all 25 waves have finite stats and the advertised enemy milestones', () => {
  for (let wave = 1; wave <= 25; wave++) {
    const plan = getWavePlan(wave);
    assert.equal(plan.enemies.length, 7 + wave * 2);
    assert.ok(plan.enemies.every(e => e.health > 0 && e.speed > 0 && e.reward > 0 && e.attackDamage > 0 && e.attackCooldown > 0 && e.attackRange > 0));
    assert.equal(plan.enemies.some(e => e.type === 'tank'), wave >= 8);
    assert.equal(plan.enemies.some(e => e.airborne), wave >= 14);
    assert.equal(plan.enemies.some(e => e.type === 'juggernaut'), wave >= 4);
    assert.equal(plan.enemies.some(e => e.type === 'heavy'), wave >= 2);
  }
  assert.equal(getWavePlan(8).enemies.filter(e => e.type === 'tank').length, 1);
  assert.ok(getWavePlan(4).enemies.some(e => e.spawnDelay < getWavePlan(4).interval));
  assert.equal(getWavePlan(1).enemies[0].reward, 6);
});

test('campaign starts with a lean two-unit garrison and reduced reserve', () => {
  assert.equal(GAME_CONFIG.startingMoney, 240);
  assert.deepEqual(GAME_CONFIG.starterDefenders.map(unit => unit.type), ['rifleman', 'machinegun']);
});

test('wave starts reject duplicates, pauses and terminal states', () => {
  const g = game();
  g.paused = true; assert.equal(g.waveManager.startWave(), false);
  g.paused = false; assert.equal(g.waveManager.startWave(), true);
  assert.equal(g.waveManager.startWave(), false);
  assert.equal(g.waveManager.wave, 1);
  g.gameOver = true; assert.equal(g.waveManager.startWave(), false);
});

test('campaign advances only after the last enemy, pays each bonus once, and wins on 25', () => {
  const g = game(); let spawned = 0, won = 0, totalBonus = 0;
  g.spawnEnemy = stats => { spawned++; g.enemies.push(stats); };
  g.finish = success => { assert.equal(success, true); won++; g.gameOver = true; };
  for (let wave = 1; wave <= 25; wave++) {
    assert.equal(g.waveManager.startWave(), true);
    while (g.waveManager.queue.length) g.waveManager.update(1.1);
    assert.equal(g.waveManager.active, true);
    g.enemies = []; g.waveManager.update(.01);
    totalBonus += getWavePlan(wave).bonus;
    assert.equal(g.money, 350 + totalBonus);
    g.waveManager.update(10);
    assert.equal(g.money, 350 + totalBonus);
  }
  assert.equal(spawned, 825); assert.equal(won, 1);
  assert.equal(g.waveManager.startWave(), false);
});

test('wave 12 burst traffic completes without leaving a hidden or stalled enemy', () => {
  const g = game(); g.health = 1e6; g.waveManager.wave = 11;
  assert.equal(g.waveManager.startWave(), true);
  for (let step = 0; step < 4000 && g.waveManager.active; step++) g.update(0, 50);
  assert.equal(g.waveManager.queue.length, 0);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.waveManager.active, false);
});

test('deployment respects the perimeter, spacing, money, and the squad limit', () => {
  const g = game();
  assert.equal(canDeploy({ x: 40, y: 350 }, []), false);
  assert.equal(canDeploy({ x: 1100, y: 350 }, []), false);
  g.choose('rifleman'); g.handleFieldClick(40, 350); assert.equal(g.money, 350);
  g.handleFieldClick(500, 190); assert.equal(g.units.length, 1); assert.equal(g.money, 300);
  g.choose('sniper'); g.handleFieldClick(510, 190); assert.equal(g.money, 300);
  g.money = 0; g.handleFieldClick(300, 350); assert.equal(g.units.length, 1);
  g.money = 1000; g.units = Array.from({ length: GAME_CONFIG.maxDefenders }, (_, i) => ({ x: 100 + i, y: 180 }));
  g.selectedType = 'rifleman'; g.handleFieldClick(500, 190); assert.equal(g.units.length, 20); assert.equal(g.money, 1000);
});

test('upgrades charge once per stage, restore health and preserve resale investment', () => {
  const g = game(); const u = unit(g, 'machinegun'); g.selectedUnit = u; g.money = 500; u.health = 20;
  g.upgradeSelected(); assert.equal(u.name, 'Advanced Sentry'); assert.equal(g.money, 335);
  assert.equal(u.health, u.maxHealth); assert.equal(u.specialUpgrades.minigun, true);
  g.upgradeSelected(); assert.equal(u.name, 'Laser Sentry'); assert.equal(g.money, 95);
  assert.equal(u.specialUpgrades.laser, true); assert.equal(u.level, 2);
  g.upgradeSelected(); assert.equal(g.money, 95);
  assert.equal(sellValue(u), 325); g.sellSelected(); assert.equal(g.money, 420);
  assert.equal(g.units.length, 0); assert.equal(u.sprite.destroyed, true);
  assert.equal(sellValue(unit(g, 'rifleman', 500, 350, true)), 0);
});

test('unaffordable and paused upgrades do not alter the unit', () => {
  const g = game(); const u = unit(g); g.selectedUnit = u; g.money = 119;
  g.upgradeSelected(); assert.equal(u.level, 0); assert.equal(g.money, 119);
  g.money = 350; g.paused = true; g.upgradeSelected(); g.sellSelected();
  assert.equal(u.level, 0); assert.equal(g.units.length, 1); assert.equal(g.money, 350);
});

test('closest targeting prefers the road lane nearest each defender before physical distance', () => {
  const g = game();
  const towerPoint = sampleRoad(500, -100), nearLanePoint = sampleRoad(670, -45), farLanePoint = sampleRoad(500, 45);
  const rifle = unit(g, 'rifleman', towerPoint.x, towerPoint.y);
  const nearLane = enemy(g, 'infantry', nearLanePoint.x, nearLanePoint.y);
  const farLane = enemy(g, 'infantry', farLanePoint.x, farLanePoint.y);
  Object.assign(nearLane, { roadDistance: 670, subLane: 0, lateralOffset: -45, targetOffset: -45, speed: 0, preferredSpeed: 0, currentSpeed: 0 });
  Object.assign(farLane, { roadDistance: 500, subLane: 4, lateralOffset: 45, targetOffset: 45, speed: 0, preferredSpeed: 0, currentSpeed: 0 });
  assert.ok(Math.hypot(farLane.x - rifle.x, farLane.y - rifle.y) < Math.hypot(nearLane.x - rifle.x, nearLane.y - rifle.y));
  assert.equal(rifle.targetPriority, 'closest'); rifle.cooldown = 0;
  g.update(0, 16);
  assert.equal(g.projectiles.find(p => p.source === rifle).target, nearLane);
});

test('AA targets aircraft exclusively and uses physical distance for its closest priority', () => {
  const g = game(); const aa = unit(g, 'aa', 550, 350);
  enemy(g, 'infantry', 540); const nearAir = enemy(g, 'helicopter', 500), farAir = enemy(g, 'helicopter', 350);
  aa.cooldown = 0; g.update(0, 16);
  assert.equal(g.projectiles.find(p => p.source === aa).target, nearAir);
  assert.notEqual(g.projectiles.find(p => p.source === aa).target, farAir);
});

test('snipers cover almost the entire playable battlefield', () => {
  assert.equal(SOLDIER_TYPES.sniper.range, 900);
  const g = game(), sniper = unit(g, 'sniper', 950, 350), target = enemy(g, 'infantry', 75, 350);
  sniper.cooldown = 0; g.update(0, 16);
  assert.equal(g.projectiles.find(projectile => projectile.source === sniper)?.target, target);
});

test('.50 Cal sniper rounds travel faster than standard bullets', () => {
  const g = game(), sniper = unit(g, 'sniper'), target = enemy(g, 'infantry', 300, 350);
  g.fire(sniper, target); assert.equal(g.projectiles[0].speed, 680); assert.equal(Math.hypot(g.projectiles[0].x - sniper.x, g.projectiles[0].y - sniper.y), 25);
  sniper.specialUpgrades.fiftycal = true;
  g.fire(sniper, target); assert.equal(g.projectiles[1].speed, 1100); assert.equal(Math.hypot(g.projectiles[1].x - sniper.x, g.projectiles[1].y - sniper.y), 34);
});

test('.50 Cal upgrade switches the sniper to its dedicated heavy-rifle artwork', () => {
  const g = game(), sniper = unit(g, 'sniper'); g.selectedUnit = sniper; g.money = 500;
  g.upgradeSelected();
  assert.equal(sniper.sprite.texture, 'sniper-fiftycal');
});

test('defender targeting priorities choose strongest and weakest contacts', () => {
  for (const [priority, expected] of [['strongest', 'strong'], ['weakest', 'weak']]) {
    const g = game(), defender = unit(g, 'rifleman', 500, 350);
    const contacts = { near: enemy(g, 'infantry', 450, 350), strong: enemy(g, 'heavy', 350, 350), weak: enemy(g, 'infantry', 400, 350) };
    contacts.strong.health = contacts.strong.maxHealth = 300; contacts.weak.health = 5;
    defender.targetPriority = priority; defender.cooldown = 0; g.update(0, 16);
    assert.equal(g.projectiles.find(projectile => projectile.source === defender)?.target, contacts[expected]);
  }
});

test('medics heal every injured nearby ally and never fire at enemies', () => {
  const g = game(), medic = unit(g, 'medic', 500, 350);
  const critical = unit(g, 'rifleman', 540, 350), wounded = unit(g, 'rifleman', 570, 350);
  critical.health = 20; wounded.health = 80; medic.cooldown = 0;
  enemy(g, 'infantry', 450, 350);
  g.update(0, 16);
  assert.equal(critical.health, 30); assert.equal(wounded.health, 90);
  assert.equal(g.projectiles.some(projectile => projectile.source === medic), false);
  assert.equal(g.effects.items.length, 3);
  assert.equal(g.effects.items[0].sprite.x, medic.x); assert.equal(g.effects.items[0].sprite.y, medic.y);
  assert.ok(medic.cooldown > 2);
  for (let i = 0; i < 30; i++) g.update(0, 16);
  const focusAngle = Math.atan2(critical.y - medic.y, critical.x - medic.x);
  const aimError = Math.abs(Math.atan2(Math.sin(medic.sprite.rotation - focusAngle), Math.cos(medic.sprite.rotation - focusAngle)));
  assert.ok(aimError < .03);
});

test('medic upgrades improve healing output, range, rate, and survivability', () => {
  const g = game(), medic = unit(g, 'medic'); g.selectedUnit = medic; g.money = 300;
  g.upgradeSelected();
  assert.equal(medic.name, 'Field Surgeon'); assert.equal(g.money, 150);
  assert.equal(medic.healing, 15); assert.ok(medic.range > 200);
  assert.equal(medic.maxHealth, 120);
});

test('hidden debug controls set the next wave only between assaults', () => {
  const g = game();
  assert.equal(g.setDebugWave(12), true); assert.equal(g.waveManager.wave, 11);
  assert.equal(g.setDebugWave(99), true); assert.equal(g.waveManager.wave, 24);
  g.waveManager.active = true;
  assert.equal(g.setDebugWave(4), false); assert.equal(g.waveManager.wave, 24);
});

test('hidden debug controls set and validate available funds', () => {
  const g = game();
  assert.equal(g.setDebugFunds(1234), true); assert.equal(g.money, 1234);
  assert.equal(g.setDebugFunds(-50), true); assert.equal(g.money, 0);
  assert.equal(g.setDebugFunds('invalid'), false); assert.equal(g.money, 0);
});

test('friendly ground units acquire ground enemies created from real wave plans', () => {
  const g = game(), rifle = unit(g, 'rifleman', 500, 350);
  const planned = createEnemy(g, getWavePlan(1).enemies[0], 0);
  const road = nearestRoad({ x: 450, y: 350 });
  Object.assign(planned, { x: 450, y: 350, pending: false, roadDistance: road.progress, lateralOffset: road.offset, targetOffset: road.offset });
  g.enemies.push(planned); rifle.cooldown = 0;
  g.update(0, 16);
  assert.equal(planned.airborne, false);
  assert.equal(g.projectiles.find(projectile => projectile.source === rifle)?.target, planned);
});

test('defenders ignore the hidden road entrance and engage once enemies enter the field', () => {
  const g = game(), rifle = unit(g, 'rifleman', 80, 350);
  const planned = createEnemy(g, getWavePlan(1).enemies[0], 0);
  const hidden = sampleRoad(0, planned.lateralOffset);
  Object.assign(planned, { pending: false, roadDistance: 0, x: hidden.x, y: hidden.y });
  g.enemies.push(planned); rifle.cooldown = 0;
  g.update(0, 16);
  assert.equal(g.projectiles.some(projectile => projectile.source === rifle), false);
  assert.equal(planned.sprite.visible, false);

  const entrance = sampleRoad(85, planned.lateralOffset);
  Object.assign(planned, { roadDistance: 85, x: entrance.x, y: entrance.y }); rifle.cooldown = 0;
  g.update(0, 16);
  assert.equal(g.projectiles.find(projectile => projectile.source === rifle)?.target, planned);
  assert.equal(planned.sprite.visible, true);
});

test('wave spawning applies backpressure to hidden ground reinforcements', () => {
  const g = game(); g.waveManager.startWave();
  g.enemies = Array.from({ length: 3 }, () => ({ airborne: false, pending: true, x: -70 }));
  const queued = g.waveManager.queue.length; g.waveManager.update(2);
  assert.equal(g.waveManager.queue.length, queued);
  g.enemies[0].pending = false; g.enemies[0].x = 1; g.spawnEnemy = stats => g.enemies.push(stats);
  g.waveManager.update(0);
  assert.equal(g.waveManager.queue.length, queued - 1);
});

test('projectiles kill once, award funds, and dispose the sprite and shadow', () => {
  const g = game(); const u = unit(g), e = enemy(g, 'infantry', 450); e.health = 1;
  g.fire(u, e); g.updateProjectiles(.2);
  assert.equal(e.alive, false); assert.equal(e.sprite.destroyed, true); assert.equal(e.shadow.destroyed, true);
  assert.equal(g.money, 360); assert.equal(g.kills, 1); assert.equal(u.kills, 1);
  g.damageEnemy(e, 100, u); assert.equal(g.money, 360); assert.equal(g.projectiles.length, 0);
});

test('friendly rounds continue to a defeated target position and impact there', () => {
  const g = game(), shooter = unit(g, 'sniper', 700, 350), target = enemy(g, 'infantry', 150, 350);
  g.fire(shooter, target); const round = g.projectiles[0];
  g.damageEnemy(target, 1000, shooter); const effectsBeforeImpact = g.effects.items.length;
  g.updateProjectiles(.1);
  assert.equal(g.projectiles[0], round); assert.deepEqual(round.impactPoint, { x: 150, y: 350 });
  for (let i = 0; i < 12 && g.projectiles.length; i++) g.updateProjectiles(.1);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.effects.items.length, effectsBeforeImpact + 4);
  assert.ok(g.effects.items.slice(-4).every(effect => effect.sprite.x === 150 && effect.sprite.y === 350));
});

test('enemy fire damages and destroys defenders without granting enemy rewards', () => {
  const g = game(); const u = unit(g), e = enemy(g, 'tank', 450); u.health = 1;
  g.fire(e, u, true); g.updateProjectiles(.3);
  assert.equal(g.units.length, 0); assert.equal(u.alive, false); assert.equal(g.money, 350);
});

test('tank turret tracks independently, fires from its barrel, and is destroyed with the hull', () => {
  const g = game(); const e = enemy(g, 'tank', 450, 350); const u = unit(g, 'rifleman', 450, 210);
  e.speed = 0; e.currentSpeed = 0; e.cooldown = 0;
  for (let i = 0; i < 40 && !g.projectiles.some(projectile => projectile.source === e); i++) g.update(0, 50);
  const tankShot = g.projectiles.find(projectile => projectile.source === e);
  assert.equal(e.sprite.rotation, e.heading);
  const angleDifference = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  assert.ok(angleDifference(e.turret.rotation, e.sprite.rotation) > .5);
  assert.ok(angleDifference(e.turret.rotation, Math.atan2(u.y - e.y, u.x - e.x)) < .13);
  assert.ok(Math.hypot(tankShot.x - e.x, tankShot.y - e.y) > 40);
  g.damageEnemy(e, 1000, u);
  assert.equal(e.sprite.destroyed, true); assert.equal(e.turret.destroyed, true);
});

test('ground infantry turn toward defenders before firing from their facing direction', () => {
  const g = game(); const e = enemy(g, 'infantry', 450, 350); const u = unit(g, 'rifleman', 450, 230);
  e.health = 1000; e.speed = 0; e.currentSpeed = 0; e.cooldown = 0;
  for (let i = 0; i < 40 && !g.projectiles.some(projectile => projectile.source === e); i++) g.update(0, 50);
  const enemyShot = g.projectiles.find(projectile => projectile.source === e);
  const targetAngle = Math.atan2(u.y - e.y, u.x - e.x);
  const angleDifference = Math.abs(Math.atan2(Math.sin(e.sprite.rotation - targetAngle), Math.cos(e.sprite.rotation - targetAngle)));
  assert.ok(angleDifference < .17);
  assert.ok(Math.hypot(enemyShot.x - e.x, enemyShot.y - e.y) > 20);
});

test('mines trigger on ground contact and spare nearby aircraft', () => {
  const g = game(); const air = enemy(g, 'helicopter', 400);
  g.selectedType = 'mine'; g.handleFieldClick(400, 350); assert.equal(g.money, 310);
  g.updateSupport(.01); assert.equal(g.mines.length, 1);
  const ground = enemy(g, 'infantry', 405); g.updateSupport(.01);
  assert.equal(g.mines.length, 0); assert.equal(ground.alive, false); assert.equal(air.health, 100);
});

test('landmines detect ground enemies within the expanded trigger radius', () => {
  const g = game(), ground = enemy(g, 'infantry', 434, 350);
  g.mines.push({ x: 400, y: 350, sprite: display(400, 350) });
  g.updateSupport(.01);
  assert.equal(g.mines.length, 0); assert.equal(ground.alive, false);
});

test('air strikes have a one-second delay, pause correctly and hit ground and air', () => {
  const g = game(); const ground = enemy(g), air = enemy(g, 'helicopter', 430);
  g.selectedType = 'airstrike'; g.handleFieldClick(420, 350); assert.equal(g.money, 210);
  g.updateSupport(.4); assert.equal(ground.health, 100);
  g.paused = true; g.update(0, 50); assert.equal(g.strikes[0].time, .6);
  g.paused = false; g.updateSupport(.61);
  assert.equal(ground.alive, false); assert.equal(air.alive, false); assert.equal(g.strikes.length, 0);
});

test('pause freezes enemies, projectiles, effects and wave spawn timers; 2x doubles travel', () => {
  const g = game(); const e = enemy(g); const u = unit(g); g.fire(u, e);
  g.waveManager.startWave(); const timer = g.waveManager.timer, px = g.projectiles[0].x;
  const life = g.effects.items[0].life, start = e.roadDistance; g.paused = true; g.update(0, 50);
  assert.equal(e.x, 400); assert.equal(g.projectiles[0].x, px); assert.equal(g.effects.items[0].life, life); assert.equal(g.waveManager.timer, timer);
  g.paused = false; g.update(0, 50); const normal = e.roadDistance - start;
  g.speed = 2; g.update(0, 50); assert.ok(Math.abs(e.roadDistance - start - normal * 3) < .02);
});

test('a tank breach deals three damage and a destroyed base ends the game', () => {
  const g = game(); enemy(g, 'tank', 1040).roadDistance = ROAD.length; g.update(0, 16);
  assert.equal(g.health, 17); assert.equal(g.enemies.length, 0); assert.equal(g.gameOver, false);
  g.health = 1; enemy(g, 'infantry', 1040).roadDistance = ROAD.length; g.update(0, 16);
  assert.equal(g.health, 0); assert.equal(g.gameOver, true);
  assert.equal(document.getElementById('endTitle').textContent, 'Outpost lost.');
});

test('cleared waves repair surviving units without exceeding maximum health', () => {
  const g = game(); const u = unit(g); u.health = 115;
  g.onWaveComplete(getWavePlan(1)); assert.equal(u.health, 120);
  u.health = 30; g.onWaveComplete(getWavePlan(2)); assert.equal(u.health, 42);
});

test('tank resists small arms and juggernaut armor depletes before health', () => {
  const g = game(), rifle = unit(g, 'rifleman', 550, 350), sniper = unit(g, 'sniper', 550, 350);
  const tank = enemy(g, 'tank', 450, 350); tank.health = tank.maxHealth = 100;
  g.damageEnemy(tank, 10, rifle); assert.equal(tank.health, 96);
  g.damageEnemy(tank, 10, sniper); assert.equal(tank.health, 89.5);
  sniper.specialUpgrades.fiftycal = true;
  g.damageEnemy(tank, 10, sniper); assert.equal(tank.health, 79.5);
  const juggernaut = enemy(g, 'juggernaut', 450, 350);
  assert.equal(juggernaut.maxArmor, 50);
  g.damageEnemy(juggernaut, 40, rifle);
  assert.equal(juggernaut.armor, 10); assert.equal(juggernaut.health, 100);
  g.damageEnemy(juggernaut, 15, rifle);
  assert.equal(juggernaut.armor, 0); assert.equal(juggernaut.health, 95);
  const armorEffects = g.effects.items.length;
  g.damageEnemy(juggernaut, 10, rifle);
  assert.equal(juggernaut.health, 85);
  assert.equal(g.effects.items.length, armorEffects + 4);
});

test('heavy troops hunt wounded defenders, suppress their fire, and helicopters prioritize AA', () => {
  const g = game(), healthy = unit(g, 'rifleman', 460, 350), wounded = unit(g, 'rifleman', 570, 350);
  wounded.health = 20;
  const heavy = enemy(g, 'heavy', 450, 350); heavy.health = 1000; heavy.speed = heavy.currentSpeed = 0; heavy.cooldown = 0;
  for (let i = 0; i < 20 && !g.projectiles.some(projectile => projectile.source === heavy); i++) g.update(0, 50);
  assert.equal(g.projectiles.find(projectile => projectile.source === heavy).target, wounded);
  g.damageUnit(healthy, 1, heavy);
  healthy.cooldown = 1; const suppression = healthy.suppression; g.enemies = []; g.update(0, 50);
  assert.ok(suppression > 1); assert.ok(healthy.cooldown > .95);

  const airGame = game(), rifle = unit(airGame, 'rifleman', 430, 350), aa = unit(airGame, 'aa', 520, 350);
  const helicopter = enemy(airGame, 'helicopter', 450, 350); helicopter.cooldown = 0;
  airGame.update(0, 16);
  assert.equal(airGame.projectiles.find(projectile => projectile.source === helicopter).target, aa);
  assert.notEqual(rifle, aa);
});

test('sentry and AA emplacements take damage but are immune to suppression', () => {
  const g = game(), heavy = enemy(g, 'heavy'); heavy.suppression = 2;
  const sentry = unit(g, 'machinegun'), aa = unit(g, 'aa');
  const sentryHealth = sentry.health, aaHealth = aa.health;
  g.damageUnit(sentry, 5, heavy); g.damageUnit(aa, 5, heavy);
  assert.equal(sentry.health, sentryHealth - 5); assert.equal(aa.health, aaHealth - 5);
  assert.equal(sentry.suppression, 0); assert.equal(aa.suppression, 0);
});

test('sentry heat forces a cooling cycle after sustained fire', () => {
  const g = game(), sentry = unit(g, 'machinegun', 500, 350), target = enemy(g, 'infantry', 450, 350);
  target.health = target.maxHealth = 1e6; target.speed = target.currentSpeed = 0;
  sentry.cooldown = 0; sentry.heat = .96;
  g.update(0, 50);
  assert.equal(sentry.overheated, true); assert.equal(sentry.heat, 1);
  g.enemies = [];
  for (let i = 0; i < 40; i++) g.update(0, 50);
  assert.equal(sentry.overheated, false); assert.ok(sentry.heat <= .35);
});

test('direct combat emits both factions’ shots and a single hit/reward per projectile', () => {
  const g = game(), u = unit(g), e = enemy(g, 'infantry', 450);
  e.health = 1;
  g.fire(u, e); g.updateProjectiles(.3); g.damageEnemy(e, 100, u);
  assert.deepEqual(g.soundEvents.map(event => event.method), ['shot', 'hit', 'kill']);
  assert.deepEqual(g.soundEvents[0].args, [u, false]);
  assert.equal(g.soundEvents[1].args[0], e);
  g.soundEvents = [];
  const attacker = enemy(g, 'heavy', 450);
  g.fire(attacker, u, true); g.updateProjectiles(.3);
  assert.deepEqual(g.soundEvents.map(event => event.method), ['shot', 'hit']);
  assert.deepEqual(g.soundEvents[0].args, [attacker, true]);
});

test('splash and support emit one typed detonation, without per-victim impact stacks', () => {
  const g = game(), u = unit(g, 'grenadier'), e = enemy(g, 'infantry', 450);
  enemy(g, 'infantry', 455);
  g.fire(u, e); g.updateProjectiles(.5);
  assert.equal(g.soundEvents.filter(event => event.method === 'hit').length, 0);
  assert.deepEqual(g.soundEvents.filter(event => event.method === 'explosion').map(event => event.args[0]), ['grenade']);
  g.soundEvents = [];
  g.selectedType = 'airstrike'; g.handleFieldClick(420, 350); g.updateSupport(1.1);
  assert.equal(g.soundEvents.filter(event => event.method === 'explosion' && event.args[0] === 'airstrike').length, 1);
  assert.equal(g.soundEvents.filter(event => event.method === 'ui' && event.args[0] === 'airstrike-call').length, 1);
});

test('unit sale does not play destruction and terminal audio cannot repeat', () => {
  const g = game(); g.selectedUnit = unit(g);
  g.sellSelected();
  assert.equal(g.soundEvents.some(event => event.method === 'explosion'), false);
  assert.equal(g.soundEvents.filter(event => event.method === 'ui' && event.args[0] === 'sell').length, 1);
  g.soundEvents = [];
  g.finish(false); g.finish(false);
  assert.deepEqual(g.soundEvents, [{ method: 'setPaused', args: [true] }, { method: 'ui', args: ['defeat'] }]);
});

test('ground depth follows Y, helicopters keep their flight path and overlay depth', () => {
  const g = game(), ground = enemy(g), air = enemy(g, 'helicopter', 430, 190);
  const lane = air.airLane; g.update(0, 50);
  assert.equal(ground.sprite.depth, 10 + ground.y / 1000);
  assert.ok(ground.shadow.depth < ground.sprite.depth);
  assert.equal(air.sprite.depth, 40);
  assert.equal(air.x, 431.5);
  assert.equal(air.y, lane + Math.sin(air.x / 105) * 13);
});

test('road placement rejects defenders, accepts mines and HUD clicks cannot deploy', () => {
  const g = game(), road = sampleRoad(500);
  let hint; g.hint = message => { hint = message; };
  g.choose('rifleman'); g.handleFieldClick(road.x, road.y);
  assert.equal(g.units.length, 0); assert.match(hint, /off the road/);
  g.choose('mine'); g.handleFieldClick(500, 190);
  assert.equal(g.mines.length, 0); assert.match(hint, /on the road/);
  g.handleFieldClick(road.x, road.y); assert.equal(g.mines.length, 1);
  g.choose('rifleman'); g.pointerOverHUD = true; g.handleFieldClick(500, 190);
  assert.equal(g.units.length, 0);
});
