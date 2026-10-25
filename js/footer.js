// Footer wordmark (desktop only, 1200px and up).
//
// A giant "godpack" set in the page font, cut by a hairline slit so only the
// top of the word shows. The letters climb out of the slit the first time
// the footer is seen. A foil highlight tracks the cursor over the word (or
// roams slowly on its own), the letter under the cursor rises a little, and
// tiny four-point stars drift up out of the slit around the highlight.
//
// How it draws: at layout time every letter is rendered once into a pair of
// sprites (dark ink, white mask) and a holographic texture is painted. Each
// frame stamps the dark sprites, then builds a foil layer from the masks
// filled with the texture, fades it with a spot around the highlight, and
// lays it on top. All easing is frame-rate independent.
(() => {
  const footer = document.querySelector('.site-footer');
  const canvas = document.getElementById('wordmark-canvas');
  if (!footer || !canvas || !window.matchMedia || !('requestAnimationFrame' in window)) return;

  const CFG = {
    word: 'godpack',
    weight: 800,
    trackingEm: -0.035,
    headroom: 0.02, // × width, above the ascenders
    slitAt: 0.638, // slit position, as a share of the box height
    slit: 0.26, // slit height above the baseline, in x-heights
    riseMs: 1100,
    staggerMs: 72,
    liftPx: 14,
    holo: ['#ffd4f3', '#d6a2ff', '#9a7bff', '#5d55ff', '#6fa8ff', '#a8e2ff', '#f1fdff', '#ffd4f3'],
  };

  const wide = matchMedia('(min-width: 1200px)');
  const boot = () => document.fonts.load(`${CFG.weight} 100px "Hanken Grotesk"`).then(init, init);
  if (wide.matches) boot();
  else {
    const onChange = (e) => {
      if (e.matches) {
        wide.removeEventListener('change', onChange);
        boot();
      }
    };
    wide.addEventListener('change', onChange);
  }

  function init() {
    const ctx = canvas.getContext('2d');
    const layer = document.createElement('canvas');
    const lx = layer.getContext('2d');
    const ruler = document.createElement('canvas').getContext('2d');
    if (!ctx || !lx) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const box = canvas.parentElement;

    const geo = { w: 0, h: 0, dpr: 1, top: 0, slit: 0, mid: 0 };
    let glyphs = [];
    let holo = null;

    const hl = { x: 0, y: 0, power: 0, placed: false };
    const pointer = { x: 0, y: 0, over: false };
    const stars = [];
    let spawnDebt = 0;
    let firstSeen = 0,
      everSeen = false,
      onScreen = false;
    let raf = 0,
      prevNow = 0;

    if (!calm && 'IntersectionObserver' in window) footer.dataset.entrance = 'waiting';

    // ---------- layout ----------

    const font = (px) => `${CFG.weight} ${px}px "Hanken Grotesk"`;

    function makeSprite(w, h, paint) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * geo.dpr);
      c.height = Math.ceil(h * geo.dpr);
      const g = c.getContext('2d');
      g.scale(geo.dpr, geo.dpr);
      paint(g);
      return c;
    }

    function paintHolo(w, h) {
      // Diagonal rainbow bands, twice the canvas width so it can slide.
      return makeSprite(w * 2, h, (g) => {
        const band = g.createLinearGradient(0, 0, w * 2, h * 0.9);
        const reps = 5;
        for (let r = 0; r < reps; r++) {
          CFG.holo.forEach((c, i) => band.addColorStop(Math.min(1, (r + i / (CFG.holo.length - 1)) / reps), c));
        }
        g.fillStyle = band;
        g.fillRect(0, 0, w * 2, h);
        // Soft white streaks for a metallic glint.
        g.globalCompositeOperation = 'screen';
        for (let i = 0; i < 9; i++) {
          const x = (i / 9) * w * 2;
          const s = g.createLinearGradient(x, 0, x + w * 0.08, h * 0.5);
          s.addColorStop(0, 'rgba(255,255,255,0)');
          s.addColorStop(0.5, 'rgba(255,255,255,0.35)');
          s.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = s;
          g.fillRect(x - w * 0.05, 0, w * 0.2, h);
        }
      });
    }

    function measureWord() {
      geo.w = canvas.clientWidth;
      if (!geo.w) return false;
      geo.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // A separate context for measuring: resizing the canvases below would reset its font.
      const m = ruler;
      const base = 100;
      m.font = font(base);
      m.letterSpacing = `${CFG.trackingEm * base}px`;
      const full = m.measureText(CFG.word);
      const span = full.actualBoundingBoxLeft + full.actualBoundingBoxRight - CFG.trackingEm * base;
      const px = (base * geo.w) / span;
      m.font = font(px);
      m.letterSpacing = `${CFG.trackingEm * px}px`;

      const ascent = m.measureText('dk').actualBoundingBoxAscent;
      const xHeight = m.measureText('xo').actualBoundingBoxAscent;
      const descent = m.measureText('gp').actualBoundingBoxDescent;
      // The box keeps the stylesheet's proportions. The slit sits at a fixed
      // share of its height; the headroom above the word absorbs the font's
      // ascender, and the rest below the slit is the glow area.
      const visible = ascent - CFG.slit * xHeight;
      geo.h = canvas.clientHeight || geo.w / 3.95;
      geo.slit = Math.max(geo.w * CFG.headroom * 0.4 + visible, geo.h * CFG.slitAt);
      geo.top = geo.slit - visible;
      geo.mid = (geo.top + geo.slit) / 2;

      for (const c of [canvas, layer]) {
        c.width = Math.round(geo.w * geo.dpr);
        c.height = Math.round(geo.h * geo.dpr);
      }

      const pad = 3;
      const tall = ascent + descent + pad * 2;
      const lead = full.actualBoundingBoxLeft;
      glyphs = [...CFG.word].map((ch, i) => {
        const adv = m.measureText(CFG.word.slice(0, i)).width;
        const mm = m.measureText(ch);
        const inkL = adv + lead - mm.actualBoundingBoxLeft; // ink's left edge in canvas px
        const inkW = mm.actualBoundingBoxLeft + mm.actualBoundingBoxRight;
        const draw = (fill) => (g) => {
          g.font = font(px);
          g.fillStyle = fill(g);
          g.fillText(ch, pad + mm.actualBoundingBoxLeft, pad + ascent);
        };
        const ink = (g) => {
          const v = g.createLinearGradient(0, pad, 0, pad + (geo.slit - geo.top));
          v.addColorStop(0, '#25212f');
          v.addColorStop(1, '#16141d');
          return v;
        };
        const old = glyphs[i];
        return {
          x: inkL - pad,
          inkL,
          inkR: inkL + inkW,
          dark: makeSprite(inkW + pad * 2, tall, draw(ink)),
          mask: makeSprite(
            inkW + pad * 2,
            tall,
            draw(() => '#fff'),
          ),
          lift: old ? old.lift : 0,
        };
      });

      holo = paintHolo(geo.w, geo.h);

      if (!hl.placed) {
        hl.x = geo.w * 0.5;
        hl.y = geo.mid;
        hl.placed = true;
      }
      return true;
    }

    // ---------- drawing ----------

    const smooth = (dt, rate) => 1 - Math.exp(-dt * rate);
    const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function fourPoint(x, y, r) {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y);
      ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
      ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y);
      ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
      ctx.fill();
    }

    function ellipseGlow(cx, rx, ry, rgb, alpha) {
      ctx.save();
      ctx.translate(cx, geo.slit + 1);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${rgb},${alpha})`);
      g.addColorStop(0.55, `rgba(${rgb},${(alpha * 0.35).toFixed(4)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-1, 0, 2, 1);
      ctx.restore();
    }

    function render(now) {
      const { w, h, top, slit, dpr } = geo;
      if (!w) return;
      const dt = prevNow ? Math.min(0.05, (now - prevNow) / 1000) : 1 / 60;
      prevNow = now;
      const t = now / 1000;
      const engaged = pointer.over && pointer.y < slit + 260;

      // Highlight target.
      let tx, ty, tp;
      if (engaged) {
        tx = pointer.x;
        ty = Math.min(Math.max(pointer.y, top), slit + 24);
        tp = 1;
      } else if (calm) {
        tx = w * 0.64;
        ty = geo.mid;
        tp = 0.7;
      } else {
        tx = w * (0.5 + 0.37 * Math.sin(t * 0.19 + 0.6 * Math.sin(t * 0.07)));
        ty = geo.mid + (slit - top) * 0.2 * Math.sin(t * 0.53);
        tp = 0.6;
      }
      if (calm) {
        hl.x = tx;
        hl.y = ty;
        hl.power = tp;
      } else {
        const k = smooth(dt, 5);
        hl.x += (tx - hl.x) * k;
        hl.y += (ty - hl.y) * k;
        hl.power += (tp - hl.power) * smooth(dt, 3);
      }

      // Per-letter vertical position.
      const ys = glyphs.map((gl, i) => {
        let drop = 0;
        if (!calm) {
          const p = Math.min(1, Math.max(0, (now - firstSeen - i * CFG.staggerMs) / CFG.riseMs));
          drop = (1 - outExpo(p)) * (slit - top + 14);
          const hovered = engaged && pointer.y < slit + 12 && pointer.x >= gl.inkL && pointer.x <= gl.inkR;
          gl.lift += ((hovered ? CFG.liftPx : 0) - gl.lift) * smooth(dt, 9);
        }
        return top - 3 + drop - gl.lift;
      });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      // Glow under the slit: a steady wash and a brighter pool under the highlight.
      ellipseGlow(w / 2, w * 0.52, (h - slit) * 0.95, '132,98,240', 0.09);
      ellipseGlow(hl.x, Math.max(210, w * 0.23), (h - slit) * 0.82, '176,142,255', (0.16 * hl.power).toFixed(4));

      // Ink.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, slit);
      ctx.clip();
      glyphs.forEach((gl, i) => ctx.drawImage(gl.dark, gl.x, ys[i], gl.dark.width / dpr, gl.dark.height / dpr));

      // Foil layer.
      lx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lx.globalCompositeOperation = 'source-over';
      lx.clearRect(0, 0, w, h);
      glyphs.forEach((gl, i) => lx.drawImage(gl.mask, gl.x, ys[i], gl.mask.width / dpr, gl.mask.height / dpr));
      lx.globalCompositeOperation = 'source-in';
      const slide = ((hl.x / w) * 0.55 + (calm ? 0 : t * 0.04)) % 1;
      lx.drawImage(holo, -slide * w, 0, w * 2, h);
      // Whole-word sheen first, then the spot-lit foil.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.07;
      ctx.drawImage(layer, 0, 0);
      lx.globalCompositeOperation = 'destination-in';
      const radius = Math.max(170, w * 0.19);
      const spot = lx.createRadialGradient(hl.x, hl.y, 0, hl.x, hl.y, radius);
      spot.addColorStop(0, 'rgba(0,0,0,1)');
      spot.addColorStop(0.4, 'rgba(0,0,0,0.62)');
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = spot;
      lx.fillRect(0, 0, w, h);
      ctx.globalAlpha = hl.power;
      ctx.drawImage(layer, 0, 0);
      ctx.restore();

      // Slit hairline, lit around the highlight.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2b2937';
      ctx.fillRect(0, slit, w, 1);
      const reach = Math.max(260, w * 0.22);
      const lit = ctx.createLinearGradient(hl.x - reach, 0, hl.x + reach, 0);
      lit.addColorStop(0, 'rgba(220,208,255,0)');
      lit.addColorStop(0.5, `rgba(236,228,255,${(0.8 * hl.power).toFixed(3)})`);
      lit.addColorStop(1, 'rgba(220,208,255,0)');
      ctx.fillStyle = lit;
      ctx.fillRect(0, slit, w, 1);

      if (calm) return;

      // Stars: spawn at a rate, rise, twinkle out.
      spawnDebt += dt * (engaged ? 11 : 2.6);
      while (spawnDebt >= 1 && stars.length < 26) {
        spawnDebt -= 1;
        stars.push({
          x: hl.x + (Math.random() - 0.5) * w * 0.22,
          born: now,
          life: 1300 + Math.random() * 1000,
          r: 2 + Math.random() * 3.4,
          sway: (Math.random() - 0.5) * 22,
          climb: 45 + Math.random() * 70,
        });
      }
      if (spawnDebt > 1) spawnDebt = 1;
      ctx.fillStyle = '#f0eaff';
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        const q = (now - s.born) / s.life;
        if (q >= 1) {
          stars.splice(i, 1);
          continue;
        }
        const twinkle = Math.pow(Math.sin(Math.PI * q), 1.3);
        ctx.globalAlpha = twinkle * (0.4 + 0.45 * hl.power);
        fourPoint(s.x + s.sway * Math.sin(q * 2.2), slit - 5 - q * s.climb, s.r * (0.55 + 0.45 * twinkle));
      }
      ctx.globalAlpha = 1;
    }

    // ---------- loop ----------

    function loop(now) {
      raf = 0;
      if (!onScreen) return;
      render(now);
      raf = requestAnimationFrame(loop);
    }

    function run() {
      if (!raf && !calm && onScreen) {
        prevNow = 0;
        raf = requestAnimationFrame(loop);
      }
    }

    function visibility(on) {
      if (on && !everSeen) {
        everSeen = true; // the climb plays once per page load
        firstSeen = performance.now() + 80;
        if (footer.dataset.entrance === 'waiting') footer.dataset.entrance = 'played';
      }
      onScreen = on;
      run();
    }

    footer.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const scale = r.width ? geo.w / r.width : 1;
      pointer.x = (e.clientX - r.left) * scale;
      pointer.y = (e.clientY - r.top) * scale;
      pointer.over = true;
      if (calm) render(performance.now());
    });
    footer.addEventListener('pointerleave', () => {
      pointer.over = false;
      if (calm) render(performance.now());
    });

    const relayout = () => {
      if (measureWord() && !raf) render(performance.now());
    };
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(box);
    else window.addEventListener('resize', relayout);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((list) => visibility(list.some((en) => en.isIntersecting)), { threshold: 0.15 }).observe(
        canvas,
      );
    } else visibility(true);
    relayout();
  }
})();
