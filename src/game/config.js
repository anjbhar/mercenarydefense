export const GAME_CONFIG = {
  startingMoney: 240,
  startingHealth: 20,
  maxDefenders: 25,
  width: 1200,
  height: 700,
  field: { left: 60, right: 1045, top: 108, bottom: 602 },
  combatArea: { left: 40, right: 1050, top: 105, bottom: 605 },
  defenderRadius: 33, // Covers even the sniper/grenadier barrel at deployment scale.
  mineRadius: 8,
  starterDefenders: [
    { type: 'rifleman', x: 875, y: 228 },
    { type: 'machinegun', x: 945, y: 250 },
  ],
};
export const WAVE_CONFIG = { finalWave: 25 };

// Authored permanent scenery shared by placement and terrain rendering.
export const SANDBAGS = [
  { x: 745, y: 95, count: 6 }, { x: 442, y: 607, count: 7 },
  { x: 1024, y: 157, count: 6, vertical: true }, { x: 1024, y: 426, count: 6, vertical: true },
];
export const BUILDINGS = [
  { x: 1090, y: 80, width: 85, height: 125, label: 'COMMS' },
  { x: 1087, y: 469, width: 100, height: 136, label: 'BARRACKS' },
];
export const PALMS = [[70, 74, 1.2, .2], [180, 50, .9, -.2], [235, 100, 1.1, .4], [700, 55, 1, .1], [865, 73, 1.3, -.4], [953, 57, .8, .2], [89, 636, 1.2, -.3], [284, 660, 1.4, .1], [611, 650, .9, -.2], [851, 643, 1.2, .3], [961, 665, 1, -.1]];
export const STRUCTURES = [
  { x: 1044, y: 0, width: 156, height: 700 }, // Fortified outpost and walls.
  { x: 315, y: 20, width: 190, height: 28 },
  { x: 340, y: 50, width: 30, height: 25 }, { x: 379, y: 56, width: 23, height: 20 },
  ...BUILDINGS,
  ...SANDBAGS.map(s => ({ x: s.x - (s.vertical ? 12 : 0), y: s.y,
    width: s.vertical ? 12 : s.count * 20 + 1, height: s.vertical ? s.count * 20 + 1 : 12 })),
];
