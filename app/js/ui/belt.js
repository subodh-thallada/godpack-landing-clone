// A horizontally drifting belt (used for Recent Hits and Top Hits).
// The track slides left at `speed` px/s; hovering pauses it; mouse drag,
// touch swipe and horizontal wheel move it, with a little inertia. With
// `clone`, the items are repeated so the drift loops seamlessly; without
// it, the belt drifts to the end and eases back to the start.
import { reducedMotion } from './dom.js';

export function belt(viewport, track, { scope, speed = 16, clone = false }) {
  let offset = 0,
    inertia = 0,
    hovering = false,
    holdUntil = 0,
    drag = null,
    last = 0,
    swallow = false;
  let loopWidth = 0;

  const measure = () => {
    if (clone) {
      const originals = [...track.children].filter((c) => !c.dataset.copy);
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      loopWidth = originals.reduce((w, c) => w + c.getBoundingClientRect().width + gap, 0);
      while (loopWidth && track.scrollWidth < viewport.clientWidth + loopWidth * 2) {
        originals.forEach((c) => {
          const copy = c.cloneNode(true);
          copy.dataset.copy = '1';
          copy.setAttribute('aria-hidden', 'true');
          copy.tabIndex = -1;
          track.append(copy);
        });
      }
    }
  };

  const limit = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const clampOffset = () => {
    if (clone && loopWidth) offset = ((offset % loopWidth) + loopWidth) % loopWidth;
    else offset = Math.max(0, Math.min(limit(), offset));
  };
  const paint = () => {
    track.style.transform = `translate3d(${(-offset).toFixed(2)}px,0,0)`;
  };

  let direction = 1;
  scope.raf((now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (drag) return;
    if (Math.abs(inertia) > 5) {
      offset += inertia * dt;
      inertia *= Math.pow(0.05, dt);
    } else if (!hovering && now > holdUntil && !reducedMotion()) {
      inertia = 0;
      if (!clone) {
        const max = limit();
        if (offset >= max - 0.5) direction = -1;
        if (offset <= 0.5) direction = 1;
        offset += speed * dt * direction * (direction < 0 ? 3 : 1);
      } else offset += speed * dt;
    }
    clampOffset();
    paint();
  });

  scope.on(viewport, 'pointerenter', (e) => {
    if (e.pointerType === 'mouse') hovering = true;
  });
  scope.on(viewport, 'pointerleave', () => {
    hovering = false;
    holdUntil = performance.now() + 1500;
  });
  scope.on(viewport, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x0: e.clientX, x: e.clientX, t: e.timeStamp, v: 0, moved: false, id: e.pointerId };
    inertia = 0;
  });
  scope.on(viewport, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('is-dragging');
    }
    const dx = e.clientX - drag.x;
    const dt = Math.max(1, e.timeStamp - drag.t) / 1000;
    offset -= dx;
    drag.v = 0.75 * (-dx / dt) + 0.25 * drag.v;
    drag.x = e.clientX;
    drag.t = e.timeStamp;
    clampOffset();
    paint();
  });
  const end = () => {
    if (!drag) return;
    if (drag.moved) {
      swallow = true;
      inertia = Math.max(-2000, Math.min(2000, drag.v));
    }
    drag = null;
    viewport.classList.remove('is-dragging');
    holdUntil = performance.now() + 2000;
  };
  scope.on(viewport, 'pointerup', end);
  scope.on(viewport, 'pointercancel', end);
  scope.on(
    viewport,
    'click',
    (e) => {
      if (swallow) {
        e.preventDefault();
        e.stopPropagation();
        swallow = false;
      }
    },
    true,
  );
  scope.on(
    viewport,
    'wheel',
    (e) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      offset += dx;
      clampOffset();
      paint();
      holdUntil = performance.now() + 2000;
    },
    { passive: false },
  );

  measure();
  scope.on(window, 'resize', measure);
  scope.later(measure, 600);
}
