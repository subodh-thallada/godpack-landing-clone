// End-to-end test of the web build's phone frame. On laptops, desktops and
// tablets the app opens inside phone.html at a fixed phone size, scaled to fit
// any window size or browser zoom; on phones it opens full screen, and asks to
// be turned upright in landscape. Checks the fit at many window sizes, that
// the app inside sees a phone-sized screen (so the tour points at the right
// things), the address bar following the app, the wheel scrolling sideways
// rows, Start over, and that a trade offer is waiting from the start.
// Screenshots go to e2e/screenshots/frame-*.
//
//   BASE=http://localhost:4180 node e2e/frame.e2e.js
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:4180';
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith('frame-')) fs.unlinkSync(path.join(OUT, f));

let fails = 0;
const ok = (name, cond, extra = '') => {
  if (!cond) fails++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const errors = [];
const watch = (p, tag) => {
  p.on('pageerror', (e) => errors.push(`${tag} pageerror ${e.message}`));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${tag} console ${m.text()}`);
  });
};
const inside = (a, b, slack = 0.5) =>
  a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.width <= b.x + b.width + slack && a.y + a.height <= b.y + b.height + slack;
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Windows a laptop or desktop really has, including browser zoom (a
// 1536x864 window at 125% is a 1229x691 viewport at 1.25x).
const SIZES = [
  [1280, 800, 2],
  [1440, 900, 2],
  [1512, 982, 2],
  [1366, 768, 1],
  [1920, 1080, 1],
  [2560, 1440, 1],
  [1229, 691, 1.25],
  [1067, 600, 1.2],
  [1600, 900, 1.2],
  [960, 540, 2],
  [1024, 768, 1],
  [800, 600, 1],
  [700, 900, 1],
];

(async () => {
  const browser = await chromium.launch();

  // ---- every window size: the phone fits, nothing scrolls, the app inside is phone-sized ----
  for (const [w, h, dpr] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const p = await ctx.newPage();
    watch(p, `${w}x${h}`);
    await p.goto(BASE + '/market');
    await p.waitForURL((u) => !u.pathname.startsWith('/phone.html'), { timeout: 15000 }).catch(() => {});
    const frame = p.frameLocator('#app');
    await frame.locator('[data-testid="ob-have-account"], [data-testid="screen-packs"]').first().waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
    const tag = `${w}x${h}@${dpr}`;
    const vp = { x: 0, y: 0, width: w, height: h };
    const phone = await p.locator('.phone').boundingBox();
    const screen = await p.locator('.screen').boundingBox();
    const about = (await p.locator('.about').isVisible()) ? await p.locator('.about').boundingBox() : null;
    const page = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      sh: document.documentElement.scrollHeight,
      iw: innerWidth,
      ih: innerHeight,
    }));
    const inner = await p.evaluate(() => {
      const f = document.getElementById('app').contentWindow;
      return { w: f.innerWidth, h: f.innerHeight, frame: f.self !== f.top };
    });
    const expect = Math.min(1, (h - 2 * (w < 600 ? 12 : 32)) / 868, (w - 2 * (w < 600 ? 12 : 32)) / 414);
    ok(`${tag}: framed on a laptop`, !!phone && (await p.evaluate(() => !!document.querySelector('.phone'))));
    ok(`${tag}: the whole phone is on screen`, inside(phone, vp), JSON.stringify(phone));
    ok(`${tag}: phone scaled to fit (never above life size)`, Math.abs(phone.height - 868 * expect) < 3 && expect <= 1, `${phone.height.toFixed(1)}px`);
    ok(`${tag}: the page itself never scrolls`, page.sw <= page.iw && page.sh <= page.ih);
    ok(`${tag}: the app sees a 390 x 764 phone screen`, inner.w === 390 && inner.h === 764 && inner.frame, `${inner.w}x${inner.h}`);
    ok(`${tag}: screen is centred in the bezel`, Math.abs(screen.x - phone.x - 12 * expect) < 2);
    if (w > 920 && h > 600) ok(`${tag}: notes sit beside the phone`, !!about && inside(about, vp) && !overlap(about, phone));
    else ok(`${tag}: notes give way to the phone`, !about);
    ok(`${tag}: the address bar shows the app's URL`, !p.url().includes('phone.html'), p.url());
    await p.screenshot({ path: path.join(OUT, `frame-size-${w}x${h}.png`) });
    await ctx.close();
  }

  // ---- the full flow on a laptop ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    watch(p, 'flow');
    await p.goto(BASE + '/');
    const f = p.frameLocator('#app');
    const id = (t) => f.locator(`[data-testid="${t}"]:visible`).first();
    const tap = async (t) => {
      await id(t).click();
      await p.waitForTimeout(300);
    };
    const visible = (t, timeout = 4000) =>
      id(t)
        .waitFor({ state: 'visible', timeout })
        .then(() => true)
        .catch(() => false);
    const snap = async (name) => {
      await p.waitForTimeout(350);
      await p.screenshot({ path: path.join(OUT, `frame-${name}.png`) });
    };
    const screenBox = async () => p.locator('#app').boundingBox();

    await id('ob-have-account').waitFor({ timeout: 30000 });
    ok('the onboarding opens in the phone', true);
    await p.waitForTimeout(2200);
    await snap('onboarding');
    ok('the address bar follows the app', (await p.evaluate(() => location.pathname)) === '/onboarding', p.url());
    await tap('ob-have-account');
    await tap('ob-age-yes');
    await id('auth-apple').waitFor();
    await p.waitForTimeout(500);
    await tap('auth-apple');
    await id('ob-notify-later').waitFor();
    await p.waitForTimeout(400);
    await tap('ob-notify-later');
    await p.waitForTimeout(2600);

    // The tour: every tip and spotlight sits inside the phone, by its target.
    ok('the tour starts', await visible('tour-tip', 8000));
    const app = await screenBox();
    for (let i = 0; i < 7; i++) {
      await p.waitForTimeout(500);
      const tip = await id('tour-tip').boundingBox();
      const hole = await f.locator('[data-testid="tour"] svg path').first().getAttribute('d');
      const m = hole && hole.match(/ZM([\d.]+) ([\d.]+)H([\d.]+)/);
      const title = await id('tour-title').innerText();
      ok(`tour ${i + 1} (${title}): the tip is inside the phone screen`, !!tip && inside(tip, app), JSON.stringify(tip));
      if (m) {
        const x = parseFloat(m[1]);
        const y = parseFloat(m[2]);
        ok(`tour ${i + 1}: the spotlight is on the phone screen`, x >= 0 && x <= 390 && y >= 0 && y <= 764, `${x},${y}`);
      }
      await snap(`tour-${i + 1}`);
      await tap('tour-next');
    }
    ok('the tour closes', !(await visible('tour-tip', 800)));

    // A trade offer is waiting from the start.
    await tap('tab-market');
    ok('the Market opens', await visible('screen-market'));
    ok('the address bar shows /market', await p.waitForURL(/\/market/, { timeout: 3000 }).then(() => true, () => false), p.url());
    const tabsRow = f.locator('[data-testid="market-tab-buy"]').locator('xpath=..');
    const before = await tabsRow.evaluate((el) => el.scrollLeft);
    const row = await tabsRow.boundingBox();
    await p.mouse.move(row.x + row.width / 2, row.y + row.height / 2);
    await p.mouse.wheel(0, 240);
    await p.waitForTimeout(300);
    const after = await tabsRow.evaluate((el) => el.scrollLeft);
    const max = await tabsRow.evaluate((el) => el.scrollWidth - el.clientWidth);
    ok('the wheel scrolls the Market tabs sideways', max <= 0 || after > before, `${before} -> ${after} of ${max}`);
    await p.mouse.move(app.x + 20, app.y + 300);
    await p.mouse.wheel(0, 300);
    await p.waitForTimeout(300);
    ok('the wheel still scrolls the page', (await f.locator('[data-testid="screen-market"]').evaluate((el) => el.scrollTop)) > 0);
    await tap('market-tab-trade');
    ok('a trade offer is waiting from the start', await visible('trade-incoming', 6000));
    await snap('trade-waiting');
    await tap('trade-accept');
    await p.waitForTimeout(500);
    ok('accepting it works', await visible('toast', 3000));
    // Another collector asks a few seconds later.
    ok('there is always another offer', await visible('trade-incoming', 9000));
    await snap('trade-next');

    // A reload stays put, still in the phone.
    await p.reload();
    await f.locator('[data-testid="screen-market"]').first().waitFor({ timeout: 30000 });
    ok('reloading keeps the app in the phone, on the same screen', (await p.locator('.phone').count()) === 1 && /\/market/.test(p.url()), p.url());

    // Start over: back to the onboarding with a clean slate.
    await p.click('#restart');
    await f.locator('[data-testid="ob-have-account"]').waitFor({ timeout: 30000 });
    const stored = await p.evaluate(() => localStorage.getItem('gp.session'));
    ok('Start over replays the onboarding with a fresh account', !stored || !JSON.parse(stored).state.s);
    await ctx.close();
  }

  // ---- tablets get the phone too ----
  for (const name of ['iPad (gen 7)', 'iPad Pro 11 landscape']) {
    const ctx = await browser.newContext({ ...devices[name] });
    const p = await ctx.newPage();
    watch(p, name);
    await p.goto(BASE + '/');
    await p.frameLocator('#app').locator('[data-testid="ob-have-account"]').waitFor({ timeout: 30000 });
    const vp = p.viewportSize();
    const phone = await p.locator('.phone').boundingBox();
    ok(`${name}: framed and fully on screen`, !!phone && inside(phone, { x: 0, y: 0, width: vp.width, height: vp.height }));
    await p.screenshot({ path: path.join(OUT, `frame-tablet-${name.replace(/\W+/g, '-')}.png`) });
    await ctx.close();
  }

  // ---- phones get the app full screen ----
  for (const name of ['iPhone SE', 'iPhone 13', 'iPhone 14 Pro Max', 'Pixel 7', 'Galaxy S9+']) {
    const ctx = await browser.newContext({ ...devices[name] });
    const p = await ctx.newPage();
    watch(p, name);
    await p.goto(BASE + '/');
    await p.locator('[data-testid="ob-have-account"]').waitFor({ timeout: 30000 });
    await p.waitForTimeout(2200);
    const vp = p.viewportSize();
    const r = await p.evaluate(() => ({ framed: !!document.querySelector('.phone'), sw: document.documentElement.scrollWidth, path: location.pathname }));
    ok(`${name}: full screen, no frame`, !r.framed && r.path === '/onboarding', r.path);
    ok(`${name}: nothing wider than the screen`, r.sw <= vp.width, `${r.sw} > ${vp.width}`);
    ok(`${name}: the turn-upright notice stays hidden in portrait`, !(await p.locator('.rotate').isVisible()));
    await p.screenshot({ path: path.join(OUT, `frame-phone-${name.replace(/\W+/g, '-')}.png`) });
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
    const p = await ctx.newPage();
    watch(p, 'landscape');
    await p.goto(BASE + '/');
    await p.waitForTimeout(1500);
    ok('a phone held sideways is asked to turn upright', await p.locator('.rotate').isVisible());
    ok('...and is not put in a frame', (await p.locator('.phone').count()) === 0);
    await p.screenshot({ path: path.join(OUT, 'frame-phone-landscape.png') });
    await ctx.close();
  }

  ok('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.log('FAIL crashed:', e.message);
  process.exit(1);
});
