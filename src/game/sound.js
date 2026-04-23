export class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.muted = false;
  }

  ensureContext() {
    if (!this.audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      this.audioContext = new Ctx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => { });
    }
    return this.audioContext;
  }

  warmup() {
    if (this.muted) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    amp.gain.value = 0.00001;
    osc.frequency.value = 220;
    osc.type = "sine";
    osc.connect(amp);
    amp.connect(this.masterGain || ctx.destination);
    const t = ctx.currentTime + 0.001;
    osc.start(t);
    osc.stop(t + 0.012);
  }

  setMuted(value) {
    this.muted = value;
  }

  beep({ frequency = 440, duration = 0.07, type = "square", gain = 0.06, sweepTo = null }) {
    if (this.muted) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const amp = ctx.createGain();
    const toneMix = ctx.createGain();
    osc.type = type;
    osc2.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc2.frequency.setValueAtTime(frequency * 1.012, ctx.currentTime);
    if (typeof sweepTo === "number") {
      osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
      osc2.frequency.exponentialRampToValueAtTime(sweepTo * 1.01, ctx.currentTime + duration);
    }

    toneMix.gain.setValueAtTime(0.5, ctx.currentTime);
    amp.gain.setValueAtTime(0.0001, ctx.currentTime);
    amp.gain.linearRampToValueAtTime(Math.min(0.24, gain * 2.2), ctx.currentTime + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(toneMix);
    osc2.connect(toneMix);
    toneMix.connect(amp);
    amp.connect(this.masterGain || ctx.destination);
    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + duration + 0.02);
    osc2.stop(ctx.currentTime + duration + 0.02);
  }

  getNoiseBuffer(ctx) {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.28));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  playGunshot(profile) {
    if (this.muted) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }
    const out = this.masterGain || ctx.destination;
    const t = ctx.currentTime;

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "square";
    click.frequency.setValueAtTime(profile.clickFreq ?? 1800, t);
    clickGain.gain.setValueAtTime(0.0001, t);
    clickGain.gain.exponentialRampToValueAtTime(Math.max(0.001, profile.clickGain ?? 0.01), t + 0.0012);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + (profile.clickDuration ?? 0.009));
    click.connect(clickGain);
    clickGain.connect(out);
    click.start(t);
    click.stop(t + (profile.clickDuration ?? 0.009) + 0.004);

    const crack = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crack.type = profile.crackType ?? "square";
    crack.frequency.setValueAtTime(profile.crackFreq, t);
    crack.frequency.exponentialRampToValueAtTime(Math.max(40, profile.crackSweep), t + profile.crackDuration);
    crackGain.gain.setValueAtTime(0.0001, t);
    crackGain.gain.linearRampToValueAtTime(Math.max(0.001, profile.crackGain), t + 0.0025);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, t + profile.crackDuration);
    crack.connect(crackGain);
    crackGain.connect(out);
    crack.start(t);
    crack.stop(t + profile.crackDuration + 0.008);

    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = profile.bodyType ?? "triangle";
    body.frequency.setValueAtTime(profile.bodyFreq, t);
    body.frequency.exponentialRampToValueAtTime(Math.max(28, profile.bodySweep), t + profile.bodyDuration);
    bodyGain.gain.setValueAtTime(0.0001, t);
    bodyGain.gain.linearRampToValueAtTime(Math.max(0.001, profile.bodyGain), t + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + profile.bodyDuration);
    body.connect(bodyGain);
    bodyGain.connect(out);
    body.start(t);
    body.stop(t + profile.bodyDuration + 0.01);

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(profile.noiseFreq ?? 1450, t);
    noiseFilter.Q.setValueAtTime(profile.noiseQ ?? 0.9, t);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(Math.max(0.001, profile.noiseGain ?? 0.02), t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + (profile.noiseDuration ?? 0.05));
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(t);
    noise.stop(t + (profile.noiseDuration ?? 0.05) + 0.01);
  }

  getShotProfile(shooter) {
    if (!shooter || typeof shooter !== "object") {
      return null;
    }

    const isCommando = Boolean(shooter.specialUpgrades?.commando);
    const isFiftyCal = Boolean(shooter.specialUpgrades?.fiftycal);
    const isMinigun = Boolean(shooter.specialUpgrades?.minigun);

    if (shooter.type === "rifleman") {
      return isCommando
        ? {
            clickFreq: 2100,
            clickGain: 0.015,
            crackFreq: 980,
            crackSweep: 420,
            crackDuration: 0.038,
            crackGain: 0.03,
            bodyFreq: 230,
            bodySweep: 105,
            bodyDuration: 0.06,
            bodyGain: 0.026,
            noiseFreq: 1700,
            noiseGain: 0.024,
            noiseDuration: 0.038,
          }
        : {
            clickFreq: 1850,
            clickGain: 0.014,
            crackFreq: 820,
            crackSweep: 350,
            crackDuration: 0.045,
            crackGain: 0.028,
            bodyFreq: 205,
            bodySweep: 96,
            bodyDuration: 0.067,
            bodyGain: 0.025,
            noiseFreq: 1450,
            noiseGain: 0.022,
            noiseDuration: 0.042,
          };
    }

    if (shooter.type === "sniper") {
      return isFiftyCal
        ? {
            clickFreq: 2400,
            clickGain: 0.017,
            crackFreq: 1350,
            crackSweep: 430,
            crackDuration: 0.07,
            crackGain: 0.035,
            bodyFreq: 145,
            bodySweep: 58,
            bodyDuration: 0.17,
            bodyGain: 0.038,
            noiseFreq: 900,
            noiseGain: 0.03,
            noiseDuration: 0.11,
          }
        : {
            clickFreq: 2150,
            clickGain: 0.016,
            crackFreq: 1090,
            crackSweep: 390,
            crackDuration: 0.058,
            crackGain: 0.032,
            bodyFreq: 175,
            bodySweep: 72,
            bodyDuration: 0.14,
            bodyGain: 0.032,
            noiseFreq: 1040,
            noiseGain: 0.026,
            noiseDuration: 0.09,
          };
    }

    if (shooter.type === "grenadier") {
      return {
        clickFreq: 1100,
        clickGain: 0.012,
        crackFreq: 420,
        crackSweep: 180,
        crackDuration: 0.09,
        crackGain: 0.026,
        bodyFreq: 125,
        bodySweep: 52,
        bodyDuration: 0.18,
        bodyGain: 0.035,
        noiseFreq: 820,
        noiseGain: 0.022,
        noiseDuration: 0.12,
      };
    }

    if (shooter.type === "machinegun") {
      return isMinigun
        ? {
            clickFreq: 2050,
            clickGain: 0.011,
            crackFreq: 950,
            crackSweep: 520,
            crackDuration: 0.026,
            crackGain: 0.021,
            bodyFreq: 210,
            bodySweep: 120,
            bodyDuration: 0.035,
            bodyGain: 0.018,
            noiseFreq: 1850,
            noiseGain: 0.018,
            noiseDuration: 0.026,
          }
        : {
            clickFreq: 1800,
            clickGain: 0.01,
            crackFreq: 790,
            crackSweep: 430,
            crackDuration: 0.032,
            crackGain: 0.022,
            bodyFreq: 195,
            bodySweep: 108,
            bodyDuration: 0.042,
            bodyGain: 0.018,
            noiseFreq: 1600,
            noiseGain: 0.017,
            noiseDuration: 0.03,
          };
    }

    return null;
  }

  shot(shooterOrMachinegun = false) {
    const profile = this.getShotProfile(shooterOrMachinegun);
    if (profile) {
      this.playGunshot(profile);
      return;
    }

    const machinegun = Boolean(shooterOrMachinegun);
    this.beep({
      frequency: machinegun ? 360 : 280,
      sweepTo: machinegun ? 170 : 140,
      duration: machinegun ? 0.045 : 0.06,
      gain: machinegun ? 0.045 : 0.05,
      type: "square",
    });
  }

  hit() {
    this.beep({
      frequency: 210,
      sweepTo: 110,
      duration: 0.05,
      gain: 0.045,
      type: "triangle",
    });
  }

  kill() {
    this.beep({
      frequency: 520,
      sweepTo: 260,
      duration: 0.12,
      gain: 0.05,
      type: "sine",
    });
  }

  waveStart() {
    this.beep({
      frequency: 340,
      sweepTo: 520,
      duration: 0.12,
      gain: 0.05,
      type: "triangle",
    });
  }

  explosion() {
    this.beep({
      frequency: 180,
      sweepTo: 70,
      duration: 0.13,
      gain: 0.06,
      type: "sawtooth",
    });
  }
}


