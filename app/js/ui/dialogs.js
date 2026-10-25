// Dialogs: a small modal host plus the odds table and the card inspector.
import { icon } from './icons.js';
import { html, raw, el, $ } from './dom.js';
import { money, cardArt, slabArt, ago } from '../data.js';

const TIER_COLOR = {
  common: 'rgb(var(--t-common))',
  core: 'rgb(var(--t-core))',
  hit: 'rgb(var(--t-hit))',
  chase: 'rgb(var(--t-chase))',
  grail: 'rgb(var(--t-grail))',
};

// Opens `content` (an element) in an overlay. Returns close().
export function openDialog(content, { label, className = '', onClose } = {}) {
  const prevFocus = document.activeElement;
  const overlay = el(`<div class="overlay ${className}" role="presentation"></div>`);
  const box = el(`<div class="dialog" role="dialog" aria-modal="true" tabindex="-1"></div>`);
  if (label) box.setAttribute('aria-label', label);
  box.append(content);
  overlay.append(box);
  document.body.append(overlay);
  box.focus({ preventScroll: true });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.add('is-leaving');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      overlay.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
      if (onClose) onClose();
    }, 190);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = [...box.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])')].filter(
        (n) => !n.disabled,
      );
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close();
  });
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });
  return close;
}

export function openOdds(pack, safe) {
  const rows = safe ? pack.safeOdds : pack.odds;
  const max = Math.max(...rows.map((r) => r[3]));
  const node = el(
    html`<div class="odds">
      <div class="odds__head">
        <h2>
          ${pack.name}${safe ? ' Safe' : ''} odds · 100% EV
          <span class="odds__info" title="Expected value equals the pack price"
            >${raw(icon('info', { size: 15 }))}</span
          >
        </h2>
        <button class="dialog__close" type="button" data-close>Close</button>
      </div>
      <div class="odds__cols"><span>Card value</span><span>Chance per pack</span></div>
      <ol class="odds__rows">
        ${raw(
          rows
            .map(
              ([tier, lo, hi, pct], i) =>
                html`<li style="--n:${i}">
                  <div class="odds__line">
                    <span class="odds__dot" style="background:${TIER_COLOR[tier]}"></span>
                    <span class="odds__range num"
                      >${money(lo, { compact: true })} – ${money(hi, { compact: true })}</span
                    >
                    <span class="odds__pct num">${pct}%</span>
                  </div>
                  <span class="odds__bar"
                    ><i style="--w:${Math.max(1.5, (pct / max) * 100).toFixed(1)}%;background:${TIER_COLOR[tier]}"></i
                  ></span>
                </li>`,
            )
            .join(''),
        )}
      </ol>
      <p class="odds__note">Demo numbers. Every pack in this clone is simulated.</p>
    </div>`,
  );
  return openDialog(node, { label: `${pack.name} odds`, className: 'overlay--odds' });
}

export function openInspect(hit) {
  const slab = hit.pack === 'master' || hit.pack === 'arena' || hit.value > 200;
  const node = el(
    html`<div class="inspect tier-${hit.tier}">
      <canvas class="inspect__stars" aria-hidden="true"></canvas>
      <button class="inspect__close icon-btn" type="button" aria-label="Close" data-close>
        ${raw(icon('close', { size: 18 }))}
      </button>
      <div class="inspect__art${slab ? ' is-slab' : ''}">
        <img src="${slab ? slabArt(hit.card.id, 'large') : cardArt(hit.card.id)}" alt="${hit.card.name}" />
      </div>
      <p class="inspect__value num">${money(hit.value)}</p>
      <p class="inspect__name">${hit.card.name}</p>
      ${hit.user ? raw(html`<p class="inspect__by">Pulled by @${hit.user.handle}${hit.minutesAgo != null ? ` · ${ago(hit.minutesAgo)}` : ''}</p>`) : ''}
    </div>`,
  );
  const close = openDialog(node, { label: hit.card.name, className: 'overlay--inspect' });
  starfield($('.inspect__stars', node));
  // Tilt toward the pointer.
  const art = $('.inspect__art', node);
  node.addEventListener('pointermove', (e) => {
    const r = node.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    art.style.transform = `perspective(900px) rotateY(${(x * 12).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg)`;
  });
  node.addEventListener('pointerleave', () => {
    art.style.transform = '';
  });
  return close;
}

// Slowly twinkling stars behind the inspected card.
function starfield(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  };
  resize();
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.3 + 0.3,
    p: Math.random() * 6.28,
    s: 0.6 + Math.random() * 1.6,
  }));
  let raf = 0;
  const draw = (t) => {
    if (!canvas.isConnected) return;
    if (canvas.width !== canvas.clientWidth * dpr) resize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((s) => {
      const a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(s.p + (t / 1000) * s.s));
      ctx.fillStyle = `rgba(230,224,255,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r * dpr, 0, Math.PI * 2);
      ctx.fill();
    });
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}
