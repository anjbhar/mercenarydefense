# Mercenary Defense

A top-down **Phaser 3** tower defense game with original procedural sprite artwork and a responsive tactical interface.

## Run

Requires Node.js 20 or newer.

```sh
pnpm install
pnpm dev
```

Open http://localhost:4173. Phaser 3.90.0 is pinned by `pnpm-lock.yaml` and served locally. No build step or CDN runtime is required. Optional Google Fonts fall back to system fonts when offline.

```sh
pnpm test
```

## itch.io upload

Do not ZIP the project folder: it includes `node_modules` and `.git`, which contain thousands of development-only files. On Windows, create the browser upload with:

```sh
pnpm package:itch
```

Upload `mercenary-defense-itch.zip` to itch.io as an HTML project. The command places `index.html` at the ZIP root, includes only runtime files, and copies the single Phaser browser bundle instead of all of `node_modules`. `pnpm build:itch` creates the same unpacked build in `dist/` without making a ZIP.

## Play

Protect the eastern outpost through **25 manually started waves**. You start with **$240**, 20 base integrity, and a complimentary two-unit garrison. Place up to 20 defenders on open terrain outside the road, clear of structures and other defenders. Units aim and fire automatically. Ground enemies follow the road from the western entrance to the eastern gate, following or passing slower traffic; helicopters fly independently.

- **1–6**: Select Rifleman, Sniper, Sentry Gun, Grenadier, AA Gun, or Medic. Snipers cover nearly the entire battlefield; medics periodically heal every injured friendly unit within range and do not attack. Click valid open terrain off the road to deploy.
- **7 / 8**: Plant a landmine on the road / call an air strike anywhere in the combat area. Air strikes land after one simulation second.
- **Click a defender**: Inspect health and kills, buy upgrades, or sell for 65% of invested funds. Complimentary units have no initial resale value.
- **Target priority**: Each defender targets enemies in the road lane nearest that defender by default, choosing the physically closest contact within that lane. Aircraft use physical distance. Priorities can be set to First, Closest, Strongest, or Weakest.
- **Space**: Start the next wave, or pause/resume an active wave.
- **Esc / right click**: Cancel selection.
- **M**: Toggle audio (samples with procedural fallbacks).
- **Speed**: Switch between 1× and 2×. **Grid**: Show deployment guides.

Kills and completed waves earn funds. Surviving units recover 10% of maximum health between waves; upgrades fully restore health. Heavy infantry arrive from wave 2, juggernauts from wave 4, tanks from wave 8, and helicopters from wave 14. Some reinforcements arrive in short assault groups. Tanks resist rifles and machine guns, while grenades, mines, air strikes and .50-caliber snipers counter their armor; .50-caliber rounds also travel substantially faster. Juggernauts carry an armor layer, shown by a blue bar above their health, which must be depleted before they lose health. Heavy troops suppress defenders and helicopters prioritize AA guns. Sentry guns build heat while firing and must cool after overheating. Infantry breach damage is 1, helicopters 2, and tanks 3. Clear wave 25 to win; losing all base integrity ends the mission. Restart from the operation report.

The game opens directly on the battlefield using a single balance profile. Press **F3** to toggle the hidden developer panel, which shows traffic diagnostics, changes available funds, and can set the next wave from 1–25 while no wave is active. It is hidden whenever the game starts or restarts.

## Art and architecture

All art is original and generated locally with Canvas 2D at startup, then baked into Phaser textures: detailed terrain, a winding supply road, rocks, palms, sandbags, buildings, soldiers, upgrade-specific .50-caliber sniper artwork, turrets, tanks and helicopters. Phaser handles sprites, input, scaling and the frame loop. Combat has muzzle flashes, tracer rounds, splash explosions, dust, shadows, health bars and floating rewards. Pause and speed changes apply to projectiles, strikes and effects as well as units.

- `src/game/game.js`: Phaser scene, combat, input and UI integration.
- `src/game/art.js`: Terrain and sprite texture generation.
- `src/game/road.js`: Single authored Bezier route, cumulative-distance sampling, tangents/normals, shoulder offsets and nearest-point/corridor queries. Terrain and previews draw these same samples.
- `src/game/traffic.js`: Ground footprints, deterministic sub-lanes, following, passing and geometric separation.
- `src/game/utils.js`: Shared placement validation and specific rejection messages.
- `src/game/models.js`: 2D entity creation and cleanup.
- `src/game/effects.js`: Effects driven by simulation time.
- `src/game/wave-manager.js`: Renderer-independent wave plans and progression.
- `src/game/constants.js`: Defender and utility stats and upgrade paths.
- `src/game/config.js`: Starting resources, map bounds, legal starter positions and permanent scenery footprints.
- `src/game/sound.js`: Sample-based Web Audio mixer with procedural fallbacks. See [the audio audit and asset handoff](assets/audio/README.md) and [exact sample manifest](assets/audio/MANIFEST.md).
- `tests/`: Wave, economy, combat and lifecycle regression checks.

Starting resources and the squad limit are configurable in `config.js`; development-only wave and funds controls remain hidden behind F3.


## Road movement and placement

The road retains the original two Bezier curves, sampled into a cumulative-distance table with sub-three-pixel segments, and ends at the eastern gate (x=1045). Movement advances by arc distance instead of raw curve parameters. A short tangent averaging window smooths the curve join. Lateral paths compensate for curvature so outside lanes do not run faster around bends.

Five invisible sub-lanes lie within a 150-pixel road corridor. Enemies reserve their current and destination lanes while changing lanes, check front/rear clearance and relative speeds, and follow more slowly when passing is unsafe. Changes use bounded lateral motion and cooldowns; enemies stay in their chosen lane after a pass. Updates run in steps no larger than 1/60 simulation second, clamp following travel, and check explicit oriented footprints to prevent intersection on curves. Entrants wait offscreen when no safe gap exists. Helicopters bypass this system.

Tanks use larger footprints and following distances, stay in the three central sub-lanes, and turn/change lanes more slowly than infantry. Heavy troops and juggernauts also take more room. Sprite depth follows current Y; shadows remain below units and aircraft stay above ground traffic.

Deployment uses a 33-pixel defender footprint against the road corridor, battlefield boundaries, structures, and palms. Friendly units may be placed as close as 42 pixels center-to-center. Mines use an 8-pixel footprint, must fit on the road within reach of a traffic lane, detect ground enemies within 35 pixels, and keep 30 pixels from other mines. Their blast radius, cost, and damage are unchanged. Air-strike bounds and behavior are unchanged. Placement previews outline the road shoulders and explain rejected positions.

The solid road widened from 135 to 150 pixels to accommodate tank passing. The starter sentry sits off the road at (945,250), with the remaining starter rifleman at (875,228). The current balance pass reduces the opening reserve and income, introduces mixed threats earlier, and adds assault groups, armor, suppression, target priorities and Sentry heat. The shortest defender range still covers useful road sections from either shoulder. Traffic uses conservative footprints and can form queues in tight spaces; it does not dynamically reroute or collide with defenders.

Run `pnpm test` for deterministic road, traffic, placement, combat, HUD and audio tests. For browser verification, `/tests/road-browser.html` embeds the real game with separate developer-only passing/congestion drills, a wave-22 setup (tanks and aircraft), a five-second simulation advance, and live overlap/corridor diagnostics. Normal speed, 2x, pause, placement, support and dialogs use the normal game controls. These test controls are not part of the main game.
