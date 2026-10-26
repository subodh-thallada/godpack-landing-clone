/* Graded slab generator: an acrylic grading case with a label and an
 * original trading card inside. Card art is procedural scenery (peaks,
 * seas, crystals, nebulae...) under a holo sheen; no licensed characters.
 * Slabs render at 600 x 1005 (the ribbon's 200 x 335 frame, tripled). */
(function () {
  var A = window.Art;
  var SW = 600,
    SH = 1005;

  // id, label lines, grade, palette and scene for each of the thirteen.
  var SLABS = [
    {
      id: 'aurora-peaks',
      year: 2007,
      set: 'ORIGINS GOLD STAR',
      name: 'AURORA PEAKS-HOLO',
      sub: 'FIRST LIGHT',
      no: '#101',
      grade: 'GEM MT',
      score: '10',
      scene: 'peaks',
      frame: 'gold',
      pal: ['#061a3a', '#0d3f6e', '#38d6c4', '#b6ff9e', '#ffffff'],
    },
    {
      id: 'solar-crown',
      year: 2016,
      set: 'ORIGINS JAPANESE',
      name: 'SOLAR CROWN FOIL',
      sub: 'ANNIVERSARY-1ST ED.',
      no: '#094',
      grade: 'GEM MT',
      score: '10',
      scene: 'sun',
      frame: 'silver',
      pal: ['#2a0b0b', '#7a2a12', '#ff8a3d', '#ffd86b', '#fff6d8'],
    },
    {
      id: 'tidal-glass',
      year: 2024,
      set: 'ORIGINS TIDEWORKS',
      name: 'TIDAL GLASS',
      sub: 'SPECIAL ILLUSTRATION',
      no: '#232',
      grade: 'GEM MT',
      score: '10',
      scene: 'waves',
      frame: 'pearl',
      pal: ['#04122e', '#0b3c7a', '#1f8fd6', '#9fe3ff', '#ffffff'],
    },
    {
      id: 'crystal-hollow',
      year: 2001,
      set: 'ORIGINS JAPANESE',
      name: 'CRYSTAL HOLLOW',
      sub: '1ST EDITION',
      no: '#100',
      grade: 'GEM MT',
      score: '10',
      scene: 'crystals',
      frame: 'gold',
      pal: ['#14072e', '#3b1477', '#8a4dff', '#e3b8ff', '#ffffff'],
    },
    {
      id: 'nebula-bloom',
      year: 2023,
      set: 'ORIGINS STARFIELD',
      name: 'NEBULA BLOOM',
      sub: 'PROMO',
      no: '#085',
      grade: 'GEM MT',
      score: '10',
      scene: 'nebula',
      frame: 'black',
      pal: ['#05030f', '#2b0d4f', '#c03fa8', '#ff9ad5', '#ffffff'],
    },
    {
      id: 'ember-dunes',
      year: 2014,
      set: 'ORIGINS SANDGLASS',
      name: 'EMBER DUNES FOIL',
      sub: 'HIGH NOON',
      no: '#034',
      grade: 'GEM MT',
      score: '10',
      scene: 'dunes',
      frame: 'silver',
      pal: ['#1d0610', '#6b1530', '#f0573a', '#ffb35c', '#fff0c8'],
    },
    {
      id: 'moonlit-grove',
      year: 2019,
      set: 'ORIGINS NIGHTFALL',
      name: 'MOONLIT GROVE',
      sub: 'SILVER CANOPY',
      no: '#238',
      grade: 'GEM MT',
      score: '10',
      scene: 'grove',
      frame: 'pearl',
      pal: ['#030a16', '#0b2a3d', '#2f7f7a', '#cfe9ff', '#ffffff'],
    },
    {
      id: 'storm-spire',
      year: 2023,
      set: 'ORIGINS TEMPEST',
      name: 'STORM SPIRE-HOLO',
      sub: 'HIGH VOLTAGE',
      no: '#093',
      grade: 'NM MT',
      score: '8',
      scene: 'storm',
      frame: 'gold',
      pal: ['#0a0a1e', '#24245a', '#5d6cff', '#ffe96b', '#ffffff'],
    },
    {
      id: 'coral-drift',
      year: 2021,
      set: 'ORIGINS DEEP BLUE',
      name: 'CORAL DRIFT',
      sub: 'ALT ART-SECRET',
      no: '#218',
      grade: 'GEM MT',
      score: '10',
      scene: 'coral',
      frame: 'rainbow',
      pal: ['#03141c', '#0a4b5c', '#ff6f8e', '#ffd2a8', '#ffffff'],
    },
    {
      id: 'frost-halo',
      year: 2026,
      set: 'ORIGINS NORTHERN',
      name: 'FROST HALO',
      sub: 'HYPER FOIL',
      no: '#276',
      grade: 'GEM MT',
      score: '10',
      scene: 'frost',
      frame: 'gold',
      pal: ['#061226', '#13406b', '#7cc8ff', '#e6f8ff', '#ffffff'],
    },
    {
      id: 'volcanic-heart',
      year: 2000,
      set: 'ORIGINS FIRSTFIRE',
      name: 'VOLCANIC HEART-HOLO',
      sub: '1ST EDITION',
      no: '#005',
      grade: 'MINT',
      score: '9',
      scene: 'lava',
      frame: 'silver',
      pal: ['#120404', '#4a0b07', '#d63a12', '#ffb02e', '#fff2b0'],
    },
    {
      id: 'prism-gate',
      year: 2024,
      set: 'ORIGINS PROMO',
      name: 'PRISM GATE',
      sub: 'GALLERY',
      no: '#151',
      grade: 'GEM MT',
      score: '10',
      scene: 'prism',
      frame: 'pearl',
      pal: ['#0c0a1c', '#2a2366', '#7c5cff', '#ffd3f4', '#ffffff'],
    },
    {
      id: 'gilded-comet',
      year: 2026,
      set: 'ORIGINS SKYWARD',
      name: 'GILDED COMET',
      sub: 'HYPER FOIL',
      no: '#130',
      grade: 'GEM MT',
      score: '10',
      scene: 'comet',
      frame: 'gold',
      pal: ['#0e0814', '#3a2410', '#c98a2b', '#ffe08a', '#fffbe8'],
    },
  ];

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // ---------- scenery ----------
  function sky(ctx, w, h, top, mid, bot) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function stars(ctx, w, h, r, n, maxY) {
    for (var i = 0; i < n; i++) {
      var x = r() * w,
        y = r() * (maxY || h),
        s = r() * 1.6 + 0.3;
      ctx.globalAlpha = 0.4 + r() * 0.6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function ridge(ctx, w, h, r, base, amp, rough, color, noise, f) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (var x = 0; x <= w; x += 2) {
      var y = base - (A.fbm(noise, x / f, base / 97, 4, 2, rough) * 0.5 + 0.5) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function glow(ctx, x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  var SCENES = {
    peaks: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[0], P[1], P[0]);
      stars(ctx, w, h, r, 120, h * 0.6);
      // Aurora curtains.
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 3; k++) {
        for (var x = 0; x < w; x += 3) {
          var y0 = h * (0.18 + k * 0.08) + Math.sin(x / 50 + k * 2) * 26 + A.fbm(n, x / 90, k, 3, 2, 0.5) * 40;
          var g = ctx.createLinearGradient(0, y0, 0, y0 + 140);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(0.35, k === 1 ? 'rgba(182,255,158,0.18)' : 'rgba(56,214,196,0.16)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x, y0, 3, 140);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ridge(ctx, w, h, r, h * 0.66, h * 0.3, 0.55, '#123a5a', n, 140);
      ridge(ctx, w, h, r, h * 0.78, h * 0.22, 0.5, '#0a2440', A.makeNoise(7), 110);
      ridge(ctx, w, h, r, h * 0.9, h * 0.14, 0.5, '#04122a', A.makeNoise(9), 90);
    },
    sun: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[1], P[2], P[3]);
      glow(ctx, w * 0.5, h * 0.52, w * 0.7, 'rgba(255,230,160,0.6)');
      ctx.fillStyle = P[4];
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.52, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
      for (var i = 0; i < 18; i++) {
        ctx.save();
        ctx.translate(w * 0.5, h * 0.52);
        ctx.rotate((i * Math.PI) / 9);
        ctx.fillStyle = 'rgba(255,240,200,0.18)';
        ctx.beginPath();
        ctx.moveTo(-8, w * 0.24);
        ctx.lineTo(8, w * 0.24);
        ctx.lineTo(0, w * 0.7);
        ctx.fill();
        ctx.restore();
      }
      var sea = ctx.createLinearGradient(0, h * 0.62, 0, h);
      sea.addColorStop(0, P[1]);
      sea.addColorStop(1, P[0]);
      ctx.fillStyle = sea;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      for (var y = h * 0.64; y < h; y += 7) {
        ctx.fillStyle = 'rgba(255,216,107,' + (0.5 * (1 - (y - h * 0.62) / (h * 0.38))).toFixed(2) + ')';
        var ww = w * 0.3 * (1 - (y - h * 0.62) / (h * 0.5));
        ctx.fillRect(w * 0.5 - ww / 2 + (r() - 0.5) * 20, y, ww, 2);
      }
    },
    waves: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[3], P[2], P[1]);
      glow(ctx, w * 0.7, h * 0.18, w * 0.4, 'rgba(255,255,255,0.7)');
      for (var k = 0; k < 7; k++) {
        var base = h * (0.42 + k * 0.085);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var x = 0; x <= w; x += 3)
          ctx.lineTo(x, base + Math.sin(x / (40 + k * 6) + k * 1.7) * (12 + k * 3) + n(x / 80, k) * 14);
        ctx.lineTo(w, h);
        ctx.closePath();
        var c1 = A.ramp([A.hex(P[2]), A.hex(P[1]), A.hex(P[0])], k / 6);
        ctx.fillStyle = 'rgb(' + c1.map(Math.round).join(',') + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(220,245,255,0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
    crystals: function (ctx, w, h, P, r) {
      sky(ctx, w, h, P[0], P[1], P[0]);
      glow(ctx, w * 0.5, h * 0.6, w * 0.6, 'rgba(160,100,255,0.5)');
      for (var i = 0; i < 26; i++) {
        var cx = w * (0.08 + r() * 0.84),
          hh = h * (0.18 + r() * 0.45),
          ww = 26 + r() * 46,
          base = h * (0.8 + r() * 0.2);
        ctx.save();
        ctx.translate(cx, base);
        ctx.rotate((r() - 0.5) * 0.7);
        var g = ctx.createLinearGradient(-ww / 2, 0, ww / 2, 0);
        g.addColorStop(0, P[1]);
        g.addColorStop(0.5, P[3]);
        g.addColorStop(1, P[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-ww / 2, 0);
        ctx.lineTo(-ww / 2, -hh * 0.75);
        ctx.lineTo(0, -hh);
        ctx.lineTo(ww / 2, -hh * 0.75);
        ctx.lineTo(ww / 2, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -hh);
        ctx.lineTo(ww / 2, -hh * 0.75);
        ctx.lineTo(ww / 2, 0);
        ctx.fill();
        ctx.restore();
      }
    },
    nebula: function (ctx, w, h, P, r, n) {
      var img = ctx.createImageData(w, h),
        d = img.data;
      var ramp = P.map(A.hex);
      for (var y = 0; y < h; y++)
        for (var x = 0; x < w; x++) {
          var v = A.fbm(n, x / 160, y / 160, 5, 2, 0.55) * 0.5 + 0.5;
          var v2 = A.fbm(n, x / 60 + 9, y / 60, 3, 2, 0.5) * 0.5 + 0.5;
          var t = Math.pow(v, 1.6) * 1.1 + v2 * 0.12;
          var c = A.ramp(ramp, t);
          var i = (y * w + x) * 4;
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
          d[i + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
      stars(ctx, w, h, r, 260);
      glow(ctx, w * 0.45, h * 0.45, w * 0.3, 'rgba(255,220,250,0.55)');
    },
    dunes: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[1], P[2], P[3]);
      ctx.fillStyle = P[4];
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.36, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      glow(ctx, w * 0.3, h * 0.36, w * 0.4, 'rgba(255,220,150,0.5)');
      var cols = [P[2], P[1], '#3a0c1c', P[0]];
      for (var k = 0; k < 4; k++) {
        var base = h * (0.55 + k * 0.12);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var x = 0; x <= w; x += 3)
          ctx.lineTo(x, base + Math.sin(x / (110 - k * 12) + k) * 30 + n(x / 200, k * 3) * 30);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = cols[k];
        ctx.fill();
      }
    },
    grove: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[0], P[1], P[2]);
      stars(ctx, w, h, r, 140, h * 0.5);
      ctx.fillStyle = P[3];
      ctx.beginPath();
      ctx.arc(w * 0.66, h * 0.24, w * 0.11, 0, Math.PI * 2);
      ctx.fill();
      glow(ctx, w * 0.66, h * 0.24, w * 0.35, 'rgba(207,233,255,0.45)');
      for (var k = 0; k < 3; k++) {
        var col = ['#123a44', '#0a2530', '#03121a'][k];
        for (var i = 0; i < 16; i++) {
          var x = (i / 15) * w + (r() - 0.5) * 40,
            top = h * (0.45 + k * 0.12 + r() * 0.08),
            wd = 40 + r() * 30;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x - wd, h);
          ctx.lineTo(x + wd, h);
          ctx.fill();
        }
      }
    },
    storm: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[0], P[1], P[0]);
      for (var c = 0; c < 40; c++) glow(ctx, r() * w, r() * h * 0.5, 80 + r() * 90, 'rgba(93,108,255,0.12)');
      ctx.fillStyle = '#0b0b22';
      ctx.beginPath();
      ctx.moveTo(w * 0.42, h);
      ctx.lineTo(w * 0.47, h * 0.32);
      ctx.lineTo(w * 0.5, h * 0.26);
      ctx.lineTo(w * 0.53, h * 0.32);
      ctx.lineTo(w * 0.58, h);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (var b = 0; b < 3; b++) {
        var x = w * (0.5 + (b - 1) * 0.28),
          y = 0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        while (y < h * 0.3 + b * 40) {
          x += (r() - 0.5) * 40;
          y += 14 + r() * 18;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,233,107,0.95)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffe96b';
        ctx.shadowBlur = 18;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      ridge(ctx, w, h, r, h * 0.92, h * 0.1, 0.5, '#06061a', n, 80);
    },
    coral: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, '#0e6b7c', P[1], P[0]);
      for (var i = 0; i < 9; i++) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#bff6ff';
        ctx.beginPath();
        var x = r() * w;
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 40, 0);
        ctx.lineTo(x + 140, h);
        ctx.lineTo(x + 60, h);
        ctx.fill();
        ctx.restore();
      }
      function branch(x, y, len, ang, wdt, depth) {
        if (depth === 0 || len < 8) return;
        var x2 = x + Math.cos(ang) * len,
          y2 = y + Math.sin(ang) * len;
        ctx.strokeStyle = depth > 3 ? P[2] : P[3];
        ctx.lineWidth = wdt;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        branch(x2, y2, len * 0.75, ang - 0.4 - r() * 0.3, wdt * 0.7, depth - 1);
        branch(x2, y2, len * 0.75, ang + 0.4 + r() * 0.3, wdt * 0.7, depth - 1);
      }
      for (var c = 0; c < 5; c++)
        branch(w * (0.1 + c * 0.2), h, 70 + r() * 30, -Math.PI / 2 + (r() - 0.5) * 0.4, 16, 6);
      for (var b = 0; b < 40; b++) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r() * w, r() * h * 0.7, 2 + r() * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    frost: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[0], P[1], P[2]);
      ctx.save();
      ctx.translate(w / 2, h * 0.46);
      for (var k = 0; k < 4; k++) {
        ctx.strokeStyle = 'rgba(230,248,255,' + (0.8 - k * 0.15) + ')';
        ctx.lineWidth = 10 - k * 2;
        ctx.beginPath();
        ctx.arc(0, 0, w * (0.18 + k * 0.07), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (var i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -w * 0.16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.1);
        ctx.lineTo(-18, -w * 0.13);
        ctx.moveTo(0, -w * 0.1);
        ctx.lineTo(18, -w * 0.13);
        ctx.stroke();
      }
      ctx.restore();
      glow(ctx, w / 2, h * 0.46, w * 0.5, 'rgba(124,200,255,0.4)');
      for (var s = 0; s < 120; s++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.6) + ')';
        ctx.beginPath();
        ctx.arc(r() * w, r() * h, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    lava: function (ctx, w, h, P, r, n) {
      var img = ctx.createImageData(w, h),
        d = img.data,
        ramp = P.map(A.hex);
      for (var y = 0; y < h; y++)
        for (var x = 0; x < w; x++) {
          var v = A.ridged(n, x / 140, y / 110, 4);
          var t = Math.pow(v, 2.2) * 1.4 * (0.5 + (y / h) * 0.7);
          var c = A.ramp(ramp, t),
            i = (y * w + x) * 4;
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
          d[i + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
      glow(ctx, w * 0.5, h * 0.4, w * 0.4, 'rgba(255,176,46,0.35)');
    },
    prism: function (ctx, w, h, P, r) {
      sky(ctx, w, h, P[0], P[1], P[0]);
      var cols = ['#ff7ad9', '#ffd36b', '#7bffb4', '#6bd3ff', '#9d7bff'];
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 5; i++) {
        ctx.fillStyle = cols[i];
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.42);
        ctx.lineTo(w, h * (0.3 + i * 0.1));
        ctx.lineTo(w, h * (0.38 + i * 0.1));
        ctx.fill();
      }
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w * 0.5, h * 0.42);
      ctx.lineTo(w * 0.5, h * 0.44);
      ctx.lineTo(0, h * 0.54);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      var g = ctx.createLinearGradient(w * 0.3, 0, w * 0.7, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.25)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0.2)');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.2);
      ctx.lineTo(w * 0.72, h * 0.62);
      ctx.lineTo(w * 0.28, h * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    comet: function (ctx, w, h, P, r, n) {
      sky(ctx, w, h, P[0], '#1c1030', P[1]);
      stars(ctx, w, h, r, 200);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 30; i++) {
        var g = ctx.createLinearGradient(w * 0.75, h * 0.25, w * 0.05, h * 0.75);
        g.addColorStop(0, 'rgba(255,224,138,0.5)');
        g.addColorStop(1, 'rgba(255,224,138,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1 + r() * 4;
        ctx.beginPath();
        ctx.moveTo(w * 0.75, h * 0.25);
        ctx.lineTo(w * (0.0 + r() * 0.2), h * (0.6 + r() * 0.3));
        ctx.stroke();
      }
      glow(ctx, w * 0.75, h * 0.25, 120, 'rgba(255,251,232,0.95)');
      ctx.globalCompositeOperation = 'source-over';
      ridge(ctx, w, h, r, h * 0.95, h * 0.12, 0.5, '#120a08', n, 100);
    },
  };

  // ---------- card ----------
  var FRAMES = {
    gold: ['#7a5a1c', '#e9c76a', '#fff2c4', '#b88a2e', '#f5d98a'],
    silver: ['#6f7280', '#d9dbe4', '#ffffff', '#9a9dab', '#e6e7ee'],
    pearl: ['#b9b2d6', '#f4effc', '#ffffff', '#cfc6ec', '#efe9fb'],
    black: ['#08070c', '#2a2633', '#55506a', '#141218', '#3a3548'],
    rainbow: ['#ff9ad5', '#ffe38a', '#9dffc4', '#8fd3ff', '#c49dff'],
  };

  function card(S, w, h) {
    var c = A.canvas(w, h),
      ctx = c.getContext('2d');
    var r = A.rng(hash(S.id)),
      n = A.makeNoise(hash(S.id) & 255);
    var rad = w * 0.045;
    // Frame.
    var F = FRAMES[S.frame];
    var fg = ctx.createLinearGradient(0, 0, w, h);
    F.forEach(function (col, i) {
      fg.addColorStop(i / (F.length - 1), col);
    });
    A.roundRect(ctx, 0, 0, w, h, rad);
    ctx.fillStyle = fg;
    ctx.fill();
    // Art window (full-art style: art runs under the text panels).
    var m = w * 0.045;
    var art = A.canvas(Math.round(w - m * 2), Math.round(h - m * 2));
    SCENES[S.scene](art.getContext('2d'), art.width, art.height, S.pal, r, n);
    ctx.save();
    A.roundRect(ctx, m, m, w - m * 2, h - m * 2, rad * 0.6);
    ctx.clip();
    ctx.drawImage(art, m, m);
    // Holo sheen.
    ctx.globalCompositeOperation = 'overlay';
    var hg = ctx.createLinearGradient(0, 0, w, h);
    ['#ff9ad5', '#ffe38a', '#9dffc4', '#8fd3ff', '#c49dff', '#ff9ad5'].forEach(function (col, i) {
      hg.addColorStop(i / 5, col);
    });
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Name bar.
    var bar = ctx.createLinearGradient(0, m, 0, m + h * 0.075);
    bar.addColorStop(0, 'rgba(255,255,255,0.78)');
    bar.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.fillStyle = bar;
    ctx.fillRect(m, m, w - m * 2, h * 0.075);
    ctx.fillStyle = '#16131e';
    ctx.font = '700 ' + Math.round(h * 0.042) + 'px "Hanken Grotesk"';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleCase(S.name.replace(/-HOLO| FOIL/, '')), m + w * 0.04, m + h * 0.039);
    ctx.textAlign = 'right';
    ctx.font = '800 ' + Math.round(h * 0.034) + 'px "Hanken Grotesk"';
    ctx.fillText('✦ ' + (60 + (hash(S.id) % 28) * 10), w - m - w * 0.04, m + h * 0.04);
    ctx.textAlign = 'left';
    // Text panel.
    var py = h * 0.66;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    A.roundRect(ctx, m + w * 0.03, py, w - m * 2 - w * 0.06, h * 0.25, w * 0.02);
    ctx.fill();
    ctx.fillStyle = 'rgba(22,19,30,0.85)';
    ctx.font = '700 ' + Math.round(h * 0.03) + 'px "Hanken Grotesk"';
    ctx.fillText(
      ['Radiant Pulse', 'First Light', 'Undertow', 'Shard Storm', 'Starfall'][hash(S.id) % 5],
      m + w * 0.07,
      py + h * 0.045,
    );
    ctx.fillStyle = 'rgba(22,19,30,0.45)';
    for (var l = 0; l < 4; l++)
      ctx.fillRect(
        m + w * 0.07,
        py + h * (0.085 + l * 0.035),
        (w - m * 2 - w * 0.14) * (l === 3 ? 0.55 : 1),
        h * 0.012,
      );
    ctx.restore();
    // Inner edge highlight.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    A.roundRect(ctx, 1, 1, w - 2, h - 2, rad);
    ctx.stroke();
    return c;
  }

  function titleCase(s) {
    return s.toLowerCase().replace(/\b([a-z])/g, function (m) {
      return m.toUpperCase();
    });
  }

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Original card back: deep violet swirl with the hexagon mark.
  function cardBack(w, h) {
    var c = A.canvas(w, h),
      ctx = c.getContext('2d');
    var rad = w * 0.045;
    A.roundRect(ctx, 0, 0, w, h, rad);
    ctx.fillStyle = '#1b1240';
    ctx.fill();
    ctx.save();
    A.roundRect(ctx, w * 0.05, w * 0.05, w * 0.9, h - w * 0.1, rad * 0.7);
    ctx.clip();
    var n = A.makeNoise(77),
      img = ctx.createImageData(w, h),
      d = img.data;
    var ramp = ['#0d0830', '#2a1a7a', '#5b3fe0', '#a98cff', '#e9e0ff'].map(A.hex);
    for (var y = 0; y < h; y++)
      for (var x = 0; x < w; x++) {
        var dx = x - w / 2,
          dy = y - h / 2,
          a = Math.atan2(dy, dx),
          r0 = Math.hypot(dx, dy);
        var v = Math.sin(a * 3 + r0 / 26 + A.fbm(n, x / 90, y / 90, 3, 2, 0.5) * 3) * 0.5 + 0.5;
        var cc = A.ramp(ramp, v * 0.8 + 0.1),
          i = (y * w + x) * 4;
        d[i] = cc[0];
        d[i + 1] = cc[1];
        d[i + 2] = cc[2];
        d[i + 3] = 255;
      }
    var tmp = A.canvas(w, h);
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
    // Emblem.
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(180,140,255,0.9)';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    hexagon(ctx, 0, 0, w * 0.26, 18);
    hexagon(ctx, 0, 0, w * 0.17, 10);
    ctx.fill('evenodd');
    A.sparkle(ctx, 0, 0, w * 0.13, 0.14);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 ' + Math.round(w * 0.1) + 'px "Hanken Grotesk"';
    ctx.textAlign = 'center';
    ctx.fillText('godpack', w / 2, h * 0.2);
    ctx.save();
    ctx.translate(w / 2, h * 0.8);
    ctx.rotate(Math.PI);
    ctx.fillText('godpack', 0, 0);
    ctx.restore();
    return c;
  }

  function hexagon(ctx, cx, cy, r, round) {
    var pts = [];
    for (var k = 0; k < 6; k++) {
      var ang = -Math.PI / 2 + (k * Math.PI) / 3;
      pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
    }
    ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (k = 1; k <= 6; k++) {
      var p1 = pts[k % 6],
        p2 = pts[(k + 1) % 6];
      ctx.arcTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, round);
    }
    ctx.closePath();
  }

  // ---------- slab ----------
  function slab(S, inner) {
    var c = A.canvas(SW, SH),
      ctx = c.getContext('2d');
    var R = 26;
    // Acrylic shell.
    var shell = ctx.createLinearGradient(0, 0, SW, 0);
    shell.addColorStop(0, '#5d5f68');
    shell.addColorStop(0.06, '#c9cad2');
    shell.addColorStop(0.12, '#8d8f99');
    shell.addColorStop(0.5, '#a3a5ae');
    shell.addColorStop(0.88, '#8a8c96');
    shell.addColorStop(0.94, '#cfd0d8');
    shell.addColorStop(1, '#55575f');
    A.roundRect(ctx, 0, 0, SW, SH, R);
    ctx.fillStyle = shell;
    ctx.fill();
    var vg = ctx.createLinearGradient(0, 0, 0, SH);
    vg.addColorStop(0, 'rgba(255,255,255,0.25)');
    vg.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    vg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = vg;
    A.roundRect(ctx, 0, 0, SW, SH, R);
    ctx.fill();
    // Recess.
    ctx.fillStyle = '#2a2b31';
    A.roundRect(ctx, 22, 22, SW - 44, SH - 44, 14);
    ctx.fill();
    // Label.
    var LX = 34,
      LY = 34,
      LW = SW - 68,
      LH = 196;
    ctx.fillStyle = '#d8333a';
    A.roundRect(ctx, LX, LY, LW, LH, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(LX + 12, LY + 12, LW - 24, LH - 24);
    if (S) {
      ctx.fillStyle = '#16141c';
      ctx.font = '500 25px "Hanken Grotesk"';
      ctx.textBaseline = 'top';
      var lines = [S.year + ' ' + S.set, S.name, S.sub];
      lines.forEach(function (t, i) {
        ctx.fillText(fit(ctx, t, 330), LX + 30, LY + 30 + i * 30);
      });
      ctx.textAlign = 'right';
      [S.no, S.grade, S.score, String(28000000 + (hash(S.id) % 9000000))].forEach(function (t, i) {
        ctx.fillText(t, LX + LW - 30, LY + 30 + i * 30);
      });
      ctx.textAlign = 'left';
      // Barcode.
      var bx = LX + 30,
        r = A.rng(hash(S.id + 'bar'));
      while (bx < LX + 230) {
        var bw = 1 + Math.floor(r() * 4);
        ctx.fillRect(bx, LY + 132, bw, 30);
        bx += bw + 1 + Math.floor(r() * 3);
      }
      // Seal mark: a small hexagon, not a grading company's logo.
      ctx.fillStyle = '#2a2f86';
      ctx.beginPath();
      hexagon(ctx, LX + LW / 2 + 40, LY + 147, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      A.sparkle(ctx, LX + LW / 2 + 40, LY + 147, 8, 0.15);
      ctx.fill();
    }
    // Card well.
    var WX = 48,
      WY = LY + LH + 30,
      WW = SW - 96,
      WH = SH - WY - 48;
    ctx.fillStyle = '#17181c';
    A.roundRect(ctx, WX - 8, WY - 8, WW + 16, WH + 16, 12);
    ctx.fill();
    var cw = WW - 24,
      ch = Math.round(cw * 1.396);
    if (ch > WH - 20) {
      ch = WH - 20;
      cw = Math.round(ch / 1.396);
    }
    var cx = Math.round(SW / 2 - cw / 2),
      cy = Math.round(WY + (WH - ch) / 2);
    ctx.drawImage(inner(cw, ch), cx, cy);
    // Acrylic glare over everything.
    ctx.save();
    A.roundRect(ctx, 0, 0, SW, SH, R);
    ctx.clip();
    var glare = ctx.createLinearGradient(0, 0, SW, SH);
    glare.addColorStop(0, 'rgba(255,255,255,0.0)');
    glare.addColorStop(0.42, 'rgba(255,255,255,0.0)');
    glare.addColorStop(0.47, 'rgba(255,255,255,0.10)');
    glare.addColorStop(0.53, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, SW, SH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    A.roundRect(ctx, 1, 1, SW - 2, SH - 2, R);
    ctx.stroke();
    return c;
  }

  function fit(ctx, t, max) {
    while (ctx.measureText(t).width > max && t.length > 4) t = t.slice(0, -1);
    return t;
  }

  window.SLABS = SLABS;
  window.renderSlab = function (i) {
    var S = SLABS[i];
    return slab(S, function (w, h) {
      return S.sport ? window.sportCard(S, w, h) : card(S, w, h);
    });
  };
  // Shared with sports.js, which adds the baseball and basketball cards.
  window.CardArt = { sky: sky, stars: stars, glow: glow, frames: FRAMES, hash: hash };
  var SEALED = {
    id: 'sealed',
    year: 'GODPACK',
    set: 'VAULT',
    name: 'SEALED PULL',
    sub: 'DEMO OPEN',
    no: '#000',
    grade: 'SEALED',
    score: '?',
  };
  window.renderSlabBack = function () {
    return slab(SEALED, cardBack);
  };
  window.renderCardBack = cardBack;
})();
