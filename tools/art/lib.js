/* Shared helpers for the art generators: seeded random, 2D gradient noise,
 * fBm, colour ramps and a few canvas conveniences. Runs in the browser page
 * that tools/render-art.js drives. */
(function (g) {
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  }

  // Classic 2D gradient noise with a seeded permutation table.
  function makeNoise(seed) {
    var r = rng(seed);
    var perm = new Uint8Array(512),
      p = [];
    for (var i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    var gx = new Float32Array(256),
      gy = new Float32Array(256);
    for (i = 0; i < 256; i++) {
      var a = r() * Math.PI * 2;
      gx[i] = Math.cos(a);
      gy[i] = Math.sin(a);
    }
    function fade(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    return function (x, y) {
      var xi = Math.floor(x),
        yi = Math.floor(y);
      var xf = x - xi,
        yf = y - yi;
      xi &= 255;
      yi &= 255;
      var aa = perm[xi + perm[yi]],
        ab = perm[xi + perm[yi + 1]];
      var ba = perm[xi + 1 + perm[yi]],
        bb = perm[xi + 1 + perm[yi + 1]];
      var n00 = gx[aa] * xf + gy[aa] * yf;
      var n10 = gx[ba] * (xf - 1) + gy[ba] * yf;
      var n01 = gx[ab] * xf + gy[ab] * (yf - 1);
      var n11 = gx[bb] * (xf - 1) + gy[bb] * (yf - 1);
      var u = fade(xf),
        v = fade(yf);
      var x1 = n00 + u * (n10 - n00),
        x2 = n01 + u * (n11 - n01);
      return (x1 + v * (x2 - x1)) * 1.414;
    };
  }

  function fbm(noise, x, y, oct, lac, gain) {
    var sum = 0,
      amp = 1,
      f = 1,
      norm = 0;
    for (var i = 0; i < oct; i++) {
      sum += amp * noise(x * f, y * f);
      norm += amp;
      amp *= gain;
      f *= lac;
    }
    return sum / norm;
  }

  function ridged(noise, x, y, oct) {
    var sum = 0,
      amp = 0.5,
      f = 1;
    for (var i = 0; i < oct; i++) {
      var n = 1 - Math.abs(noise(x * f, y * f));
      sum += n * n * amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum;
  }

  function hex(c) {
    c = c.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }

  // Sample a looping or clamped colour ramp at t.
  function ramp(stops, t, loop) {
    var n = stops.length;
    if (loop) {
      t = t - Math.floor(t);
      t *= n;
    } else {
      t = Math.max(0, Math.min(1, t)) * (n - 1);
    }
    var i = Math.floor(t),
      f = t - i;
    var a = stops[i % n],
      b = stops[(i + 1) % n];
    if (!loop && i >= n - 1) return a;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // The four-point sparkle used across the brand art.
  function sparkle(ctx, x, y, r, pinch) {
    var k = pinch == null ? 0.18 : pinch;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * k, y - r * k, x + r, y);
    ctx.quadraticCurveTo(x + r * k, y + r * k, x, y + r);
    ctx.quadraticCurveTo(x - r * k, y + r * k, x - r, y);
    ctx.quadraticCurveTo(x - r * k, y - r * k, x, y - r);
    ctx.closePath();
  }

  g.Art = {
    rng: rng,
    makeNoise: makeNoise,
    fbm: fbm,
    ridged: ridged,
    hex: hex,
    ramp: ramp,
    canvas: canvas,
    roundRect: roundRect,
    sparkle: sparkle,
  };
})(window);
