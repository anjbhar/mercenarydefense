import { AUDIO_MANIFEST, weaponCue, impactCue } from './audio/manifest.js';
import { createFallbackBuffer } from './audio/procedural.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const DEFAULT_BASE = new URL('../../assets/audio/', import.meta.url);

export class SoundManager {
  constructor({ manifest = AUDIO_MANIFEST, baseURL = DEFAULT_BASE, fetcher = globalThis.fetch?.bind(globalThis), contextFactory, random = Math.random, maxVoices = 32, timeoutMs = 3500 } = {}) {
    this.manifest = manifest;
    this.baseURL = new URL(baseURL, DEFAULT_BASE);
    this.fetcher = fetcher;
    this.contextFactory = contextFactory || (() => {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      return Context ? new Context() : null;
    });
    this.random = random;
    this.maxVoices = maxVoices;
    this.timeoutMs = timeoutMs;
    this.audioContext = null;
    this.masterGain = null;
    this.buses = {};
    this.volume = .7;
    this.muted = false;
    this.paused = false;
    this.disposed = false;
    this.buffers = new Map();
    this.fallbacks = new Map();
    this.loads = new Map();
    this.failures = new Map();
    this.lastVariation = new Map();
    this.lastPlay = new Map();
    this.voices = new Set();
    this.catalog = null;
    this.catalogTask = null;
    this.requests = new Set();
  }

  ensureContext() {
    if (this.disposed) return null;
    if (!this.audioContext) {
      try {
        const ctx = this.contextFactory();
        if (!ctx) return null;
        this.audioContext = ctx;
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = .003;
        this.compressor.release.value = .2;
        this.masterGain.connect(this.compressor);
        this.compressor.connect(ctx.destination);
        for (const [name, gain] of Object.entries({ weapons: .55, impacts: .45, explosions: .65, ui: .7 })) {
          this.buses[name] = ctx.createGain();
          this.buses[name].gain.value = gain;
          this.buses[name].connect(this.masterGain);
        }
      } catch {
        this.audioContext?.close()?.catch(() => {});
        this.audioContext = null;
        return null;
      }
    }
    return this.audioContext;
  }

  // Called directly from a click/key gesture. Never await loading to fire a shot.
  warmup() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    this.loadCatalog();
  }

  async request(path, type) {
    if (!this.fetcher || this.disposed) throw new Error('Audio loading unavailable');
    const controller = new AbortController();
    this.requests.add(controller);
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(new URL(path, this.baseURL).href, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await (type === 'json' ? response.json() : response.arrayBuffer());
    } finally {
      clearTimeout(timer);
      this.requests.delete(controller);
    }
  }

  loadCatalog() {
    if (!this.catalogTask) this.catalogTask = this.request('catalog.json', 'json').then(catalog => {
      if (catalog.version !== 1 || !Array.isArray(catalog.files) || !catalog.files.every(file => typeof file === 'string')) throw new Error('Invalid audio catalog');
      this.catalog = new Set(catalog.files);
    }).catch(error => {
      // Without an index, try each declared sample once on demand instead.
      this.failures.set('catalog.json', error.message);
    });
    return this.catalogTask;
  }

  loadCue(id) {
    if (!this.manifest.cues[id] || this.disposed) return Promise.resolve();
    if (this.loads.has(id)) return this.loads.get(id);
    const task = (async () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      await this.loadCatalog();
      if (this.disposed) return;
      await Promise.all(this.manifest.cues[id].files.map(async file => {
        if (this.catalog && !this.catalog.has(file)) return;
        try {
          const bytes = await this.request(file, 'buffer');
          if (this.disposed) return;
          const buffer = await ctx.decodeAudioData(bytes);
          if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > this.manifest.cues[id].maxDuration) throw new Error('Invalid or overlong audio sample');
          if (!this.disposed) this.buffers.set(file, buffer);
        } catch (error) { if (!this.disposed) this.failures.set(file, error.message); }
      }));
    })();
    this.loads.set(id, task);
    return task;
  }

  async preload(ids = Object.keys(this.manifest.cues)) {
    // Four cue loads at a time, even if an entire pack is requested.
    const queue = [...ids];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (queue.length && !this.disposed) await this.loadCue(queue.shift());
    }));
    return this.getDiagnostics();
  }

  play(id, { x, gain = 1 } = {}) {
    const def = this.manifest.cues[id];
    if (!def || this.disposed || this.muted || (this.paused && def.bus !== 'ui')) return false;
    this.warmup();
    const ctx = this.audioContext;
    // Discard blocked events; never replay a backlog after browser audio unlock.
    if (!ctx || ctx.state !== 'running') return false;
    this.loadCue(id);
    const now = ctx.currentTime;
    if ((now - (this.lastPlay.get(id) ?? -Infinity)) * 1000 < def.intervalMs) return false;
    const sameCue = [...this.voices].filter(voice => voice.id === id);
    if (sameCue.length >= def.voices) this.stopVoice(sameCue[0]);
    if (this.voices.size >= this.maxVoices) {
      const victim = [...this.voices].sort((a, b) => a.priority - b.priority || a.started - b.started)[0];
      if (victim.priority > def.priority) return false;
      this.stopVoice(victim);
    }
    const available = def.files.filter(file => this.buffers.has(file));
    const pool = available.length ? available : def.files;
    const alternatives = pool.filter(file => file !== this.lastVariation.get(id));
    const choices = alternatives.length ? alternatives : pool;
    const file = choices[Math.floor(this.random() * choices.length) % choices.length];
    let buffer = this.buffers.get(file);
    if (!buffer) {
      if (!this.fallbacks.has(file)) this.fallbacks.set(file, createFallbackBuffer(ctx, def, def.files.indexOf(file)));
      buffer = this.fallbacks.get(file);
    }
    const source = ctx.createBufferSource();
    const volume = ctx.createGain();
    const pan = ctx.createStereoPanner?.();
    source.buffer = buffer;
    source.playbackRate.value = def.pitch[0] + this.random() * (def.pitch[1] - def.pitch[0]);
    const level = def.gain * clamp(gain, 0, 2);
    volume.gain.setValueAtTime(0, now);
    volume.gain.linearRampToValueAtTime(level, now + .002);
    const length = buffer.duration / source.playbackRate.value;
    volume.gain.setValueAtTime(level, now + Math.max(.002, length - .012));
    volume.gain.linearRampToValueAtTime(0, now + Math.max(.003, length));
    source.connect(volume);
    if (pan) {
      pan.pan.value = def.bus !== 'ui' && Number.isFinite(x) ? clamp((x / 1200 - .5) * 1.5, -.75, .75) : 0;
      volume.connect(pan); pan.connect(this.buses[def.bus]);
    } else volume.connect(this.buses[def.bus]);
    const voice = { id, source, volume, pan, priority: def.priority, bus: def.bus, started: now };
    source.onended = () => this.releaseVoice(voice);
    this.voices.add(voice);
    source.start(now);
    this.lastVariation.set(id, file);
    this.lastPlay.set(id, now);
    return true;
  }

  releaseVoice(voice) {
    this.voices.delete(voice);
    voice.source.onended = null;
    voice.source.disconnect(); voice.volume.disconnect(); voice.pan?.disconnect();
  }
  stopVoice(voice) {
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* Already ended. */ }
    this.releaseVoice(voice);
  }
  stopAll(worldOnly = false) {
    for (const voice of [...this.voices]) if (!worldOnly || voice.bus !== 'ui') this.stopVoice(voice);
  }
  setVolume(value) {
    this.volume = Number.isFinite(value) ? clamp(value, 0, 1) : this.volume;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
  }
  setMuted(value) {
    this.muted = Boolean(value);
    if (this.muted) this.stopAll();
    this.setVolume(this.volume);
  }
  setPaused(value) {
    this.paused = Boolean(value);
    if (this.paused) this.stopAll(true);
  }
  reset() {
    this.stopAll(); this.lastPlay.clear(); this.lastVariation.clear(); this.paused = false;
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true; this.stopAll();
    for (const controller of this.requests) controller.abort();
    this.buffers.clear(); this.fallbacks.clear(); this.loads.clear();
    for (const bus of Object.values(this.buses)) bus.disconnect();
    this.masterGain?.disconnect(); this.compressor?.disconnect();
    try { await this.audioContext?.close(); } catch { /* Closing is best effort. */ }
  }
  getDiagnostics() {
    return {
      state: this.disposed ? 'disposed' : this.audioContext?.state || 'locked',
      loadedSamples: this.buffers.size, proceduralVariations: this.fallbacks.size, activeVoices: this.voices.size,
      failures: Object.fromEntries(this.failures),
      cues: Object.fromEntries(Object.entries(this.manifest.cues).map(([id, def]) => [id, {
        loaded: def.files.filter(file => this.buffers.has(file)),
        missing: this.catalog ? def.files.filter(file => !this.catalog.has(file)) : [],
      }])),
    };
  }
  shot(shooter, hostile = false) { return this.play(weaponCue(shooter, hostile), shooter); }
  hit(entity) { return this.play(impactCue(entity), entity); }
  kill() { return this.play('ui.kill'); }
  waveStart() { return this.play('ui.wave-start'); }
  explosion(kind = 'grenade', position = {}) { return this.play(`explosion.${kind}`, position); }
  ui(event) { return this.play(`ui.${event}`); }
}
