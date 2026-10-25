/* Booster pack generator: a crinkled chrome-foil pillow pack with crimped
 * ends, rendered per pixel from a height field, with the printed artwork
 * (wordmark, hexagon emblem, orbit ring, "BOOSTER PACK") shaded by the same
 * crinkles so it reads as ink on foil. Output is 1060 x 1484 with alpha. */
(function () {
  var A = window.Art;
  var W = 1060,
    H = 1484;
  // Silhouette: transparent margins, crimp strips at both ends (the bottom
  // one a little wider), and a body slightly narrower than the crimps.
  var TOP = 31,
    BOT = 18; // transparent margin above and below
  var CT = 135,
    CB = 128; // crimp strip heights
  var CMT = 82,
    CMB = 66; // crimp side margins (top, bottom)
  var BODY = 95; // body side margin
  var TEETH = 8; // serrated edge depth
  var BODY_TOP = TOP + CT,
    BODY_BOT = H - BOT - CB;
  var HOLO = ['#ffe1f6', '#f2c4ff', '#c9a6ff', '#9d8bff', '#8fb8ff', '#c8f0ff', '#ffffff'];

  // ramp: dark to light, indexed by how much studio light a pixel reflects.
  // irid: how strongly the holographic hues tint the reflection.
  var TYPES = {
    arena: {
      seed: 11,
      irid: 0.22,
      ramp: ['#16043d', '#3c0c90', '#6a1ae0', '#9a45ff', '#c58cff', '#eddcff', '#ffffff'],
      ink: 'light',
      inkHolo: false,
      ring: 'rgba(255,255,255,0.62)',
      text: 'rgba(255,255,255,0.92)',
    },
    master: {
      seed: 23,
      irid: 0.95,
      ramp: ['#010005', '#05030f', '#0e0a26', '#221a5c', '#4a3fb0', '#a99cff', '#ffffff'],
      ink: 'light',
      inkHolo: true,
      ring: 'rgba(255,255,255,0.5)',
      text: 'rgba(255,255,255,0.9)',
    },
    starter: {
      seed: 37,
      irid: 0.32,
      ramp: ['#3d2c86', '#5d47bf', '#8069e0', '#a693f7', '#c6b7ff', '#ebe4ff', '#ffffff'],
      ink: 'light',
      inkHolo: false,
      ring: 'rgba(255,255,255,0.7)',
      text: 'rgba(255,255,255,0.95)',
    },
    trainer: {
      seed: 41,
      irid: 0.6,
      ramp: ['#7b788c', '#a29fb2', '#c5c3d1', '#dfdee8', '#efeef6', '#faf9ff', '#ffffff'],
      ink: 'purple',
      inkHolo: false,
      ring: 'rgba(122,46,224,0.85)',
      text: 'rgba(98,40,190,0.95)',
    },
  };

  // Side margin of the outline at height y.
  function inset(y) {
    if (y <= BODY_TOP) return CMT;
    if (y >= BODY_BOT) return CMB;
    var dt = y - BODY_TOP,
      db = BODY_BOT - y;
    var m = BODY;
    if (dt < 26) m -= 3 * Math.pow(1 - dt / 26, 2);
    if (db < 80) m -= 11 * Math.pow(1 - db / 80, 2);
    return m;
  }

  function silhouette(ctx) {
    ctx.beginPath();
    var period = 17.5,
      x,
      y;
    ctx.moveTo(CMT, TOP + TEETH);
    for (x = CMT; x < W - CMT - 1; x += period) {
      ctx.lineTo(x + period * 0.5, TOP);
      ctx.lineTo(Math.min(W - CMT, x + period), TOP + TEETH);
    }
    for (y = TOP + TEETH; y <= H - BOT - TEETH; y += 2) ctx.lineTo(W - inset(y), y);
    for (x = W - CMB; x > CMB + 1; x -= period) {
      ctx.lineTo(x - period * 0.5, H - BOT);
      ctx.lineTo(Math.max(CMB, x - period), H - BOT - TEETH);
    }
    for (y = H - BOT - TEETH; y >= TOP + TEETH; y -= 2) ctx.lineTo(inset(y), y);
    ctx.closePath();
  }

  function heightField(seed) {
    var n1 = A.makeNoise(seed),
      n2 = A.makeNoise(seed + 101),
      n3 = A.makeNoise(seed + 202),
      n4 = A.makeNoise(seed + 303);
    var h = new Float32Array(W * H);
    var cx = W / 2,
      cy = (BODY_TOP + BODY_BOT) / 2,
      bh = (BODY_BOT - BODY_TOP) / 2;
    for (var y = 0; y < H; y++) {
      var inCrimp = y < BODY_TOP || y > BODY_BOT;
      var dc = inCrimp ? 0 : Math.min(y - BODY_TOP, BODY_BOT - y);
      var v = (y - cy) / bh;
      for (var x = 0; x < W; x++) {
        var i = y * W + x,
          val;
        if (inCrimp) {
          var cy0 = y < BODY_TOP ? (y - TOP) / CT : (H - BOT - y) / CB;
          var ridge = Math.pow(Math.abs(Math.sin((x / 14) * Math.PI + n4(x / 80, y / 50) * 1.4)), 0.6);
          var bulge = Math.sin(Math.PI * Math.min(1, cy0 * 1.15)) * 22;
          val = ridge * 11 + bulge + A.fbm(n3, x / 40, y / 30, 2, 2, 0.5) * 2 + 18;
        } else {
          var u = (x - cx) / (cx - inset(y));
          var dome =
            Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.1)), 0.42) *
            Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(v), 6)));
          // Broad, smooth undulations and a few long diagonal creases: glossy, not crumpled.
          var rx0 = x * 0.94 + y * 0.34,
            ry0 = -x * 0.34 + y * 0.94;
          var swell = A.fbm(n2, x / 380, y / 460, 3, 2, 0.45) * 30;
          var crease = Math.pow(A.ridged(n1, rx0 / 380, ry0 / 1000, 2), 4) * 40;
          var fine = A.fbm(n3, x / 52, y / 44, 2, 2, 0.5) * 0.9;
          var wrinkle = Math.pow(A.ridged(n4, rx0 / 210, ry0 / 520, 2), 5) * 16;
          // Fan pleats where the body meets each crimp.
          var pleat = Math.sin((x / 40) * Math.PI * 2 + n4(x / 120, y / 90) * 2.6) * Math.exp(-dc / 38) * 6;
          val = dome * 210 + swell + crease + fine + wrinkle + pleat;
        }
        h[i] = val;
      }
    }
    return h;
  }

  function render(type) {
    var T = TYPES[type];
    var tone = T.ramp.map(A.hex);
    var holo = HOLO.map(A.hex);
    var h = heightField(T.seed);
    var nEnv = A.makeNoise(T.seed + 404);

    // Light factor per pixel (used for the foil and to shade the print).
    var c = A.canvas(W, H),
      ctx = c.getContext('2d');
    var img = ctx.createImageData(W, H),
      d = img.data;
    var light = new Float32Array(W * H),
      spec = new Float32Array(W * H),
      envT = new Float32Array(W * H);
    // Studio softboxes (direction, tightness, strength) plus a hard key for glints.
    var boxes = [
      [norm([-0.55, -0.45, 0.7]), 10, 0.9],
      [norm([0.62, -0.1, 0.78]), 18, 0.7],
      [norm([0.0, -0.75, 0.66]), 6, 0.28],
      [norm([-0.1, 0.55, 0.83]), 14, 0.25],
      [norm([0.25, 0.25, 0.93]), 30, 0.35],
    ];
    var key = norm([-0.35, -0.5, 0.79]);
    for (var y = 1; y < H - 1; y++) {
      for (var x = 1; x < W - 1; x++) {
        var i = y * W + x;
        var dx = (h[i + 1] - h[i - 1]) * 0.5,
          dy = (h[i + W] - h[i - W]) * 0.5;
        var nx = -dx * 0.6,
          ny = -dy * 0.6,
          nz = 1,
          l = Math.sqrt(nx * nx + ny * ny + 1);
        nx /= l;
        ny /= l;
        nz /= l;
        // Reflect the view ray (0,0,1).
        var rx = 2 * nz * nx,
          ry = 2 * nz * ny,
          rz = 2 * nz * nz - 1;
        var bright = 0.13;
        for (var k2 = 0; k2 < boxes.length; k2++) {
          var B = boxes[k2],
            dot = rx * B[0][0] + ry * B[0][1] + rz * B[0][2];
          if (dot > 0) bright += Math.pow(dot, B[1]) * B[2];
        }
        var kd = Math.max(0, rx * key[0] + ry * key[1] + rz * key[2]);
        var glint = Math.pow(kd, 90) * 0.85;
        var diff = Math.max(0, nx * key[0] + ny * key[1] + nz * key[2]);
        var t = 0.5 + rx * 0.6 + ry * 0.35 + A.fbm(nEnv, x / 600, y / 800, 2, 2, 0.5) * 0.25;
        envT[i] = t;
        light[i] = diff;
        spec[i] = glint + Math.max(0, bright - 0.85) * 0.5;
        var col = A.ramp(tone, Math.min(1, bright), false);
        if (T.irid) {
          var hc = A.ramp(holo, t * 1.3, true),
            m2 = T.irid * Math.min(1, bright * 1.3);
          col = [
            col[0] * (1 - m2) + hc[0] * bright * m2,
            col[1] * (1 - m2) + hc[1] * bright * m2,
            col[2] * (1 - m2) + hc[2] * bright * m2,
          ];
        }
        var sp = glint * 255;
        // Ambient occlusion in the crimp seams and along the body's sides.
        var ao = 1;
        if (y > BODY_TOP - 5 && y < BODY_TOP + 8) ao *= 0.75;
        if (y < BODY_BOT + 5 && y > BODY_BOT - 8) ao *= 0.75;
        var side = Math.min(x - inset(y), W - inset(y) - x);
        if (side < 20) ao *= 0.78 + (0.22 * Math.max(0, side)) / 20;
        d[i * 4] = Math.min(255, (col[0] + sp) * ao);
        d[i * 4 + 1] = Math.min(255, (col[1] + sp) * ao);
        d[i * 4 + 2] = Math.min(255, (col[2] + sp) * ao);
        d[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Printed artwork on its own layer, then shaded by the crinkles.
    var art = A.canvas(W, H),
      a = art.getContext('2d');
    var holoMask = A.canvas(W, H),
      m = holoMask.getContext('2d');
    drawPrint(a, T, m);
    var ad = a.getImageData(0, 0, W, H),
      p = ad.data;
    var md = m.getImageData(0, 0, W, H).data;
    var base = ctx.getImageData(0, 0, W, H),
      b = base.data;
    for (var j = 0; j < W * H; j++) {
      var al = p[j * 4 + 3] / 255;
      if (!al) continue;
      var r = p[j * 4],
        g = p[j * 4 + 1],
        bl = p[j * 4 + 2];
      if (T.inkHolo || md[j * 4 + 3] > 0) {
        // Holographic ink: hue follows the foil reflection.
        var hc = A.ramp(holo, envT[j] * 1.6 + 0.3, true);
        r = hc[0];
        g = hc[1];
        bl = hc[2];
      }
      var shade = 0.7 + 0.42 * light[j];
      var sp2 = spec[j] * 200;
      r = Math.min(255, r * shade + sp2);
      g = Math.min(255, g * shade + sp2);
      bl = Math.min(255, bl * shade + sp2);
      b[j * 4] = b[j * 4] * (1 - al) + r * al;
      b[j * 4 + 1] = b[j * 4 + 1] * (1 - al) + g * al;
      b[j * 4 + 2] = b[j * 4 + 2] * (1 - al) + bl * al;
    }
    ctx.putImageData(base, 0, 0);

    // Cut the silhouette.
    var out = A.canvas(W, H),
      o = out.getContext('2d');
    silhouette(o);
    o.fillStyle = '#000';
    o.fill();
    o.globalCompositeOperation = 'source-in';
    o.drawImage(c, 0, 0);
    // A thin bright rim along the body's sides.
    o.globalCompositeOperation = 'source-atop';
    o.lineWidth = 3;
    o.strokeStyle = 'rgba(255,255,255,0.18)';
    silhouette(o);
    o.stroke();
    return out;
  }

  function norm(v) {
    var l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  // Emblem: a rounded hexagon ring holding a four-point sparkle.
  function hexPath(ctx, cx, cy, r, round) {
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

  // m receives the shapes that print in holographic ink.
  function drawPrint(a, T, m) {
    var cx = W / 2;
    var inkSolid = T.ink === 'purple' ? '#6a1fe0' : '#ffffff';

    // Orbit ring behind the emblem: back half first.
    a.save();
    a.translate(cx, H * 0.505);
    a.rotate(-0.2);
    a.strokeStyle = T.ring;
    a.lineWidth = 4.5;
    a.beginPath();
    a.ellipse(0, 0, W * 0.74, H * 0.16, 0, Math.PI, Math.PI * 2);
    a.stroke();
    a.restore();

    // Wordmark.
    a.save();
    a.font = '700 162px "Hanken Grotesk"';
    a.letterSpacing = '-6px';
    a.textAlign = 'center';
    a.textBaseline = 'alphabetic';
    a.fillStyle = T.ink === 'purple' ? '#6c22e2' : inkSolid;
    a.fillText('godpack', cx, H * 0.262);
    a.restore();

    // Emblem.
    var ey = H * 0.5,
      R = W * 0.235;
    [a, m].forEach(function (c) {
      if (c === m && T.ink === 'purple') return;
      c.save();
      c.beginPath();
      hexPath(c, cx, ey, R, 46);
      hexPath(c, cx, ey, R * 0.66, 28);
      c.fillStyle = T.ink === 'purple' ? '#7424f0' : '#ffffff';
      c.fill('evenodd');
      A.sparkle(c, cx, ey, R * 0.5, 0.14);
      c.fill();
      c.restore();
    });

    // Front half of the ring, over the emblem, with its sparkle.
    a.save();
    a.translate(cx, H * 0.505);
    a.rotate(-0.2);
    a.strokeStyle = T.ring;
    a.lineWidth = 4.5;
    a.beginPath();
    a.ellipse(0, 0, W * 0.74, H * 0.16, 0, 0, Math.PI);
    a.stroke();
    a.restore();
    a.fillStyle = T.ink === 'purple' ? '#7424f0' : '#ffffff';
    A.sparkle(a, W * 0.835, H * 0.635, 36, 0.12);
    a.fill();

    // BOOSTER PACK
    a.save();
    a.font = '600 31px "Hanken Grotesk"';
    a.letterSpacing = '13px';
    a.textAlign = 'center';
    a.fillStyle = T.text;
    a.fillText('BOOSTER PACK', cx + 6, H * 0.8);
    a.restore();
  }

  window.renderPack = render;
  window.PACK_TYPES = Object.keys(TYPES);
})();
