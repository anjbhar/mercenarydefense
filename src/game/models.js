import { ENEMY_TYPES, SOLDIER_TYPES } from './constants.js';
import { GAME_CONFIG } from './config.js';
import { initializeGround } from './traffic.js';

export function createUnit(scene, type, x, y, starter = false) {
  const def = SOLDIER_TYPES[type];
  return {
    type, x, y, health: def.health, maxHealth: def.health, range: def.range,
    damage: def.damage, fireRate: def.fireRate, splash: def.splash || 0,
    name: def.label, level: 0, kills: 0, invested: starter ? 0 : def.cost,
    specialUpgrades: {}, cooldown: .15, heat: 0, overheated: false, suppression: 0, alive: true, placementRadius: GAME_CONFIG.defenderRadius,
    shadow: scene.add.image(x + 6, y + 9, 'shadow').setScale(.7).setDepth(2),
    sprite: scene.add.image(x, y, type).setScale(.78).setRotation(Math.PI).setDepth(10 + y / 1000),
  };
}
export function createEnemy(scene, stats, index, random = Math.random) {
  const profile = ENEMY_TYPES[stats.type] || ENEMY_TYPES.infantry;
  stats = { ...profile, ...stats };
  const y = stats.airborne ? [190, 350, 510][index % 3] + (random() - .5) * 58 : 0;
  const scale = { tank: 1.1, helicopter: 1.1, heavy: .85, juggernaut: 1 }[stats.type] || .72;
  const texture = stats.type === 'tank' ? 'tank-hull' : stats.type;
  const enemy = { ...stats, x: 23, y, airLane: stats.airborne ? y : undefined, phase: random() * Math.PI * 2, maxHealth: stats.health, alive: true, cooldown: 1 + random(), scale,
    shadow: scene.add.image(29, y + (stats.airborne ? 38 : 9), 'shadow').setScale(scale).setDepth(2),
    sprite: scene.add.image(23, y, texture).setScale(scale).setDepth(stats.airborne ? 40 : 10 + y / 1000),
    turret: null,
    rotor: stats.airborne ? scene.add.rectangle(23, y, 91, 3, 0xd5d7bd, .7).setDepth(42) : null,
  };
  if (!stats.airborne) {
    initializeGround(enemy, index);
    enemy.sprite.setPosition(enemy.x, enemy.y).setRotation(enemy.heading).setVisible(false);
    enemy.shadow.setPosition(enemy.x + 6, enemy.y + 9).setVisible(false);
    if (stats.type === 'tank') {
      enemy.turretRotation = enemy.heading;
      enemy.muzzleDistance = 41 * scale;
      enemy.turret = scene.add.image(enemy.x, enemy.y, 'tank-turret').setScale(scale).setRotation(enemy.heading).setDepth(10.01 + enemy.y / 1000).setVisible(false);
    }
  }
  return enemy;
}
export function destroyEntity(entity) {
  entity.alive = false;
  entity.sprite.destroy();
  entity.shadow.destroy();
  entity.turret?.destroy();
  entity.rotor?.destroy();
}
