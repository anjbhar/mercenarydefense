# Mercenary Defense

Mercenary Defense is a browser-based 2D-style tower defense game built with **Three.js** (orthographic camera + top-down battlefield feel).

## Features

- Defend the **base on the right side** of the field.
- Place defender units and utilities using the top HUD.
- Manual wave flow with a **Start Wave** button.
- Multiple defender types with upgrades:
  - Rifleman (upgrade: Commando burst fire)
  - Sniper (upgrade: .50 Cal)
  - Sentry Gun (upgrade: Advanced Sentry/Minigun)
  - Grenadier (RPG-style splash attacks)
- Enemy variety by wave:
  - Infantry / Heavy
  - Juggernaut (wave 5+)
  - Tank (wave 10+)
- Utility purchases:
  - Landmine
  - Air Strike
- Economy + combat feedback:
  - Kill rewards
  - Floating money popups
  - Unit selection and upgrade panel
- Audio:
  - Synthesized weapon/combat SFX
  - Mute toggle
- Win/Loss states:
  - Lose if enemies overrun the base
  - **Wave 15 is final**; clear it to win

## Run Locally

No build step is required.

1. Open [index.html](C:\Users\anjan\Desktop\Projects\games\mercenarydefence\index.html) in a modern browser.
2. If changes do not appear, do a hard refresh (`Ctrl+F5`).

## How to Play

1. Buy defenders from the top menu.
2. Click inside the battlefield to place them.
3. Press **Start Wave** when ready.
4. Select placed defenders to view upgrades/sell options.
5. Keep enemies from reaching the right-side base.

## Controls

- `Left Click`:
  - Select unit from shop
  - Place selected unit/utility
  - Select a placed defender
  - Click ground to clear selection
- `Mute Button` (top-right): Toggle audio on/off

## Tech Stack

- Plain JavaScript (ES Modules)
- Three.js via CDN
- HTML/CSS overlay UI

## Project Structure

```text
mercenarydefence/
  index.html
  main.js
  styles.css
  src/
    game/
      constants.js
      game.js
      models.js
      sound.js
      three.js
      utils.js
```

