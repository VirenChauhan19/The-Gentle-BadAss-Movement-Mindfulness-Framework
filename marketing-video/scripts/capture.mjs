import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { CAPTURES_DIR, ensureDirs, loadEnv } from './env.mjs';

ensureDirs();
const env = loadEnv();

for (const file of fs.readdirSync(CAPTURES_DIR)) {
  if (file.endsWith('.png') || file.endsWith('.webm')) {
    fs.rmSync(path.join(CAPTURES_DIR, file), { force: true });
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
});
const page = await context.newPage();

async function settle() {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function shot(name) {
  await page.screenshot({
    path: path.join(CAPTURES_DIR, `${name}.png`),
    fullPage: false,
  });
  console.log(`Captured ${name}.png`);
}

await page.goto(env.appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await settle();
await shot('01-signin-gate');

const nameField = page.getByLabel(/first name/i);
if (await nameField.count()) {
  await nameField.fill('Runner');
  await page.getByRole('button', { name: /continue as guest/i }).click();
  await page.waitForTimeout(1600);
}

await shot('02-home-top');

await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'instant' }));
await page.waitForTimeout(700);
await shot('03-home-about');

await page.evaluate(() => window.scrollTo({ top: 850, behavior: 'instant' }));
await page.waitForTimeout(700);
await shot('04-home-actions');

await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight - window.innerHeight, behavior: 'instant' }));
await page.waitForTimeout(700);
await shot('05-home-footer');

await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);
const themeButton = page.locator('button[aria-label*="theme" i], button[title*="Theme" i]').first();
if (await themeButton.count()) {
  await themeButton.click();
  await page.waitForTimeout(500);
  await shot('06-theme-picker');
}

await context.close();
await browser.close();

const manifest = {
  appUrl: env.appUrl,
  capturedAt: new Date().toISOString(),
  adminIncluded: false,
  privateDataCaptured: false,
  screenshots: fs.readdirSync(CAPTURES_DIR).filter(file => file.endsWith('.png')).sort(),
};
fs.writeFileSync(path.join(CAPTURES_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Wrote marketing-video/captures/manifest.json');
