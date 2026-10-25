// Renders the mobile demo's icons from tools/art into mobile/assets.
//   node tools/render-app-icons.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..', 'mobile', 'assets');
const ICONS = [
  ['icon', 1024, 'icon.png'],
  ['foreground', 1024, 'android-icon-foreground.png'],
  ['background', 1024, 'android-icon-background.png'],
  ['mono', 1024, 'android-icon-monochrome.png'],
  ['splash', 512, 'splash-icon.png'],
  ['favicon', 196, 'favicon.png'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, 'art', 'index.html').replace(/\\/g, '/'));
  await page.evaluate(() => window.ready);
  for (const [kind, size, file] of ICONS) {
    const data = await page.evaluate(([k, s]) => window.renderAppIcon(k, s).toDataURL('image/png'), [kind, size]);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', file);
  }
  await browser.close();
})();
