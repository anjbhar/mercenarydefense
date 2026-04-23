import { THREE } from "./three.js";

const SOLDIER_TYPES = {
  rifleman: {
    label: "Rifleman",
    cost: 50,
    rangeRatio: 0.45,
    coneAngle: 360,
    fireRate: 1.45,
    damage: 11,
    projectileSpeed: 44,
    projectileRadius: 0.4,
    projectileColor: 0xf6d76b,
    rangeColor: 0x73c06e,
    color: 0x56c86f,
    model: "rifleman",
    health: 120,
    muzzleLocal: null,
    shellLocal: null,
  },
  sniper: {
    label: "Sniper",
    cost: 75,
    rangeRatio: 0.65,
    coneAngle: 360,
    fireRate: 0.72,
    damage: 24,
    projectileSpeed: 66,
    projectileRadius: 0.35,
    projectileColor: 0xc6e8ff,
    rangeColor: 0x74b6ee,
    color: 0x8ee89e,
    model: "sniper",
    health: 90,
    muzzleLocal: null,
    shellLocal: null,
  },
  grenadier: {
    label: "Grenadier",
    cost: 130,
    rangeRatio: 0.56,
    coneAngle: 360,
    rangeShape: "circle",
    fireRate: 0.55,
    damage: 52,
    projectileSpeed: 28,
    projectileRadius: 0.45,
    projectileColor: 0xffb07a,
    splashRadius: 5.2,
    arcHeight: 3.8,
    rangeColor: 0xd98254,
    color: 0x6ab275,
    model: "grenadier",
    health: 130,
    muzzleLocal: null,
    shellLocal: null,
  },

  machinegun: {
    label: "Sentry Gun",
    cost: 95,
    rangeRatio: 0.58,
    coneAngle: 98,
    rangeShape: "circle",
    fireRate: 5.1,
    damage: 4,
    projectileSpeed: 84,
    projectileRadius: 0.27,
    projectileColor: 0xfff5ad,
    rangeColor: 0xe2cf6d,
    color: 0xa6b0bc,
    model: "turret",
    health: 180,
    muzzleLocal: null,
    shellLocal: null,
  }
};

function setUnitOffsets() {
  SOLDIER_TYPES.rifleman.muzzleLocal = new THREE.Vector3(-2.8, 1.55, 0);
  SOLDIER_TYPES.rifleman.shellLocal = new THREE.Vector3(-1.0, 1.55, 0.15);
  SOLDIER_TYPES.sniper.muzzleLocal = new THREE.Vector3(-3.3, 1.55, 0);
  SOLDIER_TYPES.sniper.shellLocal = new THREE.Vector3(-0.55, 1.65, 0.48);
  SOLDIER_TYPES.grenadier.muzzleLocal = new THREE.Vector3(-2.95, 1.75, 0);
  SOLDIER_TYPES.grenadier.shellLocal = new THREE.Vector3(-1.1, 1.6, 0.2);
  SOLDIER_TYPES.machinegun.muzzleLocal = new THREE.Vector3(-3.05, 1.8, 0);
  SOLDIER_TYPES.machinegun.shellLocal = new THREE.Vector3(-0.45, 1.72, 0.8);
}

export { SOLDIER_TYPES, setUnitOffsets };

