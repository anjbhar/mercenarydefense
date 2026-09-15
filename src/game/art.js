import { SOLDIER_TYPES } from './constants.js';
import { ROAD, roadPolyline, intersectsRoad } from './road.js';
import { SANDBAGS, BUILDINGS, PALMS } from './config.js';

// Original, resolution-independent canvas artwork baked into Phaser textures once.
// All gameplay entities are then rendered as inexpensive 2D sprites.
function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function canvasTexture(scene, key, width, height, paint) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  paint(texture.context, width, height);
  texture.refresh();
}
const ellipse = (c, x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
function line(c, points, color, width = 1) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
}
function box(c, x, y, w, h, color, stroke) {
  c.fillStyle = color; c.fillRect(x, y, w, h);
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, h - 1); }
}
function rock(c, x, y, size, random) {
  c.save(); c.translate(x, y); c.rotate(random() * 6);
  ellipse(c, 5, 7, size, size * .6, '#4e493633');
  c.beginPath(); c.moveTo(-size, -size * .1); c.lineTo(-size * .5, -size * .65); c.lineTo(size * .4, -size * .7); c.lineTo(size, 0); c.lineTo(size * .5, size * .55); c.lineTo(-size * .65, size * .45); c.closePath();
  c.fillStyle = '#8a8061'; c.fill(); c.strokeStyle = '#6f674e'; c.stroke();
  line(c, [[-size * .6, -size * .3], [0, -size * .5], [size * .45, -size * .25]], '#b6aa83', 2);
  c.restore();
}
function palm(c, x, y, scale, rotation) {
  c.save(); c.translate(x, y); c.rotate(rotation); c.scale(scale, scale);
  ellipse(c, 20, 27, 28, 12, '#333c282f');
  line(c, [[0, 12], [-5, -10], [0, -23]], '#514d32', 7);
  line(c, [[-1, 10], [-7, -11], [-2, -23]], '#ac9d62', 2);
  c.translate(0, -23);
  for (let i = 0; i < 9; i++) {
    c.rotate(Math.PI * 2 / 9);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(23, -17, 42, 4); c.quadraticCurveTo(18, -1, 0, 0);
    c.fillStyle = i % 2 ? '#5b693b' : '#72814a'; c.fill();
    line(c, [[0, 0], [21, -5], [38, 3]], '#9a9a59', .9);
    for (let j = 9; j < 31; j += 5) line(c, [[j, -5], [j + 1, 1]], '#465536', .7);
  }
  ellipse(c, 0, 0, 5, 5, '#a5a362'); c.restore();
}
function sandbags(c, x, y, count, vertical = false) {
  c.save(); c.translate(x, y); if (vertical) c.rotate(Math.PI / 2);
  for (let i = 0; i < count; i++) {
    c.fillStyle = '#3a382738'; c.fillRect(i * 20 + 3, 5, 20, 12);
    c.fillStyle = '#a99a69'; c.beginPath(); c.roundRect(i * 20, 0, 21, 12, 4); c.fill();
    line(c, [[i * 20 + 3, 3], [i * 20 + 17, 3]], '#ccba84', 2);
    line(c, [[i * 20 + 2, 10], [i * 20 + 18, 10]], '#6e6749', 1);
  }
  c.restore();
}
function building(c, x, y, w, h, label) {
  box(c, x + 9, y + 12, w, h, '#383c324b');
  box(c, x, y, w, h, '#525a4c', '#3f483d');
  box(c, x + 5, y + 5, w - 10, h - 10, '#7e8265', '#acaa83');
  for (let k = 10; k < h - 5; k += 7) line(c, [[x + 7, y + k], [x + w - 7, y + k]], '#666f57');
  box(c, x + 12, y + 12, 21, 18, '#515d50', '#a2a68c');
  c.fillStyle = '#e5dfb5'; c.font = 'bold 10px monospace'; c.fillText(label, x + 12, y + h - 16);
}
function terrain(c, w, h) {
  const random = seeded(9168);
  const gradient = c.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#9c986e'); gradient.addColorStop(.45, '#b6aa7f'); gradient.addColorStop(1, '#8f9270');
  c.fillStyle = gradient; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 220; i++) {
    const x = random() * w, y = random() * h, r = 20 + random() * 95;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, random() > .5 ? '#d5bf8c25' : '#4c634025'); g.addColorStop(1, '#8b936000');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Broad dusty supply road, with organically curved shoulders and tire ruts.
  function road(offset, color, width) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); roadPolyline(offset).forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.lineWidth = width; c.strokeStyle = color; c.stroke(); c.restore();
  }
  road(0, '#8c805b25', ROAD.width + 42); road(0, '#bdb08760', ROAD.width + 23); road(0, '#c4b38b', ROAD.width);
  for (let i = 0; i < 18; i++) road((random() - .5) * (ROAD.width - 19), i % 2 ? '#96886620' : '#ebd3a018', 1 + random() * 3);
  road(-33, '#96876648', 3); road(-23, '#96876638', 3); road(33, '#96876648', 3); road(23, '#96876638', 3);
  // Foot tracks, fine sand grain, and patches of dry scrub.
  for (let i = 0; i < 14500; i++) {
    const x = random() * w, y = random() * h;
    c.fillStyle = random() > .5 ? '#f6e6b11b' : '#514c341c'; c.fillRect(x, y, random() * 2 + .4, random() + .3);
  }
  for (let i = 0; i < 460; i++) {
    const x = random() * 1050, y = random() * h;
    if (intersectsRoad({ x, y }, 12)) continue;
    for (let j = 0; j < 4; j++) line(c, [[x + j * 2, y + 3], [x + j * 3 - 2, y - random() * 7]], i % 3 ? '#65704c75' : '#c9bd8790');
  }
  // Faint tactical grid, intentionally beneath scenery.
  for (let x = 40; x < 1040; x += 60) for (let y = 130; y < 590; y += 60) {
    line(c, [[x - 3, y], [x + 3, y]], '#f8ebbd28'); line(c, [[x, y - 3], [x, y + 3]], '#f8ebbd28');
  }
  for (let i = 0; i < 65; i++) {
    const x = random() * 1020, y = i % 2 ? random() * 80 + 15 : 625 + random() * 60;
    rock(c, x, y, 5 + random() * 16, random);
  }
  // Ruined wall and abandoned supplies on the northern perimeter.
  box(c, 320, 29, 187, 17, '#615e4838');
  for (let i = 0; i < 10; i++) { box(c, 315 + i * 19, 20 + (i % 3) * 4, 17, 18, '#9f9572', '#bdb18c'); }
  box(c, 340, 50, 30, 25, '#80754e', '#aea271'); line(c, [[342, 52], [367, 72]], '#5f5940', 2);
  box(c, 379, 56, 23, 20, '#716b49', '#a49a6a');
  for (const [x, y, s, a] of PALMS) palm(c, x, y, s, a);
  for (const s of SANDBAGS) sandbags(c, s.x, s.y, s.count, s.vertical);
  // Fortified eastern outpost: concrete apron, gate, buildings and radio dish.
  box(c, 1060, 0, 140, h, '#646d5855');
  for (let y = 0; y < h; y += 57) {
    if (y > 280 && y < 410) continue;
    box(c, 1044, y, 13, 50, '#5f644f', '#999778');
    box(c, 1047, y + 3, 7, 42, '#a29f7b');
  }
  for (const b of BUILDINGS) building(c, b.x, b.y, b.width, b.height, b.label);
  box(c, 1080, 287, 120, 126, '#7e826965', '#a5a68b');
  c.strokeStyle = '#d5d1a780'; c.lineWidth = 2; c.beginPath(); c.arc(1140, 350, 41, 0, Math.PI * 2); c.stroke();
  box(c, 1128, 328, 6, 43, '#d5d1a790'); box(c, 1150, 328, 6, 43, '#d5d1a790'); box(c, 1133, 346, 20, 6, '#d5d1a790');
  ellipse(c, 1140, 244, 25, 15, '#303d303a'); ellipse(c, 1136, 235, 21, 21, '#abb19b'); ellipse(c, 1136, 235, 16, 16, '#6c7d70');
  line(c, [[1120, 225], [1136, 235], [1151, 220]], '#d0d2b3', 2); line(c, [[1136, 235], [1147, 210]], '#d0d2b3', 3);
  for (let y of [260, 425]) { box(c, 1053, y, 14, 18, '#454f40'); ellipse(c, 1060, y + 6, 3, 3, '#d8b566'); }
  c.save(); c.setLineDash([8, 8]); line(c, [[1035, 292], [1035, 411]], '#e0c174aa', 3); c.restore();
  // Perimeter vignette softens the frame without obscuring the play area.
  const vignette = c.createRadialGradient(w / 2, h / 2, 210, w / 2, h / 2, 720);
  vignette.addColorStop(0, '#26382c00'); vignette.addColorStop(1, '#26382c77'); c.fillStyle = vignette; c.fillRect(0, 0, w, h);
}

function plate(c, points, fill, stroke = '#303b32') {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1; c.stroke();
}

function tankHullArt(c) {
  c.translate(48, 48);
  // Separate steel track shoes and inset rubber pads keep the silhouette readable.
  for (const y of [-23, 13]) {
    plate(c, [[-25, y + 3], [-22, y], [23, y], [27, y + 3], [27, y + 7], [23, y + 10], [-22, y + 10], [-25, y + 7]], '#242a27');
    for (let x = -22; x < 24; x += 4) {
      box(c, x, y + 1, 3, 8, '#64695b'); box(c, x, y + 3, 2, 4, '#353d35');
      line(c, [[x, y + 1], [x + 2, y + 1]], '#a4a18a', .7);
    }
  }
  const armor = c.createLinearGradient(0, -18, 0, 18);
  armor.addColorStop(0, '#c0ae7c'); armor.addColorStop(.35, '#92865e'); armor.addColorStop(1, '#595b43');
  plate(c, [[-25, -14], [-20, -18], [20, -18], [28, -11], [28, 11], [20, 18], [-20, 18], [-25, 14]], armor);
  plate(c, [[-19, -13], [-7, -13], [0, -5], [-3, 12], [-19, 12]], '#6d7451', '#7e805b');
  plate(c, [[8, -15], [19, -15], [25, -9], [25, 8], [17, 7], [12, -3]], '#a69a6b', '#b4a67a');
  // Rear engine grille, exhausts, front glacis, and segmented side skirts.
  box(c, -22, -10, 11, 20, '#3d4739', '#b1a578');
  for (let y = -8; y <= 8; y += 3) line(c, [[-20, y], [-13, y]], '#7b8262', 1);
  for (const y of [-18, 14]) {
    for (let x = -19; x < 21; x += 9) {
      box(c, x, y, 8, 4, y < 0 ? '#b4a376' : '#6e7050', '#424b39');
      box(c, x + 1, y, 5, 1, '#c6b98a');
    }
  }
  line(c, [[21, -10], [24, -6], [24, 7], [20, 11]], '#d0bd8c', 1.2);
  for (const y of [-11, 8]) {
    box(c, -26, y, 4, 4, '#282f2a', '#858773');
    box(c, 24, y, 3, 3, '#e0cc8a', '#535843');
  }
  ellipse(c, 1, 1, 15, 14, '#303b2e'); ellipse(c, 0, 0, 14, 13, '#686e4e');
  for (const [x, y] of [[-18, -12], [-18, 12], [19, -12], [19, 12]]) ellipse(c, x, y, 1, 1, '#e0c793');
}

function tankTurretArt(c) {
  c.translate(48, 48);
  plate(c, [[-14, -8], [-7, -13], [9, -11], [16, -5], [16, 8], [6, 14], [-11, 12]], '#242e2870', '#242e2840');
  const armor = c.createLinearGradient(-6, -12, 8, 13);
  armor.addColorStop(0, '#c5b17d'); armor.addColorStop(.45, '#95845c'); armor.addColorStop(1, '#636447');
  plate(c, [[-16, -8], [-9, -13], [7, -12], [14, -6], [14, 6], [7, 12], [-10, 11], [-16, 6]], armor);
  plate(c, [[-11, -8], [-6, -10], [6, -9], [10, -4], [6, 1], [-8, 0]], '#7f8158', '#a6a071');
  line(c, [[-14, -7], [-8, -11], [6, -10], [11, -6]], '#dec796', 1.2);
  box(c, 9, -5, 9, 10, '#626b4e', '#ada579');
  box(c, 16, -3, 23, 6, '#414c3d', '#242f29');
  box(c, 17, -2, 21, 2, '#a5ac8b');
  for (const x of [20, 30]) box(c, x, -3, 2, 6, '#707b5d');
  plate(c, [[36, -4], [42, -4], [43, -2], [43, 2], [42, 4], [36, 4]], '#788169');
  box(c, 41, -2, 2, 4, '#202d28');
  ellipse(c, -5, 2, 6, 6, '#414d3b'); ellipse(c, -6, 1, 5, 5, '#a1a17a');
  line(c, [[-9, 0], [-6, -2], [-3, 0]], '#d6c594'); box(c, -8, 2, 5, 2, '#566345');
  box(c, 2, -8, 5, 3, '#313f35', '#b2b58b'); box(c, 3, -8, 3, 1, '#86b7ae');
  for (const y of [-9, 7]) for (let x = -1; x < 7; x += 3) box(c, x, y, 2, 3, '#46513d', '#9f9e75');
  line(c, [[-12, 6], [-23, 12]], '#28392e', .8); ellipse(c, -12, 6, 1.5, 1.5, '#c0b181');
  box(c, -15, -5, 3, 7, '#aa654b'); line(c, [[-14, -4], [-14, 0]], '#edc290', 1);
}

function helicopterArt(c) {
  c.translate(48, 48);
  // Undercarriage and armed stub wings sit beneath the faceted fuselage.
  for (const side of [-1, 1]) {
    c.save(); c.scale(1, side);
    line(c, [[-12, 16], [19, 16], [23, 13]], '#263a33', 2.5);
    line(c, [[-6, 9], [-3, 16]], '#88967a', 1.5); line(c, [[12, 8], [15, 16]], '#88967a', 1.5);
    plate(c, [[-11, 7], [2, 7], [6, 23], [-5, 22]], '#5d6b50');
    box(c, -7, 19, 15, 6, '#2d3d35', '#94a181'); box(c, -5, 20, 11, 2, '#768364');
    for (const y of [20.5, 23.5]) ellipse(c, 7, y, 1, 1, '#172a28');
    c.restore();
  }
  plate(c, [[-13, -5], [-39, -2], [-42, -5], [-41, 5], [-37, 3], [-13, 6]], '#76866a');
  line(c, [[-35, -1], [-16, -3]], '#bac2a0', 1);
  plate(c, [[-39, -2], [-41, -13], [-35, -11], [-31, 0], [-35, 10], [-41, 11]], '#4b6050');
  line(c, [[-39, -10], [-36, -9]], '#c39b64', 2);
  const body = c.createLinearGradient(0, -12, 0, 13);
  body.addColorStop(0, '#b0bd96'); body.addColorStop(.35, '#7f9271'); body.addColorStop(1, '#3c5545');
  plate(c, [[-20, -5], [-13, -10], [5, -11], [20, -7], [29, -2], [29, 3], [20, 8], [4, 12], [-13, 10], [-20, 5]], body);
  for (const y of [-8, 5]) {
    box(c, -17, y, 15, 4, '#4d614a', '#9fab86'); box(c, -19, y, 5, 4, '#253c34');
    for (let x = -11; x < -3; x += 2) line(c, [[x, y + 1], [x, y + 3]], '#263e33');
  }
  const glass = c.createLinearGradient(8, -7, 24, 8);
  glass.addColorStop(0, '#a1ddd1'); glass.addColorStop(.35, '#4b8a87'); glass.addColorStop(1, '#193c42');
  plate(c, [[6, -8], [18, -6], [26, -2], [25, 2], [8, 0]], glass);
  plate(c, [[8, 2], [25, 4], [18, 7], [6, 9]], '#365d60');
  line(c, [[9, -6], [17, -5], [21, -3]], '#cfefe0', 1);
  line(c, [[5, -9], [7, 0], [5, 10]], '#bdc5a0', 1.3);
  ellipse(c, 27, 3, 3, 3, '#2b3f36'); line(c, [[27, 3], [33, 3]], '#23372e', 2);
  box(c, -25, -2, 3, 5, '#c0b385'); box(c, -29, -1, 2, 3, '#aa694e');
  ellipse(c, -4, -23, 1.4, 1.2, '#ef9171'); ellipse(c, -4, 23, 1.4, 1.2, '#9acbbb');
  // Tail rotor is deliberately compact so it does not compete with the main rotor.
  ellipse(c, -38, 0, 7, 7, '#c8d3b526');
  line(c, [[-43, -4], [-33, 4]], '#bdc5aa', 1.2); line(c, [[-42, 5], [-34, -5]], '#bdc5aa', 1.2);
  ellipse(c, -38, 0, 1.8, 1.8, '#253b31'); ellipse(c, -3, 0, 5, 5, '#263d32');
}

function helicopterRotorArt(c) {
  c.translate(48, 48);
  for (let i = 0; i < 4; i++) {
    c.save(); c.rotate(i * Math.PI / 2);
    c.beginPath(); c.arc(0, 0, 43, -.23, .03); c.strokeStyle = '#d6dfc315'; c.lineWidth = 3; c.stroke();
    plate(c, [[4, -1], [15, -2], [44, -1], [43, 2], [13, 1], [4, 1]], '#405448aa', '#aab99b66');
    line(c, [[38, -.5], [43, -.3]], '#ddcca7aa', 1.5); c.restore();
  }
  ellipse(c, 0, 0, 4, 4, '#304337'); ellipse(c, 0, 0, 2.5, 2.5, '#d0d1aa');
  ellipse(c, -.5, -.5, 1, 1, '#f0edc9');
}

function unitArt(c, type, color, enemy = false) {
  c.translate(48, 48);
  const dark = enemy ? '#4c3c36' : '#303d39';
  if (type === 'machinegun' || type === 'aa') {
    for (let angle = 0; angle < 6.28; angle += 2.094) {
      line(c, [[0, 0], [Math.cos(angle) * 23, Math.sin(angle) * 23]], '#303d37', 7);
      ellipse(c, Math.cos(angle) * 23, Math.sin(angle) * 23, 5, 4, '#62715a');
    }
    ellipse(c, 0, 0, 15, 15, '#3f4e43'); ellipse(c, 0, 0, 11, 11, color);
    box(c, -12, -12, 22, 24, '#68765b', '#b1b494');
    for (let y of type === 'aa' ? [-9, 5] : [-3]) { box(c, 4, y, 31, 5, dark); box(c, 18, y, 12, 5, '#809084'); }
    box(c, -14, 10, 14, 8, '#958b5a', '#c0b176');
    box(c, -4, -8, 6, 5, color); return;
  }
  // Boots, backpack, shoulders, gloves, weapon and a highlighted helmet.
  box(c, -12, -14, 11, 9, '#2f3932'); box(c, -12, 6, 11, 9, '#2f3932');
  ellipse(c, -5, 0, 14, 17, dark);
  box(c, -16, -10, 9, 21, enemy ? '#6c5444' : '#667354', '#8e9870');
  ellipse(c, 1, -11, 8, 7, color); ellipse(c, 1, 11, 8, 7, color);
  line(c, [[5, -10], [15, -5], [17, 2]], color, 7); line(c, [[5, 12], [14, 10], [19, 3]], color, 6);
  ellipse(c, 17, 1, 3, 4, '#c2ab7b');
  if (type === 'fiftycal') {
    // A slightly heavier receiver, compact scope and small bulb muzzle distinguish the upgrade without overpowering the soldier.
    box(c, 6, -4, 22, 8, '#26332e', '#718078');
    box(c, 11, -7, 12, 3, '#263936', '#87948c');
    box(c, 27, -2, 13, 5, '#34433e', '#1d2927');
    ellipse(c, 42, .5, 4.5, 5, '#505d56', '#202a27');
  } else if (type === 'medic') {
    box(c, 7, -10, 20, 20, '#d9e1d4', '#526658');
    box(c, 15, -7, 5, 14, '#bd5e55'); box(c, 11, -3, 13, 6, '#bd5e55');
  } else {
    box(c, 8, -2, type === 'sniper' ? 31 : 23, type === 'grenadier' ? 8 : 5, '#26332e');
    box(c, 18, -2, 7, 3, '#869082');
    if (type === 'sniper') box(c, 13, -5, 10, 3, '#263932');
    if (type === 'grenadier') { box(c, 26, -4, 11, 11, '#7e8258'); box(c, 36, -2, 5, 7, '#b5ad73'); }
  }
  ellipse(c, -1, 1, 10, 11, '#37473a'); ellipse(c, -2, -1, 10, 10, color);
  c.beginPath(); c.arc(-2, -1, 8, Math.PI, Math.PI * 1.8); c.strokeStyle = '#edf0c66b'; c.lineWidth = 2; c.stroke();
  box(c, 5, -5, 4, 9, '#3b4e42'); line(c, [[-7, 0], [-2, -4], [2, -3]], enemy ? '#9b7960' : '#70815a', 3);
  if (type === 'medic') { box(c, -14, -9, 9, 18, '#d6ddd0', '#506052'); box(c, -12, -3, 5, 6, '#bd5e55'); }
  if (type === 'juggernaut' || type === 'heavy') { box(c, -5, -8, 9, 15, '#75614f', '#b29875'); box(c, 5, -5, 5, 9, '#dd8b68'); }
}

export function createArt(scene) {
  canvasTexture(scene, 'terrain', 1200, 700, terrain);
  for (const [type, definition] of Object.entries(SOLDIER_TYPES)) canvasTexture(scene, type, 96, 96, c => unitArt(c, type, definition.color));
  canvasTexture(scene, 'sniper-fiftycal', 96, 96, c => unitArt(c, 'fiftycal', SOLDIER_TYPES.sniper.color));
  for (const [type, color] of Object.entries({ infantry: '#ac7860', heavy: '#956f57', juggernaut: '#756756' })) canvasTexture(scene, type, 96, 96, c => unitArt(c, type, color, true));
  canvasTexture(scene, 'tank-hull', 96, 96, tankHullArt);
  canvasTexture(scene, 'tank-turret', 96, 96, tankTurretArt);
  canvasTexture(scene, 'helicopter', 96, 96, helicopterArt);
  canvasTexture(scene, 'helicopter-rotor', 96, 96, helicopterRotorArt);
  canvasTexture(scene, 'shadow', 80, 80, c => { const g = c.createRadialGradient(40, 40, 2, 40, 40, 36); g.addColorStop(0, '#182a2370'); g.addColorStop(1, '#182a2300'); ellipse(c, 40, 40, 36, 28, g); });
  canvasTexture(scene, 'mine', 48, 48, c => { ellipse(c, 26, 28, 16, 10, '#32382955'); ellipse(c, 24, 24, 14, 10, '#485646'); ellipse(c, 24, 21, 12, 8, '#899276'); ellipse(c, 24, 20, 5, 4, '#465644'); ellipse(c, 24, 19, 2, 2, '#e3b26b'); });
  canvasTexture(scene, 'spark', 24, 24, c => { const g = c.createRadialGradient(12, 12, 0, 12, 12, 12); g.addColorStop(0, '#fffde8'); g.addColorStop(.2, '#ffe6a4'); g.addColorStop(1, '#ff9c3000'); ellipse(c, 12, 12, 12, 12, g); });
  canvasTexture(scene, 'smoke', 64, 64, c => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, '#bdb39699'); g.addColorStop(.5, '#827e6c55'); g.addColorStop(1, '#827e6c00'); ellipse(c, 32, 32, 30, 30, g); });
}
