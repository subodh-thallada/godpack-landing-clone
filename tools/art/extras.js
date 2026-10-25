/* Brand extras: the header logo (hexagon mark + wordmark), favicons and the
 * link-preview image. All original artwork. */
(function () {
  var A = window.Art;
  var HOLO = ['#ffe6f7', '#f0c8ff', '#c7a5ff', '#9b86ff', '#9cc2ff', '#dff6ff'];

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

  // The mark: a holographic hexagon ring around a four-point sparkle.
  function mark(ctx, cx, cy, r) {
    var g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    HOLO.forEach(function (c, i) {
      g.addColorStop(i / (HOLO.length - 1), c);
    });
    ctx.fillStyle = g;
    ctx.beginPath();
    hexagon(ctx, cx, cy, r, r * 0.2);
    hexagon(ctx, cx, cy, r * 0.64, r * 0.12);
    ctx.fill('evenodd');
    A.sparkle(ctx, cx, cy, r * 0.47, 0.14);
    ctx.fill();
    // A soft inner sheen.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    var s = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, 0, cx - r * 0.4, cy - r * 0.5, r * 1.4);
    s.addColorStop(0, 'rgba(255,255,255,0.55)');
    s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  // Header logo at 3x of the 149 x 53 desktop box: mark, then the wordmark.
  function logo() {
    var k = 3,
      w = 149 * k,
      h = 53 * k;
    var c = A.canvas(w, h),
      ctx = c.getContext('2d');
    var layer = A.canvas(w, h),
      l = layer.getContext('2d');
    mark(l, 20 * k, 26.5 * k, 19.5 * k);
    ctx.drawImage(layer, 0, 0);
    var size = 30 * k;
    ctx.font = '700 ' + size + 'px "Hanken Grotesk"';
    ctx.letterSpacing = -0.9 * k + 'px';
    var tw = ctx.measureText('godpack').width;
    size = (size * (101 * k)) / tw;
    ctx.font = '700 ' + size + 'px "Hanken Grotesk"';
    var g = ctx.createLinearGradient(47 * k, 0, 149 * k, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#f4f0ff');
    g.addColorStop(1, '#e2d8ff');
    ctx.fillStyle = g;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('godpack', 47 * k, 34.5 * k);
    return c;
  }

  function icon(size, pad) {
    var c = A.canvas(size, size),
      ctx = c.getContext('2d');
    A.roundRect(ctx, 0, 0, size, size, size * 0.22);
    var bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#1d1238');
    bg.addColorStop(1, '#0b0a0e');
    ctx.fillStyle = bg;
    ctx.fill();
    var layer = A.canvas(size, size);
    mark(layer.getContext('2d'), size / 2, size / 2, size * (0.5 - pad));
    ctx.drawImage(layer, 0, 0);
    return c;
  }

  function og() {
    var w = 1200,
      h = 630,
      c = A.canvas(w, h),
      ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0a0e';
    ctx.fillRect(0, 0, w, h);
    var g = ctx.createRadialGradient(860, 315, 0, 860, 315, 420);
    g.addColorStop(0, 'rgba(122,44,240,0.45)');
    g.addColorStop(1, 'rgba(122,44,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var pack = window.__packForOg;
    if (pack) ctx.drawImage(pack, 700, 70, 320, 448);
    ctx.drawImage(logo(), 80, 80, 298, 106);
    ctx.fillStyle = '#f4f2f8';
    ctx.font = '600 84px "Hanken Grotesk"';
    ctx.letterSpacing = '-3.5px';
    ctx.fillText('Fair packs', 80, 330);
    ctx.fillText('for collectors', 80, 420);
    ctx.font = '700 30px "Hanken Grotesk"';
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#b8a0ff';
    ctx.fillText('100% Expected return', 80, 500);
    return c;
  }

  var EXTRAS = {
    'logo.png': logo,
    'favicon.png': function () {
      return icon(128, 0.12);
    },
    'apple-touch-icon.png': function () {
      return icon(180, 0.14);
    },
    'og-image.png': og,
  };
  // App icons for the mobile demo (mobile/assets). `kind`: icon (full
  // square), foreground (mark on transparent, Android adaptive), background
  // (plain gradient), mono (white mark) or splash (mark on transparent).
  window.renderAppIcon = function (kind, size) {
    if (kind === 'favicon') return icon(size, 0.16);
    var c = A.canvas(size, size),
      ctx = c.getContext('2d');
    if (kind === 'background' || kind === 'icon') {
      var bg = ctx.createLinearGradient(0, 0, size, size);
      bg.addColorStop(0, '#1d1238');
      bg.addColorStop(1, '#0b0a0e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      // iOS icons are full-bleed squares: the system rounds the corners.
      if (kind === 'icon') mark(ctx, size / 2, size / 2, size * 0.34);
      return c;
    }
    // Adaptive foregrounds keep the mark inside the central safe zone.
    mark(ctx, size / 2, size / 2, size * (kind === 'splash' ? 0.42 : 0.26));
    if (kind === 'mono') {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
    }
    return c;
  };

  window.EXTRAS = Object.keys(EXTRAS);
  window.renderExtra = function (name) {
    if (name === 'og-image.png' && !window.__packForOg) window.__packForOg = window.renderPack('arena');
    return EXTRAS[name]();
  };
})();
