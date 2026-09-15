import { WAVE_CONFIG } from './config.js';
import { ENEMY_TYPES } from './constants.js';

// Renderer-independent wave rules also drive the next-wave briefing.
export function getWavePlan(wave) {
  const count = 7 + wave * 2;
  const interval = Math.max(.48, 1.05 - wave * .018);
  const enemies = [];
  for (let i = 0; i < count; i++) {
    let type = 'infantry';
    if (wave >= 2 && i % 5 === 3) type = 'heavy';
    if (wave >= 4 && i % 8 === 5) type = 'juggernaut';
    if (wave >= 8 && i === count - 1) type = 'tank';
    if (wave > 8 && i % Math.max(5, 15 - Math.floor(wave / 2)) === 2) type = 'tank';
    if (wave >= 14 && (i === count - 2 || (wave >= 19 && i % 12 === 8))) type = 'helicopter';
    const profile = ENEMY_TYPES[type];
    const burstPosition = i % 9;
    const spawnDelay = wave >= 4 && burstPosition >= 1 && burstPosition <= 3 ? Math.max(.22, interval * .45) : interval;
    enemies.push({ ...profile, type, health: (12 + wave * 4.5) * profile.healthFactor, speed: (23 + wave * 1.4) * profile.speedFactor,
      reward: Math.max(1, Math.floor((8 + Math.floor(wave * 1.4)) * profile.healthFactor * .75)), spawnDelay });
  }
  return { wave, enemies, count, interval, bonus: 30 + wave * 3 };
}
export class WaveManager {
  constructor(game) {
    this.game = game;
    this.wave = 0;
    this.active = false;
    this.finalWave = WAVE_CONFIG.finalWave;
    this.queue = [];
    this.timer = 0;
  }
  startWave() {
    if (this.active || this.game.gameOver || this.game.paused || this.wave >= this.finalWave) return false;
    this.plan = getWavePlan(++this.wave);
    this.queue = [...this.plan.enemies];
    this.active = true;
    this.timer = 0.35;
    this.game.onWaveStart(this.plan);
    return true;
  }
  update(delta) {
    if (!this.active || this.game.gameOver) return;
    this.timer -= delta;
    if (this.queue.length && this.timer <= 0) {
      const next = this.queue[0];
      const hiddenGround = this.game.enemies.filter(enemy => !enemy.airborne && (enemy.pending || enemy.x < 0)).length;
      if (next.airborne || hiddenGround < 3) {
        this.queue.shift();
        this.game.spawnEnemy(next);
        this.timer += next.spawnDelay || this.plan.interval;
      }
    }
    if (!this.queue.length && !this.game.enemies.length) {
      this.active = false;
      this.game.awardWaveBonus ? this.game.awardWaveBonus(this.plan.bonus) : this.game.addMoney(this.plan.bonus);
      if (this.wave === this.finalWave) this.game.finish(true);
      else this.game.onWaveComplete(this.plan);
    }
  }
}
