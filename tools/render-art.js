// Renders the original artwork in tools/art/ to assets/.
//   node tools/render-art.js [packs] [slabs] [extras]
// Needs playwright and sharp (npm install in this folder: see package.json).
const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const want = new Set(process.argv.slice(2));
const all = want.size === 0;

function png(dataUrl) {
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function webp(buf, file, width) {
  const img = sharp(buf);
  await (width ? img.resize({ width }) : img).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(file);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => console.log('page:', m.text()));
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('file://' + path.join(__dirname, 'art', 'index.html').replace(/\\/g, '/'));
  await page.evaluate(() => window.ready);

  if (all || want.has('packs')) {
    const types = process.env.PACKS ? process.env.PACKS.split(',') : await page.evaluate(() => window.PACK_TYPES);
    for (const t of types) {
      const t0 = Date.now();
      const buf = png(await page.evaluate((n) => window.exportPack(n), t));
      fs.mkdirSync(path.join(ASSETS, 'packs'), { recursive: true });
      for (const w of [240, 480, 720]) await webp(buf, path.join(ASSETS, 'packs', `${t}-${w}.webp`), w);
      await webp(buf, path.join(ASSETS, 'packs', `${t}-1060.webp`));
      console.log('pack', t, Date.now() - t0, 'ms');
    }
  }

  if (all || want.has('slabs')) {
    const count = await page.evaluate(() => window.SLABS.length);
    fs.mkdirSync(path.join(ASSETS, 'slabs'), { recursive: true });
    for (let i = 0; i < count; i++) {
      const buf = png(await page.evaluate((n) => window.exportSlab(n), i));
      const id = await page.evaluate((n) => window.SLABS[n].id, i);
      await webp(buf, path.join(ASSETS, 'slabs', `${id}-400.webp`), 400);
      await webp(buf, path.join(ASSETS, 'slabs', `${id}-600.webp`), 600);
      console.log('slab', id);
    }
    const back = png(await page.evaluate(() => window.exportSlabBack()));
    await webp(back, path.join(ASSETS, 'slabs', 'slab-back-600.webp'), 600);
  }

  if (all || want.has('extras')) {
    const names = await page.evaluate(() => window.EXTRAS);
    fs.mkdirSync(path.join(ASSETS, 'demo'), { recursive: true });
    for (const n of names) {
      const buf = png(await page.evaluate((x) => window.exportExtra(x), n));
      if (n.endsWith('.png')) fs.writeFileSync(path.join(ASSETS, n), buf);
      else await webp(buf, path.join(ASSETS, n + '.webp'));
      console.log('extra', n);
    }
  }
  await browser.close();
})();
