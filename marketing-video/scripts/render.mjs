import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { ASSETS_DIR, CAPTURES_DIR, OUTPUT_DIR, ensureDirs } from './env.mjs';

ensureDirs();

const publicCaptures = path.resolve('public', 'captures');
const publicAssets = path.resolve('public', 'assets');
fs.mkdirSync(publicCaptures, { recursive: true });
fs.mkdirSync(publicAssets, { recursive: true });

function cleanPublicCopies() {
  for (const dir of [publicCaptures, publicAssets]) {
    if (fs.existsSync(dir) && dir.startsWith(path.resolve('public'))) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

const required = [
  '01-signin-gate.png',
  '02-home-top.png',
  '03-home-about.png',
  '04-home-actions.png',
  '05-home-footer.png',
  '06-theme-picker.png',
];

const missing = required.filter(file => !fs.existsSync(path.join(CAPTURES_DIR, file)));
if (missing.length) {
  throw new Error(`Missing captures: ${missing.join(', ')}. Run npm run video:capture first.`);
}

await import('./soundtrack.mjs');

for (const file of required) {
  fs.copyFileSync(path.join(CAPTURES_DIR, file), path.join(publicCaptures, file));
}
fs.copyFileSync(path.join(ASSETS_DIR, 'music.wav'), path.join(publicAssets, 'music.wav'));

const entry = path.resolve('marketing-video/src/index.jsx');
const serveUrl = await bundle({
  entryPoint: entry,
  webpackOverride: current => current,
});

const composition = await selectComposition({
  serveUrl,
  id: 'LaUltraPromo',
});

const output = path.join(OUTPUT_DIR, 'la-ultra-run-and-bee-promo.mp4');
try {
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: output,
    inputProps: {},
    chromiumOptions: {
      gl: 'angle',
    },
  });
} finally {
  cleanPublicCopies();
}

const stat = fs.statSync(output);
console.log(`Rendered ${output} (${(stat.size / 1048576).toFixed(1)} MB)`);
