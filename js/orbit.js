// Pack carousel.
//
// Model: the ring's position is measured in "slots" (one slot = one pack,
// a third of a turn for three packs) and follows a target through a damped
// spring. A timer
// moves the target one slot every dwell; dragging writes the position
// directly and a release snaps the target to the nearest slot in the
// direction of the flick. Each frame the position is turned into a pose per
// pack, written as CSS custom properties that the stylesheet composes into
// the transform (see .booster in css/site.css).
//
// Tapping a pack (press and release without travel) rotates it to the front
// and opens the demo ceremony from js/demo.js, loaded on first press. The
// names under the ring (.pack-tabs) follow the front pack; tapping one turns
// that pack to the front, and tapping the lit one opens it.
(() => {
  const stage = document.querySelector('.carousel');
  if (!stage || !('requestAnimationFrame' in window)) return;

  const boosters = [...stage.querySelectorAll('.booster')];
  const halos = [...stage.querySelectorAll('.halo')];
  const rings = [...stage.querySelectorAll('.pulse span')];
  const tabs = document.querySelector('.pack-tabs');
  const tabButtons = tabs ? [...tabs.querySelectorAll('button')] : [];
  const marker = tabs && tabs.querySelector('.pack-tabs-marker');
  if (boosters.length < 3) return;

  const SLOTS = boosters.length;
  const STEP = (2 * Math.PI) / SLOTS;
  // Side packs keep the same lateral offset and depth whatever the count
  // (the four-pack ring's values), so the front three always look alike.
  const SIDE_SIN = Math.sin(STEP);
  const DEPTH_POW = Math.log(0.5) / Math.log(0.5 + 0.5 * Math.cos(STEP));
  const DWELL_MS = 2600;
  const SPRING = { omega: 4, zeta: 0.875 }; // natural frequency (rad/s), damping ratio
  const TAP = { travel: 8, ms: 600 };
  const PULSE = { delays: [850, 1130], duration: 1250 };

  const motionOK = !window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ring = { pos: 0, vel: 0, target: 0 };
  let packWidth = 220;
  let dragging = null;
  let demoActive = false;
  let raf = 0;
  let prev = 0;
  let visible = true;
  let dwellTimer = 0;
  let pulseAnims = [];

  // ---- geometry -----------------------------------------------------------

  const readWidth = () => {
    const w = boosters[0].offsetWidth;
    // Ignore the image's intrinsic width if the stylesheet has not applied yet.
    if (w > 0 && w <= stage.offsetWidth) packWidth = w;
  };

  // Depth 1 is the front, 0 the back.
  const placement = (slotPos) => {
    const theta = slotPos * STEP;
    const depth = Math.pow(0.5 + 0.5 * Math.cos(theta), DEPTH_POW);
    const lateral = Math.sin(theta) / SIDE_SIN;
    return {
      depth,
      x: lateral * 0.618 * packWidth,
      y: (depth - 1) * 0.127 * packWidth,
      scale: 0.48 + 0.52 * depth,
      yaw: lateral * 34,
      dim: depth > 0.995 ? 1 : 0.3 + 0.7 * depth * depth,
      glow: 0.3 * Math.pow(depth, 2.2),
    };
  };

  const render = () => {
    boosters.forEach((el, i) => {
      const p = placement(ring.pos + i);
      const s = el.style;
      s.setProperty('--x', p.x.toFixed(2) + 'px');
      s.setProperty('--y', p.y.toFixed(2) + 'px');
      s.setProperty('--s', p.scale.toFixed(4));
      s.setProperty('--ry', p.yaw.toFixed(2) + 'deg');
      s.setProperty('--dim', p.dim.toFixed(3));
      s.zIndex = 1 + Math.round(p.depth * 200);
      if (halos[i]) halos[i].style.opacity = p.glow.toFixed(3);
    });
    const front = frontMost();
    if (front !== shown) showTab(front);
  };

  // ---- pack names ----------------------------------------------------------

  let shown = -1;
  const placeMarker = () => {
    const b = tabButtons[shown];
    if (!marker || !b) return;
    // The first placement jumps; later ones slide.
    const first = !marker.dataset.placed;
    if (first) marker.style.transition = 'none';
    marker.style.setProperty('--x', b.offsetLeft + 'px');
    marker.style.setProperty('--w', b.offsetWidth + 'px');
    if (first) {
      void marker.offsetWidth;
      marker.style.transition = '';
      marker.dataset.placed = '1';
    }
  };
  const showTab = (i) => {
    shown = i;
    tabButtons.forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
      const name = b.textContent.trim();
      b.setAttribute('aria-label', k === i ? `${name}: try a demo open` : `Show the ${name} pack`);
    });
    placeMarker();
  };

  // Turn the ring so pack `index` faces front, the shortest way round.
  const faceFront = (index) => {
    ring.target = Math.round((ring.pos + index) / SLOTS) * SLOTS - index;
    kick();
  };

  tabButtons.forEach((b, i) =>
    b.addEventListener('click', (e) => {
      if (demoActive) return;
      if (i === shown && Math.abs(ring.target - ring.pos) < 0.5) {
        beginDemo(i, e.detail === 0);
        return;
      }
      faceFront(i);
      startDwell();
    }),
  );

  // ---- spring loop --------------------------------------------------------

  const settled = () => Math.abs(ring.target - ring.pos) < 0.01 && Math.abs(ring.vel) < 0.03;

  const frame = (now) => {
    raf = 0;
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;
    if (!dragging) {
      const { omega, zeta } = SPRING;
      const accel = omega * omega * (ring.target - ring.pos) - 2 * zeta * omega * ring.vel;
      ring.vel += accel * dt;
      ring.pos += ring.vel * dt;
    }
    render();
    if (dragging || !settled()) schedule();
    else {
      ring.pos = ring.target;
      ring.vel = 0;
      render();
    }
  };

  const schedule = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    prev = 0;
    schedule();
  };

  // ---- dwell timer and tap pulse -----------------------------------------

  const stopPulse = () => {
    pulseAnims.forEach((a) => a.cancel());
    pulseAnims = [];
  };

  const playPulse = () => {
    stopPulse();
    if (!rings[0] || !rings[0].animate) return;
    rings.forEach((el, k) => {
      pulseAnims.push(
        el.animate(
          [
            { opacity: 0, transform: 'scale(0.5)' },
            { opacity: 0.5, transform: 'scale(0.683)', offset: 1 / 6 },
            { opacity: 0, transform: 'scale(1.6)' },
          ],
          { duration: PULSE.duration, delay: PULSE.delays[k], easing: 'linear', fill: 'none' },
        ),
      );
    });
  };

  const startDwell = () => {
    clearInterval(dwellTimer);
    playPulse();
    dwellTimer = setInterval(() => {
      if (demoActive || dragging || document.hidden || !visible) return;
      if (motionOK) {
        ring.target -= 1;
        kick();
      }
      playPulse();
    }, DWELL_MS);
  };

  const stopDwell = () => {
    clearInterval(dwellTimer);
    stopPulse();
  };

  // ---- demo ---------------------------------------------------------------

  const layer = document.querySelector('.demo-layer');
  const keyboardTrigger = document.querySelector('.demo-trigger');
  let demoLoad = null;

  const loadDemo = () => {
    if (window.PackDemo) return Promise.resolve();
    if (!demoLoad) {
      demoLoad = new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = 'js/demo.js';
        tag.async = true;
        tag.onload = resolve;
        tag.onerror = () => {
          tag.remove();
          demoLoad = null;
          reject(new Error('demo failed to load'));
        };
        document.head.append(tag);
      });
    }
    return demoLoad;
  };

  const frontMost = () => {
    let best = 0;
    let bestDepth = -1;
    boosters.forEach((_, i) => {
      const d = placement(ring.pos + i).depth;
      if (d > bestDepth) {
        bestDepth = d;
        best = i;
      }
    });
    return best;
  };

  const packUnder = (x, y) => {
    const hit = document.elementsFromPoint(x, y).find((n) => boosters.includes(n));
    return hit ? boosters.indexOf(hit) : frontMost();
  };

  const untilSettled = (limitMs) =>
    new Promise((resolve) => {
      const began = performance.now();
      const check = () => (settled() || performance.now() - began > limitMs ? resolve() : setTimeout(check, 40));
      check();
    });

  const endDemo = () => {
    demoActive = false;
    if (layer) layer.hidden = true;
    document.documentElement.style.overflow = '';
    startDwell();
    kick();
  };

  const beginDemo = (index, keyboard = false) => {
    if (demoActive || !layer) return;
    demoActive = true;
    stopDwell();
    faceFront(index);
    const ready = loadDemo()
      .then(() => window.PackDemo.preload(index))
      .catch(() => null);
    Promise.all([ready, untilSettled(1200)]).then(() => {
      if (!demoActive) return;
      if (!window.PackDemo) {
        endDemo();
        return;
      }
      const box = boosters[index].getBoundingClientRect();
      layer.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      window.PackDemo.open({
        root: layer,
        pack: index,
        from: { x: box.left, y: box.top, w: box.width, h: box.height },
        enterHref: '/packs',
        keyboard,
        onClose: endDemo,
      });
    });
  };

  if (keyboardTrigger) keyboardTrigger.addEventListener('click', (e) => beginDemo(frontMost(), e.detail === 0));

  // ---- pointer ------------------------------------------------------------

  stage.addEventListener('pointerdown', (e) => {
    if (demoActive) return;
    loadDemo().catch(() => {});
    dragging = { id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, startT: e.timeStamp, travel: 0, speed: 0 };
    stopDwell();
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (_) {
      /* not capturable */
    }
    kick();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const dx = e.clientX - dragging.lastX;
    const dt = Math.max(1, e.timeStamp - dragging.lastT) / 1000;
    // One pack width of travel turns the ring by about 0.94 slots.
    const dSlots = dx / (packWidth * 0.68) / (Math.PI / 2);
    ring.pos += dSlots;
    dragging.travel += Math.abs(dx);
    dragging.speed = 0.7 * (dSlots / dt) + 0.3 * dragging.speed;
    dragging.lastX = e.clientX;
    dragging.lastT = e.timeStamp;
  });

  const finishDrag = (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const d = dragging;
    dragging = null;
    if (e.type === 'pointerup' && d.travel < TAP.travel && e.timeStamp - d.startT < TAP.ms) {
      beginDemo(packUnder(e.clientX, e.clientY));
      return;
    }
    const maxSpeed = 6 / (Math.PI / 2);
    ring.vel = Math.max(-maxSpeed, Math.min(maxSpeed, d.speed));
    ring.target = Math.round(ring.pos + ring.vel * 0.12);
    startDwell();
    kick();
  };

  stage.addEventListener('pointerup', finishDrag);
  stage.addEventListener('pointercancel', finishDrag);

  // ---- lifecycle ----------------------------------------------------------

  readWidth();
  render();
  window.addEventListener('load', () => {
    readWidth();
    render();
    placeMarker();
  });
  if (tabs && 'ResizeObserver' in window) new ResizeObserver(placeMarker).observe(tabs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeMarker);
  if ('ResizeObserver' in window)
    new ResizeObserver(() => {
      readWidth();
      render();
    }).observe(boosters[0]);
  else
    window.addEventListener('resize', () => {
      readWidth();
      render();
    });

  document.addEventListener('visibilitychange', kick);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      kick();
    }).observe(stage);
  }
  startDwell();
})();
