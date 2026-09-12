// Ballistic reports use noise transients, not the former pitched square-wave
// cracks. Cutoffs and decay lengths distinguish weapons without a second beep.
const GUNS = {
  rifleman: { duration: .11, crack: 2400, body: 380, tail: .08 },
  commando: { duration: .09, crack: 3000, body: 450, tail: .06 },
  sniper: { duration: .22, crack: 3100, body: 260, tail: .18 },
  fiftycal: { duration: .28, crack: 2200, body: 170, tail: .24 },
  sentry: { duration: .075, crack: 2200, body: 340, tail: .05 },
  minigun: { duration: .055, crack: 2800, body: 390, tail: .04 },
  grenadier: { duration: .2, crack: 650, body: 150, tail: .17 },
  rpg: { duration: .25, crack: 950, body: 120, tail: .22 },
  aa: { duration: .13, crack: 1800, body: 240, tail: .1 },
  flak: { duration: .17, crack: 1600, body: 180, tail: .14 },
  'enemy-infantry': { duration: .1, crack: 1800, body: 350, tail: .075 },
  'enemy-heavy': { duration: .12, crack: 1600, body: 280, tail: .09 },
  'enemy-juggernaut': { duration: .15, crack: 1300, body: 210, tail: .12 },
  'enemy-tank': { duration: .32, crack: 900, body: 100, tail: .29 },
  'enemy-helicopter': { duration: .085, crack: 2500, body: 310, tail: .065 },
};
const envelope = (t, duration) => t >= duration ? 0 : Math.min(1, t / .0015) * Math.exp(-t / (duration * .22)) * Math.min(1, (duration - t) / .01);
const coefficient = (frequency, rate) => 1 - Math.exp(-2 * Math.PI * frequency / rate);

// Generate once per variation. A shot plays either this buffer or a loaded sample.
export function createFallbackBuffer(context, definition, variation = 0) {
  const f = definition.fallback;
  const laser = f.kind === 'gun' && f.profile === 'laser';
  const p = f.kind === 'gun' && !laser ? GUNS[f.profile] || GUNS.rifleman : null;
  const duration = p ? p.duration : laser ? .08 : f.duration;
  const buffer = context.createBuffer(1, Math.ceil(duration * context.sampleRate), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 314159 + variation * 7919;
  for (const character of JSON.stringify(f)) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
  const crackFilter = coefficient(p?.crack || f.frequency || 1800, context.sampleRate);
  const bodyFilter = coefficient(p?.body || 120, context.sampleRate);
  let phase = 0, crack = 0, body = 0, peak = .001;
  for (let i = 0; i < data.length; i++) {
    const t = i / context.sampleRate, noise = random();
    crack += (noise - crack) * crackFilter;
    body += (noise - body) * bodyFilter;
    let value;
    if (p) {
      value = (noise - crack) * .6 * envelope(t, Math.min(.035, duration))
        + crack * .9 * envelope(t, duration * .55)
        + body * 2.4 * envelope(t, p.tail);
    } else if (laser || f.kind === 'tone') {
      // Deliberately tonal: the laser and explicit interface alerts only.
      const start = laser ? 1600 : f.frequency, end = laser ? 520 : f.end || start * .45;
      phase += Math.PI * 2 * start * Math.pow(end / start, t / duration) / context.sampleRate;
      value = Math.sin(phase) * envelope(t, duration);
    } else if (f.kind === 'explosion') {
      value = (body * 3 + crack * .35) * envelope(t, duration);
    } else {
      // Impacts and reward ticks must not add a pitched confirmation to gunfire.
      value = (f.kind === 'click' ? noise - crack : crack + body * .7) * envelope(t, duration);
    }
    data[i] = value; peak = Math.max(peak, Math.abs(value));
  }
  for (let i = 0; i < data.length; i++) data[i] *= .5 / peak;
  return buffer;
}
