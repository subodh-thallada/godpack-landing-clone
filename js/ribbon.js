// Graded-card ribbon.
//
// The track drifts left at a constant speed (one loop of the thirteen cards
// every 34.24 s below 1200px and 47.66 s above). The offset lives in JS and
// wraps every loop, and enough copies of the cards are appended to cover
// the widest window, so the wrap is invisible.
//
// Interaction: hovering with a mouse or focusing a card pauses the drift.
// Mouse and touch drags move the row (with a little inertia), horizontal
// wheel / trackpad scrolling moves it, and arrow keys step one card. The
// drift resumes two seconds after the last interaction.
(() => {
  const strip = document.querySelector('.strip');
  if (!strip) return;
  const track = strip.querySelector('.strip-track');
  const originals = [...track.children];
  if (!originals.length) return;

  const LOOP_SECONDS = { narrow: 34.24, wide: 47.66 };
  const RESUME_MS = 2000;
  const DRAG_THRESHOLD = 6;

  const wideQuery = matchMedia('(min-width: 1200px)');
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const hoverQuery = matchMedia('(hover: hover)');

  let loop = 0; // width of one set of cards, px
  let cardStep = 0; // one card plus gap, px
  let offset = 0; // current scroll, px (0..loop)
  let inertia = 0; // px/s left over from a fling
  let autoplay = !reducedQuery.matches;
  let hovering = false;
  let pressing = null;
  let resumeAt = 0;
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let swallowClick = false;

  const cloneSet = () => {
    const frag = document.createDocumentFragment();
    originals.forEach((a) => {
      const copy = a.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.tabIndex = -1;
      frag.append(copy);
    });
    return frag;
  };

  const measure = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    cardStep = originals[0].getBoundingClientRect().width + gap;
    loop = cardStep * originals.length;
    if (!loop) return;
    const sets = Math.ceil(strip.clientWidth / loop) + 2;
    while (track.children.length < sets * originals.length) track.append(cloneSet());
    offset = wrap(offset);
    paint();
  };

  const wrap = (x) => (loop ? ((x % loop) + loop) % loop : 0);

  const paint = () => {
    track.style.transform = `translate3d(${(-offset).toFixed(2)}px,0,0)`;
  };

  const speed = () => loop / (wideQuery.matches ? LOOP_SECONDS.wide : LOOP_SECONDS.narrow);

  // Keyboard focus pauses the drift; focus left behind by a mouse click does not.
  const keyboardFocused = () => strip.matches(':focus-visible') || !!strip.querySelector(':focus-visible');

  const drifting = () => autoplay && !hovering && !pressing && !keyboardFocused() && performance.now() >= resumeAt;

  const tick = (now) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!pressing) {
      if (Math.abs(inertia) > 4) {
        offset += inertia * dt;
        inertia *= Math.pow(0.04, dt); // decays to 4% each second
      } else {
        inertia = 0;
        if (drifting()) offset += speed() * dt;
      }
    }
    offset = wrap(offset);
    paint();
    request();
  };

  const request = () => {
    if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(tick);
  };

  const restart = () => {
    last = 0;
    request();
  };

  const holdOff = () => {
    resumeAt = performance.now() + RESUME_MS;
  };

  // ---- pointer drag ----

  strip.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    swallowClick = false;
    inertia = 0;
    pressing = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t: e.timeStamp, v: 0, moving: false };
  });

  strip.addEventListener('pointermove', (e) => {
    const p = pressing;
    if (!p || p.id !== e.pointerId) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) {
      endPress(e);
      return;
    }
    const dx = e.clientX - p.x0;
    const dy = e.clientY - p.y0;
    if (!p.moving) {
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      p.moving = true;
      strip.setPointerCapture(e.pointerId);
      strip.classList.add('is-dragging');
    }
    const step = e.clientX - p.x;
    const dt = Math.max(1, e.timeStamp - p.t) / 1000;
    offset = wrap(offset - step);
    p.v = 0.75 * (-step / dt) + 0.25 * p.v;
    p.x = e.clientX;
    p.t = e.timeStamp;
    paint();
  });

  const endPress = (e) => {
    const p = pressing;
    if (!p || (e && p.id !== e.pointerId)) return;
    pressing = null;
    strip.classList.remove('is-dragging');
    if (strip.hasPointerCapture(p.id)) strip.releasePointerCapture(p.id);
    if (p.moving) {
      swallowClick = true;
      inertia = Math.max(-2400, Math.min(2400, p.v));
    }
    holdOff();
    restart();
  };

  strip.addEventListener('pointerup', endPress);
  strip.addEventListener('pointercancel', endPress);
  strip.addEventListener('lostpointercapture', endPress);
  window.addEventListener('blur', () => endPress());

  // Cancel only the click that ends a drag; real clicks still navigate.
  strip.addEventListener(
    'click',
    (e) => {
      if (swallowClick && e.detail !== 0) {
        e.preventDefault();
        e.stopPropagation();
      }
      swallowClick = false;
    },
    true,
  );

  strip.addEventListener('dragstart', (e) => e.preventDefault());

  // ---- hover, wheel, keys ----

  strip.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse' && hoverQuery.matches) hovering = true;
  });
  strip.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') {
      hovering = false;
      holdOff();
      restart();
    }
  });

  strip.addEventListener(
    'wheel',
    (e) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      inertia = 0;
      offset = wrap(offset + dx);
      paint();
      holdOff();
    },
    { passive: false },
  );

  strip.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const moves = { ArrowRight: 1, ArrowLeft: -1 };
    if (e.key in moves) {
      e.preventDefault();
      inertia = 0;
      offset = wrap(Math.round(offset / cardStep + moves[e.key]) * cardStep);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      offset = e.key === 'Home' ? 0 : (originals.length - 1) * cardStep;
    } else return;
    paint();
    holdOff();
  });

  // Keep a focused card in view.
  strip.addEventListener('focusin', (e) => {
    const card = e.target.closest('a');
    if (!card || !strip.contains(card)) return;
    const i = [...track.children].indexOf(card);
    const box = strip.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    if (cardBox.left < box.left + box.width * 0.13 || cardBox.right > box.right - box.width * 0.13) {
      offset = wrap(i * cardStep - box.width / 2 + cardStep / 2);
      paint();
    }
  });
  strip.addEventListener('focusout', () => {
    holdOff();
    restart();
  });

  // ---- lifecycle ----

  reducedQuery.addEventListener('change', () => {
    autoplay = !reducedQuery.matches;
    restart();
  });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  document.addEventListener('visibilitychange', restart);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      restart();
    }).observe(strip);
  }
  measure();
  // Images without intrinsic size yet would give a zero step: measure again as they load.
  originals.forEach((a) => {
    const img = a.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', measure, { once: true });
  });
  request();
})();
