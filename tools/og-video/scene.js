/* Link-preview video scene (1200 x 630, 6 s, seamless loop).
 *
 * The hexagon mark and the "godpack" wordmark start as one centred lockup,
 * slide apart, and a booster pack tears open in the gap between them: a
 * sealed slab rises out, flips to a gold pull with a burst, two more slabs
 * fan out behind it, then everything folds away and the lockup closes up
 * again on the same frame it started from.
 *
 * draw(ctx, t) is a pure function of time, so frames can be rendered one at
 * a time at any speed (tools/render-og-video.js encodes them). Randomness is
 * seeded, so every render is identical. */
(function () {
  'use strict';

  var W = 1200;
  var H = 630;
  var FPS = 30;
  var DURATION = 6;

  var HOLO = ['#ffe6f7', '#f0c8ff', '#c7a5ff', '#9b86ff', '#9cc2ff', '#dff6ff'];
  var GOLD = [255, 186, 64];

  // ---------------------------------------------------------------- helpers

  function clamp(v, a, b) {
    return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  // Progress of t through [a, b], clamped to 0..1.
  function seg(t, a, b) {
    return clamp((t - a) / (b - a));
  }
  var ease = {
    inOut: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    out: function (t) {
      return 1 - Math.pow(1 - t, 3);
    },
    in: function (t) {
      return t * t * t;
    },
    back: function (t) {
      var c = 1.6;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    },
  };
  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function mulberry(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------ assets

  var img = {};
  function load(name, src) {
    return new Promise(function (resolve, reject) {
      var i = new Image();
      i.onload = function () {
        img[name] = i;
        resolve();
      };
      i.onerror = function () {
        reject(new Error('could not load ' + src));
      };
      i.src = src;
    });
  }

  var ready = Promise.all([
    document.fonts.load('700 120px "Hanken Grotesk"'),
    load('pack', '../../assets/packs/arena-720.webp'),
    load('back', '../../assets/slabs/slab-back-600.webp'),
    load('hero', '../../assets/slabs/gilded-comet-600.webp'),
    load('left', '../../assets/slabs/aurora-peaks-600.webp'),
    load('right', '../../assets/slabs/coral-drift-600.webp'),
  ]).then(layout);

  // ------------------------------------------------------------------ layout

  var L = {};
  var FONT = 120;

  function layout() {
    var c = document.createElement('canvas').getContext('2d');
    c.font = '700 ' + FONT + 'px "Hanken Grotesk"';
    c.letterSpacing = -0.03 * FONT + 'px';
    var m = c.measureText('godpack');
    L.textW = m.width;
    L.textAsc = m.actualBoundingBoxAscent;
    L.textDesc = m.actualBoundingBoxDescent;
    L.markR = 74;
    L.gap = 34;
    var total = L.markR * 2 + L.gap + L.textW;
    // Closed: one centred lockup.
    L.closedMark = (W - total) / 2 + L.markR;
    L.closedText = L.closedMark + L.markR + L.gap;
    // Open: mark at the left edge, wordmark at the right, a little smaller.
    L.openMarkScale = 0.8;
    L.openTextScale = 0.82;
    L.openMark = 150;
    L.openText = W - 78 - L.textW * L.openTextScale;
    // The stage between them.
    L.midX = (L.openMark + L.markR * L.openMarkScale + L.openText) / 2;
    L.midY = H / 2 + 6;

    // Pack drawn from the full image frame (it has transparent margins).
    L.packH = 372;
    L.packW = L.packH / 1.4;
    L.seam = L.packH * 0.125;
    var r = mulberry(7);
    L.jag = [];
    for (var i = 0; i <= 26; i++) L.jag.push(i % 2 ? 3 + r() * 4 : -1 + r() * 2.5);

    L.slabH = 336;
    L.slabW = L.slabH * (600 / 1005);

    // Seeded particles.
    r = mulberry(11);
    L.debris = [];
    for (i = 0; i < 46; i++) {
      L.debris.push({
        u: r(),
        vx: (r() - 0.5) * 340,
        vy: -140 - r() * 300,
        rot: r() * Math.PI,
        vr: (r() - 0.5) * 14,
        w: 3 + r() * 6,
        h: 6 + r() * 10,
        life: 0.9 + r() * 0.7,
        c: ['#b98cff', '#7a2cf0', '#e9dcff', '#ffffff', '#c7a5ff'][Math.floor(r() * 5)],
      });
    }
    r = mulberry(23);
    L.beams = [];
    for (i = 0; i < 15; i++) {
      L.beams.push({
        a: (r() - 0.5) * 0.9,
        len: 0.6 + r() * 0.5,
        w: 4 + r() * 12,
        off: (r() - 0.5) * 0.7,
        d: r() * 0.2,
        warm: r() < 0.35,
      });
    }
    r = mulberry(31);
    L.sparks = [];
    for (i = 0; i < 70; i++) {
      var a = r() * Math.PI * 2;
      L.sparks.push({ a: a, v: 180 + r() * 520, life: 0.6 + r() * 0.9, r: 1 + r() * 2.2 });
    }
    r = mulberry(41);
    L.lines = [];
    for (i = 0; i < 90; i++)
      L.lines.push({
        a: r() * Math.PI * 2,
        r0: 0.1 + r() * 0.4,
        len: 0.12 + r() * 0.35,
        w: 1.5 + r() * 4,
        s: 0.8 + r() * 0.6,
      });
    r = mulberry(53);
    L.twinkles = [];
    for (i = 0; i < 18; i++) L.twinkles.push({ x: (r() - 0.5) * 2, y: (r() - 0.5) * 2, ph: r(), r: 2 + r() * 3.5 });
  }

  // ---------------------------------------------------------------- pieces

  function hexagon(ctx, cx, cy, r, round) {
    var pts = [];
    for (var k = 0; k < 6; k++) {
      var ang = -Math.PI / 2 + (k * Math.PI) / 3;
      pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
    }
    ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (k = 1; k <= 6; k++) {
      var p1 = pts[k % 6];
      var p2 = pts[(k + 1) % 6];
      ctx.arcTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, round);
    }
    ctx.closePath();
  }

  function sparkle(ctx, x, y, r, k) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * k, y - r * k, x + r, y);
    ctx.quadraticCurveTo(x + r * k, y + r * k, x, y + r);
    ctx.quadraticCurveTo(x - r * k, y + r * k, x - r, y);
    ctx.quadraticCurveTo(x - r * k, y - r * k, x, y - r);
    ctx.closePath();
  }

  // The brand mark: holographic hexagon ring around a four-point sparkle.
  function mark(ctx, cx, cy, r, shine) {
    var g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    HOLO.forEach(function (c, i) {
      g.addColorStop(i / (HOLO.length - 1), c);
    });
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    hexagon(ctx, cx, cy, r, r * 0.2);
    hexagon(ctx, cx, cy, r * 0.64, r * 0.12);
    ctx.fill('evenodd');
    sparkle(ctx, cx, cy, r * 0.47, 0.14);
    ctx.fill();
    // A soft band of light that slides across as the lockup opens and closes.
    ctx.globalCompositeOperation = 'source-atop';
    var sx = cx - r * 1.6 + shine * r * 3.2;
    var band = ctx.createLinearGradient(sx - r * 0.5, cy - r, sx + r * 0.5, cy + r);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  function wordmark(ctx, x, cy, scale) {
    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(scale, scale);
    ctx.font = '700 ' + FONT + 'px "Hanken Grotesk"';
    ctx.letterSpacing = -0.03 * FONT + 'px';
    ctx.textBaseline = 'alphabetic';
    var g = ctx.createLinearGradient(0, 0, L.textW, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#f4f0ff');
    g.addColorStop(1, '#e2d8ff');
    ctx.fillStyle = g;
    // Centre the ink box vertically on cy.
    ctx.fillText('godpack', 0, (L.textAsc - L.textDesc) / 2);
    ctx.restore();
  }

  function glow(ctx, x, y, r, color, a) {
    if (a <= 0.001) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(0.45, rgba(color, a * 0.35));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function slab(ctx, image, cx, cy, scale, rot, alpha, flipX) {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(scale * (flipX === undefined ? 1 : flipX), scale);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    ctx.drawImage(image, -L.slabW / 2, -L.slabH / 2, L.slabW, L.slabH);
    ctx.restore();
  }

  function tearLine(w) {
    var pts = [];
    for (var i = 0; i < L.jag.length; i++) pts.push([(i / (L.jag.length - 1)) * w, L.seam + L.jag[i]]);
    return pts;
  }

  // ------------------------------------------------------------------ frame

  function draw(ctx, t) {
    t = ((t % DURATION) + DURATION) % DURATION;

    // Background: near-black with a violet glow that follows the stage.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0b0a0e';
    ctx.fillRect(0, 0, W, H);

    var open = ease.inOut(seg(t, 0.5, 1.2)) - ease.inOut(seg(t, 4.95, 5.65));
    var gx = lerp(W / 2, L.midX, open);
    glow(ctx, gx, H / 2, 560, [122, 44, 240], 0.2 + 0.08 * open);
    glow(ctx, gx, H / 2, 260, [180, 140, 255], 0.06 * open);

    // Gold wash after the reveal.
    var burst = seg(t, 3.12, 3.2);
    var goldFade = burst * (1 - seg(t, 3.9, 5.0));
    glow(ctx, L.midX, L.midY, 420, GOLD, 0.32 * goldFade);

    // ---- lockup
    var markX = lerp(L.closedMark, L.openMark, open);
    var markS = lerp(1, L.openMarkScale, open);
    var textX = lerp(L.closedText, L.openText, open);
    var textS = lerp(1, L.openTextScale, open);
    var shine = seg(t, 0.45, 1.35) + seg(t, 4.9, 5.8);
    mark(ctx, markX, H / 2, L.markR * markS, shine > 1 ? shine - 1 : shine);
    wordmark(ctx, textX, H / 2, textS);

    // ---- pack
    var pin = seg(t, 0.85, 1.45);
    var drop = seg(t, 2.45, 3.05);
    var px = L.midX;
    var py = L.midY + lerp(46, 0, ease.out(pin)) + Math.sin(t * 2.4) * 3 * (1 - drop) + ease.in(drop) * 430;
    var pScale = lerp(0.62, 1, ease.back(pin));
    var pAlpha = clamp(pin * 2.2) * (1 - drop);
    var left = -L.packW / 2;
    var top = -L.packH / 2;

    // ---- the slab that comes out (drawn behind the pack's body)
    var rise = ease.out(seg(t, 2.05, 2.8));
    var settle = ease.inOut(seg(t, 2.8, 3.1));
    var out = seg(t, 4.75, 5.15);
    var flip = seg(t, 2.95, 3.3);
    var flipX = Math.abs(Math.cos(Math.PI * flip));
    var front = flip >= 0.5;
    var slabY = lerp(L.midY + 40, L.midY - 140, rise);
    slabY = lerp(slabY, L.midY, settle);
    var slabS = lerp(0.84, 1, settle) * lerp(1, 0.55, ease.in(out)) * (1 + 0.06 * Math.sin(Math.PI * flip));
    var slabA = (t > 2.05 ? 1 : 0) * (1 - out);
    var fan = ease.back(seg(t, 3.5, 3.95)) * (1 - ease.inOut(seg(t, 4.55, 4.95)));
    var floatY = Math.sin(t * 2.1) * 4 * seg(t, 3.1, 3.4) * (1 - out);

    if (fan > 0.001) {
      slab(
        ctx,
        img.left,
        L.midX - 98 * fan,
        L.midY + 14 + floatY,
        0.9 * slabS,
        -0.2 * fan,
        Math.min(1, fan * 1.5) * (1 - out),
      );
      slab(
        ctx,
        img.right,
        L.midX + 98 * fan,
        L.midY + 14 + floatY,
        0.9 * slabS,
        0.2 * fan,
        Math.min(1, fan * 1.5) * (1 - out),
      );
    }
    if (t < 2.8) slab(ctx, img.back, L.midX, slabY, slabS, 0, slabA * clamp((t - 2.05) * 8), 1);

    // Pack body + torn strip.
    if (pAlpha > 0.001) {
      ctx.save();
      ctx.globalAlpha = pAlpha;
      ctx.translate(px, py);
      ctx.rotate(drop * 0.1);
      ctx.scale(pScale, pScale);
      var line = tearLine(L.packW);
      // Body below the tear.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left + line[0][0], top + line[0][1]);
      line.forEach(function (p) {
        ctx.lineTo(left + p[0], top + p[1]);
      });
      ctx.lineTo(left + L.packW, top + L.packH);
      ctx.lineTo(left, top + L.packH);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img.pack, left, top, L.packW, L.packH);
      ctx.restore();
      // Strip above the tear: lifts as the seam glows, then flies off.
      var glowP = seg(t, 1.45, 1.78);
      var fly = ease.out(seg(t, 1.78, 2.4));
      var stripA = 1 - seg(t, 1.9, 2.4);
      if (stripA > 0.001) {
        ctx.save();
        ctx.globalAlpha = pAlpha * stripA;
        ctx.translate(left + L.packW, top + L.seam);
        ctx.translate(fly * 80, -glowP * 4 - fly * 160);
        ctx.rotate(-glowP * 0.05 - fly * 0.55);
        ctx.translate(-(left + L.packW), -(top + L.seam));
        ctx.beginPath();
        ctx.moveTo(left, top);
        line.forEach(function (p) {
          ctx.lineTo(left + p[0], top + p[1]);
        });
        ctx.lineTo(left + L.packW, top);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img.pack, left, top, L.packW, L.packH);
        ctx.restore();
      }
      // Seam glow sweeping across before the tear.
      if (glowP > 0 && t < 1.95) {
        var gw = L.packW * 0.82 * glowP;
        var ga = 1 - seg(t, 1.78, 1.95);
        ctx.save();
        ctx.globalAlpha = pAlpha * ga;
        ctx.shadowColor = 'rgba(200,170,255,0.95)';
        ctx.shadowBlur = 22;
        var sg = ctx.createLinearGradient(left + L.packW * 0.09, 0, left + L.packW * 0.09 + gw, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0.2)');
        sg.addColorStop(1, '#ffffff');
        ctx.fillStyle = sg;
        ctx.fillRect(left + L.packW * 0.09, top + L.seam - 3, gw, 6);
        ctx.restore();
      }
      ctx.restore();
    }

    // Front of the pulled slab after the pack has gone.
    if (t >= 2.8) slab(ctx, front ? img.hero : img.back, L.midX, slabY + floatY, slabS, 0, slabA, flipX);

    // ---- effects (additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var seamX = px;
    var seamY = py + (top + L.seam) * pScale;

    // Flare at the tear.
    var fl = seg(t, 1.78, 2.3);
    if (fl > 0 && fl < 1) {
      var fa = Math.sin(Math.PI * Math.min(1, fl * 1.6)) * (1 - fl);
      ctx.save();
      ctx.translate(seamX, seamY);
      ctx.scale(L.packW * (0.7 + fl), 70);
      var fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      fg.addColorStop(0, 'rgba(255,240,202,' + fa + ')');
      fg.addColorStop(0.2, 'rgba(255,214,140,' + fa * 0.5 + ')');
      fg.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }

    // Light fanning up out of the opening.
    var rayT = t - 1.82;
    if (rayT > 0 && rayT < 1.35) {
      L.beams.forEach(function (b) {
        var p = clamp((rayT - b.d) / 0.35);
        if (p <= 0) return;
        var fade = clamp(1 - (rayT - 0.45) / 0.9);
        var len = b.len * 300 * ease.out(p);
        ctx.save();
        ctx.translate(seamX + b.off * L.packW * pScale, seamY);
        ctx.rotate(b.a);
        var g = ctx.createLinearGradient(0, 0, 0, -len);
        var col = b.warm ? [255, 226, 160] : [236, 228, 255];
        g.addColorStop(0, rgba(col, 0.5 * fade));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-b.w * 0.3, 0);
        ctx.lineTo(b.w * 0.3, 0);
        ctx.lineTo(b.w, -len);
        ctx.lineTo(-b.w, -len);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }
    ctx.restore();

    // Foil confetti from the seam (normal blending so it reads as foil).
    var dT = t - 1.78;
    if (dT > 0 && dT < 1.7) {
      L.debris.forEach(function (b) {
        if (dT > b.life) return;
        var x = seamX + (b.u - 0.5) * L.packW * 0.8 * pScale + b.vx * dT;
        var y = seamY + b.vy * dT + 0.5 * 900 * dT * dT;
        var r = b.rot + b.vr * dT;
        ctx.save();
        ctx.globalAlpha = clamp(1 - dT / b.life) * 0.95;
        ctx.translate(x, y);
        ctx.rotate(r);
        ctx.scale(1, Math.cos(r * 1.7));
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      });
    }

    // The gold burst as the slab flips.
    var bT = t - 3.12;
    if (bT > 0 && bT < 1.3) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Speed lines.
      var reach = 520;
      var lf = clamp(1 - Math.pow(bT / 0.9, 2));
      if (lf > 0) {
        L.lines.forEach(function (s) {
          var r0 = (s.r0 + bT * s.s * 0.9) * reach;
          var x0 = L.midX + Math.cos(s.a) * r0;
          var y0 = L.midY + Math.sin(s.a) * r0;
          var x1 = L.midX + Math.cos(s.a) * (r0 + s.len * reach);
          var y1 = L.midY + Math.sin(s.a) * (r0 + s.len * reach);
          var g = ctx.createLinearGradient(x0, y0, x1, y1);
          g.addColorStop(0, 'rgba(255,240,210,0)');
          g.addColorStop(1, 'rgba(255,240,210,' + 0.75 * lf + ')');
          ctx.strokeStyle = g;
          ctx.lineWidth = s.w;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        });
      }
      // Ring.
      var rp = clamp(bT / 1.2);
      var ra = Math.sin(Math.PI * Math.min(1, rp * 1.25)) * 0.9;
      ctx.translate(L.midX, L.midY);
      ctx.scale(lerp(0.7, 1.15, ease.out(rp)), lerp(0.7, 1.15, ease.out(rp)));
      ctx.shadowColor = rgba(GOLD, 1);
      ctx.shadowBlur = 16;
      ctx.strokeStyle = rgba(GOLD, ra);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 200, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 172, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(bT * 0.9);
      for (var k = 0; k < 36; k++) {
        ctx.rotate((Math.PI * 2) / 36);
        ctx.fillStyle = rgba(GOLD, ra * (k % 3 ? 0.55 : 1));
        ctx.fillRect(-1, -198, 2, k % 3 ? 14 : 22);
      }
      ctx.restore();
      // Sparks.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      L.sparks.forEach(function (s) {
        if (bT > s.life) return;
        var d = (s.v * (1 - Math.exp(-2.4 * bT))) / 2.4;
        var x = L.midX + Math.cos(s.a) * d;
        var y = L.midY + Math.sin(s.a) * d + 40 * bT * bT;
        var a = 1 - bT / s.life;
        ctx.fillStyle = bT < s.life * 0.3 ? 'rgba(255,255,255,' + a + ')' : rgba(GOLD, a);
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Flash: a brief warm bloom centred on the card rather than a full-frame white-out.
    if (bT > 0 && bT < 0.4) {
      glow(ctx, L.midX, L.midY, 640, [255, 246, 226], 0.42 * Math.pow(1 - bT / 0.4, 2));
    }

    // Glint across the revealed card.
    var gl = seg(t, 3.35, 3.85);
    if (gl > 0 && gl < 1) {
      ctx.save();
      ctx.translate(L.midX, L.midY + floatY);
      ctx.scale(slabS, slabS);
      ctx.beginPath();
      ctx.rect(-L.slabW / 2, -L.slabH / 2, L.slabW, L.slabH);
      ctx.clip();
      var gxx = lerp(-L.slabW * 1.2, L.slabW * 1.2, ease.inOut(gl));
      var gg = ctx.createLinearGradient(gxx - 60, -L.slabH / 2, gxx + 60, L.slabH / 2);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gg;
      ctx.fillRect(-L.slabW / 2, -L.slabH / 2, L.slabW, L.slabH);
      ctx.restore();
    }

    // Twinkles around the reveal while it rests.
    var tw = seg(t, 3.3, 3.6) * (1 - seg(t, 4.5, 4.9));
    if (tw > 0) {
      ctx.save();
      ctx.fillStyle = '#fff4d6';
      L.twinkles.forEach(function (s) {
        var a = Math.pow(Math.max(0, Math.sin(Math.PI * 2 * (t * 0.9 + s.ph))), 3) * tw;
        if (a < 0.02) return;
        ctx.globalAlpha = a;
        sparkle(ctx, L.midX + s.x * 210, L.midY + s.y * 200, s.r * (0.6 + 0.4 * a), 0.12);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  window.OG = { W: W, H: H, FPS: FPS, DURATION: DURATION, ready: ready, draw: draw };
})();
