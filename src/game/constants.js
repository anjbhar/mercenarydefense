export const SOLDIER_TYPES = {
  rifleman: { label: 'Rifleman', role: 'Versatile infantry', cost: 50, range: 205, fireRate: 1.45, damage: 11, health: 120, color: '#b6c98c', upgrades: [{ id: 'commando', label: 'Commando', cost: 120, damage: 1.7, fireRate: 1.5, range: 1.1 }] },
  sniper: { label: 'Sniper', role: 'Map-wide precision', cost: 75, range: 900, fireRate: 0.72, damage: 24, health: 90, color: '#9cc3cb', upgrades: [{ id: 'fiftycal', label: '.50 Cal Sniper', cost: 140, damage: 2.2, fireRate: 0.85, range: 1.15 }] },
  machinegun: { label: 'Sentry Gun', role: 'Rapid-fire suppression', cost: 95, range: 235, fireRate: 5.1, damage: 4, health: 180, color: '#d9c689', upgrades: [{ id: 'minigun', label: 'Advanced Sentry', cost: 165, damage: 1.35, fireRate: 1.8, range: 1.08 }, { id: 'laser', label: 'Laser Sentry', cost: 240, damage: 1.9, fireRate: 1.22, range: 1.1 }] },
  grenadier: { label: 'Grenadier', role: 'Area damage', cost: 130, range: 255, fireRate: 0.55, damage: 52, splash: 62, health: 130, color: '#dba579', upgrades: [{ id: 'rpg', label: 'Rocket Specialist', cost: 180, damage: 1.7, fireRate: 1.2, range: 1.1 }] },
  aa: { label: 'AA Gun', role: 'Anti-air defense', cost: 160, range: 370, fireRate: 2.4, damage: 18, health: 165, airTargets: true, color: '#91c5be', upgrades: [{ id: 'flak', label: 'Flak Battery', cost: 210, damage: 1.8, fireRate: 1.3, range: 1.1 }] },
  medic: { label: 'Medic', role: 'Area healing support', cost: 110, range: 185, fireRate: .42, damage: 0, healing: 10, health: 100, color: '#a9d8bd', upgrades: [{ id: 'surgeon', label: 'Field Surgeon', cost: 150, healing: 1.5, fireRate: 1.25, range: 1.12 }] },
};
export const ENEMY_TYPES = {
  infantry: { healthFactor: 1, speedFactor: 1, attackDamage: 5, attackCooldown: 1.35, attackRange: 160, airborne: false },
  heavy: { healthFactor: 1.55, speedFactor: .8, attackDamage: 8, attackCooldown: 1.55, attackRange: 175, suppression: 1.25, airborne: false },
  juggernaut: { healthFactor: 3.3, armorFactor: .5, speedFactor: .62, attackDamage: 12, attackCooldown: 1.9, attackRange: 160, suppression: 2, airborne: false },
  tank: { healthFactor: 5.8, speedFactor: .52, attackDamage: 16, attackCooldown: 2.6, attackRange: 230, airborne: false },
  helicopter: { healthFactor: 2.4, speedFactor: .92, attackDamage: 7, attackCooldown: 1.25, attackRange: 190, airborne: true },
};
export const UTILITIES = {
  mine: { label: 'Landmine', cost: 40, radius: 72, triggerRadius: 35, damage: 170 },
  airstrike: { label: 'Air Strike', cost: 140, radius: 125, damage: 230 },
};
