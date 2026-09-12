import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const audioExtensions = new Set(['.wav', '.ogg', '.mp3', '.m4a', '.aac']);

async function copyRuntimeAudio(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = resolve(source, entry.name), to = resolve(destination, entry.name);
    if (entry.isDirectory()) await copyRuntimeAudio(from, to);
    else if (entry.name === 'catalog.json' || audioExtensions.has(extname(entry.name).toLowerCase())) await cp(from, to);
  }
}

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, 'vendor'), { recursive: true });

await Promise.all([
  cp(resolve(root, 'main.js'), resolve(dist, 'main.js')),
  cp(resolve(root, 'styles.css'), resolve(dist, 'styles.css')),
  cp(resolve(root, 'src'), resolve(dist, 'src'), { recursive: true }),
  copyRuntimeAudio(resolve(root, 'assets', 'audio'), resolve(dist, 'assets', 'audio')),
  cp(resolve(root, 'node_modules', 'phaser', 'dist', 'phaser.min.js'), resolve(dist, 'vendor', 'phaser.min.js')),
]);

const sourceHtml = await readFile(resolve(root, 'index.html'), 'utf8');
const uploadHtml = sourceHtml.replace('./node_modules/phaser/dist/phaser.min.js', './vendor/phaser.min.js');
if (uploadHtml === sourceHtml) throw new Error('Could not replace the Phaser development path in index.html.');
await writeFile(resolve(dist, 'index.html'), uploadHtml);

console.log(`Prepared itch.io web build in ${dist}`);
