# Audio asset manifest

Generated from `src/game/audio/manifest.js` by `npm run audio:index`. Edit that source, not this document.

46 cues; 135 exact sample variations. All are optional at runtime. See README.md for the audit, mix, export and integration instructions.

Every numbered file is a different performance/timbre variation of the same event, not a sequential part. Weapons are single attacks, never firing loops. Explosions are separate assets.

## weapon.friendly.rifleman

Dry assault-rifle shot; mechanical click, crack and short body.

**Trigger:** Rifleman, 1.45 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/rifleman-01.wav`
- `assets/audio/weapons/friendly/rifleman-02.wav`
- `assets/audio/weapons/friendly/rifleman-03.wav`
- `assets/audio/weapons/friendly/rifleman-04.wav`

## weapon.friendly.commando

Sharper, tighter assault-rifle shot. One shot per file, not a burst.

**Trigger:** Commando upgrade, 2.175 shots/s; current gameplay does not simulate a three-shot burst.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/commando-01.wav`
- `assets/audio/weapons/friendly/commando-02.wav`
- `assets/audio/weapons/friendly/commando-03.wav`
- `assets/audio/weapons/friendly/commando-04.wav`

## weapon.friendly.sniper

Crisp precision-rifle crack with a restrained low tail.

**Trigger:** Sniper, 0.72 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/sniper-01.wav`
- `assets/audio/weapons/friendly/sniper-02.wav`
- `assets/audio/weapons/friendly/sniper-03.wav`
- `assets/audio/weapons/friendly/sniper-04.wav`

## weapon.friendly.fiftycal

Heavy .50-caliber report, deeper body and longer tail.

**Trigger:** .50 Cal Sniper upgrade, 0.612 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/fiftycal-01.wav`
- `assets/audio/weapons/friendly/fiftycal-02.wav`
- `assets/audio/weapons/friendly/fiftycal-03.wav`
- `assets/audio/weapons/friendly/fiftycal-04.wav`

## weapon.friendly.sentry

Short machine-gun round, clean enough to overlap rapidly.

**Trigger:** Sentry Gun, 5.1 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/sentry-01.wav`
- `assets/audio/weapons/friendly/sentry-02.wav`
- `assets/audio/weapons/friendly/sentry-03.wav`
- `assets/audio/weapons/friendly/sentry-04.wav`

## weapon.friendly.minigun

Very short rotary-cannon round, no spin-up or firing loop.

**Trigger:** Advanced Sentry, 9.18 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/minigun-01.wav`
- `assets/audio/weapons/friendly/minigun-02.wav`
- `assets/audio/weapons/friendly/minigun-03.wav`
- `assets/audio/weapons/friendly/minigun-04.wav`

## weapon.friendly.laser

Short electronic laser pulse, distinct from ballistic shots.

**Trigger:** Laser Sentry, 11.1996 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/laser-01.wav`
- `assets/audio/weapons/friendly/laser-02.wav`
- `assets/audio/weapons/friendly/laser-03.wav`

## weapon.friendly.grenadier

Launcher thump with a short exhaust tail; no detonation.

**Trigger:** Grenadier, 0.55 shots/s; explosion is separate.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/grenadier-01.wav`
- `assets/audio/weapons/friendly/grenadier-02.wav`
- `assets/audio/weapons/friendly/grenadier-03.wav`

## weapon.friendly.rpg

Heavier rocket launch and exhaust; no detonation.

**Trigger:** Rocket Specialist upgrade, 0.66 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/rpg-01.wav`
- `assets/audio/weapons/friendly/rpg-02.wav`
- `assets/audio/weapons/friendly/rpg-03.wav`

## weapon.friendly.aa

Twin-barrel anti-air cannon report rendered as one attack.

**Trigger:** AA Gun, 2.4 shots/s.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/aa-01.wav`
- `assets/audio/weapons/friendly/aa-02.wav`
- `assets/audio/weapons/friendly/aa-03.wav`
- `assets/audio/weapons/friendly/aa-04.wav`

## weapon.friendly.flak

Heavy anti-air report with more metal and body.

**Trigger:** Flak Battery upgrade, 3.12 shots/s; current attack remains direct-hit.

**Mix:** weapons; gain 0.48; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 28 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/friendly/flak-01.wav`
- `assets/audio/weapons/friendly/flak-02.wav`
- `assets/audio/weapons/friendly/flak-03.wav`
- `assets/audio/weapons/friendly/flak-04.wav`

## weapon.enemy.infantry

Distant, slightly rough enemy rifle report.

**Trigger:** Enemy infantry projectile creation in fire(hostile=true).

**Mix:** weapons; gain 0.33; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 45 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/enemy/infantry-01.wav`
- `assets/audio/weapons/enemy/infantry-02.wav`
- `assets/audio/weapons/enemy/infantry-03.wav`
- `assets/audio/weapons/enemy/infantry-04.wav`

## weapon.enemy.heavy

Deeper enemy automatic-rifle round.

**Trigger:** Enemy heavy projectile creation in fire(hostile=true).

**Mix:** weapons; gain 0.33; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 45 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/enemy/heavy-01.wav`
- `assets/audio/weapons/enemy/heavy-02.wav`
- `assets/audio/weapons/enemy/heavy-03.wav`
- `assets/audio/weapons/enemy/heavy-04.wav`

## weapon.enemy.juggernaut

Heavy armored infantry gun report.

**Trigger:** Enemy juggernaut projectile creation in fire(hostile=true).

**Mix:** weapons; gain 0.33; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 45 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/enemy/juggernaut-01.wav`
- `assets/audio/weapons/enemy/juggernaut-02.wav`
- `assets/audio/weapons/enemy/juggernaut-03.wav`
- `assets/audio/weapons/enemy/juggernaut-04.wav`

## weapon.enemy.tank

Tank cannon discharge with a low punch; no impact.

**Trigger:** Enemy tank projectile creation in fire(hostile=true).

**Mix:** weapons; gain 0.33; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 45 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/enemy/tank-01.wav`
- `assets/audio/weapons/enemy/tank-02.wav`
- `assets/audio/weapons/enemy/tank-03.wav`

## weapon.enemy.helicopter

Airborne gun report; no rotor loop or rocket salvo.

**Trigger:** Enemy helicopter projectile creation in fire(hostile=true).

**Mix:** weapons; gain 0.33; pitch 0.96–1.04×; maximum 5 simultaneous voices; minimum interval 45 ms; priority 1.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1 seconds.

- `assets/audio/weapons/enemy/helicopter-01.wav`
- `assets/audio/weapons/enemy/helicopter-02.wav`
- `assets/audio/weapons/enemy/helicopter-03.wav`
- `assets/audio/weapons/enemy/helicopter-04.wav`

## impact.flesh

Subtle cloth/body hit, no vocalization or exaggerated gore.

**Trigger:** Direct bullet hit on riflemen, snipers, grenadiers, or infantry.

**Mix:** impacts; gain 0.25; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 0.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/impacts/flesh-01.wav`
- `assets/audio/impacts/flesh-02.wav`
- `assets/audio/impacts/flesh-03.wav`
- `assets/audio/impacts/flesh-04.wav`

## impact.armor

Short metal/armor tick with a solid body.

**Trigger:** Direct hit on sentries, AA, heavy infantry, juggernauts, tanks or aircraft.

**Mix:** impacts; gain 0.25; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 0.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/impacts/armor-01.wav`
- `assets/audio/impacts/armor-02.wav`
- `assets/audio/impacts/armor-03.wav`
- `assets/audio/impacts/armor-04.wav`

## impact.base

Concrete/metal breach impact with low structural knock.

**Trigger:** One enemy crosses the eastern perimeter.

**Mix:** impacts; gain 0.65; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/impacts/base-01.wav`
- `assets/audio/impacts/base-02.wav`
- `assets/audio/impacts/base-03.wav`
- `assets/audio/impacts/base-04.wav`

## explosion.grenade

Compact fragmentation/rocket detonation.

**Trigger:** A friendly splash projectile reaches its target.

**Mix:** explosions; gain 0.6; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 2.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 3 seconds.

- `assets/audio/explosions/grenade-01.wav`
- `assets/audio/explosions/grenade-02.wav`
- `assets/audio/explosions/grenade-03.wav`
- `assets/audio/explosions/grenade-04.wav`

## explosion.tank-shell

Heavy shell impact and low debris tail.

**Trigger:** An enemy tank splash projectile reaches its target.

**Mix:** explosions; gain 0.6; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 2.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 3 seconds.

- `assets/audio/explosions/tank-shell-01.wav`
- `assets/audio/explosions/tank-shell-02.wav`
- `assets/audio/explosions/tank-shell-03.wav`
- `assets/audio/explosions/tank-shell-04.wav`

## explosion.mine

Sharp ground-mine blast and dirt debris.

**Trigger:** Ground contact triggers one mine.

**Mix:** explosions; gain 0.6; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 2.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 3 seconds.

- `assets/audio/explosions/mine-01.wav`
- `assets/audio/explosions/mine-02.wav`
- `assets/audio/explosions/mine-03.wav`

## explosion.airstrike

One composite multi-blast air strike, with a broad low tail.

**Trigger:** One strike resolves after its delay; NOT six sounds for six visual blasts.

**Mix:** explosions; gain 0.6; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 120 ms; priority 2.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 3 seconds.

- `assets/audio/explosions/airstrike-01.wav`
- `assets/audio/explosions/airstrike-02.wav`
- `assets/audio/explosions/airstrike-03.wav`

## explosion.vehicle

Destroyed armored vehicle, secondary rattle and debris.

**Trigger:** A tank or helicopter is killed.

**Mix:** explosions; gain 0.6; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 2.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 3 seconds.

- `assets/audio/explosions/vehicle-01.wav`
- `assets/audio/explosions/vehicle-02.wav`
- `assets/audio/explosions/vehicle-03.wav`
- `assets/audio/explosions/vehicle-04.wav`

## explosion.defender

Small equipment destruction/defender loss accent.

**Trigger:** A friendly unit is destroyed; one per lost unit.

**Mix:** explosions; gain 0.6; pitch 0.96–1.04×; maximum 3 simultaneous voices; minimum interval 45 ms; priority 2.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 3 seconds.

- `assets/audio/explosions/defender-01.wav`
- `assets/audio/explosions/defender-02.wav`
- `assets/audio/explosions/defender-03.wav`

## ui.select

Soft tactical selection click.

**Trigger:** Choose a defender/support type or select a deployed unit.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/select-01.wav`
- `assets/audio/ui/select-02.wav`

## ui.cancel

Soft deselection tick.

**Trigger:** User clears an existing selection with Esc, right click, ground, or close.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/cancel-01.wav`
- `assets/audio/ui/cancel-02.wav`

## ui.deploy

Equipment placement latch.

**Trigger:** A defender purchase is successfully deployed.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/deploy-01.wav`
- `assets/audio/ui/deploy-02.wav`

## ui.mine-arm

Mechanical latch and short arming confirmation.

**Trigger:** A purchased mine is successfully placed.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/mine-arm-01.wav`
- `assets/audio/ui/mine-arm-02.wav`

## ui.airstrike-call

Brief radio acknowledgement; no spoken dialogue required.

**Trigger:** Air strike purchase is accepted, before impact.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/airstrike-call-01.wav`
- `assets/audio/ui/airstrike-call-02.wav`

## ui.upgrade

Two-tone equipment upgrade confirmation.

**Trigger:** A paid upgrade succeeds.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/upgrade-01.wav`
- `assets/audio/ui/upgrade-02.wav`

## ui.sell

Quiet withdrawal/refund confirmation.

**Trigger:** A selected defender is sold.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/sell-01.wav`
- `assets/audio/ui/sell-02.wav`

## ui.denied

Muted error/downward tick.

**Trigger:** Insufficient funds, squad cap, invalid placement or unavailable upgrade. Disabled native buttons intentionally stay silent.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/denied-01.wav`
- `assets/audio/ui/denied-02.wav`

## ui.kill

Very quiet reward tick, suitable for frequent kills.

**Trigger:** Enemy elimination; rate-limited so splash kills do not stack.

**Mix:** ui; gain 0.12; pitch 1–1×; maximum 1 simultaneous voices; minimum interval 120 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/kill-01.wav`
- `assets/audio/ui/kill-02.wav`

## ui.wave-start

Short tactical alert signalling engagement.

**Trigger:** A new wave actually starts.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/wave-start-01.wav`
- `assets/audio/ui/wave-start-02.wav`

## ui.wave-clear

Restrained success/supply confirmation.

**Trigger:** A nonfinal wave clears.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/wave-clear-01.wav`
- `assets/audio/ui/wave-clear-02.wav`

## ui.victory

Short resolved mission-success sting.

**Trigger:** Final wave is cleared.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 4.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 4 seconds.

- `assets/audio/ui/victory-01.wav`
- `assets/audio/ui/victory-02.wav`

## ui.defeat

Short descending mission-failure sting.

**Trigger:** Base integrity reaches zero.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 4.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 4 seconds.

- `assets/audio/ui/defeat-01.wav`
- `assets/audio/ui/defeat-02.wav`

## ui.pause

Soft descending pause click.

**Trigger:** Pause button or Space pauses the battle.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/pause-01.wav`
- `assets/audio/ui/pause-02.wav`

## ui.resume

Soft ascending resume click.

**Trigger:** Pause is released.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/resume-01.wav`
- `assets/audio/ui/resume-02.wav`

## ui.speed

Small transport/control switch click.

**Trigger:** Simulation speed is toggled.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/speed-01.wav`
- `assets/audio/ui/speed-02.wav`

## ui.grid

Small tactical-display switch click.

**Trigger:** Grid is toggled.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/grid-01.wav`
- `assets/audio/ui/grid-02.wav`

## ui.audio-on

Subtle output-enabled confirmation.

**Trigger:** Unmute succeeds. Muting is immediate and intentionally silent.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/audio-on-01.wav`
- `assets/audio/ui/audio-on-02.wav`

## ui.help-open

Soft field-manual open click.

**Trigger:** Help opens, without an additional pause cue.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/help-open-01.wav`
- `assets/audio/ui/help-open-02.wav`

## ui.help-close

Soft field-manual close click.

**Trigger:** Help closes, without an additional resume cue.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/help-close-01.wav`
- `assets/audio/ui/help-close-02.wav`

## ui.restart

Short redeployment confirmation.

**Trigger:** Restart after victory/defeat; plays after old audio is cleared.

**Mix:** ui; gain 0.38; pitch 1–1×; maximum 2 simultaneous voices; minimum interval 80 ms; priority 3.

**Export:** WAV PCM, 44.1 or 48 kHz, 16/24-bit; mono preferred for positional cues. Maximum duration 1.5 seconds.

- `assets/audio/ui/restart-01.wav`
- `assets/audio/ui/restart-02.wav`
