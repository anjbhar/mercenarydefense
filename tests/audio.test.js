import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SoundManager } from '../src/game/sound.js';
import { AUDIO_MANIFEST, weaponCue, impactCue } from '../src/game/audio/manifest.js';
import { createFallbackBuffer } from '../src/game/audio/procedural.js';
import { SOLDIER_TYPES } from '../src/game/constants.js';

const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; } });
class Node {
  constructor() { this.gain = param(); this.pan = param(); this.playbackRate = param(); }
  connect(target) { this.output = target; return target; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; this.onended?.(); }
}
class Context {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = new Node(); this.sources = []; }
  createGain() { return new Node(); }
  createStereoPanner() { return new Node(); }
  createDynamicsCompressor() { return Object.assign(new Node(), Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(key => [key, param()]))); }
  createBufferSource() { const source = new Node(); this.sources.push(source); return source; }
  createBuffer(channels, length, rate) { const data = new Float32Array(length); return { duration: length / rate, length, getChannelData: () => data }; }
  async decodeAudioData(bytes) { if (bytes.byteLength === 0) throw new Error('Bad audio'); return this.createBuffer(1, 800, 8000); }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}
const cue = 'weapon.friendly.rifleman';
const file = AUDIO_MANIFEST.cues[cue].files[0];
function setup({ files = [], fetcher, ...options } = {}) {
  const ctx = new Context(); const requests = [];
  const sound = new SoundManager({ contextFactory: () => ctx, random: () => 0, ...options, fetcher: async (url, init) => {
    requests.push(url);
    if (fetcher) return fetcher(url, init);
    return url.endsWith('catalog.json')
      ? { ok: true, json: async () => ({ version: 1, files }) }
      : { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
  } });
  return { sound, ctx, requests };
}

test('manifest covers every friendly upgrade, enemy weapon and impact surface', () => {
  const expected = new Set();
  for (const [type, def] of Object.entries(SOLDIER_TYPES)) {
    const shooter = { type, specialUpgrades: {} };
    expected.add(weaponCue(shooter));
    for (const upgrade of def.upgrades) { shooter.specialUpgrades[upgrade.id] = true; expected.add(weaponCue(shooter)); }
  }
  assert.equal(expected.size, 11);
  for (const type of ['infantry', 'heavy', 'juggernaut', 'tank', 'helicopter']) expected.add(weaponCue({ type }, true));
  for (const id of expected) assert.ok(AUDIO_MANIFEST.cues[id], id);
  assert.equal(weaponCue({ type: 'machinegun', specialUpgrades: { laser: true, minigun: true } }), 'weapon.friendly.laser');
  assert.equal(impactCue({ type: 'tank' }), 'impact.armor');
  assert.equal(impactCue({ type: 'rifleman' }), 'impact.flesh');
  const files = Object.values(AUDIO_MANIFEST.cues).flatMap(def => def.files);
  assert.equal(files.length, new Set(files).size);
  assert.equal(files.length, 135);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../assets/audio/manifest.json', import.meta.url))), AUDIO_MANIFEST);
});

test('every procedural cue produces finite, non-silent, peak-bounded audio', () => {
  const ctx = new Context();
  for (const [id, def] of Object.entries(AUDIO_MANIFEST.cues)) {
    const buffer = createFallbackBuffer(ctx, def);
    const samples = buffer.getChannelData(0);
    assert.ok(buffer.duration <= def.maxDuration, id);
    assert.ok(samples.every(value => Number.isFinite(value) && Math.abs(value) <= .501), id);
    assert.ok(samples.some(value => Math.abs(value) > .1), id);
  }
});

test('an empty catalog uses procedural playback without missing-file requests', async () => {
  const { sound, requests, ctx } = setup();
  assert.equal(sound.play(cue, { x: 0 }), true);
  await sound.preload();
  assert.equal(requests.length, 1);
  assert.equal(ctx.sources.length, 1);
  assert.ok(ctx.sources[0].buffer.length > 0);
  assert.equal(sound.getDiagnostics().cues[cue].missing.length, 4);
  await sound.dispose();
});

test('ballistic reports and kill clicks have no dominant midrange beep', () => {
  const ctx = new Context();
  // Fraction of total energy explained by a single pitched component. This
  // catches reintroduced beep layers without requiring exact random waveforms.
  const toneShare = samples => {
    const energy = samples.reduce((sum, value) => sum + value * value, 0);
    let strongest = 0;
    for (let frequency = 500; frequency <= 3000; frequency += 50) {
      let real = 0, imaginary = 0;
      for (let i = 0; i < samples.length; i++) {
        const phase = 2 * Math.PI * frequency * i / ctx.sampleRate;
        real += samples[i] * Math.cos(phase); imaginary += samples[i] * Math.sin(phase);
      }
      strongest = Math.max(strongest, 2 * (real * real + imaginary * imaginary) / (samples.length * energy));
    }
    return strongest;
  };
  assert.ok(toneShare(Float32Array.from({ length: 800 }, (_, i) => Math.sin(2 * Math.PI * 1000 * i / ctx.sampleRate))) > .99);
  for (const [id, def] of Object.entries(AUDIO_MANIFEST.cues)) {
    if (!(def.bus === 'weapons' && def.fallback.profile !== 'laser') && id !== 'ui.kill') continue;
    for (let variation = 0; variation < def.files.length; variation++) {
      assert.ok(toneShare(createFallbackBuffer(ctx, def, variation).getChannelData(0)) < .15, `${id} variation ${variation}`);
    }
  }
});

test('every loaded weapon starts exactly one sample source with no fallback layer', async () => {
  for (const [id, def] of Object.entries(AUDIO_MANIFEST.cues)) {
    if (def.bus !== 'weapons') continue;
    const { sound, ctx } = setup({ files: [def.files[0]] });
    await sound.loadCue(id);
    assert.equal(sound.play(id), true);
    assert.equal(ctx.sources.length, 1, id);
    assert.equal(ctx.sources[0].buffer, sound.buffers.get(def.files[0]), id);
    assert.equal(sound.fallbacks.size, 0, id);
    await sound.dispose();
  }
});

test('loaded samples replace fallback on future events without delayed playback', async () => {
  const { sound, ctx, requests } = setup({ files: [file] });
  sound.play(cue);
  const fallback = ctx.sources[0].buffer;
  await Promise.all([sound.loadCue(cue), sound.loadCue(cue)]);
  assert.equal(ctx.sources.length, 1, 'loading must not replay the original shot');
  ctx.currentTime += .1; sound.play(cue);
  assert.notEqual(ctx.sources[1].buffer, fallback);
  assert.equal(ctx.sources[1].buffer, sound.buffers.get(file));
  assert.equal(requests.filter(url => url.endsWith('.wav')).length, 1);
  await sound.dispose();
});

test('partial packs choose only available recordings and avoid immediate repeats', async () => {
  const files = AUDIO_MANIFEST.cues[cue].files.slice(0, 2);
  const { sound, ctx } = setup({ files });
  await sound.loadCue(cue);
  sound.play(cue); ctx.currentTime += .1; sound.play(cue); ctx.currentTime += .1; sound.play(cue);
  assert.notEqual(ctx.sources[0].buffer, ctx.sources[1].buffer);
  assert.equal(ctx.sources[0].buffer, ctx.sources[2].buffer);
  await sound.dispose();
});

test('missing files and decode errors are cached and fall back without retry loops', async () => {
  const files = AUDIO_MANIFEST.cues[cue].files;
  const { sound, ctx, requests } = setup({ fetcher: async url => url.endsWith('catalog.json')
    ? { ok: true, json: async () => ({ version: 1, files }) }
    : url.endsWith('-01.wav') ? { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }
      : { ok: false, status: 404 } });
  await sound.loadCue(cue);
  assert.equal(sound.failures.size, 4);
  for (let i = 0; i < 8; i++) { ctx.currentTime += .1; sound.play(cue); }
  await sound.loadCue(cue);
  assert.equal(requests.length, 5);
  assert.equal(sound.buffers.size, 0); assert.ok(sound.fallbacks.size > 0);
  await sound.dispose();
});

test('a missing catalog still allows declared assets to load once on demand', async () => {
  const { sound, requests } = setup({ fetcher: async url => url.endsWith('catalog.json')
    ? { ok: false, status: 404 } : { ok: true, arrayBuffer: async () => new ArrayBuffer(4) } });
  await sound.loadCue(cue); await sound.loadCue(cue);
  assert.equal(sound.buffers.size, 4); assert.equal(requests.length, 5);
  await sound.dispose();
});

test('loading timeouts release requests and leave the fallback usable', async () => {
  const { sound, ctx } = setup({ timeoutMs: 5, fetcher: async (url, { signal }) => url.endsWith('catalog.json')
    ? { ok: true, json: async () => ({ version: 1, files: [file] }) }
    : new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true })) });
  await sound.loadCue(cue);
  assert.equal(sound.requests.size, 0); assert.equal(sound.failures.size, 1);
  sound.play(cue); assert.equal(ctx.sources.length, 1);
  await sound.dispose();
});

test('voice caps and cooldowns protect the mix, reserving higher-priority cues', async () => {
  const { sound, ctx } = setup({ maxVoices: 2 });
  sound.play('ui.select'); sound.play('ui.upgrade');
  assert.equal(sound.play(cue), false);
  sound.play('ui.victory'); assert.equal(sound.voices.size, 2);
  assert.ok([...sound.voices].some(v => v.id === 'ui.victory'));
  sound.reset(); sound.play(cue);
  assert.equal(sound.play(cue), false, 'same-frame duplicate is suppressed');
  for (let i = 0; i < 10; i++) { ctx.currentTime += .1; sound.play(cue); }
  assert.equal(sound.voices.size, 2);
  await sound.dispose();
});

test('per-cue polyphony and source-ended cleanup disconnect audio nodes', async () => {
  const { sound, ctx } = setup();
  for (let i = 0; i < 12; i++) { ctx.currentTime += .1; sound.play(cue); }
  assert.equal(sound.voices.size, 5);
  assert.equal(ctx.sources[0].stopped, true);
  const voice = [...sound.voices][0]; voice.source.onended();
  assert.equal(sound.voices.size, 4);
  assert.equal(voice.volume.disconnected, true); assert.equal(voice.pan.disconnected, true);
  await sound.dispose();
});

test('mute immediately stops existing tails; pause stops world audio but allows UI', async () => {
  const { sound, ctx } = setup();
  sound.play(cue); sound.play('ui.select'); sound.setPaused(true);
  assert.equal(ctx.sources[0].stopped, true); assert.equal(sound.voices.size, 1);
  assert.equal(sound.play(cue), false); assert.equal(sound.play('ui.pause'), true);
  sound.setMuted(true); assert.equal(sound.voices.size, 0); assert.equal(sound.masterGain.gain.value, 0);
  assert.equal(sound.play('ui.resume'), false);
  sound.setVolume(.25); sound.setMuted(false); assert.equal(sound.masterGain.gain.value, .25);
  sound.reset(); assert.equal(sound.paused, false); assert.equal(sound.play(cue), true);
  await sound.dispose();
});

test('world cues pan across the fixed battlefield; UI remains centered', async () => {
  const { sound, ctx } = setup();
  sound.play(cue, { x: 0 }); const left = [...sound.voices][0]; assert.equal(left.pan.pan.value, -.75);
  ctx.currentTime += .1; sound.play(cue, { x: 1200 }); assert.equal([...sound.voices][1].pan.pan.value, .75);
  sound.play('ui.select', { x: 0 }); assert.equal([...sound.voices][2].pan.pan.value, 0);
  assert.ok(ctx.sources.every(source => source.playbackRate.value > 0));
  await sound.dispose();
});

test('unsupported audio and denied autoplay never throw or queue combat events', async () => {
  const unavailable = new SoundManager({ contextFactory: () => { throw new Error('Unavailable'); } });
  assert.equal(unavailable.play(cue), false);
  const { sound, ctx } = setup(); ctx.state = 'suspended'; ctx.resume = async () => { throw new Error('Not allowed'); };
  assert.equal(sound.play(cue), false);
  await Promise.resolve(); assert.equal(ctx.sources.length, 0);
  await sound.dispose();
});

test('dispose ignores in-flight decode completions and closes the shared context', async () => {
  const { sound, ctx } = setup({ files: [file] });
  let finishDecode;
  let decoding;
  const started = new Promise(resolve => { decoding = resolve; });
  ctx.decodeAudioData = () => { decoding(); return new Promise(resolve => { finishDecode = resolve; }); };
  const loading = sound.loadCue(cue); await started;
  await sound.dispose(); finishDecode(ctx.createBuffer(1, 800, 8000)); await loading;
  assert.equal(sound.buffers.size, 0); assert.equal(ctx.state, 'closed');
  assert.equal(sound.play(cue), false); assert.equal(sound.getDiagnostics().state, 'disposed');
});
