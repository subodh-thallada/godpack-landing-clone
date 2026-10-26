/* Baseball and basketball cards for the landing page's category packs.
 * Each card is a "moment" (a grand slam, a buzzer beater...) drawn as
 * procedural scenery: stadiums, courts, balls in flight. No players, teams
 * or leagues. The cards use the same graded slab as cards.js, with a
 * sports layout: full-bleed art and a team-colour name band. */
(function () {
  var A = window.Art,
    C = window.CardArt;

  var CARDS = [
    {
      id: 'grand-slam',
      sport: 'Baseball',
      year: 2024,
      set: 'DIAMOND SERIES',
      name: 'GRAND SLAM',
      sub: 'REFRACTOR',
      no: '#001',
      grade: 'GEM MT',
      score: '10',
      serial: '07/25',
      scene: 'grandslam',
      frame: 'gold',
      band: ['#0b1f5c', '#1d4ccc'],
      pal: ['#02040f', '#0a1640', '#1c3a8a', '#ffe9a8', '#ffffff'],
    },
    {
      id: 'perfect-game',
      sport: 'Baseball',
      year: 2023,
      set: 'DIAMOND SERIES',
      name: 'PERFECT GAME',
      sub: 'GOLD PARALLEL',
      no: '#027',
      grade: 'GEM MT',
      score: '10',
      serial: '18/50',
      scene: 'diamond',
      frame: 'rainbow',
      band: ['#0e3d22', '#1f7a3c'],
      pal: ['#0f4a25', '#1c7a3d', '#b5713a', '#e9c79a', '#ffffff'],
    },
    {
      id: 'curveball',
      sport: 'Baseball',
      year: 2024,
      set: 'DIAMOND SERIES',
      name: 'CURVEBALL',
      sub: 'CHROME',
      no: '#064',
      grade: 'MINT',
      score: '9',
      scene: 'curveball',
      frame: 'silver',
      band: ['#08343d', '#13838a'],
      pal: ['#020c12', '#073240', '#1fb8c1', '#e6fbff', '#ffffff'],
    },
    {
      id: 'walk-off',
      sport: 'Baseball',
      year: 2022,
      set: 'DIAMOND SERIES',
      name: 'WALK-OFF',
      sub: 'FIREWORKS',
      no: '#088',
      grade: 'GEM MT',
      score: '10',
      scene: 'walkoff',
      frame: 'black',
      band: ['#3a0b2a', '#a3195b'],
      pal: ['#04020c', '#170b30', '#ff4fa3', '#ffd166', '#7cf3ff'],
    },
    {
      id: 'golden-hour',
      sport: 'Baseball',
      year: 2024,
      set: 'DIAMOND SERIES',
      name: 'GOLDEN HOUR',
      sub: 'BASE',
      no: '#112',
      grade: 'NM-MT',
      score: '8',
      scene: 'goldenhour',
      frame: 'pearl',
      band: ['#5a1d0a', '#c2410c'],
      pal: ['#2a0f3a', '#b83a12', '#f98a3c', '#fde28a', '#fff7ea'],
    },
    {
      id: 'buzzer-beater',
      sport: 'Basketball',
      year: 2024,
      set: 'HARDWOOD SERIES',
      name: 'BUZZER BEATER',
      sub: 'REFRACTOR',
      no: '#001',
      grade: 'GEM MT',
      score: '10',
      serial: '05/10',
      scene: 'buzzer',
      frame: 'gold',
      band: ['#4a0d14', '#c81e3a'],
      pal: ['#05030b', '#1a0f30', '#ff6a1a', '#ff3355', '#ffffff'],
    },
    {
      id: 'glass-breaker',
      sport: 'Basketball',
      year: 2023,
      set: 'HARDWOOD SERIES',
      name: 'GLASS BREAKER',
      sub: 'SHATTER PARALLEL',
      no: '#033',
      grade: 'GEM MT',
      score: '10',
      serial: '12/50',
      scene: 'glass',
      frame: 'rainbow',
      band: ['#08223d', '#1d5fa8'],
      pal: ['#02060f', '#0a2240', '#5ad7ff', '#e6fbff', '#ff7a2e'],
    },
    {
      id: 'swish',
      sport: 'Basketball',
      year: 2024,
      set: 'HARDWOOD SERIES',
      name: 'SWISH',
      sub: 'CHROME',
      no: '#071',
      grade: 'MINT',
      score: '9',
      scene: 'swish',
      frame: 'silver',
      band: ['#2a0d4d', '#7c3aed'],
      pal: ['#10051c', '#36135e', '#a35af5', '#ff8a3d', '#ffffff'],
    },
    {
      id: 'center-court',
      sport: 'Basketball',
      year: 2022,
      set: 'HARDWOOD SERIES',
      name: 'CENTER COURT',
      sub: 'SPOTLIGHT',
      no: '#090',
      grade: 'GEM MT',
      score: '10',
      scene: 'court',
      frame: 'black',
      band: ['#3d1c06', '#a3520f'],
      pal: ['#0b0604', '#5e3317', '#c4874a', '#f3d4a4', '#ffffff'],
    },
    {
      id: 'fast-break',
      sport: 'Basketball',
      year: 2024,
      set: 'HARDWOOD SERIES',
      name: 'FAST BREAK',
      sub: 'BASE',
      no: '#118',
      grade: 'NM-MT',
      score: '8',
      scene: 'fastbreak',
      frame: 'pearl',
      band: ['#5c0d0d', '#c2261b'],
      pal: ['#3a0805', '#b51c17', '#ff7a2e', '#ffd2a8', '#ffffff'],
    },
  ];

  // ---------- helpers ----------

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function disc(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  // Soft out-of-focus lights.
  function bokeh(ctx, w, y0, y1, r, n, colors, maxR) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var x = r() * w,
        y = lerp(y0, y1, r()),
        s = (0.25 + r() * 0.75) * maxR;
      var g = ctx.createRadialGradient(x, y, 0, x, y, s);
      var col = colors[Math.floor(r() * colors.length)];
      g.addColorStop(0, col.replace('A', (0.18 + r() * 0.3).toFixed(2)));
      g.addColorStop(1, col.replace('A', '0'));
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    ctx.restore();
  }

  // A glowing path that thickens and brightens toward its end.
  function trail(ctx, pts, w0, w1, rgb, a0, a1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var i = 1; i < pts.length; i++) {
      var t = i / (pts.length - 1);
      ctx.strokeStyle = 'rgba(' + rgb + ',' + lerp(a0, a1, t).toFixed(3) + ')';
      ctx.lineWidth = lerp(w0, w1, t);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function quad(p0, p1, p2, steps) {
    var out = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps,
        u = 1 - t;
      out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
    }
    return out;
  }

  function sphere(ctx, x, y, r, stops) {
    var g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x, y, r);
    stops.forEach(function (s, i) {
      g.addColorStop(i / (stops.length - 1), s);
    });
    disc(ctx, x, y, r);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Seams of a baseball: two arcs centred outside the ball, with stitches.
  function baseball(ctx, x, y, r, rot) {
    sphere(ctx, x, y, r, ['#ffffff', '#f4f0e6', '#d9d2c2', '#9d9585']);
    ctx.save();
    disc(ctx, x, y, r);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    var d = r * 1.42,
      sr = r * 1.02;
    var span = Math.acos((sr * sr + d * d - r * r) / (2 * sr * d)) * 0.94;
    ctx.strokeStyle = '#d42a26';
    ctx.lineCap = 'round';
    [-1, 1].forEach(function (side) {
      var sx = side * d,
        mid = side < 0 ? 0 : Math.PI;
      ctx.lineWidth = Math.max(1.5, r * 0.035);
      ctx.beginPath();
      ctx.arc(sx, 0, sr, mid - span, mid + span);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.2, r * 0.03);
      for (var k = -8; k <= 8; k++) {
        var t = mid + (k / 8.6) * span,
          nx = Math.cos(t),
          ny = Math.sin(t);
        var px = sx + nx * sr,
          py = ny * sr,
          L = r * 0.085,
          o = r * 0.035;
        ctx.beginPath();
        ctx.moveTo(px - nx * L - ny * o, py - ny * L + nx * o);
        ctx.lineTo(px, py);
        ctx.lineTo(px + nx * L - ny * o, py + ny * L + nx * o);
        ctx.stroke();
      }
    });
    ctx.restore();
    // Rim light.
    ctx.save();
    disc(ctx, x, y, r);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.stroke();
    ctx.restore();
  }

  function basketball(ctx, x, y, r, rot, rnd) {
    sphere(ctx, x, y, r, ['#ffb27a', '#f97a2a', '#d4520f', '#7a2604']);
    ctx.save();
    disc(ctx, x, y, r);
    ctx.clip();
    // Pebbled leather.
    if (rnd) {
      ctx.fillStyle = 'rgba(70,20,0,0.16)';
      for (var i = 0; i < r * r * 0.35; i++) {
        var a = rnd() * Math.PI * 2,
          d = Math.sqrt(rnd()) * r;
        ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.2, 1.2);
      }
    }
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.strokeStyle = '#1c0a03';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.18, -r * 0.4, r * 0.18, r * 0.4, 0, r);
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r * 0.4, -r * 0.14, r * 0.4, -r * 0.14, r, 0);
    ctx.stroke();
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.arc(side * r * 1.3, 0, r * 0.98, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
    // Shadowed edge and a rim light.
    var g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(40,8,0,0.45)');
    disc(ctx, x, y, r);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,170,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.stroke();
  }

  // A stadium light tower: pole, a bank of lamps and its glare.
  function tower(ctx, x, top, base, s) {
    ctx.fillStyle = '#0a0f22';
    ctx.fillRect(x - 2.5 * s, top, 5 * s, base - top);
    ctx.fillStyle = '#0d1430';
    A.roundRect(ctx, x - 26 * s, top - 30 * s, 52 * s, 34 * s, 4 * s);
    ctx.fill();
    for (var row = 0; row < 3; row++)
      for (var col = 0; col < 5; col++) {
        ctx.fillStyle = '#fff8e0';
        ctx.fillRect(x - 22 * s + col * 9 * s, top - 26 * s + row * 9.5 * s, 6.5 * s, 6.5 * s);
      }
    C.glow(ctx, x, top - 13 * s, 120 * s, 'rgba(255,244,214,0.55)');
  }

  // ---------- baseball scenes ----------

  var SCENES = {
    grandslam: function (ctx, w, h, P, r) {
      C.sky(ctx, w, h, P[0], P[1], P[2]);
      C.stars(ctx, w, h, r, 70, h * 0.4);
      // Beams from the towers.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [w * 0.1, w * 0.9].forEach(function (tx) {
        for (var k = 0; k < 6; k++) {
          ctx.fillStyle = 'rgba(255,240,200,0.035)';
          ctx.beginPath();
          ctx.moveTo(tx - 10, h * 0.17);
          ctx.lineTo(tx + 10, h * 0.17);
          ctx.lineTo(w * (0.15 + k * 0.14), h * 0.8);
          ctx.lineTo(w * (0.08 + k * 0.14), h * 0.8);
          ctx.fill();
        }
      });
      ctx.restore();
      // Stands and crowd.
      ctx.fillStyle = '#060a1a';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.quadraticCurveTo(w * 0.5, h * 0.44, w, h * 0.5);
      ctx.lineTo(w, h * 0.67);
      ctx.lineTo(0, h * 0.67);
      ctx.fill();
      for (var i = 0; i < 1400; i++) {
        var cx0 = r() * w,
          cy0 = lerp(h * 0.51, h * 0.655, r());
        var hue = ['255,255,255', '255,214,140', '140,190,255', '255,140,170'][Math.floor(r() * 4)];
        ctx.fillStyle = 'rgba(' + hue + ',' + (0.12 + r() * 0.35).toFixed(2) + ')';
        ctx.fillRect(cx0, cy0, 1.6, 1.6);
      }
      tower(ctx, w * 0.1, h * 0.17, h * 0.6, 0.9);
      tower(ctx, w * 0.9, h * 0.17, h * 0.6, 0.9);
      // Outfield wall.
      ctx.fillStyle = '#0b3524';
      ctx.fillRect(0, h * 0.655, w, h * 0.05);
      ctx.fillStyle = '#ffd84a';
      ctx.fillRect(0, h * 0.655, w, 3);
      // Grass with mowing stripes.
      var g = ctx.createLinearGradient(0, h * 0.705, 0, h);
      g.addColorStop(0, '#1e7a3a');
      g.addColorStop(1, '#0a3a1c');
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.705, w, h * 0.3);
      for (var k = -6; k < 8; k += 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + k * w * 0.05, h * 0.705);
        ctx.lineTo(w * 0.5 + (k + 1) * w * 0.05, h * 0.705);
        ctx.lineTo(w * 0.5 + (k + 1) * w * 0.3, h);
        ctx.lineTo(w * 0.5 + k * w * 0.3, h);
        ctx.fill();
      }
      // The ball on its way out.
      var path = quad([w * 0.18, h * 0.86], [w * 0.3, h * 0.0], [w * 0.74, h * 0.2], 60);
      trail(ctx, path, 1, w * 0.05, '255,233,168', 0.02, 0.5);
      C.glow(ctx, w * 0.74, h * 0.2, w * 0.2, 'rgba(255,240,200,0.7)');
      baseball(ctx, w * 0.74, h * 0.2, w * 0.05, 0.6);
    },

    diamond: function (ctx, w, h, P, r) {
      var hx = w * 0.5,
        hy = h * 0.86,
        d = w * 0.36;
      ctx.fillStyle = P[1];
      ctx.fillRect(0, 0, w, h);
      // Checkerboard mowing.
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(Math.PI / 4);
      var cell = w * 0.11;
      for (var i = -12; i < 12; i++)
        for (var j = -12; j < 12; j++) {
          ctx.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
          ctx.fillRect(i * cell, j * cell, cell, cell);
        }
      ctx.restore();
      // Warning track and wall.
      ctx.lineWidth = h * 0.05;
      ctx.strokeStyle = '#8a5a30';
      ctx.beginPath();
      ctx.arc(hx, hy, h * 0.84, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.lineWidth = h * 0.12;
      ctx.strokeStyle = '#0b2a18';
      ctx.beginPath();
      ctx.arc(hx, hy, h * 0.93, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      // Infield dirt.
      var dirt = ctx.createRadialGradient(hx, hy, 0, hx, hy, w * 0.8);
      dirt.addColorStop(0, P[3]);
      dirt.addColorStop(1, P[2]);
      ctx.fillStyle = dirt;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.arc(hx, hy, w * 0.78, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.closePath();
      ctx.fill();
      // Infield grass.
      var q = d / Math.SQRT2,
        cyM = hy - q;
      var corners = [
        [hx, hy],
        [hx + q, hy - q],
        [hx, hy - 2 * q],
        [hx - q, hy - q],
      ].map(function (p) {
        return [lerp(p[0], hx, 0.16), lerp(p[1], cyM, 0.16)];
      });
      ctx.fillStyle = P[1];
      ctx.beginPath();
      corners.forEach(function (p, k) {
        if (k) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      });
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.translate(hx, hy);
      ctx.rotate(Math.PI / 4);
      for (i = -8; i < 8; i++)
        for (j = -8; j < 8; j++) {
          ctx.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
          ctx.fillRect(i * cell * 0.5, j * cell * 0.5, cell * 0.5, cell * 0.5);
        }
      ctx.restore();
      // Foul lines.
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + hy, 0);
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - hy, 0);
      ctx.stroke();
      // Mound and plate area.
      [
        [hx, cyM, w * 0.055],
        [hx, hy, w * 0.075],
      ].forEach(function (m) {
        disc(ctx, m[0], m[1], m[2]);
        ctx.fillStyle = P[2];
        ctx.fill();
      });
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx - w * 0.02, cyM - 2, w * 0.04, 4);
      ctx.beginPath();
      ctx.moveTo(hx - 7, hy - 6);
      ctx.lineTo(hx + 7, hy - 6);
      ctx.lineTo(hx + 7, hy + 1);
      ctx.lineTo(hx, hy + 7);
      ctx.lineTo(hx - 7, hy + 1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx - w * 0.07, hy - 14, w * 0.04, 28);
      ctx.strokeRect(hx + w * 0.03, hy - 14, w * 0.04, 28);
      // Bases.
      [
        [hx + q, hy - q],
        [hx, hy - 2 * q],
        [hx - q, hy - q],
      ].forEach(function (b) {
        ctx.save();
        ctx.translate(b[0], b[1]);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      });
      // Floodlit vignette.
      var v = ctx.createRadialGradient(hx, h * 0.5, w * 0.2, hx, h * 0.5, h * 0.75);
      v.addColorStop(0, 'rgba(255,250,230,0.08)');
      v.addColorStop(1, 'rgba(0,10,4,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    },

    curveball: function (ctx, w, h, P, r) {
      var g = ctx.createRadialGradient(w * 0.6, h * 0.45, 0, w * 0.6, h * 0.45, h * 0.8);
      g.addColorStop(0, P[1]);
      g.addColorStop(1, P[0]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      bokeh(ctx, w, 0, h, r, 26, ['rgba(31,184,193,A)', 'rgba(230,251,255,A)'], w * 0.12);
      // Speed lines behind the ball.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 26; i++) {
        var y = h * 0.45 + (r() - 0.5) * w * 0.38,
          x1 = w * 0.6 - w * 0.12,
          x0 = x1 - w * (0.3 + r() * 0.5);
        var lg = ctx.createLinearGradient(x0, 0, x1, 0);
        lg.addColorStop(0, 'rgba(230,251,255,0)');
        lg.addColorStop(1, 'rgba(230,251,255,' + (0.15 + r() * 0.35).toFixed(2) + ')');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1 + r() * 3;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      }
      ctx.restore();
      // Ghosts along the break of the pitch.
      var path = quad([w * 0.04, h * 0.2], [w * 0.36, h * 0.12], [w * 0.6, h * 0.45], 7);
      path.slice(0, -1).forEach(function (p, k) {
        ctx.globalAlpha = 0.08 + k * 0.05;
        disc(ctx, p[0], p[1], w * (0.05 + k * 0.018));
        ctx.fillStyle = '#e6fbff';
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      C.glow(ctx, w * 0.6, h * 0.45, w * 0.42, 'rgba(31,184,193,0.5)');
      baseball(ctx, w * 0.6, h * 0.45, w * 0.2, -0.5);
    },

    walkoff: function (ctx, w, h, P, r) {
      C.sky(ctx, w, h, P[0], P[1], P[1]);
      C.stars(ctx, w, h, r, 50, h * 0.5);
      // Fireworks.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [
        [0.3, 0.22, 0.26, P[2]],
        [0.72, 0.16, 0.22, P[3]],
        [0.6, 0.42, 0.18, P[4]],
        [0.18, 0.46, 0.13, P[3]],
      ].forEach(function (f) {
        var fx = w * f[0],
          fy = h * f[1],
          R = w * f[2];
        C.glow(ctx, fx, fy, R * 1.1, f[3] + '40');
        C.glow(ctx, fx, fy, R * 0.35, 'rgba(255,255,255,0.5)');
        // Sparks brighten toward their tips and droop a little.
        for (var k = 0; k < 56; k++) {
          var a = (k / 56) * Math.PI * 2 + r() * 0.05,
            L = R * (0.7 + r() * 0.3);
          for (var s = 1; s <= 10; s++) {
            var t = s / 10;
            ctx.globalAlpha = 0.08 + 0.8 * Math.pow(t, 1.6);
            ctx.fillStyle = f[3];
            disc(ctx, fx + Math.cos(a) * L * t, fy + Math.sin(a) * L * t + t * t * R * 0.15, 0.8 + t * 1.3);
            ctx.fill();
          }
        }
      });
      ctx.restore();
      ctx.globalAlpha = 1;
      // Stadium silhouette.
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.7);
      ctx.lineTo(w * 0.12, h * 0.66);
      ctx.quadraticCurveTo(w * 0.5, h * 0.6, w * 0.88, h * 0.66);
      ctx.lineTo(w, h * 0.7);
      ctx.lineTo(w, h);
      ctx.fill();
      tower(ctx, w * 0.12, h * 0.5, h * 0.7, 0.7);
      tower(ctx, w * 0.88, h * 0.5, h * 0.7, 0.7);
      for (var i = 0; i < 500; i++) {
        ctx.fillStyle = 'rgba(255,214,150,' + (0.1 + r() * 0.3).toFixed(2) + ')';
        ctx.fillRect(r() * w, lerp(h * 0.68, h * 0.8, r()), 1.5, 1.5);
      }
      var g = ctx.createLinearGradient(0, h * 0.82, 0, h);
      g.addColorStop(0, '#0d2a17');
      g.addColorStop(1, '#04110a');
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.82, w, h * 0.18);
    },

    goldenhour: function (ctx, w, h, P, r) {
      var g = ctx.createLinearGradient(0, 0, 0, h * 0.62);
      g.addColorStop(0, P[0]);
      g.addColorStop(0.55, P[1]);
      g.addColorStop(1, P[3]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      C.glow(ctx, w * 0.62, h * 0.6, w * 0.7, 'rgba(255,214,140,0.7)');
      disc(ctx, w * 0.62, h * 0.6, w * 0.14);
      ctx.fillStyle = P[4];
      ctx.fill();
      // Long clouds.
      for (var i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(255,190,150,' + (0.12 + r() * 0.12).toFixed(2) + ')';
        ctx.beginPath();
        ctx.ellipse(r() * w, h * (0.15 + r() * 0.3), w * (0.2 + r() * 0.25), h * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Scoreboard over the fence.
      ctx.fillStyle = '#1c0b1e';
      ctx.fillRect(w * 0.1, h * 0.4, w * 0.36, h * 0.2);
      ctx.fillRect(w * 0.26, h * 0.6, w * 0.04, h * 0.05);
      for (var row = 0; row < 3; row++)
        for (var col = 0; col < 9; col++) {
          ctx.fillStyle = r() > 0.35 ? 'rgba(255,196,96,0.85)' : 'rgba(255,196,96,0.18)';
          ctx.fillRect(w * 0.125 + col * w * 0.036, h * 0.425 + row * h * 0.05, w * 0.024, h * 0.03);
        }
      ctx.fillStyle = '#120714';
      ctx.fillRect(0, h * 0.62, w, h * 0.06);
      var f = ctx.createLinearGradient(0, h * 0.68, 0, h);
      f.addColorStop(0, '#2c3a12');
      f.addColorStop(1, '#0d1406');
      ctx.fillStyle = f;
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      // Long evening shadows.
      for (i = 0; i < 7; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.moveTo(w * 0.62, h * 0.68);
        ctx.lineTo(w * (i * 0.2 - 0.2), h);
        ctx.lineTo(w * (i * 0.2 - 0.12), h);
        ctx.fill();
      }
      var path = quad([w * 0.3, h * 0.95], [w * 0.6, h * 0.1], [w * 0.86, h * 0.28], 40);
      trail(ctx, path, 1, 5, '255,247,234', 0.02, 0.6);
      baseball(ctx, w * 0.86, h * 0.28, w * 0.032, 0.2);
    },

    // ---------- basketball scenes ----------

    buzzer: function (ctx, w, h, P, r) {
      C.sky(ctx, w, h, P[0], P[1], P[0]);
      bokeh(ctx, w, h * 0.55, h, r, 60, ['rgba(255,190,120,A)', 'rgba(255,255,255,A)', 'rgba(255,51,85,A)'], w * 0.06);
      // Spotlight.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var sg = ctx.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, 'rgba(255,240,220,0.16)');
      sg.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(w * 0.62, 0);
      ctx.lineTo(w * 0.9, 0);
      ctx.lineTo(w * 1.1, h);
      ctx.lineTo(w * 0.35, h);
      ctx.fill();
      ctx.restore();
      // Shot clock.
      ctx.fillStyle = '#0b0710';
      A.roundRect(ctx, w * 0.07, h * 0.07, w * 0.36, h * 0.12, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.font = '800 ' + Math.round(h * 0.085) + 'px "Hanken Grotesk"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = P[3];
      ctx.shadowBlur = 18;
      ctx.fillStyle = P[3];
      ctx.fillText('0.0', w * 0.25, h * 0.133);
      ctx.restore();
      // Backboard, rim and net.
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(w * 0.58, h * 0.26, w * 0.38, h * 0.21);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeRect(w * 0.58, h * 0.26, w * 0.38, h * 0.21);
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.69, h * 0.36, w * 0.16, h * 0.09);
      net(ctx, w * 0.77, h * 0.49, w * 0.1, h * 0.12, 'rgba(255,255,255,0.75)');
      ctx.strokeStyle = P[2];
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(w * 0.77, h * 0.49, w * 0.1, w * 0.022, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The shot.
      var path = quad([w * 0.02, h * 0.92], [w * 0.12, h * 0.15], [w * 0.36, h * 0.3], 50);
      trail(ctx, path, 1, w * 0.06, '255,170,110', 0.02, 0.45);
      C.glow(ctx, w * 0.36, h * 0.3, w * 0.22, 'rgba(255,140,60,0.5)');
      basketball(ctx, w * 0.36, h * 0.3, w * 0.075, 0.5, r);
    },

    glass: function (ctx, w, h, P, r) {
      var g = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, h * 0.7);
      g.addColorStop(0, P[1]);
      g.addColorStop(1, P[0]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      var bx = w * 0.07,
        by = h * 0.16,
        bw = w * 0.86,
        bh = h * 0.42;
      ctx.fillStyle = 'rgba(90,215,255,0.06)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(230,251,255,0.9)';
      ctx.lineWidth = 5;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.lineWidth = 3.5;
      ctx.strokeRect(w * 0.33, h * 0.38, w * 0.34, h * 0.17);
      // Cracks from the impact.
      var ix = w * 0.5,
        iy = h * 0.57;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, bw, bh);
      ctx.clip();
      ctx.strokeStyle = 'rgba(230,251,255,0.8)';
      ctx.lineWidth = 1.6;
      for (var k = 0; k < 22; k++) {
        var a = Math.PI + (k / 21) * Math.PI + (r() - 0.5) * 0.1,
          x = ix,
          y = iy;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (var s = 0; s < 8; s++) {
          var L = w * (0.05 + r() * 0.05);
          a += (r() - 0.5) * 0.35;
          x += Math.cos(a) * L;
          y += Math.sin(a) * L;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (var ring = 1; ring < 5; ring++) {
        ctx.beginPath();
        for (k = 0; k <= 24; k++) {
          var aa = Math.PI + (k / 24) * Math.PI,
            rr = w * ring * 0.07 * (0.85 + r() * 0.3);
          if (k) ctx.lineTo(ix + Math.cos(aa) * rr, iy + Math.sin(aa) * rr);
          else ctx.moveTo(ix + Math.cos(aa) * rr, iy + Math.sin(aa) * rr);
        }
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // Flying shards.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (k = 0; k < 46; k++) {
        var ang = r() * Math.PI * 2,
          dist = w * (0.12 + r() * 0.45),
          sx = ix + Math.cos(ang) * dist,
          sy = iy + Math.sin(ang) * dist * 0.8,
          sz = w * (0.01 + r() * 0.03);
        ctx.fillStyle = 'rgba(200,240,255,' + (0.15 + r() * 0.4).toFixed(2) + ')';
        ctx.beginPath();
        ctx.moveTo(sx, sy - sz);
        ctx.lineTo(sx + sz * (0.4 + r()), sy + sz * 0.6);
        ctx.lineTo(sx - sz * (0.4 + r()), sy + sz * (0.2 + r() * 0.6));
        ctx.fill();
      }
      ctx.restore();
      C.glow(ctx, ix, iy, w * 0.5, 'rgba(90,215,255,0.35)');
      // Ball through the rim, rim bent down.
      net(ctx, ix, h * 0.63, w * 0.15, h * 0.16, 'rgba(255,255,255,0.7)');
      basketball(ctx, ix, h * 0.58, w * 0.12, 0.3, r);
      ctx.strokeStyle = P[4];
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(ix, h * 0.635, w * 0.15, w * 0.03, 0.08, 0, Math.PI);
      ctx.stroke();
    },

    swish: function (ctx, w, h, P, r) {
      C.sky(ctx, w, h, P[1], P[0], P[0]);
      bokeh(ctx, w, 0, h, r, 30, ['rgba(163,90,245,A)', 'rgba(255,255,255,A)'], w * 0.1);
      var cx = w * 0.5,
        top = h * 0.2,
        rx = w * 0.32,
        ry = w * 0.075;
      // Back of the rim, the net's back strands, the ball, then the front.
      ctx.strokeStyle = P[3];
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(cx, top, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      mesh(ctx, cx, top, rx, ry, h * 0.44, false);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 9; i++) {
        var x = cx + (r() - 0.5) * w * 0.3;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.1 + r() * 0.25).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.02);
        ctx.lineTo(x, top - ry);
        ctx.stroke();
      }
      ctx.restore();
      basketball(ctx, cx, h * 0.42, w * 0.18, 0.9, r);
      mesh(ctx, cx, top, rx, ry, h * 0.44, true);
      ctx.strokeStyle = P[3];
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI);
      ctx.stroke();
    },

    court: function (ctx, w, h, P, r) {
      var hor = h * 0.36;
      C.sky(ctx, w, hor, P[0], '#1b0f08', P[0]);
      bokeh(ctx, w, h * 0.05, hor, r, 50, ['rgba(255,214,150,A)', 'rgba(255,255,255,A)'], w * 0.04);
      ctx.fillStyle = '#080403';
      ctx.fillRect(0, hor - h * 0.06, w, h * 0.06);
      // Hardwood in perspective.
      var f = ctx.createLinearGradient(0, hor, 0, h);
      f.addColorStop(0, P[1]);
      f.addColorStop(1, P[2]);
      ctx.fillStyle = f;
      ctx.fillRect(0, hor, w, h - hor);
      ctx.strokeStyle = 'rgba(40,18,6,0.28)';
      ctx.lineWidth = 1.4;
      for (var k = -20; k <= 20; k++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + k * w * 0.012, hor);
        ctx.lineTo(w * 0.5 + k * w * 0.09, h);
        ctx.stroke();
      }
      // Lines: half-court and the centre circle.
      var cy = h * 0.67;
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w * 0.5, cy, w * 0.4, h * 0.1, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,106,26,0.55)';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, cy, w * 0.14, h * 0.036, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Spotlight onto the circle.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var sg = ctx.createLinearGradient(0, 0, 0, cy);
      sg.addColorStop(0, 'rgba(255,240,210,0.0)');
      sg.addColorStop(1, 'rgba(255,240,210,0.16)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(w * 0.44, 0);
      ctx.lineTo(w * 0.56, 0);
      ctx.lineTo(w * 0.86, cy);
      ctx.lineTo(w * 0.14, cy);
      ctx.fill();
      ctx.restore();
      C.glow(ctx, w * 0.5, cy, w * 0.45, 'rgba(255,236,200,0.35)');
      // Ball and its shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, cy + h * 0.01, w * 0.1, h * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      basketball(ctx, w * 0.5, cy - w * 0.09, w * 0.095, 0.4, r);
    },

    fastbreak: function (ctx, w, h, P, r) {
      var g = ctx.createLinearGradient(w, 0, 0, h);
      g.addColorStop(0, P[2]);
      g.addColorStop(0.55, P[1]);
      g.addColorStop(1, P[0]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Halftone in the corner.
      for (var y = 0; y < h * 0.5; y += 12)
        for (var x = w * 0.45; x < w; x += 12) {
          var t = Math.max(0, 1 - Math.hypot(x - w, y) / (w * 0.6));
          if (t <= 0) continue;
          disc(ctx, x, y, 4.5 * t);
          ctx.fillStyle = 'rgba(255,230,200,0.22)';
          ctx.fill();
        }
      // Speed streaks.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 40; i++) {
        var sx = r() * w * 1.4,
          sy = r() * h,
          L = w * (0.2 + r() * 0.5);
        ctx.strokeStyle = 'rgba(255,220,190,' + (0.06 + r() * 0.22).toFixed(2) + ')';
        ctx.lineWidth = 1 + r() * 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - L, sy + L * 0.55);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.shadowColor = 'rgba(40,0,0,0.6)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      disc(ctx, w * 0.56, h * 0.44, w * 0.27);
      ctx.fillStyle = '#d4520f';
      ctx.fill();
      ctx.restore();
      basketball(ctx, w * 0.56, h * 0.44, w * 0.27, 0.6, r);
    },
  };

  // A hoop net hanging from a rim centred at (cx, cy).
  function net(ctx, cx, cy, rx, depth, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    var n = 10;
    for (var i = 0; i <= n; i++) {
      var t = i / n,
        x0 = cx - rx + t * rx * 2,
        x1 = cx - rx * 0.55 + t * rx * 1.1;
      ctx.beginPath();
      ctx.moveTo(x0, cy);
      ctx.quadraticCurveTo((x0 + x1) / 2 + (t - 0.5) * rx * 0.1, cy + depth * 0.6, x1, cy + depth);
      ctx.stroke();
    }
    for (var j = 1; j < 4; j++) {
      var yy = cy + (depth * j) / 4,
        rr = rx * (1 - 0.45 * (j / 4));
      ctx.beginPath();
      ctx.moveTo(cx - rr, yy);
      for (i = 1; i <= n; i++) ctx.lineTo(cx - rr + (i / n) * rr * 2, yy + (i % 2 ? 4 : 0));
      ctx.stroke();
    }
  }

  // A diamond-lattice net seen from below; front or back strands only.
  function mesh(ctx, cx, top, rx, ry, depth, front) {
    var N = 16,
      L = 6;
    ctx.lineWidth = front ? 2.4 : 1.6;
    ctx.strokeStyle = front ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)';
    function pt(i, j) {
      var a = (i / N) * Math.PI * 2 + j * 0.18,
        k = 1 - 0.45 * (j / L);
      return [cx + Math.cos(a) * rx * k, top + (depth * j) / L + Math.sin(a) * ry * k, Math.sin(a)];
    }
    for (var i = 0; i < N; i++)
      for (var j = 0; j < L; j++) {
        [1, -1].forEach(function (dir) {
          var p = pt(i, j),
            q = pt(i + dir, j + 1);
          if (p[2] + q[2] > 0 !== front) return;
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
          ctx.stroke();
        });
      }
  }

  // ---------- card ----------

  window.sportCard = function (S, w, h) {
    var c = A.canvas(w, h),
      ctx = c.getContext('2d');
    var r = A.rng(C.hash(S.id)),
      n = A.makeNoise(C.hash(S.id) & 255);
    var rad = w * 0.045,
      m = w * 0.045;
    var F = C.frames[S.frame];
    var fg = ctx.createLinearGradient(0, 0, w, h);
    F.forEach(function (col, i) {
      fg.addColorStop(i / (F.length - 1), col);
    });
    A.roundRect(ctx, 0, 0, w, h, rad);
    ctx.fillStyle = fg;
    ctx.fill();
    // Full-bleed art.
    var art = A.canvas(Math.round(w - m * 2), Math.round(h - m * 2));
    SCENES[S.scene](art.getContext('2d'), art.width, art.height, S.pal, r, n);
    ctx.save();
    A.roundRect(ctx, m, m, w - m * 2, h - m * 2, rad * 0.6);
    ctx.clip();
    ctx.drawImage(art, m, m);
    // Refractor sheen, stronger on the numbered cards.
    ctx.globalCompositeOperation = 'overlay';
    var hg = ctx.createLinearGradient(0, 0, w, h);
    ['#ff9ad5', '#ffe38a', '#9dffc4', '#8fd3ff', '#c49dff', '#ff9ad5'].forEach(function (col, i) {
      hg.addColorStop(i / 5, col);
    });
    ctx.globalAlpha = S.serial ? 0.3 : 0.14;
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Name band with a slanted top edge.
    var by = h * 0.79;
    var bg = ctx.createLinearGradient(0, by, w, h);
    bg.addColorStop(0, S.band[0]);
    bg.addColorStop(1, S.band[1]);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(m, by + h * 0.035);
    ctx.lineTo(w - m, by);
    ctx.lineTo(w - m, h - m);
    ctx.lineTo(m, h - m);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = F[2];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(m, by + h * 0.035);
    ctx.lineTo(w - m, by);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    var size = Math.round(h * 0.056);
    ctx.font = '800 ' + size + 'px "Hanken Grotesk"';
    while (ctx.measureText(S.name).width > w * 0.62 && size > 12) {
      size -= 1;
      ctx.font = '800 ' + size + 'px "Hanken Grotesk"';
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(S.name, m + w * 0.05, h * 0.905);
    ctx.font = '600 ' + Math.round(h * 0.024) + 'px "Hanken Grotesk"';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText((S.sport + ' · ' + S.sub).toUpperCase(), m + w * 0.05, h * 0.945);
    ctx.letterSpacing = '0px';
    ctx.restore();
    // Medallion with the ball, over the band's corner.
    var bx = w - m - w * 0.13,
      byc = by + h * 0.07,
      br = w * 0.085;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    disc(ctx, bx, byc, br);
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
    disc(ctx, bx, byc, br * 0.8);
    ctx.fillStyle = '#0d0b14';
    ctx.fill();
    if (S.sport === 'Baseball') baseball(ctx, bx, byc, br * 0.58, 0.5);
    else basketball(ctx, bx, byc, br * 0.58, 0.5);
    // Serial number on the numbered cards.
    if (S.serial) {
      ctx.font = '700 ' + Math.round(h * 0.026) + 'px "Hanken Grotesk"';
      var tw = ctx.measureText(S.serial).width,
        pw = tw + w * 0.06,
        ph = h * 0.045,
        px = w - m - w * 0.04 - pw,
        py = m + w * 0.04;
      ctx.fillStyle = 'rgba(8,6,14,0.55)';
      A.roundRect(ctx, px, py, pw, ph, ph / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(S.serial, px + w * 0.03, py + ph / 2 + 1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    A.roundRect(ctx, 1, 1, w - 2, h - 2, rad);
    ctx.stroke();
    return c;
  };

  CARDS.forEach(function (S) {
    window.SLABS.push(S);
  });
})();
