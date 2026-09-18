import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox'],
});

const reviewDir = new URL('../.impeccable/review/', import.meta.url);
await mkdir(reviewDir, { recursive: true });

const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

async function capture(name, width, height, url, fullPage = true) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: new URL(name, reviewDir).pathname, fullPage });
}

await capture('hero-repro.png', 1536, 1024, 'http://127.0.0.1:8787/sunset-forecast/new-delhi-india', false);
await capture('desktop.png', 1440, 1000, 'http://127.0.0.1:8787/sunset-forecast/new-delhi-india');
await capture('tablet.png', 768, 1024, 'http://127.0.0.1:8787/sunset-forecast/new-delhi-india');
await capture('mobile.png', 390, 844, 'http://127.0.0.1:8787/sunset-forecast/new-delhi-india');
await capture('landing-desktop.png', 1440, 900, 'http://127.0.0.1:8787/');
await capture('landing-mobile.png', 390, 844, 'http://127.0.0.1:8787/');

await browser.close();
