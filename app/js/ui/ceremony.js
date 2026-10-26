// Pack-opening ceremony for the app clone (adapted from the landing page's
// demo in /js/demo.js). Imported on demand by the store.
//
//   PackDemo.preload(index) -> Promise   decode the art the ceremony needs
//   PackDemo.open({ root, pack, from, card, actions, onClose })
//     card    { id, name, value, tier } — the pull to reveal
//     actions [{ label, primary, onClick }] — buttons shown after the reveal
//
// The ceremony runs in four beats inside a full-screen layer:
//   1. Sealed  — the pack flies in from its spot in the carousel. Drag across
//                it (anywhere on screen) or press "Open pack" to tear the top.
//   2. Torn    — the strip flies off with foil debris and a fan of light, a
//                token card rises out and the pack drops away.
//   3. Token   — the token spins and takes on the colour of the pull's tier
//                (core, hit, chase, grail), then settles as a sealed slab.
//   4. Reveal  — tap the slab: streaks, arcs, a burst and a flip show the
//                card, with its value and an "Enter Godpack" button.
// Effects are drawn on one canvas; cards, pack and text are DOM.
window.PackDemo = (() => {
  'use strict';

  const PACKS = ['arena', 'master', 'starter', 'trainer'];
  const PACK_TINT = [
    ['#b98cff', '#7a2cf0', '#e9dcff'],
    ['#7c6cff', '#ff8ee2', '#cfefff'],
    ['#cbb8ff', '#9a83e6', '#ffffff'],
    ['#e4e2ec', '#a39fb2', '#c59cff'],
  ];

  const TIERS = {
    core: { rgb: [56, 158, 255], wash: 'rgba(56,158,255,0.38)', label: 'core' },
    hit: { rgb: [140, 92, 255], wash: 'rgba(140,92,255,0.42)', label: 'hit' },
    chase: { rgb: [255, 76, 160], wash: 'rgba(255,76,160,0.40)', label: 'chase' },
    grail: { rgb: [255, 186, 64], wash: 'rgba(255,194,75,0.55)', label: 'grail' },
  };

  // Demo pulls: original cards from the ribbon, weighted toward the exciting tiers.
  const POOL = [
    { id: 'gilded-comet', name: 'Gilded Comet', value: 537.52, tier: 'grail' },
    { id: 'aurora-peaks', name: 'Aurora Peaks', value: 1248.0, tier: 'grail' },
    { id: 'volcanic-heart', name: 'Volcanic Heart', value: 412.0, tier: 'grail' },
    { id: 'coral-drift', name: 'Coral Drift', value: 312.4, tier: 'chase' },
    { id: 'crystal-hollow', name: 'Crystal Hollow', value: 236.0, tier: 'chase' },
    { id: 'nebula-bloom', name: 'Nebula Bloom', value: 188.75, tier: 'chase' },
    { id: 'frost-halo', name: 'Frost Halo', value: 96.1, tier: 'hit' },
    { id: 'prism-gate', name: 'Prism Gate', value: 74.25, tier: 'hit' },
    { id: 'solar-crown', name: 'Solar Crown', value: 61.2, tier: 'hit' },
    { id: 'storm-spire', name: 'Storm Spire', value: 41.8, tier: 'hit' },
    { id: 'tidal-glass', name: 'Tidal Glass', value: 28.6, tier: 'core' },
    { id: 'moonlit-grove', name: 'Moonlit Grove', value: 19.95, tier: 'core' },
    { id: 'ember-dunes', name: 'Ember Dunes', value: 14.3, tier: 'core' },
  ];
  const TIER_ODDS = { grail: 0.3, chase: 0.25, hit: 0.25, core: 0.2 };

  const packSrc = (i) => `/assets/packs/${PACKS[i]}-720.webp`;
  const slabSrc = (id) => `/assets/slabs/${id}-600.webp`;
  const SLAB_BACK = '/assets/slabs/slab-back-600.webp';
  const SLAB_RATIO = 1005 / 600;
  const PACK_RATIO = 1.4;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- helpers

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = {
    out3: (t) => 1 - Math.pow(1 - t, 3),
    in3: (t) => t * t * t,
    inOut3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
  };
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 60) : ms));
  const money = (v) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function el(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function decode(src) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    return (
      img.decode
        ? img.decode()
        : new Promise((r) => {
            img.onload = r;
          })
    ).then(
      () => img,
      () => img,
    );
  }

  function pick() {
    let r = Math.random(),
      tier = 'core';
    for (const [t, p] of Object.entries(TIER_ODDS)) {
      if ((r -= p) <= 0) {
        tier = t;
        break;
      }
    }
    const cards = POOL.filter((c) => c.tier === tier);
    return cards[Math.floor(Math.random() * cards.length)];
  }

  // The hexagon-and-sparkle mark, as SVG markup.
  const MARK = `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path fill-rule="evenodd" d="${hexPath(46, 9)} ${hexPath(29, 5)}"/><path d="M0-22Q2.6-2.6 22 0Q2.6 2.6 0 22Q-2.6 2.6-22 0Q-2.6-2.6 0-22Z"/></svg>`;
  function hexPath(r, round) {
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 3;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    let d = '';
    for (let k = 0; k < 6; k++) {
      const p = pts[k],
        prev = pts[(k + 5) % 6],
        next = pts[(k + 1) % 6];
      const t = round / r;
      const a = [lerp(p[0], prev[0], t), lerp(p[1], prev[1], t)];
      const b = [lerp(p[0], next[0], t), lerp(p[1], next[1], t)];
      d += `${k ? 'L' : 'M'}${a[0].toFixed(2)} ${a[1].toFixed(2)}Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
    }
    return d + 'Z';
  }

  // ------------------------------------------------------------------- styles

  const CSS = `
.pd{position:absolute;inset:0;overflow:hidden;outline:none;color:#f4f2f9;font-family:inherit;opacity:0;transition:opacity 240ms ease-out}
.pd[data-in="true"]{opacity:1}
.pd-bg{position:absolute;inset:0;background:#000}
.pd-wash{position:absolute;inset:0;opacity:0;pointer-events:none;background:linear-gradient(180deg,var(--wash),#000 45%);transition:opacity 700ms ease-out}
.pd-wash[data-on="true"]{opacity:1}
.pd-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.pd-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.pd-back{position:absolute;left:max(4px,env(safe-area-inset-left));top:max(6px,env(safe-area-inset-top));z-index:20;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;background:none;color:#f4f2f9;cursor:pointer}
.pd-back:focus-visible,.pd-btn:focus-visible,.pd-flip:focus-visible,.pd-cta:focus-visible{outline:2px solid #ae96ff;outline-offset:4px}
.pd-stage{position:absolute;inset:0;touch-action:none;user-select:none;-webkit-user-select:none}
.pd-pack{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.pd-pack img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;pointer-events:none}
.pd-strip{transform-origin:100% var(--seam);will-change:transform,opacity}
.pd-seam{position:absolute;left:9%;width:82%;height:2px;overflow:hidden;background:linear-gradient(90deg,transparent,rgba(183,161,238,.33),transparent);pointer-events:none}
.pd-seam i{display:block;width:35%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,243,220,.8),transparent);animation:pd-shimmer 2.6s linear infinite}
@keyframes pd-shimmer{from{transform:translateX(-100%)}to{transform:translateX(290%)}}
.pd-glow{position:absolute;left:9%;height:8px;margin-top:-3px;width:0;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,.15),#fff);box-shadow:0 0 12px 3px rgba(255,255,255,.9),0 0 30px 8px rgba(190,160,255,.6);opacity:0;pointer-events:none}
.pd-flare{position:absolute;left:-50%;width:200%;height:160px;margin-top:-80px;opacity:0;pointer-events:none;background:radial-gradient(ellipse,var(--flare) 0%,rgba(255,223,152,.53) 10%,rgba(255,214,122,.2) 35%,transparent 70%)}
.pd-hint{position:absolute;left:12px;right:12px;text-align:center;transition:opacity 180ms}
.pd-hint p{margin:0 0 12px;font-size:14px;color:#bcb8ca}
.pd-btn{min-height:44px;min-width:44px;padding:8px 12px;border:1px solid #48404f;border-radius:10px;background:#282330;color:inherit;font:inherit;font-size:16px;font-weight:600;cursor:pointer}
.pd-hint[data-off="true"]{opacity:0;pointer-events:none}
.pd-token{position:absolute;left:0;top:0;transform-origin:50% 50%;transform-style:preserve-3d;will-change:transform;pointer-events:none}
.pd-face{position:absolute;inset:0;border-radius:4.5%/3.2%;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:var(--metal);box-shadow:inset 0 0 0 3px var(--rim),inset 0 0 0 7px rgba(255,255,255,.35),0 18px 50px -12px rgba(0,0,0,.9)}
.pd-face.back{transform:rotateY(180deg)}
.pd-face::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 9%,rgba(255,255,255,.38) 12%,transparent 15% 24%);background-size:200% 200%;animation:pd-sheen 1.6s linear infinite;mix-blend-mode:overlay}
@keyframes pd-sheen{from{background-position:0 0}to{background-position:-100% 0}}
.pd-face svg.arcs{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:rgba(255,255,255,.75);stroke-width:1.2}
.pd-face .mark{position:absolute;left:50%;top:50%;width:46%;transform:translate(-50%,-50%)}
.pd-face .mark svg{display:block;width:100%;fill:url(#pd-holo);filter:drop-shadow(0 1px 2px rgba(0,0,0,.25))}
.pd-face .word{position:absolute;left:0;right:0;text-align:center;font-weight:700;letter-spacing:-.03em;color:rgba(255,255,255,.92);text-shadow:0 1px 2px rgba(0,0,0,.25)}
.pd-face .word.top{top:17%}
.pd-face .word.bottom{bottom:17%;transform:rotate(180deg)}
.pd-token[data-tier] .pd-face{transition:background 300ms}
.pd-aura{position:absolute;left:50%;top:50%;width:260%;height:200%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,var(--aura),transparent);opacity:0;pointer-events:none;transition:opacity 400ms}
.pd-reveal{position:absolute;inset:0;display:flex;flex-direction:column}
.pd-body{flex:1 1 0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px 16px;gap:40px}
.pd-card{position:relative;flex:none;perspective:1100px;isolation:isolate}
.pd-flip{position:relative;display:block;width:100%;height:100%;padding:0;border:0;background:none;color:inherit;cursor:pointer}
.pd-turn,.pd-tilt{position:absolute;inset:0;transform-style:preserve-3d}
.pd-side{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.pd-side img{display:block;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;pointer-events:none}
.pd-side.front{transform:rotateY(180deg)}
.pd-card[data-landed="true"] .pd-turn{transform:none!important}
.pd-card[data-landed="true"] .pd-side.front{transform:none;backface-visibility:visible}
.pd-card[data-landed="true"] .pd-side.backface{display:none}
.pd-card[data-landed="true"] .pd-flip{cursor:default}
.pd-glint{position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:4%/2.5%;background:linear-gradient(121deg,transparent 41%,rgba(255,255,255,.28) 45.5%,rgba(255,255,255,.92) 49.4%,rgba(255,255,255,.92) 50.6%,rgba(255,255,255,.28) 54.5%,transparent 59%) 100% 100%/300% 300%;opacity:0}
.pd-card[data-landed="true"] .pd-glint{animation:pd-glint 560ms cubic-bezier(.3,.1,.3,1) forwards}
@keyframes pd-glint{0%{opacity:1;background-position:100% 100%}99%{opacity:1}100%{opacity:0;background-position:0 0}}
.pd-card-aura{position:absolute;inset:-12%;z-index:-1;background:radial-gradient(rgba(171,131,239,.145),transparent 68%);pointer-events:none}
.pd-tap{position:absolute;top:100%;left:0;right:0;margin:22px 0 0;text-align:center;font-size:14px;color:#bcb8ca;transition:opacity 200ms}
.pd-chrome{display:flex;flex-direction:column;align-self:stretch;flex:none;opacity:0;visibility:hidden;transition:opacity 260ms ease-out}
.pd-chrome[data-on="true"]{opacity:1;visibility:visible}
.pd-facts{min-height:80px;display:flex;flex-direction:column;justify-content:center;gap:6px;text-align:center}
.pd-value{margin:0;font-size:32px;line-height:38px;font-weight:800;color:#3dd68c;font-variant-numeric:tabular-nums}
.pd-name{margin:0;font-size:18px;line-height:24px;font-weight:700;letter-spacing:-.2px}
.pd-actions{flex:none;box-sizing:border-box;min-height:86px;padding:16px}
.pd-row{display:flex;gap:10px;width:100%;max-width:480px;margin:0 auto}
.pd-cta{flex:1 1 0;display:flex;align-items:center;justify-content:center;min-height:54px;padding:10px;border-radius:999px;background:#f4f2f8;color:#0b0a0e;font-size:16px;font-weight:600;text-decoration:none}
.pd-cta:hover{background:#fff}
.pd-cta--alt{background:#24202d;color:#f4f2f9;border:1px solid #3a3849}
.pd-cta--alt:hover{background:#2e2939}
button.pd-cta{border:0;font-family:inherit;cursor:pointer}
button.pd-cta.pd-cta--alt{border:1px solid #3a3849}
@media (prefers-reduced-motion:reduce){.pd-seam i,.pd-face::before{animation:none}}
`;

  let styled = false;
  function injectStyles() {
    if (styled) return;
    styled = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.append(s);
  }

  // ----------------------------------------------------------------- effects
  // A tiny particle/effect host on one canvas. Each effect is a function
  // (ctx, t, dt) -> boolean (keep alive); t is seconds since it started.

  class FX {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.items = [];
      this.raf = 0;
      this.last = 0;
      this.resize();
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = this.canvas.clientWidth;
      this.h = this.canvas.clientHeight;
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.dpr = dpr;
    }
    add(fn) {
      this.items.push({ fn, born: performance.now() });
      if (!this.raf) {
        this.last = 0;
        this.raf = requestAnimationFrame((n) => this.frame(n));
      }
    }
    frame(now) {
      this.raf = 0;
      const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
      this.last = now;
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      this.items = this.items.filter((it) => {
        c.save();
        const keep = it.fn(c, (now - it.born) / 1000, dt);
        c.restore();
        return keep;
      });
      if (this.items.length) this.raf = requestAnimationFrame((n) => this.frame(n));
      else c.clearRect(0, 0, this.w, this.h);
    }
    stop() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.items = [];
    }
  }

  // Foil confetti bursting from the torn seam.
  function debris(x0, x1, y, colors) {
    const bits = Array.from({ length: 46 }, () => ({
      x: rand(x0, x1),
      y: y + rand(-3, 3),
      vx: rand(-160, 160),
      vy: rand(-420, -120),
      w: rand(3, 9),
      h: rand(6, 16),
      rot: rand(0, Math.PI),
      vr: rand(-10, 10),
      c: colors[Math.floor(Math.random() * colors.length)],
      life: rand(0.9, 1.6),
    }));
    return (c, t, dt) => {
      let alive = false;
      for (const b of bits) {
        if (t > b.life) continue;
        alive = true;
        b.vy += 900 * dt;
        b.vx *= 1 - 1.2 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
        c.save();
        c.translate(b.x, b.y);
        c.rotate(b.rot);
        c.scale(1, Math.cos(b.rot * 1.7));
        c.globalAlpha = clamp(1 - t / b.life) * 0.95;
        c.fillStyle = b.c;
        c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        c.restore();
      }
      return alive;
    };
  }

  // Beams of light fanning up out of the opened pack.
  function rays(cx, cy, width, rgb) {
    const beams = Array.from({ length: 16 }, () => ({
      a: rand(-0.45, 0.45),
      len: rand(0.55, 1.05),
      w: rand(4, 16),
      off: rand(-width * 0.35, width * 0.35),
      d: rand(0, 0.25),
      warm: Math.random() < 0.35,
    }));
    const span = 1.5;
    return (c, t) => {
      if (t > span) return false;
      c.globalCompositeOperation = 'lighter';
      for (const b of beams) {
        const p = clamp((t - b.d) / 0.35);
        const fade = clamp(1 - (t - 0.5) / (span - 0.5));
        if (p <= 0) continue;
        const L = b.len * cy * 1.1 * ease.out3(p);
        c.save();
        c.translate(cx + b.off, cy);
        c.rotate(b.a);
        const g = c.createLinearGradient(0, 0, 0, -L);
        const col = b.warm ? [255, 226, 160] : rgb;
        g.addColorStop(0, rgba(col, 0.55 * fade));
        g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-b.w * 0.3, 0);
        c.lineTo(b.w * 0.3, 0);
        c.lineTo(b.w, -L);
        c.lineTo(-b.w, -L);
        c.closePath();
        c.fill();
        c.restore();
      }
      return true;
    };
  }

  // A diagonal band of light streaks racing behind the slab.
  function streaks(w, h, rgb) {
    const lines = Array.from({ length: 90 }, () => ({
      o: rand(-1, 1),
      s: rand(0.6, 1.4),
      l: rand(40, 160),
      ph: Math.random(),
    }));
    const dur = 0.85;
    const ang = -0.42;
    return (c, t) => {
      if (t > dur) return false;
      const fade = Math.sin(Math.PI * clamp(t / dur));
      c.translate(w / 2, h / 2);
      c.rotate(ang);
      c.globalCompositeOperation = 'lighter';
      const band = Math.min(w, h) * 0.16;
      const L = Math.hypot(w, h);
      for (const s of lines) {
        const x = ((s.ph + t * s.s * 1.6) % 1) * L * 1.4 - L * 0.7;
        c.strokeStyle = rgba(rgb, 0.5 * fade);
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, s.o * band);
        c.lineTo(x + s.l, s.o * band);
        c.stroke();
      }
      const g = c.createLinearGradient(0, -band, 0, band);
      g.addColorStop(0, rgba(rgb, 0));
      g.addColorStop(0.5, rgba(rgb, 0.18 * fade));
      g.addColorStop(1, rgba(rgb, 0));
      c.fillStyle = g;
      c.fillRect(-L, -band, L * 2, band * 2);
      return true;
    };
  }

  // Crackling arcs around a rectangle.
  function arcs(rect, rgb, dur) {
    let next = 0,
      bolts = [];
    const pt = () => {
      const side = Math.floor(Math.random() * 4);
      const u = Math.random();
      return [
        [rect.x + u * rect.w, rect.y],
        [rect.x + rect.w, rect.y + u * rect.h],
        [rect.x + u * rect.w, rect.y + rect.h],
        [rect.x, rect.y + u * rect.h],
      ][side];
    };
    return (c, t) => {
      if (t > dur) return false;
      if (t > next) {
        next = t + rand(0.04, 0.09);
        bolts = Array.from({ length: 3 }, () => {
          const a = pt(),
            cx = rect.x + rect.w / 2,
            cy = rect.y + rect.h / 2;
          const out = [a[0] + (a[0] - cx) * rand(0.15, 0.4), a[1] + (a[1] - cy) * rand(0.1, 0.3)];
          const path = [a];
          for (let k = 1; k <= 7; k++)
            path.push([lerp(a[0], out[0], k / 7) + rand(-10, 10), lerp(a[1], out[1], k / 7) + rand(-10, 10)]);
          return path;
        });
      }
      c.globalCompositeOperation = 'lighter';
      c.shadowColor = rgba(rgb, 1);
      c.shadowBlur = 14;
      for (const path of bolts) {
        c.strokeStyle = rgba([255, 255, 255], 0.9);
        c.lineWidth = 1.6;
        c.beginPath();
        path.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.stroke();
        c.strokeStyle = rgba(rgb, 0.7);
        c.lineWidth = 4;
        c.stroke();
      }
      return true;
    };
  }

  // Radial speed lines exploding outward.
  function speedLines(cx, cy, w, h, dur) {
    const L = Math.hypot(w, h) / 2;
    const lines = Array.from({ length: 110 }, () => ({
      a: rand(0, Math.PI * 2),
      r0: rand(0.12, 0.5),
      len: rand(0.15, 0.45),
      w: rand(2, 7),
      s: rand(0.8, 1.4),
    }));
    return (c, t) => {
      if (t > dur) return false;
      const fade = clamp(1 - Math.pow(t / dur, 2));
      c.globalCompositeOperation = 'lighter';
      for (const s of lines) {
        const r = (s.r0 + t * s.s * 0.9) * L;
        const x0 = cx + Math.cos(s.a) * r,
          y0 = cy + Math.sin(s.a) * r;
        const x1 = cx + Math.cos(s.a) * (r + s.len * L),
          y1 = cy + Math.sin(s.a) * (r + s.len * L);
        const g = c.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, `rgba(255,255,255,0)`);
        g.addColorStop(1, `rgba(255,255,255,${0.85 * fade})`);
        c.strokeStyle = g;
        c.lineWidth = s.w;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
      }
      return true;
    };
  }

  // A rotating ring of marks, for the top tier.
  function rune(cx, cy, r, rgb, dur) {
    return (c, t) => {
      if (t > dur) return false;
      const p = clamp(t / dur);
      const scale = lerp(0.65, 1.12, ease.out3(p));
      const alpha = Math.sin(Math.PI * Math.min(1, p * 1.25)) * 0.95;
      c.translate(cx, cy);
      c.scale(scale, scale);
      c.globalCompositeOperation = 'lighter';
      c.shadowColor = rgba(rgb, 1);
      c.shadowBlur = 18;
      c.strokeStyle = rgba(rgb, alpha);
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 0, r * 0.86, 0, Math.PI * 2);
      c.stroke();
      c.rotate(t * 0.9);
      for (let k = 0; k < 36; k++) {
        c.rotate((Math.PI * 2) / 36);
        c.fillStyle = rgba(rgb, alpha * (k % 3 ? 0.6 : 1));
        if (k % 3) c.fillRect(-1, -r * 0.985, 2, r * 0.1);
        else {
          c.beginPath();
          c.moveTo(0, -r * 0.99);
          c.lineTo(5, -r * 0.9);
          c.lineTo(0, -r * 0.88);
          c.lineTo(-5, -r * 0.9);
          c.fill();
        }
      }
      c.rotate(-t * 1.8);
      c.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        c.rotate(Math.PI / 3);
        c.beginPath();
        c.arc(0, -r * 0.68, r * 0.12, 0, Math.PI * 2);
        c.stroke();
      }
      return true;
    };
  }

  // Soft wedge rays that linger behind the card after it lands.
  function afterglow(cx, cy, rgb, dur) {
    const wedges = Array.from({ length: 18 }, (_, i) => ({
      a: (i / 18) * Math.PI * 2 + rand(-0.08, 0.08),
      w: rand(0.05, 0.12),
      l: rand(0.7, 1.1),
    }));
    return (c, t) => {
      if (t > dur) return false;
      const fade = Math.pow(1 - t / dur, 1.6) * clamp(t / 0.15);
      const R = Math.max(c.canvas.width, c.canvas.height);
      c.translate(cx, cy);
      c.rotate(t * 0.12);
      c.globalCompositeOperation = 'lighter';
      for (const wd of wedges) {
        const g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.5 * wd.l);
        g.addColorStop(0, rgba(rgb, 0.32 * fade));
        g.addColorStop(1, rgba(rgb, 0));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, R * 0.5 * wd.l, wd.a - wd.w, wd.a + wd.w);
        c.closePath();
        c.fill();
      }
      return true;
    };
  }

  // Sparks flung from a point.
  function sparks(cx, cy, rgb, count, speed) {
    const ps = Array.from({ length: count }, () => {
      const a = rand(0, Math.PI * 2),
        v = rand(0.3, 1) * speed;
      return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.6, 1.3), r: rand(1, 2.6) };
    });
    return (c, t, dt) => {
      let alive = false;
      c.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        if (t > p.life) continue;
        alive = true;
        p.vx *= 1 - 2.2 * dt;
        p.vy = p.vy * (1 - 2.2 * dt) + 60 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = 1 - t / p.life;
        c.fillStyle = rgba(t < p.life * 0.3 ? [255, 255, 255] : rgb, a);
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      }
      return alive;
    };
  }

  // --------------------------------------------------------------- ceremony

  class Ceremony {
    constructor(opts) {
      this.o = opts;
      const given = opts.card;
      this.card = given ? { ...given, tier: TIERS[given.tier] ? given.tier : 'core' } : pick();
      this.tier = TIERS[this.card.tier];
      this.cleanups = [];
      this.closed = false;
      this.prevFocus = document.activeElement;
    }

    on(target, type, fn, opt) {
      target.addEventListener(type, fn, opt);
      this.cleanups.push(() => target.removeEventListener(type, fn, opt));
    }

    // ---- DOM ----

    build() {
      const { root, pack, enterHref } = this.o;
      root.textContent = '';
      const wrap = el('div', 'pd', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Pack opening',
        tabindex: '-1',
      });
      wrap.innerHTML = `
        <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="pd-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe6f7"/><stop offset=".3" stop-color="#e2c2ff"/><stop offset=".55" stop-color="#a996ff"/><stop offset=".8" stop-color="#a8d4ff"/><stop offset="1" stop-color="#f2fdff"/></linearGradient></defs></svg>
        <div class="pd-bg"><div class="pd-wash pd-wash-cool" style="--wash:rgba(124,92,255,0.18)"></div><div class="pd-wash pd-wash-warm" style="--wash:${this.tier.wash}"></div></div>
        <canvas class="pd-fx" aria-hidden="true"></canvas>
        <div class="pd-flash" aria-hidden="true"></div>
        <div class="pd-stage"></div>
        <button class="pd-back" type="button" aria-label="Close demo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>`;
      root.append(wrap);
      this.wrap = wrap;
      this.stage = wrap.querySelector('.pd-stage');
      this.flash = wrap.querySelector('.pd-flash');
      this.coolWash = wrap.querySelector('.pd-wash-cool');
      this.warmWash = wrap.querySelector('.pd-wash-warm');
      this.fx = new FX(wrap.querySelector('.pd-fx'));

      // Pack: a body below the seam and a strip above it, both the same art.
      const packEl = el('div', 'pd-pack');
      const src = packSrc(pack);
      packEl.innerHTML = `
        <div class="pd-body-half"><img alt="" src="${src}" draggable="false"></div>
        <div class="pd-strip"><img alt="" src="${src}" draggable="false"></div>
        <div class="pd-flare" aria-hidden="true"></div>
        <div class="pd-seam" aria-hidden="true"><i></i></div>
        <div class="pd-glow" aria-hidden="true"></div>`;
      this.packEl = packEl;
      this.bodyHalf = packEl.querySelector('.pd-body-half');
      this.strip = packEl.querySelector('.pd-strip');
      this.seam = packEl.querySelector('.pd-seam');
      this.glow = packEl.querySelector('.pd-glow');
      this.flare = packEl.querySelector('.pd-flare');
      [this.bodyHalf, this.strip].forEach((n) => {
        n.style.position = 'absolute';
        n.style.inset = '0';
      });

      // Token card (spins between the pack and the slab).
      const token = el('div', 'pd-token');
      const face = (cls) =>
        `<div class="pd-face ${cls}"><svg class="arcs" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="70" rx="70" ry="22" transform="rotate(-14 50 70)"/><ellipse cx="50" cy="70" rx="60" ry="30" transform="rotate(10 50 70)" opacity=".6"/></svg><div class="mark">${MARK}</div><div class="word top">godpack</div><div class="word bottom">godpack</div></div>`;
      token.innerHTML = `<div class="pd-aura"></div>${face('front')}${face('back')}`;
      token.style.opacity = '0';
      this.token = token;
      this.paintToken('silver');

      // Hint under the pack.
      const hint = el('div', 'pd-hint');
      hint.innerHTML = `<p>Drag anywhere to tear open</p><button class="pd-btn" type="button">Open pack</button>`;
      this.hint = hint;
      this.openBtn = hint.querySelector('button');

      // Reveal layout (slab, facts, CTA) — laid out now so it can be measured.
      const reveal = el('div', 'pd-reveal');
      reveal.innerHTML = `
        <div class="pd-body">
          <div class="pd-card" style="visibility:hidden">
            <div class="pd-card-aura"></div>
            <button class="pd-flip" type="button" aria-label="Reveal your card">
              <div class="pd-tilt"><div class="pd-turn">
                <div class="pd-side backface"><img alt="" src="${SLAB_BACK}" draggable="false"></div>
                <div class="pd-side front"><img alt="${this.card.name}, graded" src="${slabSrc(this.card.id)}" draggable="false"></div>
              </div></div>
              <div class="pd-glint"></div>
            </button>
            <p class="pd-tap" style="opacity:0">Tap to reveal</p>
          </div>
          <div class="pd-chrome"><div class="pd-facts"><p class="pd-value">${money(this.card.value)}</p><p class="pd-name">${this.card.name}</p></div></div>
        </div>
        <div class="pd-chrome pd-chrome-actions"><div class="pd-actions"><div class="pd-row">${
          this.o.actions
            ? this.o.actions
                .map(
                  (a, i) =>
                    `<button type="button" class="pd-cta${a.primary ? '' : ' pd-cta--alt'}" data-action="${i}">${a.label}</button>`,
                )
                .join('')
            : `<a class="pd-cta" href="${enterHref}">Enter Godpack</a>`
        }</div></div></div>`;
      this.reveal = reveal;
      this.cardEl = reveal.querySelector('.pd-card');
      this.flipBtn = reveal.querySelector('.pd-flip');
      this.turn = reveal.querySelector('.pd-turn');
      this.tilt = reveal.querySelector('.pd-tilt');
      this.tapHint = reveal.querySelector('.pd-tap');
      this.chromes = reveal.querySelectorAll('.pd-chrome');

      this.stage.append(reveal, token, packEl, hint);
      this.layout();
    }

    paintToken(kind) {
      const metals = {
        silver: [
          'linear-gradient(140deg,#aeb2bd 0%,#eef0f5 28%,#9ca1ae 52%,#e4e7ee 76%,#8d92a0 100%)',
          '#d9dce4',
          'rgba(220,220,235,.6)',
        ],
        core: [
          'linear-gradient(140deg,#2a6fd6 0%,#8fd0ff 30%,#2f7fe8 55%,#b8e4ff 78%,#2160c4 100%)',
          '#a7dbff',
          rgba(TIERS.core.rgb, 0.7),
        ],
        hit: [
          'linear-gradient(140deg,#5b33d6 0%,#c4adff 30%,#6a43ec 55%,#dccfff 78%,#4b28b8 100%)',
          '#cdbbff',
          rgba(TIERS.hit.rgb, 0.7),
        ],
        chase: [
          'linear-gradient(140deg,#d62f86 0%,#ffb3dc 30%,#e8459b 55%,#ffd0ea 78%,#b8216f 100%)',
          '#ffc2e3',
          rgba(TIERS.chase.rgb, 0.7),
        ],
        grail: [
          'linear-gradient(140deg,#d39a22 0%,#ffe9a0 26%,#e2ad35 50%,#fff2c4 72%,#c88a18 100%)',
          '#ffe08a',
          rgba(TIERS.grail.rgb, 0.75),
        ],
      }[kind];
      this.token.style.setProperty('--metal', metals[0]);
      this.token.style.setProperty('--rim', metals[1]);
      this.token.style.setProperty('--aura', metals[2]);
      if (kind !== 'silver') this.token.dataset.tier = kind;
    }

    layout() {
      const vw = this.stage.clientWidth,
        vh = this.stage.clientHeight;
      this.vw = vw;
      this.vh = vh;
      this.fx.resize();
      // Pack: 300px wide at most, smaller on short or narrow screens, with
      // the pack, hint text and button centred together.
      const pw = Math.round(Math.min(300, vw * 0.66, (vh - 230) / PACK_RATIO));
      const ph = Math.round(pw * PACK_RATIO);
      const block = ph + 20 + 32 + 44;
      const top = Math.max(56, Math.round((vh - block) / 2));
      this.packRect = { x: Math.round((vw - pw) / 2), y: top, w: pw, h: ph };
      this.seamY = Math.round(ph * 0.125);
      const pe = this.packEl;
      pe.style.width = pw + 'px';
      pe.style.height = ph + 'px';
      pe.style.setProperty('--seam', this.seamY + 'px');
      this.seam.style.top = this.seamY + 'px';
      this.glow.style.top = this.seamY + 'px';
      this.flare.style.top = this.seamY + 'px';
      this.flare.style.setProperty('--flare', '#fff0ca');
      this.setTear(this.tearAmount || 0);
      this.hint.style.top = top + ph + 20 + 'px';
      // Slab size in the reveal: 300px wide at most, fitting above the facts and CTA.
      const sw = Math.round(Math.min(300, vw - 80, (vh - 60 - 16 - 40 - 80 - 86 - 8) / SLAB_RATIO));
      this.cardEl.style.width = sw + 'px';
      this.cardEl.style.height = Math.round(sw * SLAB_RATIO) + 'px';
      const r = this.cardEl.getBoundingClientRect();
      const rootBox = this.stage.getBoundingClientRect();
      this.slabRect = { x: r.left - rootBox.left, y: r.top - rootBox.top, w: r.width, h: r.height };
      const tw = Math.round(sw * 0.92),
        th = Math.round(tw * 1.4);
      this.tokenRect = {
        x: this.slabRect.x + (sw - tw) / 2,
        y: this.slabRect.y + (this.slabRect.h - th) / 2,
        w: tw,
        h: th,
      };
      this.token.style.width = tw + 'px';
      this.token.style.height = th + 'px';
      this.token.querySelectorAll('.word').forEach((n) => {
        n.style.fontSize = Math.round(tw * 0.13) + 'px';
      });
      if (this.phase === 'sealed' || this.phase === 'torn') this.placePack(this.packRect, 1);
    }

    // Clip the body below a jagged tear line and the strip above it.
    setTear(amount) {
      this.tearAmount = amount;
      const w = parseFloat(this.packEl.style.width) || 300;
      const y = this.seamY || 52;
      if (!this.jag) this.jag = Array.from({ length: 27 }, (_, i) => (i % 2 ? rand(3.5, 7) : rand(-1, 1.5)));
      const pts = this.jag.map((d, i) => `${((i / 26) * w).toFixed(2)}px ${(y + d).toFixed(2)}px`).join(',');
      this.bodyHalf.style.clipPath = `polygon(${pts},${w}px 100%,0px 100%)`;
      this.strip.style.clipPath = `polygon(0px 0px,${pts},${w}px 0px)`;
    }

    // Token transform with its centre at (cx, cy).
    tokenAt(cx, cy, s, extra) {
      const tr = this.tokenRect;
      return `translate(${(cx - tr.w / 2).toFixed(2)}px,${(cy - tr.h / 2).toFixed(2)}px) scale(${s})${extra ? ' ' + extra : ''}`;
    }

    placePack(r, scale) {
      this.packEl.style.transform = `translate(${r.x}px,${r.y}px) scale(${scale})`;
    }

    // ---- flow ----

    async start() {
      injectStyles();
      this.build();
      this.phase = 'intro';
      this.on(window, 'resize', () => this.layout());
      this.on(this.wrap.querySelector('.pd-back'), 'click', () => this.close());
      this.on(document, 'keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
      requestAnimationFrame(() => {
        this.wrap.dataset.in = 'true';
      });

      // Fly the pack in from the carousel.
      const f = this.o.from,
        to = this.packRect;
      const s0 = f && f.w ? f.w / to.w : 1;
      const from = f && f.w ? { x: f.x, y: f.y } : { x: to.x, y: to.y + 40 };
      const anim = this.packEl.animate(
        [
          { transform: `translate(${from.x}px,${from.y}px) scale(${s0})` },
          { transform: `translate(${to.x}px,${to.y}px) scale(1)` },
        ],
        { duration: reduced ? 1 : 560, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
      );
      this.placePack(to, 1);
      this.hint.dataset.off = 'true';
      await anim.finished.catch(() => {});
      anim.cancel();
      if (this.closed) return;
      this.phase = 'sealed';
      this.hint.dataset.off = 'false';
      // Keyboard users land on the button; pointer users get no focus ring.
      (this.o.keyboard ? this.openBtn : this.wrap).focus({ preventScroll: true });
      this.armTear();
    }

    armTear() {
      let drag = null;
      let progress = 0;
      const need = () => this.packRect.w * 0.75;
      const show = (p) => {
        progress = p;
        const w = this.packRect.w;
        this.glow.style.opacity = p > 0.01 ? '1' : '0';
        this.glow.style.width = (p * w * 0.82).toFixed(1) + 'px';
        this.strip.style.transform = `translateY(${(-p * 5).toFixed(2)}px) rotate(${(-p * 3.5).toFixed(2)}deg)`;
        this.seam.style.opacity = p > 0.01 ? '0' : '1';
      };
      const down = (e) => {
        if (this.phase !== 'sealed' || e.target.closest('.pd-back, .pd-btn')) return;
        drag = { x: e.clientX, id: e.pointerId };
        try {
          this.stage.setPointerCapture(e.pointerId);
        } catch (_) {
          /* ignore */
        }
      };
      const move = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = Math.abs(e.clientX - drag.x);
        drag.x = e.clientX;
        show(clamp(progress + dx / need()));
        if (progress >= 1) {
          drag = null;
          this.tear();
        }
      };
      const up = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        // Not far enough: ease the strip back down.
        const startP = progress,
          t0 = performance.now();
        const back = (now) => {
          if (this.phase !== 'sealed' || drag) return;
          const k = clamp((now - t0) / 260);
          show(startP * (1 - ease.out3(k)));
          if (k < 1) requestAnimationFrame(back);
        };
        requestAnimationFrame(back);
      };
      this.on(this.stage, 'pointerdown', down);
      this.on(this.stage, 'pointermove', move);
      this.on(this.stage, 'pointerup', up);
      this.on(this.stage, 'pointercancel', up);
      this.on(this.openBtn, 'click', () => {
        if (this.phase !== 'sealed') return;
        this.phase = 'auto-tear';
        const startP = progress,
          t0 = performance.now();
        const run = (now) => {
          if (this.closed) return;
          const k = clamp((now - t0) / 420);
          show(lerp(startP, 1, ease.inOut3(k)));
          if (k < 1) requestAnimationFrame(run);
          else this.tear();
        };
        requestAnimationFrame(run);
      });
    }

    async tear() {
      if (this.phase === 'torn' || this.closed) return;
      this.phase = 'torn';
      this.hint.dataset.off = 'true';
      this.glow.style.opacity = '0';
      const pr = this.packRect;
      const seamAbs = pr.y + this.seamY;
      const tint = PACK_TINT[this.o.pack];

      // Strip flies off to the upper right; flare and debris at the seam.
      this.strip.animate(
        [
          { transform: getComputedStyle(this.strip).transform, opacity: 1 },
          { transform: 'translate(70px,-150px) rotate(-30deg)', opacity: 0 },
        ],
        { duration: reduced ? 1 : 680, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' },
      );
      this.flare.animate(
        [
          { opacity: 0, transform: 'scale(.5)' },
          { opacity: 1, transform: 'scale(1.05)', offset: 0.25 },
          { opacity: 0, transform: 'scale(1.5)' },
        ],
        { duration: reduced ? 1 : 760, easing: 'ease-out', fill: 'forwards' },
      );
      if (!reduced) {
        this.fx.add(debris(pr.x + pr.w * 0.1, pr.x + pr.w * 0.9, seamAbs, tint.concat(['#ffffff'])));
        this.fx.add(rays(pr.x + pr.w / 2, seamAbs, pr.w, [236, 230, 255]));
      }
      await wait(320);
      if (this.closed) return;

      // The token rises out of the opening, behind the pack's front.
      const tr = this.tokenRect;
      const tw = pr.w * 0.86,
        th = tw * 1.4;
      const sx = tw / tr.w;
      const cx = pr.x + pr.w / 2;
      const cyStart = pr.y + pr.h * 0.18 + th / 2;
      const cyEnd = pr.y - th * 0.38 + th / 2;
      this.token.style.zIndex = '0';
      this.packEl.style.zIndex = '1';
      this.paintToken('silver');
      const rise = this.token.animate(
        [
          { transform: this.tokenAt(cx, cyStart, sx), opacity: 1 },
          { transform: this.tokenAt(cx, cyEnd, sx), opacity: 1 },
        ],
        { duration: reduced ? 1 : 620, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
      );
      await wait(380);
      if (this.closed) return;
      // The pack drops away.
      this.packEl.animate(
        [
          { transform: `translate(${pr.x}px,${pr.y}px) scale(1)`, opacity: 1 },
          { transform: `translate(${pr.x}px,${this.vh + 60}px) scale(.94) rotate(4deg)`, opacity: 0.4 },
        ],
        { duration: reduced ? 1 : 720, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
      );
      await rise.finished.catch(() => {});
      if (this.closed) return;
      // Hand the transform over from the animation to inline styles.
      if (rise.commitStyles) rise.commitStyles();
      rise.cancel();
      this.token.style.opacity = '1';
      this.spinToken(cx, cyEnd, sx);
    }

    async spinToken(cx0, cy0, s0) {
      this.phase = 'token';
      this.token.style.zIndex = '2';
      this.coolWash.dataset.on = 'true';
      const tr = this.tokenRect;
      const aura = this.token.querySelector('.pd-aura');
      const dur = reduced ? 1 : 2100;
      const t0 = performance.now();
      let recolored = false;
      await new Promise((resolve) => {
        const step = (now) => {
          if (this.closed) return resolve();
          const k = clamp((now - t0) / dur);
          const move = ease.out3(clamp(k / 0.45));
          const x = lerp(cx0, tr.x + tr.w / 2, move),
            y = lerp(cy0, tr.y + tr.h / 2, move),
            s = lerp(s0, 1, move);
          // Two and a half turns that slow to a stop, tilted slightly.
          const spin = ease.out3(k) * 900;
          const tilt = Math.sin(k * Math.PI) * 8;
          this.token.style.transform = this.tokenAt(
            x,
            y,
            s,
            `perspective(1100px) rotateX(${tilt.toFixed(2)}deg) rotateY(${spin.toFixed(2)}deg)`,
          );
          if (!recolored && k > 0.42) {
            recolored = true;
            this.paintToken(this.card.tier);
            aura.style.opacity = '1';
            this.flashOnce(0.35, 260);
            if (!reduced) this.fx.add(sparks(tr.x + tr.w / 2, tr.y + tr.h / 2, this.tier.rgb, 40, 520));
          }
          if (k < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
      if (this.closed) return;
      await wait(260);
      this.toSlab();
    }

    flashOnce(peak, ms) {
      if (reduced) return;
      this.flash.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
    }

    async toSlab() {
      this.phase = 'slab';
      const tr = this.tokenRect,
        sr = this.slabRect;
      // Token shrinks into the slab's card well while the slab fades up.
      const fade = this.token.animate(
        [
          { transform: this.tokenAt(tr.x + tr.w / 2, tr.y + tr.h / 2, 1), opacity: 1 },
          { transform: this.tokenAt(tr.x + tr.w / 2, tr.y + tr.h / 2 + sr.h * 0.08, 0.94), opacity: 0 },
        ],
        { duration: reduced ? 1 : 360, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
      );
      // Then it stays gone. iOS can drop a finished animation's held end
      // state, which put the token back over the slab, so write it down.
      fade.finished.then(() => this.hideToken()).catch(() => {});
      this.cardEl.style.visibility = 'visible';
      this.cardEl.animate(
        [
          { opacity: 0, transform: 'scale(.92)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: reduced ? 1 : 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
      this.coolWash.dataset.on = 'true';
      await wait(300);
      if (this.closed) return;
      this.tapHint.style.opacity = '1';
      if (this.o.keyboard) this.flipBtn.focus({ preventScroll: true });
      this.armReveal();
    }

    armReveal() {
      // Gentle tilt toward the pointer while waiting.
      const tiltTo = (e) => {
        if (this.phase !== 'slab') return;
        const r = this.cardEl.getBoundingClientRect();
        const nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 1.5), -1, 1);
        const ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 1.5), -1, 1);
        this.tilt.style.transform = `rotateY(${(nx * 7).toFixed(2)}deg) rotateX(${(-ny * 7).toFixed(2)}deg)`;
      };
      this.on(this.stage, 'pointermove', tiltTo);
      const go = (e) => {
        if (this.phase !== 'slab') return;
        if (e && e.target && e.target.closest && e.target.closest('.pd-back')) return;
        this.revealCard();
      };
      this.on(this.flipBtn, 'click', (e) => {
        e.stopPropagation();
        go(e);
      });
      this.on(this.stage, 'pointerup', go);
    }

    hideToken() {
      this.token.style.opacity = '0';
      this.token.style.visibility = 'hidden';
    }

    async revealCard() {
      this.phase = 'revealing';
      this.hideToken();
      this.tapHint.style.opacity = '0';
      this.tilt.style.transition = 'transform 200ms ease-out';
      this.tilt.style.transform = 'none';
      const tierName = this.card.tier;
      const rgb = this.tier.rgb;
      const sr = this.slabRect;
      const cx = sr.x + sr.w / 2,
        cy = sr.y + sr.h / 2;
      const big = tierName === 'grail' || tierName === 'chase';

      // Anticipation: a shake that builds, streaks for chase/grail, arcs for hit and up.
      const shake = this.cardEl.animate(
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 11) * (big ? 6 : 3.5);
          return {
            transform: `translate(${rand(-a, a).toFixed(1)}px,${rand(-a, a).toFixed(1)}px) rotate(${rand(-a, a).toFixed(1) * 0.2}deg)`,
          };
        }).concat([{ transform: 'none' }]),
        { duration: reduced ? 1 : big ? 900 : 600, easing: 'linear' },
      );
      if (!reduced) {
        if (big) this.fx.add(streaks(this.vw, this.vh, tierName === 'grail' ? [255, 120, 200] : rgb));
        if (tierName !== 'core')
          setTimeout(() => !this.closed && this.fx.add(arcs(sr, rgb, big ? 0.55 : 0.35)), big ? 380 : 200);
      }
      await shake.finished.catch(() => {});
      if (this.closed) return;

      // Burst and flip.
      if (!reduced) {
        this.fx.add(speedLines(cx, cy, this.vw, this.vh, big ? 1.1 : 0.7));
        if (tierName === 'grail' || tierName === 'chase')
          this.fx.add(rune(cx, cy, Math.min(sr.w * 0.95, this.vw * 0.45), rgb, 1.5));
        this.fx.add(sparks(cx, cy, rgb, big ? 90 : 50, big ? 900 : 600));
        this.flashOnce(big ? 0.85 : 0.5, big ? 620 : 420);
      }
      const flip = this.turn.animate(
        [
          { transform: 'rotateY(0deg) scale(1)' },
          { transform: 'rotateY(90deg) scale(1.06)', offset: 0.5 },
          { transform: 'rotateY(180deg) scale(1)' },
        ],
        { duration: reduced ? 1 : big ? 640 : 520, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' },
      );
      await flip.finished.catch(() => {});
      if (this.closed) return;
      flip.cancel();
      this.cardEl.dataset.landed = 'true';
      this.phase = 'landed';
      this.coolWash.dataset.on = 'false';
      this.warmWash.dataset.on = 'true';
      if (!reduced) {
        this.fx.add(afterglow(cx, cy, rgb, big ? 2.2 : 1.5));
        this.fx.add(sparks(cx, sr.y + sr.h * 0.3, rgb, 24, 380));
      }
      await wait(220);
      if (this.closed) return;
      this.chromes.forEach((c) => {
        c.dataset.on = 'true';
      });
      this.flipBtn.setAttribute('aria-label', `${this.card.name}, worth ${money(this.card.value)}`);
      const cta = this.reveal.querySelector('.pd-cta');
      if (cta && this.o.keyboard) cta.focus({ preventScroll: true });
      if (this.o.actions) {
        this.reveal.querySelectorAll('[data-action]').forEach((b) => {
          this.on(b, 'click', () => {
            const act = this.o.actions[+b.dataset.action];
            if (act && act.onClick) act.onClick(this.card);
            this.close();
          });
        });
      }
    }

    close() {
      if (this.closed) return;
      this.closed = true;
      this.wrap.dataset.in = 'false';
      this.cleanups.forEach((fn) => fn());
      setTimeout(
        () => {
          this.fx.stop();
          this.o.root.textContent = '';
          if (this.prevFocus && this.prevFocus.focus) this.prevFocus.focus({ preventScroll: true });
          if (this.o.onClose) this.o.onClose();
        },
        reduced ? 0 : 240,
      );
    }
  }

  // --------------------------------------------------------------------- API

  function preload(index) {
    injectStyles();
    const i = clamp(index | 0, 0, PACKS.length - 1);
    return Promise.all([decode(packSrc(i)), decode(SLAB_BACK)]).then(() => {
      // Warm the card fronts in the background; nothing waits on them.
      POOL.forEach((c) => decode(slabSrc(c.id)));
    });
  }

  function open(opts) {
    const c = new Ceremony(opts);
    c.start();
    return c;
  }

  return { preload, open };
})();
