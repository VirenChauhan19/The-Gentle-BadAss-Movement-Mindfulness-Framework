import fs from 'node:fs';
import path from 'node:path';
import { ASSETS_DIR, ensureDirs } from './env.mjs';

ensureDirs();

const out = path.join(ASSETS_DIR, 'music.wav');
if (fs.existsSync(out)) {
  console.log('Soundtrack already exists.');
} else {
  const sampleRate = 48000;
  const seconds = 60;
  const samples = sampleRate * seconds;
  const data = Buffer.alloc(samples * 2);

  const notes = [130.81, 164.81, 196.0, 246.94];
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const bar = Math.floor(t / 4) % notes.length;
    const root = notes[bar];
    const env = Math.min(1, t / 4) * Math.min(1, (seconds - t) / 4);
    const pulse = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.5 * t);
    const tone =
      Math.sin(2 * Math.PI * root * t) * 0.16 +
      Math.sin(2 * Math.PI * root * 1.5 * t) * 0.08 +
      Math.sin(2 * Math.PI * root * 2 * t) * 0.05;
    const value = Math.max(-1, Math.min(1, tone * env * pulse * 0.35));
    data.writeInt16LE(Math.round(value * 32767), i * 2);
  }

  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  fs.writeFileSync(out, Buffer.concat([header, data]));
  console.log(`Wrote ${out}`);
}
