// Fixed authored route, independent of Canvas/Phaser. These are the original
// terrain Beziers; the playable route stops where it meets the eastern gate.
const curves = [
  [[-70, 358], [260, 400], [315, 235], [605, 340]],
  [[605, 340], [805, 433], [875, 357], [1230, 355]],
];
const at = (c, t) => {
  const u = 1 - t;
  return { x: u ** 3 * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t ** 3 * c[3][0],
    y: u ** 3 * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t ** 3 * c[3][1] };
};
const points = [];
let length = 0;
for (const curve of curves) {
  for (let i = points.length ? 1 : 0; i <= 400; i++) {
    let p = at(curve, i / 400);
    if (p.x > 1045) {
      let low = (i - 1) / 400, high = i / 400;
      for (let j = 0; j < 32; j++) { const mid = (low + high) / 2; if (at(curve, mid).x < 1045) low = mid; else high = mid; }
      p = at(curve, (low + high) / 2);
    }
    const previous = points.at(-1);
    if (previous) length += Math.hypot(p.x - previous.x, p.y - previous.y);
    points.push({ ...p, distance: length });
    if (p.x >= 1045 - .000001) break;
  }
}
for (let i = 0; i < points.length; i++) {
  // Average direction across a short arc window at the authored Bezier join.
  // This avoids an offset-lane kink without changing the painted centerline.
  let left = i, right = i;
  while (left > 0 && points[i].distance - points[left].distance < 12) left--;
  while (right < points.length - 1 && points[right].distance - points[i].distance < 12) right++;
  const a = points[left], b = points[right];
  points[i].angle = Math.atan2(b.y - a.y, b.x - a.x);
}

export const ROAD = Object.freeze({ width: 150, halfWidth: 75, length, lanes: Object.freeze([-45, -15, 0, 15, 45]),
  points: Object.freeze(points.map(Object.freeze)) });

export function sampleRoad(distance = 0, offset = 0, out = {}) {
  distance = Number.isNaN(distance) ? 0 : Math.max(0, Math.min(ROAD.length, distance));
  if (!Number.isFinite(offset)) offset = 0;
  let low = 0, high = points.length - 1;
  while (high - low > 1) { const mid = (low + high) >> 1; if (points[mid].distance < distance) low = mid; else high = mid; }
  const a = points[low], b = points[high], span = b.distance - a.distance;
  const t = span ? (distance - a.distance) / span : 0;
  const angle = a.angle + (b.angle - a.angle) * t;
  out.tx = Math.cos(angle); out.ty = Math.sin(angle); out.nx = -out.ty; out.ny = out.tx;
  out.x = a.x + (b.x - a.x) * t + out.nx * offset;
  out.y = a.y + (b.y - a.y) * t + out.ny * offset;
  out.angle = angle; out.distance = distance;
  out.curvature = span ? (b.angle - a.angle) / span : 0;
  return out;
}
export const sampleRoadProgress = (progress, offset = 0, out) => sampleRoad(progress * ROAD.length, offset, out);

export function nearestRoad(point) {
  let best = Infinity, result = { distance: Infinity, progress: 0, offset: 0, x: points[0].x, y: points[0].y };
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return result;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
    const x = a.x + dx * t, y = a.y + dy * t, d2 = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (d2 < best) {
      best = d2; const segmentLength = b.distance - a.distance;
      result = { distance: Math.sqrt(d2), progress: a.distance + segmentLength * t,
        offset: ((point.y - y) * dx - (point.x - x) * dy) / segmentLength, x, y };
    }
  }
  return result;
}
export const intersectsRoad = (point, radius = 0) => nearestRoad(point).distance <= ROAD.halfWidth + radius;
export const insideRoad = (point, radius = 0) => nearestRoad(point).distance + radius <= ROAD.halfWidth + .001;

// Same normal-offset samples are used for artwork, tire ruts and HUD highlights.
export function roadPolyline(offset = 0) { return points.map(p => sampleRoad(p.distance, offset)); }
