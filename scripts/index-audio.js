import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO_MANIFEST } from '../src/game/audio/manifest.js';

const audioRoot = new URL('../assets/audio/', import.meta.url);
async function writeChanged(name, contents) {
  const path = new URL(name, audioRoot);
  if (await readFile(path, 'utf8').catch(() => '') !== contents) await writeFile(path, contents);
}
export async function indexAudioAssets() {
  await mkdir(audioRoot, { recursive: true });
  const expected = Object.values(AUDIO_MANIFEST.cues).flatMap(cue => cue.files);
  const present = await Promise.all(expected.map(async file => {
    try { await access(new URL(file, audioRoot)); return file; } catch { return null; }
  }));
  const files = present.filter(Boolean).sort();
  await writeChanged('catalog.json', JSON.stringify({ version: 1, files }, null, 2) + '\n');
  await writeChanged('manifest.json', JSON.stringify(AUDIO_MANIFEST, null, 2) + '\n');
  const lines = [
    '# Audio asset manifest', '',
    'Generated from `src/game/audio/manifest.js` by `npm run audio:index`. Edit that source, not this document.', '',
    `${Object.keys(AUDIO_MANIFEST.cues).length} cues; ${expected.length} exact sample variations. All are optional at runtime. See README.md for the audit, mix, export and integration instructions.`, '',
    'Every numbered file is a different performance/timbre variation of the same event, not a sequential part. Weapons are single attacks, never firing loops. Explosions are separate assets.', '',
  ];
  for (const [id, cue] of Object.entries(AUDIO_MANIFEST.cues)) {
    lines.push(`## ${id}`, '', cue.description, '', `**Trigger:** ${cue.trigger}`, '',
      `**Mix:** ${cue.bus}; gain ${cue.gain}; pitch ${cue.pitch.join('–')}×; maximum ${cue.voices} simultaneous voices; minimum interval ${cue.intervalMs} ms; priority ${cue.priority}.`, '',
      `**Export:** ${AUDIO_MANIFEST.format}. Maximum duration ${cue.maxDuration} seconds.`, '',
      ...cue.files.map(file => `- \`assets/audio/${file}\``), '');
  }
  await writeChanged('MANIFEST.md', lines.join('\n'));
  return { available: files.length, expected: expected.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await indexAudioAssets();
  console.log(`Audio index: ${result.available}/${result.expected} samples present. Missing cues use procedural audio.`);
}
