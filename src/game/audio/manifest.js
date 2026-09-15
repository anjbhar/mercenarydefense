// Authoritative asset contract. Run `pnpm audio:index` after adding recordings
// or editing this file to refresh the published manifest and available-file index.
const cues = {};
function cue(id, folder, name, variations, description, trigger, options = {}) {
  const bus = folder.startsWith('weapons') ? 'weapons' : folder;
  cues[id] = {
    files: Array.from({ length: variations }, (_, i) => `${folder}/${name}-${String(i + 1).padStart(2, '0')}.wav`),
    description, trigger, bus,
    gain: bus === 'weapons' ? .48 : bus === 'ui' ? .35 : .6,
    pitch: bus === 'ui' ? [1, 1] : [.96, 1.04],
    priority: bus === 'ui' ? 3 : bus === 'explosions' ? 2 : 1,
    voices: bus === 'weapons' ? 5 : 3,
    intervalMs: bus === 'weapons' ? 28 : bus === 'impacts' ? 45 : 70,
    maxDuration: bus === 'weapons' ? 1 : bus === 'explosions' ? 3 : 1.5,
    fallback: { kind: 'tone', frequency: 500, end: 320, duration: .08 },
    ...options,
  };
}

const friendly = [
  ['rifleman', 4, 'Dry assault-rifle shot; mechanical click, crack and short body.', 'Rifleman, 1.45 shots/s.'],
  ['commando', 4, 'Sharper, tighter assault-rifle shot. One shot per file, not a burst.', 'Commando upgrade, 2.175 shots/s; current gameplay does not simulate a three-shot burst.'],
  ['sniper', 4, 'Crisp precision-rifle crack with a restrained low tail.', 'Sniper, 0.72 shots/s.'],
  ['fiftycal', 4, 'Heavy .50-caliber report, deeper body and longer tail.', '.50 Cal Sniper upgrade, 0.612 shots/s.'],
  ['sentry', 4, 'Short machine-gun round, clean enough to overlap rapidly.', 'Sentry Gun, 5.1 shots/s.'],
  ['minigun', 4, 'Very short rotary-cannon round, no spin-up or firing loop.', 'Advanced Sentry, 9.18 shots/s.'],
  ['laser', 3, 'Short electronic laser pulse, distinct from ballistic shots.', 'Laser Sentry, 11.1996 shots/s.'],
  ['grenadier', 3, 'Launcher thump with a short exhaust tail; no detonation.', 'Grenadier, 0.55 shots/s; explosion is separate.'],
  ['rpg', 3, 'Heavier rocket launch and exhaust; no detonation.', 'Rocket Specialist upgrade, 0.66 shots/s.'],
  ['aa', 4, 'Twin-barrel anti-air cannon report rendered as one attack.', 'AA Gun, 2.4 shots/s.'],
  ['flak', 4, 'Heavy anti-air report with more metal and body.', 'Flak Battery upgrade, 3.12 shots/s; current attack remains direct-hit.'],
];
for (const [name, count, description, trigger] of friendly) {
  cue(`weapon.friendly.${name}`, 'weapons/friendly', name, count, description, trigger, {
    gain: name === 'fiftycal' ? .64 : .48,
    fallback: { kind: 'gun', profile: name },
  });
}
for (const [name, count, description] of [
  ['infantry', 4, 'Distant, slightly rough enemy rifle report.'],
  ['heavy', 4, 'Deeper enemy automatic-rifle round.'],
  ['juggernaut', 4, 'Heavy armored infantry gun report.'],
  ['tank', 3, 'Tank cannon discharge with a low punch; no impact.'],
  ['helicopter', 4, 'Airborne gun report; no rotor loop or rocket salvo.'],
]) {
  cue(`weapon.enemy.${name}`, 'weapons/enemy', name, count, description, `Enemy ${name} projectile creation in fire(hostile=true).`, {
    gain: .33, intervalMs: 45, fallback: { kind: 'gun', profile: `enemy-${name}` },
  });
}

for (const [name, description, trigger, frequency] of [
  ['flesh', 'Subtle cloth/body hit, no vocalization or exaggerated gore.', 'Direct bullet hit on riflemen, snipers, grenadiers, or infantry.', 180],
  ['armor', 'Short metal/armor tick with a solid body.', 'Direct hit on sentries, AA, heavy infantry, juggernauts, tanks or aircraft.', 1600],
  ['base', 'Concrete/metal breach impact with low structural knock.', 'One enemy crosses the eastern perimeter.', 90],
]) cue(`impact.${name}`, 'impacts', name, 4, description, trigger, {
  gain: name === 'base' ? .65 : .25, priority: name === 'base' ? 3 : 0,
  fallback: { kind: 'impact', frequency, duration: name === 'base' ? .28 : .09 },
});
for (const [name, count, duration, description, trigger] of [
  ['grenade', 4, .45, 'Compact fragmentation/rocket detonation.', 'A friendly splash projectile reaches its target.'],
  ['tank-shell', 4, .65, 'Heavy shell impact and low debris tail.', 'An enemy tank splash projectile reaches its target.'],
  ['mine', 3, .55, 'Sharp ground-mine blast and dirt debris.', 'Ground contact triggers one mine.'],
  ['airstrike', 3, 1.3, 'One composite multi-blast air strike, with a broad low tail.', 'One strike resolves after its delay; NOT six sounds for six visual blasts.'],
  ['vehicle', 4, .85, 'Destroyed armored vehicle, secondary rattle and debris.', 'A tank or helicopter is killed.'],
  ['defender', 3, .3, 'Small equipment destruction/defender loss accent.', 'A friendly unit is destroyed; one per lost unit.'],
]) cue(`explosion.${name}`, 'explosions', name, count, description, trigger, {
  intervalMs: name === 'airstrike' ? 120 : 45,
  fallback: { kind: 'explosion', duration, frequency: name === 'airstrike' ? 65 : 100 },
});

const ui = [
  ['select', 'Soft tactical selection click.', 'Choose a defender/support type or select a deployed unit.', 650, 820],
  ['cancel', 'Soft deselection tick.', 'User clears an existing selection with Esc, right click, ground, or close.', 520, 340],
  ['deploy', 'Equipment placement latch.', 'A defender purchase is successfully deployed.', 390, 620],
  ['mine-arm', 'Mechanical latch and short arming confirmation.', 'A purchased mine is successfully placed.', 780, 1020],
  ['airstrike-call', 'Brief radio acknowledgement; no spoken dialogue required.', 'Air strike purchase is accepted, before impact.', 420, 700],
  ['upgrade', 'Two-tone equipment upgrade confirmation.', 'A paid upgrade succeeds.', 620, 1100],
  ['sell', 'Quiet withdrawal/refund confirmation.', 'A selected defender is sold.', 680, 450],
  ['denied', 'Muted error/downward tick.', 'Insufficient funds, squad cap, invalid placement or unavailable upgrade. Disabled native buttons intentionally stay silent.'],
  ['kill', 'Very quiet reward tick, suitable for frequent kills.', 'Enemy elimination; rate-limited so splash kills do not stack.', 980, 700],
  ['wave-start', 'Short tactical alert signalling engagement.', 'A new wave actually starts.', 340, 520],
  ['wave-clear', 'Restrained success/supply confirmation.', 'A nonfinal wave clears.', 540, 950],
  ['victory', 'Short resolved mission-success sting.', 'Final wave is cleared.', 520, 1040],
  ['defeat', 'Short descending mission-failure sting.', 'Base integrity reaches zero.', 240, 75],
  ['pause', 'Soft descending pause click.', 'Pause button or Space pauses the battle.', 430, 280],
  ['resume', 'Soft ascending resume click.', 'Pause is released.', 280, 430],
  ['speed', 'Small transport/control switch click.', 'Simulation speed is toggled.', 620, 730],
  ['grid', 'Small tactical-display switch click.', 'Grid is toggled.', 740, 650],
  ['audio-on', 'Subtle output-enabled confirmation.', 'Unmute succeeds. Muting is immediate and intentionally silent.', 530, 720],
  ['help-open', 'Soft field-manual open click.', 'Help opens, without an additional pause cue.', 360, 510],
  ['help-close', 'Soft field-manual close click.', 'Help closes, without an additional resume cue.', 510, 360],
  ['restart', 'Short redeployment confirmation.', 'Restart after victory/defeat; plays after old audio is cleared.', 320, 640],
];
for (const [name, description, trigger, frequency = 220, end = 120] of ui) {
  const sting = ['victory', 'defeat'].includes(name);
  cue(`ui.${name}`, 'ui', name, 2, description, trigger, {
    gain: name === 'kill' ? .12 : .38, voices: name === 'kill' ? 1 : 2,
    priority: sting ? 4 : 3, intervalMs: name === 'kill' ? 120 : 80,
    maxDuration: sting ? 4 : 1.5,
    fallback: name === 'kill'
      ? { kind: 'click', frequency: 1800, duration: .018 }
      : { kind: 'tone', frequency, end, duration: sting ? .65 : name.startsWith('wave-') ? .2 : .08 },
  });
}

export const AUDIO_MANIFEST = { version: 1, format: 'WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues', cues };

export function weaponCue(shooter, hostile = false) {
  const type = shooter?.type;
  if (hostile) return `weapon.enemy.${['infantry', 'heavy', 'juggernaut', 'tank', 'helicopter'].includes(type) ? type : 'infantry'}`;
  const upgrade = shooter?.specialUpgrades || {};
  const name = type === 'rifleman' ? (upgrade.commando ? 'commando' : 'rifleman')
    : type === 'sniper' ? (upgrade.fiftycal ? 'fiftycal' : 'sniper')
    : type === 'machinegun' ? (upgrade.laser ? 'laser' : upgrade.minigun ? 'minigun' : 'sentry')
    : type === 'grenadier' ? (upgrade.rpg ? 'rpg' : 'grenadier')
    : type === 'aa' ? (upgrade.flak ? 'flak' : 'aa') : 'rifleman';
  return `weapon.friendly.${name}`;
}
export function impactCue(entity) {
  return ['machinegun', 'aa', 'heavy', 'juggernaut', 'tank', 'helicopter'].includes(entity?.type) ? 'impact.armor' : 'impact.flesh';
}
