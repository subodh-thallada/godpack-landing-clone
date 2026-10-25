// Renders the link-preview video and poster from tools/og-video/.
//   node tools/render-og-video.js            -> assets/og/og-video.mp4 + assets/og-image.jpg
//   node tools/render-og-video.js --frames D -> also writes review frames to directory D
// Uses installed Google Chrome (channel "chrome") for its H.264 encoder.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const framesAt = process.argv.indexOf('--frames');
const framesDir = framesAt > -1 ? path.resolve(process.argv[framesAt + 1]) : null;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(pathToFileURL(path.join(__dirname, 'og-video', 'index.html')).href);

  if (framesDir) {
    fs.mkdirSync(framesDir, { recursive: true });
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * 6;
      const png = await page.evaluate((t) => window.frame(t), t);
      fs.writeFileSync(
        path.join(framesDir, `t${t.toFixed(2).padStart(5, '0')}.png`),
        Buffer.from(png.split(',')[1], 'base64'),
      );
    }
    console.log('review frames ->', framesDir);
  }

  const t0 = Date.now();
  const result = await page.evaluate(() => window.encode());
  const mp4 = Buffer.from(result.data, 'base64');
  fs.mkdirSync(path.join(ROOT, 'assets', 'og'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets', 'og', 'og-video.mp4'), mp4);
  console.log(
    `video: ${result.frames} frames, ${result.codec}, ${(mp4.length / 1024).toFixed(0)} KB, ${Date.now() - t0} ms`,
  );

  const jpg = await page.evaluate(() => window.poster(0));
  fs.writeFileSync(path.join(ROOT, 'assets', 'og-image.jpg'), Buffer.from(jpg.split(',')[1], 'base64'));
  console.log('poster: assets/og-image.jpg');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
