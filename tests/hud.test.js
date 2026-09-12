import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the HUD provides one element for every scene DOM binding and control', () => {
  const markup = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../src/game/game.js', import.meta.url), 'utf8');
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HUD IDs must be unique');
  const references = [...scene.matchAll(/(?:\$|(?<![\w.])on)\('([^']+)'/g)].map(match => match[1]);
  for (const id of references) assert.ok(ids.includes(id), `Missing scene binding: #${id}`);
  for (const id of ['pauseBtn', 'speedBtn', 'gridBtn', 'muteBtn', 'helpBtn', 'mineBtn', 'airstrikeBtn', 'startWaveBtn', 'upgradeBtn', 'sellBtn', 'restartBtn']) {
    assert.match(markup, new RegExp(`<button[^>]*id="${id}"`), `#${id} must remain a keyboard-accessible native button`);
  }
  assert.match(markup, /id="hint"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(markup, /id="mineBtn"[^>]*data-utility="mine"/);
  assert.match(markup, /id="airstrikeBtn"[^>]*data-utility="airstrike"/);
});
