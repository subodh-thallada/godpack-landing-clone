// Packs: the store block, then two drifting belts — recent pulls for the
// selected tier and the all-time top hits.
import { icon } from '../ui/icons.js';
import { html, raw, el, $, reducedMotion } from '../ui/dom.js';
import { viewHead } from '../main.js';
import { PACKS, pullsFor, TOP_HITS, cardArt, slabArt, money, ago } from '../data.js';
import { openInspect } from '../ui/dialogs.js';
import { belt } from '../ui/belt.js';
import { storeMarkup, wireStore, initialPack } from '../ui/store.js';
import { store } from '../ui/dom.js';
import { myPulls } from '../session.js';

export const title = 'Packs';

export function hitCard(h, i) {
  const slab = h.pack === 'master' || h.pack === 'arena';
  const art = slab
    ? `<span class="thumb is-slab glow-${h.tier}"><img src="${slabArt(h.card.id)}" alt="" loading="lazy" draggable="false"></span>`
    : `<span class="thumb glow-${h.tier}"><img src="${cardArt(h.card.id, 'small')}" alt="" loading="lazy" draggable="false"></span>`;
  return html`<li style="--n:${i}">
    <div class="hit tier-${h.tier}">
      <button
        class="hit__inspect"
        type="button"
        aria-label="${h.card.name}, ${money(h.value)}, pulled by @${h.user.handle}, ${ago(h.minutesAgo)}"
      ></button>
      <span class="hit__art">${raw(art)}</span>
      <span class="hit__info">
        <span class="hit__value num">${money(h.value, { compact: true })}</span>
        <span class="hit__name">${h.card.name}</span>
        <a
          class="hit__who"
          href="${h.user.self ? '/profile' : `/profile/${h.user.handle}`}"
          data-link
          aria-label="View @${h.user.handle}'s profile"
          ><span class="avatar" style="background:${h.user.color}">${h.user.handle[0].toUpperCase()}</span
          ><span>@${h.user.handle}</span></a
        >
        <time class="hit__time">${ago(h.minutesAgo)}</time>
      </span>
    </div>
  </li>`;
}

function topTile(t, i) {
  return html`<button
    class="tile tier-${t.tier}"
    type="button"
    style="--n:${i}"
    data-n="${i}"
    aria-label="${t.card.name}, ${money(t.value)}"
  >
    <span class="tile__art"
      ><span class="thumb is-slab glow-${t.tier}"
        ><img src="${slabArt(t.card.id)}" alt="" loading="lazy" draggable="false" /></span
    ></span>
    <span class="tile__cap"
      ><span class="tile__value num">${money(t.value, { compact: true })}</span
      ><span class="tile__name">${t.card.name}</span></span
    >
  </button>`;
}

export function mount(view, { scope, openAuth, navigate, toast }) {
  view.innerHTML = html` ${raw(viewHead('Choose your pack'))}
    ${raw(storeMarkup({ safe: store.get('safe', false), index: initialPack() }))}
    <section class="hits-section">
      <div class="section-head">
        <h2 class="shine-head">${raw(icon('flame', { size: 21 }))}<span>Recent Hits</span></h2>
      </div>
      <div class="hits-belt"><ul class="hits-track" aria-label="Recent pulls above pack value"></ul></div>
    </section>
    <section class="top-section">
      <div class="section-head">
        <h2 class="shine-head shine-head--gold">${raw(icon('trophy', { size: 21 }))}<span>Top Hits</span></h2>
      </div>
      <div class="top-belt"><div class="top-track">${raw(TOP_HITS.map(topTile).join(''))}</div></div>
    </section>`;

  const hitsTrack = $('.hits-track', view);
  const hitData = new WeakMap();
  let current = null;

  function paintHits(index, loading) {
    if (loading) {
      hitsTrack.innerHTML = Array.from(
        { length: 6 },
        () => '<li><div class="hit is-loading"><span class="skeleton"></span></div></li>',
      ).join('');
      return;
    }
    // Your own pulls of at least the pack price lead the belt.
    const pack = PACKS[index];
    const mine = myPulls().filter((p) => p.pack === pack.id && p.value >= pack.price);
    const hits = [...mine, ...pullsFor(pack, 12, current && current.safe ? 17 : 7)].slice(0, 14);
    hitsTrack.innerHTML = hits.map(hitCard).join('');
    [...hitsTrack.children].forEach((li, i) => hitData.set(li, hits[i]));
    hitsTrack.classList.remove('is-in');
    void hitsTrack.offsetWidth;
    hitsTrack.classList.add('is-in');
  }

  current = wireStore(view, { scope, openAuth, onTier: paintHits, navigate, toast });
  paintHits(current.index, false);

  scope.on(hitsTrack, 'click', (e) => {
    const b = e.target.closest('.hit__inspect');
    const hit = b && hitData.get(b.closest('li'));
    if (hit) openInspect(hit);
  });
  scope.on($('.top-track', view), 'click', (e) => {
    const t = e.target.closest('.tile');
    if (t) openInspect(TOP_HITS[+t.dataset.n]);
  });
  belt($('.hits-belt', view), hitsTrack, { scope, speed: 14 });
  belt($('.top-belt', view), $('.top-track', view), { scope, speed: 18, clone: true });

  // A new pull lands at the front every few seconds.
  if (!reducedMotion()) {
    let seed = 100;
    scope.timer(() => {
      if (!hitsTrack.querySelector('.hit:not(.is-loading)')) return;
      const fresh = pullsFor(current.pack(), 1, seed++)[0];
      fresh.minutesAgo = 0;
      const li = el(hitCard(fresh, 0));
      li.classList.add('is-new');
      hitData.set(li, fresh);
      hitsTrack.prepend(li);
      while (hitsTrack.children.length > 14) hitsTrack.lastElementChild.remove();
    }, 7000);
  }
}
