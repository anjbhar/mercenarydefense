# Audio implementation audit and asset handoff

The asset contract contains **46 cues and 135 individual WAV variations**. No production recordings are bundled yet: the game works with procedural fallbacks until samples are added.

- [Exact filenames, variations, triggers and mix settings](MANIFEST.md)
- [Machine-readable manifest](manifest.json)
- Authoritative source: `src/game/audio/manifest.js`
- Runtime player/mixer: `src/game/sound.js`
- Buffered procedural synthesis: `src/game/audio/procedural.js`

## Audit of the implementation before this change

| Area | Existing implementation | Resolution |
| --- | --- | --- |
| Rifleman / Commando | Separate layered oscillator/noise profiles; only friendly fire called `shot`. | Noise-based ballistic fallbacks, distinct four-variation sample sets. |
| Sniper / .50 Cal | Separate profiles, distinct transients and low tails. | Distinct four-variation sample sets. |
| Sentry / Advanced Sentry / Laser Sentry | Three separate profiles; generated several live audio nodes per shot. | Three sample sets and cached procedural buffers through one bounded voice player. |
| Grenadier / Rocket Specialist | One launcher profile; RPG upgrade did not change audio. | Separate launch cues; shared grenade/rocket detonation family. |
| AA / Flak | No `getShotProfile` case. A truthy shooter object fell into the generic machine-gun beep. | Dedicated AA and Flak samples and fallbacks. |
| Infantry / Heavy / Juggernaut / Tank / Helicopter | `fire(..., hostile=true)` explicitly skipped sound. | Five enemy weapon cue families at projectile creation. |
| Direct impacts | `hit()` existed in sound.js but had no game.js callers. Enemy damage only created visual hit particles. | One flesh/cloth or armor impact per direct projectile hit. |
| Explosive damage | Splash projectiles, mines and air strikes all called the same 0.13-second sawtooth beep. | Separate grenade, tank-shell, mine and air-strike families. |
| Destruction / breaches | Vehicle death, defender death and base breach produced visual explosions but no corresponding audio. | Vehicle/defender destruction cues and structural breach impact. |
| Kill rewards | `kill()` existed but was unused. | Low-gain reward confirmation, throttled to avoid splash-kill stacks. |
| Wave flow | Only `waveStart()` was called. | Wave start, clear, victory and defeat cues. |
| Interface | Buttons and field clicks warmed up the context but made no interface sounds. Keyboard paths did not explicitly unlock audio. | Selection, cancel, deploy, mine arming, air-strike call, upgrade, sell, denial, pause/resume, speed, grid, unmute, help and restart cues; gesture-based unlock. |
| Muting | Prevented future sounds, but did not mute already playing sources or lower master gain. | Master gain immediately reaches zero and active voices stop. |
| Pause / restart / teardown | Audio tails continued independently; no sound lifecycle cleanup. | Pause stops world voices while allowing UI; restart clears voices and cooldowns while preserving loaded buffers; destruction aborts requests and closes the context. |
| Mixing / loading | No samples, per-bus gains, spatial panning, voice caps or request caching. | Category gains, compressor, positional panning, sample caches, variations, priority caps, bounded requests and diagnostics. |

The existing combat simulation is preserved. In particular, the current Commando upgrade increases shot rate rather than implementing a three-shot burst; Flak is still a direct-hit attack. Their assets represent **one actual attack**. Enemy heavy/juggernaut weapon names describe timbre only, not additional gameplay weapons.

## Every sound event in game.js

| Call site | Audio event(s) | Trigger rule |
| --- | --- | --- |
| `bindUI`, keyboard/pointer handlers | `warmup()` | Unlock on a gesture, with no audible warmup tone. |
| `choose`, field unit selection | `ui.select`, `ui.cancel`, `ui.denied` | User choice/changed selection or failed purchase; never on HUD refresh. |
| `clearSelection` | `ui.cancel` | Only for a user clearing an actual selection. Automatic clears on wave start/game over are silent. |
| `handleFieldClick` | `ui.deploy`, `ui.mine-arm`, `ui.airstrike-call`, `ui.denied` | Exactly once on a successful transaction or rejected placement. |
| `upgradeSelected`, `sellSelected` | `ui.upgrade`, `ui.sell`, `ui.denied` | Confirm successful upgrade/sale; reject unavailable upgrades. |
| `fire` | `weapon.friendly.*`, `weapon.enemy.*` | One cue per emitted projectile. Location is the source, in logical map coordinates. |
| `updateProjectiles`, direct hit | `impact.flesh`, `impact.armor` | One impact at the struck entity, before damage/death. |
| `updateProjectiles`, splash | `explosion.grenade`, `explosion.tank-shell` | One detonation, not one impact per splash victim. |
| `updateSupport`, mine | `explosion.mine` | One triggered mine. |
| `updateSupport`, air strike | `explosion.airstrike` | One composite cue per strike, independent of its six visual blasts. |
| `damageEnemy` | `ui.kill`, `explosion.vehicle` | Reward tick once per kill; destruction audio only for tank/aircraft. |
| `damageUnit` | `explosion.defender` | Once on unit destruction, not on sale. |
| `update`, enemy breach | `impact.base` | Once on crossing the perimeter; keeps existing integrity damage. |
| `onWaveStart`, `onWaveComplete` | `ui.wave-start`, `ui.wave-clear` | Actual transitions; final completion uses victory instead. |
| `finish` | `ui.victory`, `ui.defeat` | Stop world audio, then play one mission result. |
| `togglePause` | `ui.pause`, `ui.resume` | Stop world voices on pause; help-triggered pause/resume suppresses duplicate feedback. |
| `toggleMute` | `ui.audio-on` | Only unmuting emits feedback. Muting is silent and immediate. |
| Speed/grid button handlers | `ui.speed`, `ui.grid` | Once per toggle. |
| Help open/close | `ui.help-open`, `ui.help-close` | Includes closing via Escape; no extra pause/resume sound. |
| Restart/create, scene shutdown, game destruction | `ui.restart`, lifecycle cleanup | Clear previous voices before restart cue; preserve sample cache across restarts; dispose on game destruction. |

Intentionally silent: hover/focus, disabled native buttons, HUD/resource refreshes, money popups, ordinary movement, rotor animation, projectile flight, mouse motion, range previews, and expired projectiles whose target has died. There are no reload, looping fire, rotor-loop, terrain-collision, voice-over or ambient events in this implementation. No disconnected assets for those are requested.

## Delivering samples

1. Create the paths in [MANIFEST.md](MANIFEST.md) under this folder and place the exact numbered WAV files there. Partial packs work; any available decoded variation is used before procedural audio.
2. Run `pnpm audio:index` (`node scripts/index-audio.js` works directly). The local development server also indexes on startup. If files are added while it is running, re-index and reload the page, or restart the server and reload.
3. For static hosting, run the index command before uploading and include `assets/audio/catalog.json`, the referenced files, and the existing application source.
4. Play the game. The first event may use the immediate fallback while that cue's recordings load. Loading never replays stale combat events later.

`catalog.json` lists files actually present, so an empty pack does not issue 135 failing requests. If a catalog-listed file is missing, corrupt, unsupported, or overlong, its request/decode failure is cached and playback falls back. If the catalog itself is absent or invalid, declared sample paths are tried once per cue on demand. Reload to retry after replacing an asset. Filenames are case-sensitive on many hosts.

### Recording/export specification

- WAV PCM, 44.1 or 48 kHz, 16 or 24 bit. Mono preferred for weapons/impacts/explosions; UI stings can be stereo. Stereo width is subsequently affected by world panning.
- Trim attack silence to under 5 ms. Preserve a short natural tail; no room-long reverberation, loops or baked-in adjacent attacks. Start/end at zero crossings or use tiny fades.
- Target approximately -6 dBFS true peak, with comparable perceived loudness within each family. Do not hard-limit every file to 0 dBFS. Gain defaults assume headroom; audition the pack and adjust manifest gains as needed.
- Each numbered variation should be perceptibly different but equally loud. Runtime pitch variation is subtle and specified per cue; UI pitch is fixed. Do not export numbered files as sequential layers.
- Enforce the per-cue maximum duration in the manifest. Weapon files contain the discharge only; splash and destruction sounds are separate. The air-strike file contains the composite blast sequence once.
- Keep licensed/source attribution alongside any third-party recordings. This repository currently supplies no third-party sound recordings. `tests/fixtures/audio` contains only a short generated test tone, not a production asset.

## Runtime behavior and maintenance

The four buses are weapons (.55), impacts (.45), explosions (.65), and UI (.7), feeding master gain (.7) and a compressor. Manifest gain multiplies those values. `setVolume(0..1)` controls master level; `setMuted` preserves that level for unmute. World events pan across the fixed 1200-pixel map, limited to +/-0.75. UI remains centered.

There are at most 32 logical voices, plus per-cue caps and minimum event intervals. Lower-priority sounds cannot steal a voice from a higher-priority cue. High-rate guns and splash deaths may intentionally coalesce. Samples and fallbacks follow the same caps, gains, pitch and panning. Ballistic fallbacks use filtered noise cracks and thumps with distinct decay/filter settings per weapon. The old pitched weapon layers have been removed. Impacts, explosions and kill confirmations also use noise; only the laser and explicit interface alerts retain tones. Each event starts one source using either a sample or a fallback, never both.

Game speed changes the frequency of new combat events, **not** audio pitch or sample duration. Pausing stops current world tails rather than resuming them later. UI still works in pause/help. Mute stops every voice. A mission result stops world voices before its sting; restart stops everything and clears rate limits while retaining caches. One shared context survives scene restarts and is disposed with the Phaser game.

`SoundManager.preload(cueIds)` optionally preloads a pack after an audio gesture (four cue loads at a time). Normal playback is lazy and synchronous; asset fetching/decoding never blocks combat. `SoundManager.getDiagnostics()` reports loaded/missing samples, cached failures, generated variations, current voices and context state. In local browser developer tools:

```js
mercenaryGame.sfx.getDiagnostics()
mercenaryGame.sfx.setVolume(0.5)
await mercenaryGame.sfx.preload(['weapon.friendly.rifleman'])
```

To add a weapon, add its cue and variations in `src/game/audio/manifest.js`, map its type/upgrade in `weaponCue`, provide a procedural profile if necessary, and run `pnpm audio:index`. To add a UI event, trigger `sfx.ui('event-name')` on a successful transition rather than in the render/update loop.

## Verification

`npm test` includes manifest/upgrade coverage, finite fallback samples, partial packs, load deduplication, failed downloads/decodes, timeouts, no delayed playback, variation selection, priority/polyphony caps, panning, pause/mute/reset and teardown. The gameplay tests continue to cover combat/economy behavior.

For a real-browser Web Audio smoke check, start the dev server, open `/tests/audio-browser.html`, and click **Run audio checks**. It loads and decodes the generated WAV fixture, plays a procedural weapon fallback, and checks voice cleanup, mute and pause behavior. This is a developer test page, not part of the game HUD.

API references: [decoding and caching AudioBuffers](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData), [sample playback rate](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/playbackRate).
