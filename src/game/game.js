import { GAME_CONFIG } from './config.js';
import { SOLDIER_TYPES, UTILITIES } from './constants.js';
import { WaveManager, getWavePlan } from './wave-manager.js';
import { createArt } from './art.js';
import { createUnit, createEnemy, destroyEntity } from './models.js';
import { CombatEffects } from './effects.js';
import { SoundManager } from './sound.js';
import { distance, clamp, lerpAngle, placementError, sellValue } from './utils.js';
import { ROAD, roadPolyline } from './road.js';
import { GroundTraffic } from './traffic.js';

const $ = id => document.getElementById(id);
const Phaser = window.Phaser;
const TANK_TURRET_TURN_SPEED = 4.5;
const TANK_FIRE_TOLERANCE = .12;
const ENEMY_BODY_TURN_SPEED = 9;
const ENEMY_FIRE_TOLERANCE = .16;
const SENTRY_HEAT_PER_SHOT = .075;
const SENTRY_COOL_RATE = .35;

function selectEnemyTarget(enemy, units) {
  const candidates = units.filter(unit => unit.alive && distance(enemy, unit) < enemy.attackRange);
  if (!candidates.length) return null;
  if (enemy.type === 'helicopter') {
    const antiAir = candidates.filter(unit => unit.type === 'aa');
    if (antiAir.length) return antiAir.reduce((best, unit) => distance(enemy, unit) < distance(enemy, best) ? unit : best);
  }
  if (enemy.type === 'heavy') {
    return candidates.reduce((best, unit) => {
      const healthRatio = unit.health / unit.maxHealth, bestRatio = best.health / best.maxHealth;
      return healthRatio < bestRatio - .05 || Math.abs(healthRatio - bestRatio) <= .05 && distance(enemy, unit) < distance(enemy, best) ? unit : best;
    });
  }
  return candidates.reduce((best, unit) => distance(enemy, unit) < distance(enemy, best) ? unit : best);
}

function defenderDamageMultiplier(enemy, source) {
  if (!source) return 1;
  if (enemy.type === 'tank') {
    if (source.type === 'machinegun') return .3;
    if (source.type === 'rifleman') return .4;
    if (source.type === 'sniper') return source.specialUpgrades?.fiftycal ? 1 : .65;
  }
  if (enemy.type === 'juggernaut' && Number.isFinite(enemy.heading)) {
    const incomingAngle = Math.atan2(source.y - enemy.y, source.x - enemy.x);
    const angle = Math.abs(Math.atan2(Math.sin(incomingAngle - enemy.heading), Math.cos(incomingAngle - enemy.heading)));
    if (angle < Math.PI / 3) return .5;
  }
  return 1;
}

export class Battlefield extends (Phaser?.Scene || class {}) {
  constructor() { super('Battlefield'); }
  create() {
    this.money = GAME_CONFIG.startingMoney;
    this.health = GAME_CONFIG.startingHealth;
    this.units = []; this.enemies = []; this.mines = []; this.projectiles = []; this.strikes = [];
    this.paused = false; this.gameOver = false; this.speed = 1; this.kills = 0; this.elapsed = 0; this.spawnIndex = 0;
    this.selectedType = null; this.selectedUnit = null; this.gridVisible = false; this.hudTimer = 0;
    this.pointerOverHUD = false; this.hintExpires = 0;
    this.sfx = this.game.registry.get('sfx');
    this.sfx.reset();
    createArt(this);
    this.add.image(600, 350, 'terrain');
    this.grid = this.add.graphics().setDepth(1).setVisible(false);
    this.grid.lineStyle(1, 0xe4e7c0, .16);
    for (let x = 100; x < 1040; x += 40) this.grid.lineBetween(x, 128, x, 582);
    for (let y = 142; y < 583; y += 40) this.grid.lineBetween(95, y, 1005, y);
    this.rangeGraphics = this.add.graphics().setDepth(3);
    this.roadGuide = this.add.graphics().setDepth(2).setVisible(false);
    this.roadGuide.lineStyle(2, 0xe5d39d, .5);
    for (const offset of [-ROAD.halfWidth, ROAD.halfWidth]) {
      const edge = roadPolyline(offset);
      for (let i = 1; i < edge.length; i++) this.roadGuide.lineBetween(edge[i - 1].x, edge[i - 1].y, edge[i].x, edge[i].y);
    }
    this.healthGraphics = this.add.graphics().setDepth(55);
    this.projectileGraphics = this.add.graphics().setDepth(48);
    this.ghost = this.add.image(0, 0, 'rifleman').setScale(.78).setRotation(Math.PI).setAlpha(.65).setDepth(45).setVisible(false);
    this.effects = new CombatEffects(this);
    this.waveManager = new WaveManager(this);
    this.traffic = new GroundTraffic();
    this.dust = Array.from({ length: 16 }, () => this.add.image(Math.random() * 1200, Math.random() * 700, 'smoke').setScale(1.8 + Math.random() * 2).setAlpha(.07).setDepth(43));
    for (const unit of GAME_CONFIG.starterDefenders) this.units.push(createUnit(this, unit.type, unit.x, unit.y, true));
    this.bindUI();
    this.input.on('pointerdown', pointer => {
      this.pointerOverHUD = Boolean(pointer.event?.target?.closest?.('[data-hud-blocker], dialog'));
      if (this.pointerOverHUD) return;
      this.sfx.warmup();
      if (pointer.rightButtonDown()) this.clearSelection();
      else this.handleFieldClick(pointer.worldX, pointer.worldY);
    });
    this.input.mouse?.disableContextMenu();
    this.input.keyboard.on('keydown', event => {
      if (event.repeat || document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
      this.sfx.warmup();
      const keys = [...Object.keys(SOLDIER_TYPES), 'mine', 'airstrike'];
      if (/^[1-7]$/.test(event.key)) this.choose(keys[Number(event.key) - 1]);
      if (event.code === 'Escape') this.clearSelection();
      if (event.code === 'KeyM') this.toggleMute();
      if (event.code === 'Space') { event.preventDefault(); this.waveManager.active || this.paused ? this.togglePause() : this.waveManager.startWave(); }
    });
    this.events.once('shutdown', () => { this.uiEvents.abort(); this.sfx.stopAll(); });
    $('loading').classList.add('hidden');
    $('pauseOverlay').classList.add('hidden');
    $('phaseBanner').classList.remove('active');
    $('phaseText').textContent = 'PREPARATION PHASE';
    this.hint('Your garrison is ready. Add defenders, then start the first wave.');
    this.updateHUD(); this.updateIntel();
    window.mercenaryGame = this;
    if (this.sfx.restartPending) { this.sfx.restartPending = false; this.sfx.ui('restart'); }
  }
  bindUI() {
    this.uiEvents = new AbortController();
    document.addEventListener('pointerdown', event => {
      this.pointerOverHUD = Boolean(event.target.closest('[data-hud-blocker], dialog'));
      this.sfx.warmup();
    }, { capture: true, signal: this.uiEvents.signal });
    const on = (id, action) => $(id).addEventListener('click', () => { this.sfx.warmup(); action(); }, { signal: this.uiEvents.signal });
    $('shop').innerHTML = Object.entries(SOLDIER_TYPES).map(([type, def], index) => `<button class="deploy-button unit-button" data-type="${type}" aria-label="Deploy ${def.label}, $${def.cost}" aria-pressed="false" title="${def.label} · ${def.role} (${index + 1})"><kbd>${index + 1}</kbd><img src="${this.textures.get(type).getSourceImage().toDataURL()}" alt="" /><span class="unit-name">${def.label}</span><span class="unit-price">$${def.cost}</span></button>`).join('');
    // HUD panels receive their own clicks; their empty surroundings pass through.
    document.addEventListener('pointermove', event => {
      this.pointerOverHUD = Boolean(event.target.closest('[data-hud-blocker], dialog'));
    }, { signal: this.uiEvents.signal });
    document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => this.choose(button.dataset.type), { signal: this.uiEvents.signal }));
    $('waveDots').innerHTML = '<i></i>'.repeat(25);
    on('startWaveBtn', () => this.waveManager.startWave());
    on('pauseBtn', () => this.togglePause()); on('resumeBtn', () => this.togglePause());
    on('speedBtn', () => { this.speed = this.speed === 1 ? 2 : 1; this.sfx.ui('speed'); this.updateHUD(); });
    on('muteBtn', () => this.toggleMute());
    on('gridBtn', () => { this.gridVisible = !this.gridVisible; this.grid.setVisible(this.gridVisible); this.sfx.ui('grid'); $('gridBtn').setAttribute('aria-pressed', this.gridVisible); });
    on('mineBtn', () => this.choose('mine')); on('airstrikeBtn', () => this.choose('airstrike'));
    on('upgradeBtn', () => this.upgradeSelected()); on('sellBtn', () => this.sellSelected()); on('closeSelectionBtn', () => this.clearSelection());
    on('helpBtn', () => { this.resumeAfterHelp = !this.paused && !this.gameOver; if (this.resumeAfterHelp) this.togglePause(false); this.sfx.ui('help-open'); $('helpDialog').showModal(); });
    on('closeHelpBtn', () => $('helpDialog').close()); on('helpDoneBtn', () => $('helpDialog').close());
    $('helpDialog').addEventListener('close', () => { if (this.resumeAfterHelp && this.paused) this.togglePause(false); this.resumeAfterHelp = false; this.sfx.ui('help-close'); }, { signal: this.uiEvents.signal });
    $('endDialog').addEventListener('cancel', event => event.preventDefault(), { signal: this.uiEvents.signal });
    on('restartBtn', () => { $('endDialog').close(); this.sfx.restartPending = true; this.scene.restart(); });
    $('gridBtn').setAttribute('aria-pressed', 'false');
  }
  toggleMute() {
    this.sfx.setMuted(!this.sfx.muted);
    if (!this.sfx.muted) this.sfx.ui('audio-on');
    this.updateHUD();
  }
  togglePause(feedback = true) {
    if (this.gameOver) return;
    this.paused = !this.paused;
    this.sfx.setPaused(this.paused);
    if (feedback) this.sfx.ui(this.paused ? 'pause' : 'resume');
    $('pauseOverlay').classList.toggle('hidden', !this.paused);
    this.updateHUD();
  }
  hint(text) {
    $('hint').textContent = text;
    this.hintExpires = Date.now() + 5500;
    $('statusStrip').classList.add('hint-visible');
  }
  clearSelection(feedback = true) {
    if (feedback && (this.selectedType || this.selectedUnit)) this.sfx.ui('cancel');
    this.selectedType = null; this.selectedUnit = null; this.ghost.setVisible(false); this.rangeGraphics.clear();
    // A cancelled placement should not leave an instruction to deploy on screen.
    this.hint(this.waveManager.active ? 'Hold the eastern outpost. Select a defender to inspect it.' : 'Deploy your squad, then start the next wave.');
    this.updateHUD(); this.renderSelection();
  }
  choose(type) {
    if (this.paused || this.gameOver) return;
    const def = SOLDIER_TYPES[type] || UTILITIES[type];
    if (!def || this.money < def.cost) { this.sfx.ui('denied'); this.hint('Insufficient funds. Eliminate hostiles to earn more.'); return; }
    if (SOLDIER_TYPES[type] && this.units.length >= GAME_CONFIG.maxDefenders) { this.sfx.ui('denied'); this.hint('Squad at capacity. Sell a defender to free a position.'); return; }
    if (this.selectedType === type) { this.clearSelection(); return; }
    this.selectedType = type; this.selectedUnit = null;
    this.sfx.ui('select');
    this.previewMessage = null;
    this.hint(type === 'airstrike' ? 'Click a target area. Air strike impacts after 1 second.' : type === 'mine' ? 'Landmines must be planted on the road. Esc to cancel.' : `Deploy ${def.label} · $${def.cost} off the road. Esc to cancel.`);
    this.updateHUD(); this.renderSelection();
  }
  handleFieldClick(x, y) {
    if (this.paused || this.gameOver || this.pointerOverHUD || document.querySelector('dialog[open]')) return;
    const point = { x, y }, type = this.selectedType;
    if (!type) {
      const previous = this.selectedUnit;
      this.selectedUnit = this.units.find(unit => distance(unit, point) < 27) || null;
      if (this.selectedUnit !== previous) {
        if (this.selectedUnit) this.sfx.ui('select');
        else if (previous) this.sfx.ui('cancel');
      }
      this.renderSelection(); return;
    }
    const def = SOLDIER_TYPES[type] || UTILITIES[type];
    if (this.money < def.cost) { this.sfx.ui('denied'); this.hint('Insufficient funds.'); return; }
    const error = placementError(point, this.units, this.mines, type);
    if (error) { this.sfx.ui('denied'); this.hint(error); return; }
    if (type === 'airstrike') {
      this.money -= def.cost;
      const marker = this.add.circle(x, y, def.radius, 0xdab577, .13).setStrokeStyle(2, 0xffd391, .8).setDepth(4);
      const label = this.add.text(x, y, 'STRIKE INBOUND', { fontFamily: 'monospace', fontSize: '11px', color: '#fff0c5', backgroundColor: '#66452da0', padding: { x: 8, y: 5 } }).setOrigin(.5).setDepth(60);
      this.strikes.push({ x, y, time: 1, marker, label });
      this.sfx.ui('airstrike-call');
      this.hint('Air support inbound. Stand by for impact.');
    } else {
      if (type !== 'mine' && this.units.length >= GAME_CONFIG.maxDefenders) { this.sfx.ui('denied'); this.hint('Squad at capacity.'); return; }
      this.money -= def.cost;
      if (type === 'mine') this.mines.push({ x, y, sprite: this.add.image(x, y, 'mine').setScale(.8).setDepth(3) });
      else this.units.push(createUnit(this, type, x, y));
      this.sfx.ui(type === 'mine' ? 'mine-arm' : 'deploy');
      this.effects.popup(x, y, `−$${def.cost}`, '#e4d3a6');
      this.hint(type === 'mine' ? 'Landmine armed. Ground contact triggers the blast.' : `${def.label} deployed. Select it to inspect, upgrade, or sell.`);
    }
    this.selectedType = null; this.ghost.setVisible(false); this.updateHUD();
  }
  upgradeSelected() {
    const unit = this.selectedUnit;
    if (!unit || !unit.alive || this.paused || this.gameOver) return;
    const upgrade = SOLDIER_TYPES[unit.type].upgrades[unit.level];
    if (!upgrade || this.money < upgrade.cost) { this.sfx.ui('denied'); return; }
    this.money -= upgrade.cost; unit.invested += upgrade.cost;
    unit.damage *= upgrade.damage; unit.fireRate *= upgrade.fireRate; unit.range *= upgrade.range;
    unit.level++; unit.specialUpgrades[upgrade.id] = true; unit.name = upgrade.label;
    unit.maxHealth = Math.ceil(unit.maxHealth * 1.2); unit.health = unit.maxHealth; unit.heat = 0; unit.overheated = false;
    unit.sprite.setTint(upgrade.id === 'laser' ? 0xffb2a4 : 0xf3e5b9);
    this.sfx.ui('upgrade');
    this.effects.popup(unit.x, unit.y, 'UPGRADED', '#d3e8ad');
    this.hint(`${unit.name} ready. Firepower increased and health restored.`);
    this.updateHUD(); this.renderSelection();
  }
  sellSelected() {
    const unit = this.selectedUnit;
    if (!unit || this.paused || this.gameOver) return;
    const value = sellValue(unit); this.addMoney(value); this.removeUnit(unit);
    this.sfx.ui('sell');
    this.hint(`Unit withdrawn. $${value} recovered.`); this.updateHUD();
  }
  renderSelection() {
    const unit = this.selectedUnit;
    $('selectionPanel').classList.toggle('hidden', !unit);
    $('gameShell').classList.toggle('has-selection', Boolean(unit));
    if (!unit) return;
    if ($('selectedPortrait').dataset.type !== unit.type) {
      $('selectedPortrait').src = this.textures.get(unit.type).getSourceImage().toDataURL();
      $('selectedPortrait').dataset.type = unit.type;
    }
    $('selectedName').textContent = unit.name;
    $('selectedHP').textContent = `${Math.ceil(unit.health)} / ${unit.maxHealth}`;
    $('selectedDamage').textContent = Math.round(unit.damage);
    $('selectedKills').textContent = unit.kills;
    const upgrade = SOLDIER_TYPES[unit.type].upgrades[unit.level];
    $('upgradeBtn').textContent = upgrade ? `${upgrade.label} · $${upgrade.cost}` : 'Fully upgraded';
    $('upgradeBtn').disabled = !upgrade || this.money < upgrade.cost || this.paused || this.gameOver;
    $('sellBtn').textContent = `Sell · $${sellValue(unit)}`;
    $('sellBtn').disabled = this.paused || this.gameOver;
  }
  updateIntel() {
    const next = Math.min(25, this.waveManager.wave + 1);
    const plan = getWavePlan(next);
    $('intelTypes').textContent = [...new Set(plan.enemies.map(enemy => enemy.type))].map(type => type.toUpperCase()).join(' / ');
    $('intelDescription').textContent = next === 14 ? 'Air contact detected. Deploy an AA gun before launching wave 14.' : `${plan.count} hostiles approaching. ${next >= 8 ? 'Armor inbound. Use explosives or precision fire.' : next >= 4 ? 'Heavy resistance. Prepare crossfire and area defenses.' : 'Deploy your squad and prepare the outpost.'}`;
  }
  updateHUD() {
    const wave = this.waveManager;
    const shell = $('gameShell');
    shell.classList.toggle('is-active', wave.active);
    shell.classList.toggle('is-placing', Boolean(this.selectedType));
    shell.classList.toggle('is-paused', this.paused);
    shell.classList.toggle('is-ended', this.gameOver);
    $('briefing').hidden = wave.active || Boolean(this.selectedType) || Boolean(this.selectedUnit) || this.gameOver;
    $('statusStrip').classList.toggle('hint-visible', Date.now() < this.hintExpires);
    $('money').textContent = this.money.toLocaleString('en-US'); $('health').textContent = this.health;
    $('healthFill').style.width = `${this.health / GAME_CONFIG.startingHealth * 100}%`;
    $('healthFill').style.background = this.health <= 5 ? '#cd8770' : '#adc38a';
    $('healthMeter').setAttribute('aria-valuenow', this.health);
    $('baseStatus').textContent = this.health > 14 ? 'All systems operational' : this.health > 5 ? 'Perimeter compromised' : 'Critical damage. Hold the line.';
    $('wave').textContent = String(wave.wave).padStart(2, '0');
    $('unitCount').textContent = `${this.units.length} / ${GAME_CONFIG.maxDefenders}`;
    $('waveStatus').textContent = wave.active ? `${wave.queue.length} reinforcements incoming` : 'Awaiting your command';
    $('enemyCount').textContent = `${this.enemies.length} HOSTILES`;
    $('waveDots').querySelectorAll('i').forEach((dot, i) => { dot.className = i < wave.wave - (wave.active ? 1 : 0) ? 'done' : i === wave.wave - 1 && wave.active ? 'current' : ''; });
    $('startWaveBtn').disabled = wave.active || this.paused || this.gameOver;
    $('startWaveBtn').firstElementChild.textContent = wave.active ? 'Wave active' : `Start wave ${String(Math.min(25, wave.wave + 1)).padStart(2, '0')}`;
    const pauseLabel = this.paused ? '▶ <span>Resume</span>' : 'Ⅱ <span>Pause</span>';
    if ($('pauseBtn').innerHTML !== pauseLabel) $('pauseBtn').innerHTML = pauseLabel;
    $('pauseBtn').setAttribute('aria-label', this.paused ? 'Resume game' : 'Pause game');
    $('pauseBtn').disabled = this.gameOver; $('speedBtn').disabled = this.gameOver;
    const speedLabel = `${this.speed}× <span>Speed</span>`;
    if ($('speedBtn').innerHTML !== speedLabel) $('speedBtn').innerHTML = speedLabel;
    $('speedBtn').setAttribute('aria-label', `Game speed: ${this.speed}×`);
    $('muteBtn').textContent = this.sfx.muted ? '×♪' : '♪';
    $('muteBtn').setAttribute('aria-label', this.sfx.muted ? 'Unmute audio' : 'Mute audio');
    $('muteBtn').setAttribute('aria-pressed', String(this.sfx.muted));
    document.querySelectorAll('[data-type], [data-utility]').forEach(button => {
      const type = button.dataset.type || button.dataset.utility;
      button.classList.toggle('selected', type === this.selectedType);
      button.setAttribute('aria-pressed', type === this.selectedType);
      const unaffordable = this.money < (SOLDIER_TYPES[type] || UTILITIES[type]).cost;
      button.classList.toggle('unaffordable', unaffordable);
      button.disabled = this.paused || this.gameOver || unaffordable || (Boolean(SOLDIER_TYPES[type]) && this.units.length >= GAME_CONFIG.maxDefenders);
    });
    this.renderSelection();
  }
  onWaveStart(plan) {
    this.clearSelection(false); this.sfx.waveStart();
    $('phaseBanner').classList.add('active'); $('phaseText').textContent = `WAVE ${String(plan.wave).padStart(2, '0')} / ENGAGED`;
    this.hint(`Wave ${plan.wave}: ${plan.count} hostiles inbound. Keep the eastern outpost secure.`);
    this.updateHUD();
  }
  onWaveComplete(plan) {
    this.sfx.ui('wave-clear');
    $('phaseBanner').classList.remove('active'); $('phaseText').textContent = 'PREPARATION PHASE';
    this.hint(`Wave ${plan.wave} cleared. +$${plan.bonus} supply bonus. Reinforce and prepare for the next wave.`);
    // Between waves the outpost can patch up the surviving garrison.
    this.units.forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + unit.maxHealth * .1); });
    this.updateHUD(); this.updateIntel();
  }
  addMoney(amount) { this.money += amount; }
  spawnEnemy(stats) { this.enemies.push(createEnemy(this, stats, this.spawnIndex++)); }
  removeUnit(unit) {
    destroyEntity(unit); this.units = this.units.filter(other => other !== unit);
    if (this.selectedUnit === unit) { this.selectedUnit = null; this.renderSelection(); }
  }
  damageEnemy(enemy, amount, source) {
    if (!enemy.alive) return;
    enemy.health -= amount * defenderDamageMultiplier(enemy, source); enemy.hitTime = .12;
    this.effects.hit(enemy.x, enemy.y);
    if (enemy.health <= 0) {
      this.sfx.kill();
      this.kills++; if (source?.alive) source.kills++;
      this.addMoney(enemy.reward); this.effects.popup(enemy.x, enemy.y, `+$${enemy.reward}`);
      if (enemy.type === 'tank' || enemy.airborne) { this.effects.explosion(enemy.x, enemy.y, 45); this.sfx.explosion('vehicle', enemy); }
      destroyEntity(enemy); this.enemies = this.enemies.filter(other => other !== enemy);
    }
  }
  damageUnit(unit, amount, source) {
    if (!unit.alive) return;
    if (source?.suppression) {
      if (unit.suppression <= 0) this.effects.popup(unit.x, unit.y - 18, 'SUPPRESSED', '#e4b37d');
      unit.suppression = Math.max(unit.suppression, source.suppression);
    }
    unit.health -= amount; unit.hitTime = .1;
    if (unit.health <= 0) { this.effects.explosion(unit.x, unit.y, 24); this.sfx.explosion('defender', unit); this.removeUnit(unit); this.hint('A defender has fallen. Reinforce the line.'); }
  }
  fire(source, target, hostile = false) {
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const muzzleAngle = hostile && source.type === 'tank' && Number.isFinite(source.turretRotation)
      ? source.turretRotation
      : hostile && !source.airborne && Number.isFinite(source.sprite?.rotation) ? source.sprite.rotation : angle;
    const muzzleDistance = source.muzzleDistance || 25;
    const muzzle = { x: source.x + Math.cos(muzzleAngle) * muzzleDistance, y: source.y + Math.sin(muzzleAngle) * muzzleDistance };
    const splash = hostile ? (source.type === 'tank' ? 45 : 0) : source.splash;
    const damage = hostile ? source.attackDamage : source.damage;
    this.projectiles.push({ ...muzzle, target, source, hostile, damage, splash, speed: splash ? 310 : 680, life: 2, angle, color: hostile ? 0xf8a083 : source.specialUpgrades?.laser ? 0xff8b88 : source.type === 'sniper' || source.type === 'aa' ? 0xc3f0ec : 0xffe2a0 });
    this.effects.flash(muzzle.x, muzzle.y);
    this.sfx.shot(source, hostile);
  }
  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (!p.target.alive) { p.life = 0; continue; }
      p.angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      const travel = p.speed * dt;
      if (distance(p, p.target) <= travel + 9) {
        if (p.splash) {
          this.effects.explosion(p.target.x, p.target.y, p.splash); this.sfx.explosion(p.hostile ? 'tank-shell' : 'grenade', p.target);
          for (const entity of [...(p.hostile ? this.units : this.enemies)]) {
            if (distance(entity, p.target) < p.splash && (p.hostile || !entity.airborne)) p.hostile ? this.damageUnit(entity, p.damage, p.source) : this.damageEnemy(entity, p.damage, p.source);
          }
        } else {
          this.sfx.hit(p.target);
          p.hostile ? this.damageUnit(p.target, p.damage, p.source) : this.damageEnemy(p.target, p.damage, p.source);
        }
        p.life = 0;
      } else { p.x += Math.cos(p.angle) * travel; p.y += Math.sin(p.angle) * travel; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
  }
  updateSupport(dt) {
    this.mines = this.mines.filter(mine => {
      if (!this.enemies.some(enemy => !enemy.airborne && !enemy.pending && distance(enemy, mine) < UTILITIES.mine.triggerRadius)) return true;
      this.effects.explosion(mine.x, mine.y, UTILITIES.mine.radius); this.sfx.explosion('mine', mine);
      for (const enemy of [...this.enemies]) if (!enemy.airborne && distance(enemy, mine) < UTILITIES.mine.radius) this.damageEnemy(enemy, UTILITIES.mine.damage);
      mine.sprite.destroy(); return false;
    });
    this.strikes = this.strikes.filter(strike => {
      strike.time -= dt; strike.marker.setAlpha(.6 + Math.sin(strike.time * 18) * .3);
      if (strike.time > 0) return true;
      strike.marker.destroy(); strike.label.destroy();
      for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3; this.effects.explosion(strike.x + Math.cos(angle) * 60, strike.y + Math.sin(angle) * 60, 64); }
      for (const enemy of [...this.enemies]) if (distance(enemy, strike) <= UTILITIES.airstrike.radius) this.damageEnemy(enemy, UTILITIES.airstrike.damage);
      this.sfx.explosion('airstrike', strike); this.hint('Air strike complete. Target area cleared.'); return false;
    });
  }
  update(time, delta) {
    const dt = Math.min(delta / 1000, .05) * this.speed;
    if (!this.paused && !this.gameOver) {
      this.elapsed += dt;
      this.waveManager.update(dt);
      this.traffic.update(this.enemies, dt);
      for (const unit of this.units) {
        unit.suppression = Math.max(0, unit.suppression - dt);
        if (unit.type === 'machinegun') {
          unit.heat = Math.max(0, unit.heat - dt * SENTRY_COOL_RATE);
          if (unit.overheated && unit.heat <= .35) unit.overheated = false;
        }
        unit.cooldown -= dt * (unit.suppression > 0 ? .55 : 1);
        const candidates = this.enemies.filter(enemy => enemy.alive && !enemy.pending && Boolean(SOLDIER_TYPES[unit.type].airTargets) === Boolean(enemy.airborne) && distance(unit, enemy) <= unit.range);
        const target = candidates.reduce((best, enemy) => !best || (enemy.airborne ? enemy.x > best.x : enemy.roadDistance > best.roadDistance) ? enemy : best, null);
        if (target) {
          unit.sprite.rotation = lerpAngle(unit.sprite.rotation, Math.atan2(target.y - unit.y, target.x - unit.x), Math.min(1, dt * 14));
          if (unit.cooldown <= 0 && !unit.overheated) {
            this.fire(unit, target); unit.cooldown = 1 / unit.fireRate;
            if (unit.type === 'machinegun') {
              unit.heat = Math.min(1, unit.heat + SENTRY_HEAT_PER_SHOT);
              if (unit.heat >= 1) unit.overheated = true;
            }
          }
        }
        if (unit.hitTime > 0) { unit.hitTime -= dt; unit.sprite.setAlpha(.6); }
        else unit.sprite.setAlpha(unit.suppression > 0 ? .82 : 1);
      }
      for (const enemy of [...this.enemies]) {
        if (enemy.pending) continue;
        if (enemy.airborne) {
          enemy.x += enemy.speed * dt;
          enemy.y = enemy.airLane + Math.sin(enemy.x / 105 + enemy.phase) * 13;
        }
        enemy.sprite.setVisible(true).setDepth(enemy.airborne ? 40 : 10 + enemy.y / 1000);
        enemy.sprite.setPosition(enemy.x, enemy.y).setScale(enemy.scale, enemy.scale * (1 + (!enemy.airborne && enemy.type !== 'tank' ? Math.sin(this.elapsed * 14 + enemy.phase) * .035 : 0)));
        enemy.shadow.setVisible(true).setPosition(enemy.x + 6, enemy.y + (enemy.airborne ? 38 : 9)).setDepth(2 + enemy.y / 1000);
        if (enemy.rotor) { enemy.rotor.setPosition(enemy.x - 3, enemy.y); enemy.rotor.rotation += dt * 35; }
        const target = selectEnemyTarget(enemy, this.units);
        let aimError = 0;
        if (enemy.turret) {
          enemy.sprite.setRotation(enemy.heading);
          const desiredAngle = target ? Math.atan2(target.y - enemy.y, target.x - enemy.x) : enemy.heading;
          enemy.turretRotation = lerpAngle(enemy.turretRotation, desiredAngle, Math.min(1, dt * TANK_TURRET_TURN_SPEED));
          aimError = Math.abs(Math.atan2(Math.sin(desiredAngle - enemy.turretRotation), Math.cos(desiredAngle - enemy.turretRotation)));
          enemy.turret.setVisible(true).setPosition(enemy.x, enemy.y).setScale(enemy.scale).setRotation(enemy.turretRotation).setDepth(10.01 + enemy.y / 1000);
        } else if (!enemy.airborne) {
          const desiredAngle = target ? Math.atan2(target.y - enemy.y, target.x - enemy.x) : enemy.heading;
          enemy.sprite.rotation = lerpAngle(enemy.sprite.rotation, desiredAngle, Math.min(1, dt * ENEMY_BODY_TURN_SPEED));
          aimError = Math.abs(Math.atan2(Math.sin(desiredAngle - enemy.sprite.rotation), Math.cos(desiredAngle - enemy.sprite.rotation)));
        }
        enemy.cooldown -= dt;
        const fireTolerance = enemy.turret ? TANK_FIRE_TOLERANCE : ENEMY_FIRE_TOLERANCE;
        if (enemy.cooldown <= 0 && target && (enemy.airborne || aimError <= fireTolerance)) {
          this.fire(enemy, target, true); enemy.cooldown = enemy.attackCooldown;
        }
        if (enemy.hitTime > 0) { enemy.hitTime -= dt; enemy.sprite.setTint(0xffd5ae); enemy.turret?.setTint(0xffd5ae); }
        else { enemy.sprite.clearTint(); enemy.turret?.clearTint(); }
        if (enemy.airborne ? enemy.x >= 1040 : enemy.roadDistance >= ROAD.length) {
          destroyEntity(enemy); this.enemies = this.enemies.filter(other => other !== enemy);
          this.health = Math.max(0, this.health - (enemy.type === 'tank' ? 3 : enemy.airborne ? 2 : 1));
          this.sfx.play('impact.base', { x: 1045 });
          this.effects.explosion(1045, enemy.y, 35); this.hint('Perimeter breached. The outpost is taking damage.'); this.updateHUD();
          if (!this.health) { this.finish(false); break; }
        }
      }
      if (!this.gameOver) { this.updateProjectiles(dt); this.updateSupport(dt); }
      this.effects.update(dt);
      for (const dust of this.dust) { dust.x += dt * 12; dust.y += dt * 3; if (dust.x > 1300) { dust.x = -100; dust.y = Math.random() * 700; } }
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) { this.updateHUD(); this.hudTimer = .2; }
    }
    this.drawOverlays();
  }
  drawOverlays() {
    const g = this.rangeGraphics.clear(); this.ghost.setVisible(false);
    this.roadGuide.setVisible(Boolean(this.selectedType && this.selectedType !== 'airstrike' && !this.paused && !this.gameOver));
    const pointer = this.input.activePointer;
    let target = this.selectedUnit;
    if (this.selectedType && !this.paused && !this.gameOver && !this.pointerOverHUD && this.input.manager.isOver) {
      const point = { x: pointer.worldX, y: pointer.worldY }, type = this.selectedType;
      const def = SOLDIER_TYPES[type] || UTILITIES[type];
      const error = placementError(point, this.units, this.mines, type);
      const valid = !error && this.money >= def.cost && (type === 'mine' || type === 'airstrike' || this.units.length < GAME_CONFIG.maxDefenders);
      const message = error || (valid ? (type === 'mine' ? 'Plant landmines on the road. Esc to cancel.' : type === 'airstrike' ? 'Click to call air support. Esc to cancel.' : 'Deploy on open ground off the road. Esc to cancel.') : 'Insufficient funds or squad at capacity.');
      if (message !== this.previewMessage) { this.previewMessage = message; this.hint(message); }
      const color = valid ? 0xe5d39d : 0xdd8b75;
      const radius = def.range || def.radius;
      g.fillStyle(color, .07).fillCircle(point.x, point.y, radius); g.lineStyle(1.5, color, .65).strokeCircle(point.x, point.y, radius);
      g.lineStyle(1, color, .8).strokeCircle(point.x, point.y, type === 'mine' ? GAME_CONFIG.mineRadius : GAME_CONFIG.defenderRadius);
      if (type !== 'airstrike') this.ghost.setTexture(type).setPosition(point.x, point.y).setTint(valid ? 0xffffff : 0xee8877).setVisible(true);
      target = null;
    }
    if (target?.alive) {
      g.fillStyle(0xdce9b4, .07).fillCircle(target.x, target.y, target.range);
      g.lineStyle(1.5, 0xe1e9b5, .55).strokeCircle(target.x, target.y, target.range);
      g.lineStyle(2, 0xe7d29b, .9).strokeCircle(target.x, target.y, 25);
    }
    const health = this.healthGraphics.clear();
    for (const unit of this.units) {
      health.lineStyle(1, 0xb4c893, .3).strokeCircle(unit.x, unit.y, 20);
      for (let level = 0; level < unit.level; level++) health.fillStyle(0xe4c581, 1).fillRect(unit.x - 3 + level * 6, unit.y + 26, 4, 3);
      if (unit.type === 'machinegun' && unit.heat > .08) {
        health.fillStyle(0x263229, .85).fillRect(unit.x - 13, unit.y + 31, 26, 4);
        health.fillStyle(unit.overheated ? 0xd86855 : 0xe0a75e, 1).fillRect(unit.x - 12, unit.y + 32, unit.heat * 24, 2);
      }
    }
    for (const entity of [...this.units, ...this.enemies]) {
      if (entity.health === entity.maxHealth && entity !== this.selectedUnit) continue;
      const x = entity.x - 15, y = entity.y - (entity.airborne ? 30 : 26);
      health.fillStyle(0x263229, .85).fillRect(x - 1, y - 1, 32, 5);
      health.fillStyle(entity.reward ? 0xdc967b : 0xbfd69c, 1).fillRect(x, y, clamp(entity.health / entity.maxHealth, 0, 1) * 30, 3);
    }
    const bullets = this.projectileGraphics.clear();
    for (const p of this.projectiles) {
      bullets.lineStyle(p.splash ? 4 : 2, p.color, 1).lineBetween(p.x, p.y, p.x - Math.cos(p.angle) * (p.splash ? 7 : 15), p.y - Math.sin(p.angle) * (p.splash ? 7 : 15));
    }
  }
  finish(won) {
    if (this.gameOver) return;
    this.gameOver = true; this.clearSelection(false);
    this.sfx.setPaused(true);
    this.sfx.ui(won ? 'victory' : 'defeat');
    $('endTitle').textContent = won ? 'The line held.' : 'Outpost lost.';
    $('endMessage').textContent = won ? 'All 25 waves defeated. Operation Dustfall is a success, commander.' : 'The perimeter has fallen. Regroup, rethink your defenses, and return to the field.';
    $('endStats').textContent = `WAVE ${this.waveManager.wave} / 25  ·  ${this.kills} ELIMINATIONS`;
    $('endDialog').showModal(); this.updateHUD();
  }
}

export function bootstrap() {
  if (!Phaser) { $('loading').textContent = 'Phaser could not load. Install dependencies with npm install, then restart the server.'; return; }
  const sfx = new SoundManager();
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: GAME_CONFIG.width, height: GAME_CONFIG.height,
    backgroundColor: '#929574', antialias: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { roundPixels: false }, scene: Battlefield,
    callbacks: { preBoot: game => game.registry.set('sfx', sfx) },
    audio: { noAudio: true },
  });
  game.events.once('destroy', () => { void sfx.dispose(); });
  return game;
}
