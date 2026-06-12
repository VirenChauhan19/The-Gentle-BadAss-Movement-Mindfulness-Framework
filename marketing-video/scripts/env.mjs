import fs from 'node:fs';
import path from 'node:path';

export const VIDEO_DIR = path.resolve('marketing-video');
export const CAPTURES_DIR = path.join(VIDEO_DIR, 'captures');
export const ASSETS_DIR = path.join(VIDEO_DIR, 'assets');
export const OUTPUT_DIR = path.join(VIDEO_DIR, 'output');

export function ensureDirs() {
  for (const dir of [VIDEO_DIR, CAPTURES_DIR, ASSETS_DIR, OUTPUT_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadEnv() {
  const envPath = path.join(VIDEO_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (!process.env[key]) process.env[key] = rest.join('=');
    }
  }
  return {
    appUrl: process.env.APP_URL || 'https://laultrarunandbee.web.app/',
    adminEmail: process.env.ADMIN_EMAIL || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    userEmail: process.env.USER_EMAIL || '',
    userPassword: process.env.USER_PASSWORD || '',
    useHiggsfield: (process.env.USE_HIGGSFIELD || 'false').toLowerCase() === 'true',
    voiceProvider: process.env.VOICE_PROVIDER || '',
  };
}
