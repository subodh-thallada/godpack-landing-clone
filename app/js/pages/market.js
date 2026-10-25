// Market: buy, bid on, trade and sell cards with the demo's other
// collectors. Sections (kept in ?tab=): Buy (fixed-price listings and
// bundles), Auctions (proxy bidding), Trade (offers to you, your trades and
// a builder for any shape of trade), Selling (list cards, manage listings
// and answer offers) and Activity (history, your offers, price alerts).
// /market/l/:id and /market/t/:id open a listing or a trade on top.
// Everything runs through the shared engine (../market/engine.js) and is
// demo credit only.
import { icon } from '../ui/icons.js';
import { html, raw, el, $, $$ } from '../ui/dom.js';
import { viewHead, avatarOf } from '../main.js';
import { CARDS, USERS, cardArt, slabArt, money, user } from '../data.js';
import { session, market, marketDo, marketOf } from '../session.js';
import { openDialog } from '../ui/dialogs.js';
import { ME, FEE, DURATIONS, SORTS, MAX_BUNDLE, MAX_SIDE, increment, nice, valueOf } from '../market/engine.js';

export const title = 'Market';

const TABS = [
  ['buy', 'Buy'],
  ['auctions', 'Auctions'],
  ['trade', 'Trade'],
  ['selling', 'Selling'],
  ['activity', 'Activity'],
];
const TIER_CHIPS = [
  ['all', 'Any tier'],
  ['common', 'Base'],
  ['core', 'Core'],
  ['hit', 'Hit'],
  ['chase', 'Chase'],
  ['grail', 'Grail'],
];

// ---------------------------------------------------------------- helpers

const cardOf = (id) => CARDS.find((c) => c.id === id) || CARDS[0];
const tierClass = (t) => (t === 'common' ? 'base' : t);
const tierName = (t) => (t === 'common' ? 'Base' : t[0].toUpperCase() + t.slice(1));
const usd = (v) => money(v);
const signed = (v) => (v > 0 ? '+' : '−') + money(Math.abs(v));
const handleOf = (h) => (h === ME ? 'You' : `@${h}`);

function since(t, now = Date.now()) {
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export function countdown(ms) {
  if (ms <= 0) return 'Ended';
  const s = Math.ceil(ms / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function thumb(it, large = false) {
  const src = it.graded ? slabArt(it.id, large ? 'large' : undefined) : cardArt(it.id, large ? undefined : 'small');
  return `<span class="thumb${it.graded ? ' is-slab' : ''} glow-${tierClass(it.tier)}"><img src="${src}" alt="" loading="lazy" draggable="false"></span>`;
}

// One card, or a small fan for a bundle.
function art(items, large = false) {
  if (items.length === 1) return thumb(items[0], large);
  return `<span class="mk-fan${large ? ' is-large' : ''}">${items
    .slice(0, 3)
    .map(
      (it, i) =>
        `<span class="mk-fan__card" style="--i:${i - Math.min(items.length, 3) / 2 + 0.5}">${thumb(it, large)}</span>`,
    )
    .join('')}</span>`;
}

const avatar = (h, size = 20) => avatarOf(h === ME ? session.state || user(h) : user(h), size);

function sub(items) {
  if (items.length > 1) return `Bundle · ${items.length} cards`;
  const c = cardOf(items[0].id);
  return `${c.set} · ${items[0].graded ? c.grade : 'Raw'}`;
}

function spark(series) {
  if (series.length < 2) return '<p class="mk-spark__empty">Not enough sales yet for a chart.</p>';
  const ts = series.map((p) => p[0]);
  const vs = series.map((p) => p[1]);
  const [t0, t1] = [Math.min(...ts), Math.max(...ts)];
  const [v0, v1] = [Math.min(...vs), Math.max(...vs)];
  const pts = series.map(
    ([t, v]) =>
      `${(((t - t0) / (t1 - t0 || 1)) * 300).toFixed(1)},${(74 - ((v - v0) / (v1 - v0 || 1)) * 64).toFixed(1)}`,
  );
  return `<svg class="mk-spark" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="mk-spark-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7954ed" stop-opacity=".32"/><stop offset="1" stop-color="#7954ed" stop-opacity="0"/></linearGradient></defs>
    <path d="M${pts.join(' L')} L300,80 L0,80 Z" fill="url(#mk-spark-fill)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="#a897ff" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
  </svg>`;
}

// Price history for one card at its tier and finish.
const tierStats = (s, it, now = Date.now()) => market.cardStats(s, it.id, it.graded, it.tier, now);

// Keyed list patching: unchanged items stay put (and don't replay their
// entrance), changed ones update in place, new ones animate in.
function patch(container, entries) {
  const old = new Map([...container.children].map((n) => [n.dataset.key, n]));
  let prev = null;
  entries.forEach(({ key, markup }, i) => {
    let n = old.get(key);
    if (n) {
      old.delete(key);
      if (n._markup !== markup) {
        const next = el(markup);
        n.replaceChildren(...next.childNodes);
        n.className = next.className + (n.classList.contains('is-settled') ? ' is-settled' : '');
        n._markup = markup;
      }
    } else {
      n = el(markup);
      n._markup = markup;
      n.dataset.key = key;
      n.style.setProperty('--n', Math.min(i, 12));
      n.addEventListener('animationend', () => n.classList.add('is-settled'), { once: true });
    }
    const want = prev ? prev.nextSibling : container.firstChild;
    if (n !== want) container.insertBefore(n, want);
    prev = n;
  });
  old.forEach((n) => n.remove());
}

const status = (st) =>
  ({
    pending: ['Waiting', 'pending'],
    countered: ['Countered', 'countered'],
    accepted: ['Accepted', 'good'],
    declined: ['Declined', 'bad'],
    withdrawn: ['Withdrawn', 'muted'],
    expired: ['Expired', 'muted'],
    cancelled: ['Cancelled', 'muted'],
    replaced: ['You countered', 'muted'],
    active: ['Live', 'good'],
    sold: ['Sold', 'good'],
    ended: ['Ended', 'muted'],
  })[st] || [st, 'muted'];
const statusChip = (st, label) => {
  const [text, tone] = status(st);
  return `<span class="mk-status is-${tone}">${label || text}</span>`;
};

function errorText(r, what = '') {
  switch (r.error) {
    case 'funds':
      return `Not enough balance: add ${usd(r.short)} first.`;
    case 'low':
      return `Offers under half the price aren't sent. Try at least ${usd(r.min)}.`;
    case 'amount':
      return r.min ? `The next bid has to be at least ${usd(r.min)}.` : 'Check the amount.';
    case 'pending':
      return 'You already have an offer waiting on this one.';
    case 'buyNow':
      return "That's at or over the Buy now price: just buy it.";
    case 'bids':
      return "It has bids, so it can't be taken down now.";
    case 'gone':
      return `That ${what || 'listing'} isn't available any more.`;
    case 'price':
      return 'Prices start at $0.50.';
    case 'reserve':
      return 'The reserve has to be at least the starting price.';
    case 'size':
      return `Up to ${MAX_SIDE} cards on each side.`;
    case 'give':
      return 'Add a card or some cash from your side.';
    case 'get':
      return 'Pick a card (or ask for cash) from their side.';
    case 'cards':
      return 'A trade needs at least one card.';
    case 'items':
      return 'Some of those cards have moved. Pick again.';
    default:
      return 'That didn’t work. Try again.';
  }
}

// ---------------------------------------------------------------- the view

export function mount(view, ctx) {
  const { scope, toast, openAuth, navigate, params = {} } = ctx;
  const qs = new URLSearchParams(location.search);
  let tab = TABS.some(([k]) => k === qs.get('tab')) ? qs.get('tab') : 'buy';

  if (!session.signedIn) {
    view.innerHTML = html`${raw(viewHead('Market', 'Buy, sell, bid on and trade cards with other collectors. Demo credit only.'))}
      <div class="empty surface">
        ${raw(icon('market', { size: 36 }))}
        <h3>The Market</h3>
        <p>Log in to buy, sell, bid on and trade cards with other collectors.</p>
        <button class="btn btn--primary" type="button" data-auth="login" style="margin-top:6px">Log in</button>
      </div>`;
    return;
  }
  marketOf();

  view.innerHTML = html`${raw(viewHead('Market', 'Buy, sell, bid on and trade cards with other collectors. Demo credit only.'))}
    <section class="mk-pulse surface" aria-label="Market today">
      <dl class="mk-stats">
        <div>
          <dt class="label-caps">24h volume</dt>
          <dd class="num" data-p="volume">—</dd>
        </div>
        <div>
          <dt class="label-caps">Sales today</dt>
          <dd class="num" data-p="sales">—</dd>
        </div>
        <div>
          <dt class="label-caps">Listed</dt>
          <dd class="num" data-p="listed">—</dd>
        </div>
        <div>
          <dt class="label-caps">Live auctions</dt>
          <dd class="num" data-p="auctions">—</dd>
        </div>
        <div class="mk-stats__hold" hidden>
          <dt class="label-caps">On hold</dt>
          <dd class="num" data-p="held">—</dd>
        </div>
      </dl>
      <div class="mk-tape" aria-label="Latest sales"><ol class="mk-tape__list"></ol></div>
    </section>
    <div class="tabs mk-tabs" role="tablist" aria-label="Market">
      ${raw(
        TABS.map(
          ([k, label]) =>
            `<button role="tab" type="button" id="mk-tab-${k}" data-tab="${k}" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}">${label}<span class="mk-tabs__count num" hidden></span></button>`,
        ).join(''),
      )}
      <span class="tabs__bar" aria-hidden="true"></span>
    </div>
    <div class="mk-panel" role="tabpanel"></div>`;

  const panel = $('.mk-panel', view);
  const bar = $('.tabs__bar', view);
  const tape = $('.mk-tape__list', view);
  const closers = new Set();
  scope.add(() => closers.forEach((c) => c()));
  const track = (close) => {
    closers.add(close);
    return close;
  };

  // Browse state for Buy and Auctions.
  const filters = { q: '', type: 'all', tier: 'all', sort: 'Ending soon', watching: false };
  let panelPrint = '';
  let dirty = false;

  const moveBar = () => {
    const t = $(`[data-tab="${tab}"]`, view);
    if (!t) return;
    bar.style.width = t.offsetWidth + 'px';
    bar.style.transform = `translateX(${t.offsetLeft}px)`;
  };

  const syncUrl = () => {
    if (location.pathname === '/market') history.replaceState({}, '', `/market?tab=${tab}`);
  };

  function setTab(next) {
    if (next === tab && panel.childElementCount) return;
    tab = next;
    $$('[role=tab]', view).forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    moveBar();
    const current = $(`[data-tab="${tab}"]`, view);
    if (current) current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    syncUrl();
    panelPrint = '';
    panel.replaceChildren();
    panel.classList.remove('is-in');
    void panel.offsetWidth;
    panel.classList.add('is-in');
    paintPanel();
  }

  // ---- the pulse strip ----

  function paintPulse() {
    const s = session.state;
    if (!s) return;
    const p = market.pulse(s);
    $('[data-p="volume"]', view).textContent = usd(p.volume24);
    $('[data-p="sales"]', view).textContent = p.sales24.toLocaleString('en-US');
    $('[data-p="listed"]', view).textContent = p.listed.toLocaleString('en-US');
    $('[data-p="auctions"]', view).textContent = p.auctions.toLocaleString('en-US');
    const held = market.held(s);
    $('.mk-stats__hold', view).hidden = !held;
    $('[data-p="held"]', view).textContent = usd(held);
    patch(
      tape,
      p.tape.map((x) => ({
        key: x.id,
        markup: html`<li class="mk-tape__item" data-card="${x.card}">
          ${raw(thumb({ id: x.card, graded: x.graded, tier: x.tier }))}
          <span class="mk-tape__text"
            ><strong>${cardOf(x.card).name}</strong
            ><span><b class="num">${usd(x.price)}</b> · ${handleOf(x.buyer)} · ${since(x.at)}</span></span
          >
        </li>`,
      })),
    );
    // Tab counts: things waiting on you.
    const m = s.market;
    const counts = {
      trade: m.trades.filter((t) => t.dir === 'in' && t.status === 'pending').length,
      selling: m.offers.filter((o) => o.dir === 'in' && o.status === 'pending').length,
      activity: m.offers.filter((o) => o.dir === 'out' && o.status === 'countered').length,
    };
    $$('[role=tab]', view).forEach((b) => {
      const n = counts[b.dataset.tab] || 0;
      const c = $('.mk-tabs__count', b);
      c.hidden = !n;
      c.textContent = n;
    });
  }

  // ---- panels ----

  function paintPanel() {
    const s = session.state;
    if (!s) return;
    // Don't yank a field (or an open counter / price form) out from under
    // someone using it; repaint once they're done.
    const typing = panel.contains(document.activeElement) && document.activeElement.matches('input, select, textarea');
    if ((typing || $('.mk-counter', panel)) && tab !== 'buy' && tab !== 'auctions') {
      dirty = true;
      return;
    }
    dirty = false;
    ({ buy: paintBrowse, auctions: paintBrowse, trade: paintTrade, selling: paintSelling, activity: paintActivity })[
      tab
    ](s);
  }
  scope.on(panel, 'focusout', (e) => {
    if (dirty && !panel.contains(e.relatedTarget) && !$('.mk-counter', panel)) setTimeout(paintPanel, 0);
  });
  // Close an inline form and catch up on anything that changed meanwhile.
  const dropForm = (form) => {
    form.remove();
    if (dirty) paintPanel();
  };

  // Buy and Auctions: filters plus a keyed grid.
  function paintBrowse(s) {
    if (!$('.mk-grid', panel)) {
      const auctions = tab === 'auctions';
      panel.innerHTML = html`<div class="vault-tools mk-tools">
          <label class="search"
            ><span class="sr">Search the market</span>${raw(icon('search', { size: 18 }))}<input
              type="search"
              placeholder="Search cards, sets or @sellers"
              value="${filters.q}"
          /></label>
          <div class="vault-tools__chips" role="group" aria-label="Card type">
            ${raw(
              [
                ['all', 'All'],
                ['raw', 'Raw'],
                ['graded', 'Graded'],
              ]
                .map(
                  ([k, l]) =>
                    `<button class="chip${filters.type === k ? ' is-on' : ''}" type="button" aria-pressed="${filters.type === k}" data-type="${k}">${l}</button>`,
                )
                .join(''),
            )}
          </div>
          <button
            class="chip mk-watching${filters.watching ? ' is-on' : ''}"
            type="button"
            aria-pressed="${filters.watching}"
          >
            ${raw(icon(filters.watching ? 'heartOn' : 'heart', { size: 15 }))}Watching
          </button>
          <span class="vault-tools__gap"></span>
          <div class="sort">
            <button class="sort__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
              <span class="label-caps">Sort</span><span class="sort__value">${filters.sort}</span>${raw(
                icon('chevronDown', { size: 16 }),
              )}
            </button>
            <ul class="sort__menu" role="listbox" hidden>
              ${raw(
                SORTS.map(
                  (x) => `<li role="option" tabindex="-1" aria-selected="${x === filters.sort}">${x}</li>`,
                ).join(''),
              )}
            </ul>
          </div>
          <div class="mk-tiers" role="group" aria-label="Tier">
            ${raw(
              TIER_CHIPS.map(
                ([k, l]) =>
                  `<button class="chip${filters.tier === k ? ' is-on' : ''}" type="button" aria-pressed="${filters.tier === k}" data-tier="${k}">${k === 'all' ? '' : `<i class="mk-dot tier-${tierClass(k)}"></i>`}${l}</button>`,
              ).join(''),
            )}
          </div>
        </div>
        ${auctions ? raw('<p class="mk-hint">Bids are proxy bids: set the most you’d pay and we bid for you, one step at a time. Bids in the last 30 seconds add time.</p>') : ''}
        <div class="card-grid mk-grid"></div>
        <div class="empty surface mk-empty" hidden>
          ${raw(icon(auctions ? 'gavel' : 'market', { size: 32 }))}
          <h3></h3>
          <p></p>
        </div>`;
      wireBrowse();
    }
    const list = market.browse(s, { ...filters, kind: tab === 'auctions' ? 'auction' : 'fixed' });
    const grid = $('.mk-grid', panel);
    patch(
      grid,
      list.map((l) => ({ key: l.id, markup: tileMarkup(s, l) })),
    );
    const empty = $('.mk-empty', panel);
    empty.hidden = list.length > 0;
    if (!list.length) {
      const narrowed = filters.q || filters.type !== 'all' || filters.tier !== 'all' || filters.watching;
      $('h3', empty).textContent = filters.watching
        ? 'Nothing on your watchlist'
        : narrowed
          ? 'Nothing matches'
          : tab === 'auctions'
            ? 'No live auctions right now'
            : 'Nothing listed right now';
      $('p', empty).textContent = filters.watching
        ? 'Tap the heart on a listing to keep an eye on it. You’ll hear about price drops.'
        : narrowed
          ? 'Try a different search or filter.'
          : 'New listings appear every minute or so.';
    }
  }

  function tileMarkup(s, l) {
    const m = s.market;
    const lead = l.items[0];
    const value = valueOf(l.items);
    const deal = market.dealOf(l);
    const watching = m.watch.includes(l.id);
    const c = market.collector(l.seller);
    const auction = l.kind === 'auction';
    const badges = [];
    if (auction) {
      badges.push(
        `<span class="mk-badge is-clock">${icon('clock', { size: 12 })}<span class="num" data-ends="${l.ends}">${countdown(l.ends - Date.now())}</span></span>`,
      );
      if (market.leading(l)) badges.push('<span class="mk-badge is-good">You’re winning</span>');
      else if (l.myMax) badges.push('<span class="mk-badge is-bad">Outbid</span>');
    } else if (deal >= 0.05)
      badges.push(`<span class="mk-badge is-good">${Math.round(deal * 100)}% under value</span>`);
    if (!auction && l.dropped)
      badges.push(`<span class="mk-badge is-drop">Was <s class="num">${usd(l.dropped)}</s></span>`);
    if (l.items.length > 1) badges.push(`<span class="mk-badge">Bundle · ${l.items.length}</span>`);
    const bids = auction ? (l.bids || []).length : 0;
    return html`<div class="mk-cell">
      <article class="tile tile--mk tier-${tierClass(lead.tier)}">
        <button
          class="mk-tile__open"
          type="button"
          data-open="${l.id}"
          aria-label="${market.titleOf(l.items)}, ${auction ? `current bid ${usd(l.price)}` : usd(l.price)}"
        ></button>
        <span class="mk-badges">${raw(badges.join(''))}</span>
        <button
          class="icon-btn mk-heart${watching ? ' is-on' : ''}"
          type="button"
          data-watch="${l.id}"
          aria-pressed="${watching}"
          aria-label="${watching ? 'Stop watching' : 'Watch'} ${market.titleOf(l.items)}"
        >
          ${raw(icon(watching ? 'heartOn' : 'heart', { size: 18 }))}
        </button>
        <span class="tile__art">${raw(art(l.items))}</span>
        <span class="tile__cap mk-cap">
          <span class="mk-cap__price"
            ><b class="num">${usd(l.price)}</b
            ><span class="num"
              >${auction ? (bids ? `${bids} bid${bids === 1 ? '' : 's'}` : 'No bids') : `Value ${usd(value)}`}</span
            ></span
          >
          <span class="tile__name">${market.titleOf(l.items)}</span>
          <span class="mk-seller"
            >${raw(avatar(l.seller, 16))}<span>@${l.seller}</span
            ><span class="mk-star">★ ${c.rating.toFixed(1)}</span></span
          >
        </span>
      </article>
    </div>`;
  }

  // Listeners for the freshly built toolbar (chips are handled by the
  // view's own click handler).
  function wireBrowse() {
    $('.search input', panel).addEventListener('input', (e) => {
      filters.q = e.target.value;
      paintBrowse(session.state);
    });
    const trigger = $('.sort__trigger', panel);
    const menu = $('.sort__menu', panel);
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', String(!menu.hidden));
    });
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      $$('li', menu).forEach((x) => x.setAttribute('aria-selected', String(x === li)));
      $('.sort__value', panel).textContent = filters.sort = li.textContent;
      closeSort();
      paintBrowse(session.state);
    });
  }
  const closeSort = () => {
    const menu = $('.sort__menu', panel);
    if (!menu) return;
    menu.hidden = true;
    $('.sort__trigger', panel).setAttribute('aria-expanded', 'false');
  };
  scope.on(document, 'click', (e) => {
    if (!e.target.closest('.sort')) closeSort();
  });

  // Trade: offers to you, your trades, and collectors to trade with.
  function paintTrade(s) {
    const m = s.market;
    const incoming = m.trades.filter((t) => t.dir === 'in' && t.status === 'pending');
    const mine = m.trades.filter((t) => t.dir === 'out' || t.status !== 'pending');
    const print = JSON.stringify([incoming.map((t) => t.id), mine.map((t) => t.id + t.status), s.vault.length]);
    if (print === panelPrint) return;
    panelPrint = print;
    panel.innerHTML = html`<section class="mk-section">
        <h2 class="mk-h2">Trade offers for you</h2>
        ${raw(
          incoming.length
            ? `<ol class="mk-trades">${incoming.map((t) => `<li>${tradeCard(s, t)}</li>`).join('')}</ol>`
            : emptyLine(
                'trade',
                'No trade offers right now',
                'Collectors send offers for cards in your Vault every few minutes.',
              ),
        )}
      </section>
      <section class="mk-section">
        <h2 class="mk-h2">Your trades</h2>
        ${raw(
          mine.length
            ? `<ol class="mk-trades">${mine.map((t) => `<li>${tradeCard(s, t)}</li>`).join('')}</ol>`
            : emptyLine('trade', 'No trades yet', 'Pick a collector below and offer any mix of cards and cash.'),
        )}
      </section>
      <section class="mk-section">
        <h2 class="mk-h2">Start a trade</h2>
        <p class="mk-hint">
          One for one, two for one, cards plus cash: any shape works. Cards a collector wants count for a bit more with
          them.
        </p>
        <ul class="mk-collectors">
          ${raw(
            USERS.map((u) => {
              const c = market.collector(u.handle);
              const inv = market.inventory(s, u.handle);
              return html`<li>
                <article class="mk-collector surface">
                  ${raw(avatar(u.handle, 40))}
                  <div class="mk-collector__main">
                    <a class="mk-collector__name" href="/profile/${u.handle}" data-link>@${u.handle}</a>
                    <span class="mk-collector__meta"
                      ><span class="mk-star">★ ${c.rating.toFixed(1)}</span> · ${inv.length} cards · ${c.sales}
                      sales</span
                    >
                    <span class="mk-collector__wants"
                      >Wants
                      ${cardOf(c.wants[0]).name}${c.wants[1] !== c.wants[0] ? ` & ${cardOf(c.wants[1]).name}` : ''}</span
                    >
                  </div>
                  <button class="btn btn--secondary" type="button" data-trade-with="${u.handle}">
                    ${raw(icon('trade', { size: 17 }))}Trade
                  </button>
                </article>
              </li>`;
            }).join(''),
          )}
        </ul>
      </section>`;
  }

  // Selling: list cards, offers on your listings, your listings.
  function paintSelling(s) {
    const m = s.market;
    const offers = m.offers.filter((o) => o.dir === 'in' && o.status === 'pending');
    const live = m.listings.filter((l) => l.mine && l.status === 'active');
    const done = m.listings.filter((l) => l.mine && l.status !== 'active');
    const print = JSON.stringify([
      offers.map((o) => o.id),
      live.map((l) => [l.id, l.price, (l.bids || []).length, l.ends]),
      done.map((l) => l.id + l.status),
      s.vault.length,
    ]);
    if (print === panelPrint) return;
    panelPrint = print;
    const listed = live.reduce((a, l) => a + l.items.length, 0);
    panel.innerHTML = html`<section class="mk-sellbar surface">
        <div>
          <h2 class="mk-h2">Sell on the Market</h2>
          <p class="mk-hint">
            Set your price or run an auction. Collectors pay you directly, minus a ${Math.round(FEE * 100)}% fee. Cards
            stay held until they sell or you take them down.
          </p>
        </div>
        <button class="btn btn--primary mk-list-btn" type="button" data-sell>
          ${raw(icon('tag', { size: 18 }))}List cards
        </button>
      </section>
      <section class="mk-section">
        <h2 class="mk-h2">Offers on your listings</h2>
        ${raw(
          offers.length
            ? `<ol class="mk-rows">${offers.map((o) => offerRow(s, o)).join('')}</ol>`
            : emptyLine(
                'cash',
                'No offers yet',
                'Collectors make offers on listings now and then, usually a bit under your price.',
              ),
        )}
      </section>
      <section class="mk-section">
        <h2 class="mk-h2">Listed <span class="mk-h2__count num">${listed}</span></h2>
        ${raw(
          live.length
            ? `<ol class="mk-rows">${live.map((l) => listingRow(s, l)).join('')}</ol>`
            : emptyLine(
                'tag',
                'Nothing listed',
                s.vault.length
                  ? 'List a card and collectors start bidding or buying within a minute.'
                  : 'Open a pack first: cards you keep can be listed here.',
              ),
        )}
      </section>
      ${
        done.length
          ? raw(
              html`<section class="mk-section">
                <h2 class="mk-h2">Sold &amp; ended</h2>
                <ol class="mk-rows">
                  ${raw(done.map((l) => listingRow(s, l)).join(''))}
                </ol>
              </section>`,
            )
          : ''
      }`;
  }

  // Activity: your offers, alerts and the history log.
  function paintActivity(s) {
    const m = s.market;
    const offers = m.offers.filter((o) => o.dir === 'out');
    const print = JSON.stringify([
      offers.map((o) => o.id + o.status),
      m.alerts.map((a) => a.id),
      m.history.length && m.history[0].id,
    ]);
    if (print === panelPrint) return;
    panelPrint = print;
    panel.innerHTML = html`<section class="mk-section">
        <h2 class="mk-h2">Your offers</h2>
        ${raw(
          offers.length
            ? `<ol class="mk-rows">${offers.map((o) => myOfferRow(s, o)).join('')}</ol>`
            : emptyLine('cash', 'No offers sent', 'Open any listing and make an offer under the asking price.'),
        )}
      </section>
      <section class="mk-section">
        <h2 class="mk-h2">Price alerts</h2>
        <form class="mk-alert-form surface">
          <label
            ><span class="label-caps">Card</span
            ><select class="field" name="card">
              ${raw(CARDS.map((c) => `<option value="${c.id}">${c.name}</option>`).join(''))}
            </select></label
          >
          <label
            ><span class="label-caps">Under</span
            ><input
              class="field"
              name="below"
              type="number"
              inputmode="decimal"
              min="0.5"
              step="0.01"
              placeholder="25.00"
              required
          /></label>
          <button class="btn btn--secondary" type="submit">${raw(icon('bell', { size: 17 }))}Add alert</button>
        </form>
        ${raw(
          m.alerts.length
            ? `<ul class="mk-alerts">${m.alerts
                .map(
                  (a) =>
                    html`<li>
                      ${raw(icon('bell', { size: 16 }))}<span class="mk-grow"
                        >${cardOf(a.card).name}${a.graded == null ? '' : a.graded ? ' (graded)' : ' (raw)'} under
                        <b class="num">${usd(a.below)}</b></span
                      ><button class="btn btn--ghost" type="button" data-alert-off="${a.id}">Remove</button>
                    </li>`,
                )
                .join('')}</ul>`
            : '<p class="mk-hint">Get a notification when a card is listed under your price.</p>',
        )}
      </section>
      <section class="mk-section">
        <h2 class="mk-h2">History</h2>
        ${raw(
          m.history.length
            ? `<ol class="mk-history">${m.history
                .map(
                  (h) =>
                    html`<li>
                      <a
                        class="mk-history__item"
                        href="${h.target.type === 'listing' ? `/market/l/${h.target.id}` : h.target.type === 'trade' ? `/market/t/${h.target.id}` : '/market?tab=activity'}"
                        data-target="${h.target.type}"
                        data-id="${h.target.id || ''}"
                      >
                        <span class="mk-history__icon is-${h.kind}"
                          >${raw(icon(historyIcon(h.kind), { size: 16 }))}</span
                        >
                        <span class="mk-history__text"><strong>${h.title}</strong><span>${h.body}</span></span>
                        <span class="mk-history__side"
                          >${h.amount != null ? raw(`<b class="num ${h.amount >= 0 ? 'is-plus' : 'is-minus'}">${signed(h.amount)}</b>`) : ''}<time
                            >${since(h.at)}</time
                          ></span
                        >
                      </a>
                    </li>`,
                )
                .join('')}</ol>`
            : emptyLine('clock', 'Nothing yet', 'Everything you buy, sell, bid on and trade shows up here.'),
        )}
      </section>`;
  }

  const historyIcon = (k) =>
    ({
      bought: 'cash',
      sold: 'cash',
      listed: 'tag',
      edited: 'pencil',
      cancelled: 'close',
      offer: 'cash',
      counter: 'cash',
      bid: 'gavel',
      outbid: 'gavel',
      won: 'trophy',
      unsold: 'gavel',
      trade: 'trade',
      traded: 'trade',
    })[k] || 'info';

  const emptyLine = (ico, h, p) =>
    `<div class="mk-empty-line">${icon(ico, { size: 22 })}<div><strong>${h}</strong><span>${p}</span></div></div>`;

  function tradeCard(s, t) {
    // A side can be cards, cards plus cash, or (from collectors) just cash.
    const side = (items, cash, label) =>
      html`<div class="mk-trade__side">
        <span class="label-caps">${label}</span>
        <div class="mk-trade__cards">
          ${raw(items.map((it) => `<span class="mk-trade__card" title="${cardOf(it.id).name} · ${usd(it.value)}">${thumb(it)}</span>`).join(''))}
          ${
            cash
              ? raw(
                  items.length
                    ? `<span class="mk-trade__cash num">+${usd(cash)}</span>`
                    : `<span class="mk-trade__cashonly">${icon('cash', { size: 22 })}<span><b class="num">${usd(cash)}</b> in cash</span></span>`,
                )
              : ''
          }
        </div>
        <span class="mk-trade__total num">${usd(valueOf(items) + cash)}</span>
      </div>`;
    // An offer for a card you've since sold, listed or traded can't go ahead.
    const stale =
      t.dir === 'in' &&
      t.status === 'pending' &&
      (t.give.some((x) => !s.vault.some((v) => v.uid === x.uid)) ||
        t.get.some((x) => !market.inventory(s, t.with).some((y) => y.uid === x.uid)));
    const actions = [];
    if (stale) {
      actions.push('<span class="mk-note">The cards in this offer aren’t available any more.</span>');
      actions.push(
        `<button class="btn btn--ghost" type="button" data-trade-act="decline" data-id="${t.id}">Dismiss</button>`,
      );
    } else if (t.dir === 'in' && t.status === 'pending') {
      actions.push(
        `<button class="btn btn--primary" type="button" data-trade-act="accept" data-id="${t.id}">Accept</button>`,
      );
      actions.push(
        `<button class="btn btn--secondary" type="button" data-trade-act="counter" data-id="${t.id}">Counter</button>`,
      );
      actions.push(
        `<button class="btn btn--ghost" type="button" data-trade-act="decline" data-id="${t.id}">Decline</button>`,
      );
    } else if (t.dir === 'out' && t.status === 'countered') {
      actions.push(
        `<button class="btn btn--primary" type="button" data-trade-act="take" data-id="${t.id}">Add ${usd(t.counter)} &amp; trade</button>`,
      );
      actions.push(
        `<button class="btn btn--ghost" type="button" data-trade-act="cancel" data-id="${t.id}">Cancel</button>`,
      );
    } else if (t.dir === 'out' && t.status === 'pending') {
      actions.push('<span class="mk-thinking">Thinking it over<i></i><i></i><i></i></span>');
      actions.push(
        `<button class="btn btn--ghost" type="button" data-trade-act="cancel" data-id="${t.id}">Cancel</button>`,
      );
    }
    const when =
      t.dir === 'in' && t.status === 'pending'
        ? `expires in ${countdown(t.expires - Date.now())}`
        : since(t.closedAt || t.at);
    return html`<article class="mk-trade surface" data-trade="${t.id}">
      <header class="mk-trade__head">
        ${raw(avatar(t.with, 28))}
        <span class="mk-trade__who"
          ><strong>${t.dir === 'in' ? `@${t.with} wants to trade` : `Trade with @${t.with}`}</strong
          ><span>${when}</span></span
        >
        ${raw(statusChip(t.status, t.dir === 'in' ? { pending: 'New', countered: 'You countered' }[t.status] || '' : ''))}
      </header>
      <div class="mk-trade__sides">
        ${raw(side(t.give, t.cashGive, 'You give'))}
        <span class="mk-trade__arrow" aria-hidden="true">${raw(icon('trade', { size: 18 }))}</span>
        ${raw(side(t.get, t.cashGet, 'You get'))}
      </div>
      ${
        t.dir === 'out' && t.status === 'countered'
          ? raw(html`<p class="mk-note">@${t.with} will do it if you add <b class="num">${usd(t.counter)}</b>.</p>`)
          : ''
      }
      ${actions.length ? raw(`<div class="mk-trade__actions">${actions.join('')}</div>`) : ''}
    </article>`;
  }

  function offerRow(s, o) {
    const l = market.get(s, o.listing);
    return html`<li class="mk-row" data-offer="${o.id}">
      ${l ? raw(`<span class="mk-row__art">${art(l.items)}</span>`) : ''}
      <div class="mk-row__main">
        <strong>${raw(avatar(o.with, 18))} @${o.with} offers <b class="num">${usd(o.amount)}</b></strong>
        <span>For ${o.title} · listed at ${usd(o.ask)} · you’d get ${usd(o.amount * (1 - FEE))}</span>
      </div>
      <div class="mk-row__actions">
        <button class="btn btn--primary" type="button" data-offer-act="accept" data-id="${o.id}">Accept</button>
        <button class="btn btn--secondary" type="button" data-offer-act="counter" data-id="${o.id}">Counter</button>
        <button class="btn btn--ghost" type="button" data-offer-act="decline" data-id="${o.id}">Decline</button>
      </div>
    </li>`;
  }

  function myOfferRow(s, o) {
    const actions =
      o.status === 'pending'
        ? `<span class="mk-thinking">Waiting<i></i><i></i><i></i></span><button class="btn btn--ghost" type="button" data-my-offer="withdraw" data-id="${o.id}">Withdraw</button>`
        : o.status === 'countered'
          ? `<button class="btn btn--primary" type="button" data-my-offer="take" data-id="${o.id}">Pay ${usd(o.counter)}</button><button class="btn btn--ghost" type="button" data-my-offer="withdraw" data-id="${o.id}">Decline</button>`
          : '';
    return html`<li class="mk-row" data-my="${o.id}">
      <div class="mk-row__main">
        <strong><a href="/market/l/${o.listing}" data-open-link="${o.listing}">${o.title}</a> from @${o.with}</strong>
        <span
          >You offered <b class="num">${usd(o.amount)}</b> (asking
          ${usd(o.ask)})${
            o.status === 'countered' ? raw(html` · they countered at <b class="num">${usd(o.counter)}</b>`) : ''
          }
          · ${since(o.at)}</span
        >
      </div>
      ${raw(statusChip(o.status))} ${actions ? raw(`<div class="mk-row__actions">${actions}</div>`) : ''}
    </li>`;
  }

  function listingRow(s, l) {
    const auction = l.kind === 'auction';
    const offers = s.market.offers.filter((o) => o.listing === l.id && o.dir === 'in' && o.status === 'pending').length;
    const live = l.status === 'active';
    const meta = [];
    if (auction && live) {
      meta.push(`${(l.bids || []).length} bids`);
      meta.push(`ends in <span class="num" data-ends="${l.ends}">${countdown(l.ends - Date.now())}</span>`);
      if (l.reserve != null) meta.push(l.price >= l.reserve && l.top ? 'reserve met' : `reserve ${usd(l.reserve)}`);
    } else if (live) {
      meta.push(`${l.watchers || 0} watching`);
      if (offers) meta.push(`${offers} offer${offers > 1 ? 's' : ''}`);
      meta.push(`listed ${since(l.at)}`);
    } else if (l.status === 'sold') {
      meta.push(`to @${l.buyer} · you got ${usd(l.soldFor * (1 - FEE))} · ${since(l.soldAt)}`);
    } else {
      meta.push(`${l.status === 'cancelled' ? 'taken down' : 'no sale'} · ${since(l.closedAt || l.at)}`);
    }
    return html`<li class="mk-row" data-listing="${l.id}">
      <span class="mk-row__art">${raw(art(l.items))}</span>
      <div class="mk-row__main">
        <strong><a href="/market/l/${l.id}" data-open-link="${l.id}">${market.titleOf(l.items)}</a></strong>
        <span>${raw(meta.join(' · '))}</span>
      </div>
      <span class="mk-row__price"
        ><b class="num">${usd(l.status === 'sold' ? l.soldFor : l.price)}</b
        ><span
          >${auction ? (live ? (l.top ? 'current bid' : 'starting bid') : 'auction') : l.status === 'sold' ? 'sold' : 'price'}</span
        ></span
      >
      ${raw(statusChip(l.status))}
      ${
        live
          ? raw(
              `<div class="mk-row__actions">${auction ? '' : `<button class="btn btn--secondary" type="button" data-edit="${l.id}">Edit price</button>`}<button class="btn btn--ghost" type="button" data-takedown="${l.id}"${auction && l.top ? ' disabled title="It has bids"' : ''}>Take down</button></div>`,
            )
          : ''
      }
    </li>`;
  }

  // ---- clicks across all panels ----

  scope.on(view, 'click', (e) => {
    const tabBtn = e.target.closest('[role=tab][data-tab]');
    if (tabBtn) return setTab(tabBtn.dataset.tab);
    const chip = e.target.closest('[data-type], [data-tier]');
    if (chip && panel.contains(chip)) {
      const key = chip.dataset.type ? 'type' : 'tier';
      filters[key] = chip.dataset[key];
      $$(`[data-${key}]`, panel).forEach((b) => {
        b.classList.toggle('is-on', b === chip);
        b.setAttribute('aria-pressed', String(b === chip));
      });
      return paintBrowse(session.state);
    }
    const wf = e.target.closest('.mk-watching');
    if (wf) {
      filters.watching = !filters.watching;
      wf.classList.toggle('is-on', filters.watching);
      wf.setAttribute('aria-pressed', String(filters.watching));
      wf.innerHTML = `${icon(filters.watching ? 'heartOn' : 'heart', { size: 15 })}Watching`;
      return paintBrowse(session.state);
    }
    const watch = e.target.closest('[data-watch]');
    if (watch) {
      const on = marketDo((s) => market.toggleWatch(s, watch.dataset.watch));
      toast(on ? 'Watching: you’ll hear about price drops' : 'Removed from your watchlist');
      return;
    }
    const open = e.target.closest('[data-open]');
    if (open) return openListing(open.dataset.open);
    const link = e.target.closest('[data-open-link]');
    if (link) {
      e.preventDefault();
      return openListing(link.dataset.openLink);
    }
    const hist = e.target.closest('.mk-history__item');
    if (hist) {
      e.preventDefault();
      if (hist.dataset.target === 'listing') openListing(hist.dataset.id);
      else if (hist.dataset.target === 'trade') openTrade(hist.dataset.id);
      return;
    }
    const tw = e.target.closest('[data-trade-with]');
    if (tw) return openBuilder(tw.dataset.tradeWith);
    if (e.target.closest('[data-sell]')) return openSell();
    const ta = e.target.closest('[data-trade-act]');
    if (ta) return tradeAction(ta.dataset.tradeAct, ta.dataset.id);
    const oa = e.target.closest('[data-offer-act]');
    if (oa) return offerAction(oa.dataset.offerAct, oa.dataset.id, oa);
    const mo = e.target.closest('[data-my-offer]');
    if (mo) return myOfferAction(mo.dataset.myOffer, mo.dataset.id);
    const ed = e.target.closest('[data-edit]');
    if (ed) return editPrice(ed.dataset.edit, ed);
    const td = e.target.closest('[data-takedown]');
    if (td) return takeDown(td.dataset.takedown);
    const al = e.target.closest('[data-alert-off]');
    if (al) {
      marketDo((s) => market.removeAlert(s, al.dataset.alertOff));
      toast('Alert removed');
      return;
    }
    const sold = e.target.closest('.mk-tape__item');
    if (sold) {
      filters.q = cardOf(sold.dataset.card).name;
      if (tab !== 'buy') setTab('buy');
      const input = $('.search input', panel);
      if (input) input.value = filters.q;
      paintBrowse(session.state);
    }
  });

  scope.on(view, 'submit', (e) => {
    const f = e.target.closest('.mk-alert-form');
    if (!f) return;
    e.preventDefault();
    const below = parseFloat(f.below.value);
    const r = marketDo((s) => market.addAlert(s, { card: f.card.value, below }));
    if (r.ok) {
      toast(`We’ll tell you when ${cardOf(f.card.value).name} lists under ${usd(below)}`);
      f.below.value = '';
      f.below.blur();
    } else toast('Enter a price above $0');
  });

  function tradeAction(act, id) {
    const s = session.state;
    const t = s.market.trades.find((x) => x.id === id);
    if (!t) return;
    if (act === 'counter')
      return openBuilder(t.with, {
        give: t.give.map((x) => x.uid),
        get: t.get.map((x) => x.uid),
        cashGet: t.cashGet,
        replaces: t.id,
      });
    const r = marketDo((st) =>
      act === 'accept'
        ? market.respondTrade(st, id, 'accept')
        : act === 'decline'
          ? market.respondTrade(st, id, 'decline')
          : act === 'take'
            ? market.acceptTradeCounter(st, id)
            : market.cancelTrade(st, id),
    );
    if (!r.ok) return toast(errorText(r, 'trade'));
    toast(
      {
        accept: `Traded with @${t.with}: the cards are in your Vault`,
        decline: 'Trade declined',
        take: `Traded with @${t.with}`,
        cancel: 'Trade cancelled: everything’s back',
      }[act],
    );
  }

  function offerAction(act, id, btn) {
    if (act === 'counter') {
      const row = btn.closest('.mk-row');
      const o = session.state.market.offers.find((x) => x.id === id);
      if (!o || $('.mk-counter', row)) return;
      const form = el(
        html`<form class="mk-counter" novalidate>
          <label class="mk-money"
            ><span>$</span
            ><input
              class="field"
              type="number"
              inputmode="decimal"
              step="0.01"
              min="${o.amount + 0.01}"
              max="${o.ask}"
              value="${(Math.round(((o.amount + o.ask) / 2) * 100) / 100).toFixed(2)}"
              aria-label="Counter offer"
          /></label>
          <button class="btn btn--primary" type="submit">Send counter</button>
          <button class="btn btn--ghost" type="button" data-cancel-counter>Cancel</button>
        </form>`,
      );
      row.append(form);
      $('input', form).focus();
      form.addEventListener('click', (e) => {
        if (e.target.closest('[data-cancel-counter]')) dropForm(form);
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat($('input', form).value);
        const r = marketDo((s) => market.respondOffer(s, id, 'counter', amount));
        if (!r.ok) return toast(`Counter between ${usd(o.amount + 0.01)} and ${usd(o.ask)}`);
        dropForm(form);
        toast(`Counter sent to @${o.with}`);
      });
      return;
    }
    const o = session.state.market.offers.find((x) => x.id === id);
    const r = marketDo((s) => market.respondOffer(s, id, act));
    if (!r.ok) return toast(errorText(r, 'offer'));
    toast(act === 'accept' ? `Sold to @${o.with} for ${usd(o.amount)}` : 'Offer declined');
  }

  function myOfferAction(act, id) {
    const o = session.state.market.offers.find((x) => x.id === id);
    const r = marketDo((s) => (act === 'take' ? market.acceptCounter(s, id) : market.withdrawOffer(s, id)));
    if (!r.ok) return toast(errorText(r));
    toast(
      act === 'take'
        ? `Bought ${o.title}: it’s in your Vault`
        : o.status === 'countered'
          ? 'Counter declined'
          : 'Offer withdrawn: your money is back',
    );
  }

  function editPrice(id, btn) {
    const row = btn.closest('.mk-row');
    const l = market.get(session.state, id);
    if (!l || $('.mk-counter', row)) return;
    const form = el(
      html`<form class="mk-counter" novalidate>
        <label class="mk-money"
          ><span>$</span
          ><input
            class="field"
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0.5"
            value="${l.price}"
            aria-label="New price"
        /></label>
        <button class="btn btn--primary" type="submit">Save price</button>
        <button class="btn btn--ghost" type="button" data-cancel-counter>Cancel</button>
      </form>`,
    );
    row.append(form);
    $('input', form).select();
    form.addEventListener('click', (e) => {
      if (e.target.closest('[data-cancel-counter]')) dropForm(form);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const price = parseFloat($('input', form).value);
      const r = marketDo((s) => market.editPrice(s, id, price));
      if (!r.ok) return toast(errorText(r));
      dropForm(form);
      toast(`Repriced to ${usd(price)}`);
    });
  }

  function takeDown(id) {
    const l = market.get(session.state, id);
    if (!l) return;
    const node = el(
      html`<div class="confirm">
        <h2>Take down ${market.titleOf(l.items)}?</h2>
        <p>The card${l.items.length > 1 ? 's go' : ' goes'} back to your Vault and any offers on it are declined.</p>
        <div class="confirm__row">
          <button class="btn btn--secondary" type="button" data-close>Keep it listed</button
          ><button class="btn btn--primary confirm__go" type="button">Take down</button>
        </div>
      </div>`,
    );
    const close = track(openDialog(node, { label: 'Take down listing', className: 'overlay--confirm' }));
    $('.confirm__go', node).addEventListener('click', () => {
      const r = marketDo((s) => market.cancel(s, id));
      toast(r.ok ? 'Taken down: it’s back in your Vault' : errorText(r));
      close();
    });
  }

  // ---- dialogs (also reachable at /market/l/:id and /market/t/:id) ----

  // The dialog's own URL while it's open. On close, put the market URL back
  // only if the address is still the dialog's (not if you've navigated on).
  function dialogUrl(path, onClose) {
    if (location.pathname + location.search !== path) history.replaceState({}, '', path);
    return () => {
      if (location.pathname + location.search === path) history.replaceState({}, '', `/market?tab=${tab}`);
      if (onClose) onClose();
    };
  }

  function openListing(id) {
    const s = session.state;
    const l = market.get(s, id);
    if (!l) {
      toast('That listing isn’t on the Market any more');
      syncUrl();
      return;
    }
    const node = el('<div class="mk-detail"></div>');
    let mode = null; // null | 'buy' | 'offer' | 'alert' | 'bid'
    const drafts = {}; // what's been typed into each form
    let lastPrint = '';
    let note = '';
    const unsub = { fn: null };
    const close = track(
      openDialog(node, {
        label: market.titleOf(l.items),
        className: 'overlay--mk',
        onClose: dialogUrl(`/market/l/${id}`, () => unsub.fn && unsub.fn()),
      }),
    );

    function paint() {
      const st = session.state;
      if (!st) return close();
      const x = market.get(st, id);
      if (!x) return close();
      const offer = st.market.offers.find((o) => o.listing === id && o.dir === 'out');
      const print = JSON.stringify([
        x.status,
        x.price,
        (x.bids || []).length,
        x.top,
        offer && offer.status,
        mode,
        note,
        st.market.watch.includes(id),
        st.balance,
        st.market.offers.filter((o) => o.listing === id).map((o) => o.status),
      ]);
      if (print === lastPrint) return;
      lastPrint = print;
      const focused = node.contains(document.activeElement) && document.activeElement.closest('form[data-form]');
      const focusedForm = focused ? focused.dataset.form : null;
      node.innerHTML = detailMarkup(st, x, offer, mode, note);
      // Keep what someone typed across live updates. A max bid stays unless
      // a new bid has pushed the minimum above it.
      $$('form[data-form]', node).forEach((f) => {
        const input = $('input', f);
        const typed = drafts[f.dataset.form];
        if (!input || typed == null) return;
        if (f.dataset.form === 'bid' && !(parseFloat(typed) >= parseFloat(input.min))) delete drafts.bid;
        else input.value = typed;
        if (f.dataset.form === focusedForm) input.focus();
      });
      tilt();
    }

    function tilt() {
      const a = $('.mk-detail__art', node);
      if (!a || matchMedia('(hover: none)').matches) return;
      const inner = $('.mk-detail__lift', a);
      a.addEventListener('pointermove', (e) => {
        const r = a.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        inner.style.transform = `perspective(900px) rotateY(${(px * 10).toFixed(2)}deg) rotateX(${(-py * 8).toFixed(2)}deg)`;
      });
      a.addEventListener('pointerleave', () => {
        inner.style.transform = '';
      });
    }

    unsub.fn = session.on(paint);
    paint();

    node.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const st = session.state;
      const x = market.get(st, id);
      const act = b.dataset.act;
      if (act === 'mode') {
        mode = mode === b.dataset.mode ? null : b.dataset.mode;
        note = '';
        paint();
        const input = $('.mk-sub input', node);
        if (input) input.focus();
        return;
      }
      if (act === 'watch') {
        const on = marketDo((s) => market.toggleWatch(s, id));
        toast(on ? 'Watching: you’ll hear about price drops' : 'Removed from your watchlist');
        return;
      }
      if (act === 'pct') {
        const input = $('.mk-sub input', node);
        input.value = nice(x.price * +b.dataset.pct);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      if (act === 'step') {
        const input = $('.mk-sub input', node);
        const base = market.leading(x) ? Math.round((x.top.max + increment(x.top.max)) * 100) / 100 : market.minBid(x);
        let v = base;
        for (let i = 0; i < +b.dataset.steps; i++) v = Math.round((v + increment(v)) * 100) / 100;
        input.value = v.toFixed(2);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      if (act === 'buy') {
        const r = marketDo((s) => market.buy(s, id));
        if (!r.ok) {
          note = errorText(r);
          return paint();
        }
        mode = null;
        note = '';
        toast(`Bought ${market.titleOf(x.items)}: it’s in your Vault`);
        return paint();
      }
      if (act === 'withdraw') {
        const o = st.market.offers.find(
          (q) => q.listing === id && q.dir === 'out' && (q.status === 'pending' || q.status === 'countered'),
        );
        if (o) marketDo((s) => market.withdrawOffer(s, o.id));
        toast('Offer withdrawn');
        return;
      }
      if (act === 'take-counter') {
        const o = st.market.offers.find((q) => q.listing === id && q.dir === 'out' && q.status === 'countered');
        const r = marketDo((s) => market.acceptCounter(s, o.id));
        if (!r.ok) {
          note = errorText(r);
          return paint();
        }
        toast(`Bought ${o.title}: it’s in your Vault`);
        return;
      }
      if (act === 'takedown') {
        close();
        return takeDown(id);
      }
      if (act === 'offer-accept' || act === 'offer-decline') {
        const r = marketDo((s) => market.respondOffer(s, b.dataset.id, act === 'offer-accept' ? 'accept' : 'decline'));
        if (!r.ok) toast(errorText(r, 'offer'));
        return;
      }
      if (act === 'vault') {
        close();
        navigate('/vault');
      }
    });

    node.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const amount = parseFloat($('input', f).value);
      const x = market.get(session.state, id);
      if (f.dataset.form === 'offer') {
        if (amount >= x.price) {
          note = 'That’s the full price: just buy it.';
          return paint();
        }
        const r = marketDo((s) => market.offer(s, id, amount));
        if (!r.ok) {
          note = errorText(r);
          return paint();
        }
        mode = null;
        note = '';
        toast(`Offer sent to @${x.seller}: ${usd(amount)} is on hold`);
      } else if (f.dataset.form === 'bid') {
        const r = marketDo((s) => market.bid(s, id, amount));
        if (!r.ok) {
          note = errorText(r);
          return paint();
        }
        note = r.leading
          ? ''
          : `@${market.get(session.state, id).top.by}’s max is higher. Current bid ${usd(r.price)}.`;
        toast(r.leading ? `You’re winning at ${usd(market.get(session.state, id).price)}` : 'Outbid straight away');
      } else if (f.dataset.form === 'alert') {
        const it = x.items[0];
        const r = marketDo((s) => market.addAlert(s, { card: it.id, graded: it.graded, below: amount }));
        if (!r.ok) {
          note = 'Enter a price above $0.';
          return paint();
        }
        mode = null;
        note = '';
        toast(`We’ll tell you when ${cardOf(it.id).name} lists under ${usd(amount)}`);
      } else if (f.dataset.form === 'price') {
        const r = marketDo((s) => market.editPrice(s, id, amount));
        if (!r.ok) {
          note = errorText(r);
          return paint();
        }
        mode = null;
        note = '';
        toast(`Repriced to ${usd(amount)}`);
      }
      delete drafts[f.dataset.form];
      lastPrint = '';
      paint();
    });

    // Live preview of what an offer or bid means.
    node.addEventListener('input', (e) => {
      const form = e.target.closest('form[data-form]');
      if (form) drafts[form.dataset.form] = e.target.value;
      const out = $('[data-live]', node);
      if (!out || !e.target.matches('input')) return;
      const v = parseFloat(e.target.value) || 0;
      const x = market.get(session.state, id);
      out.textContent =
        out.dataset.live === 'offer'
          ? `${Math.round((v / x.price) * 100)}% of the asking price · ${usd(v)} held until @${x.seller} answers`
          : out.dataset.live === 'price'
            ? `You’d receive ${usd(v * (1 - FEE))} after the ${Math.round(FEE * 100)}% fee`
            : `${usd(v)} held while you’re winning; you pay one step over the next-highest bid`;
    });
  }

  function detailMarkup(s, l, offer, mode, note) {
    const lead = l.items[0];
    const value = valueOf(l.items);
    const auction = l.kind === 'auction';
    const c = l.mine ? null : market.collector(l.seller);
    const stats = l.items.length === 1 ? tierStats(s, lead) : null;
    const watching = s.market.watch.includes(l.id);
    const live = l.status === 'active';
    const deal = market.dealOf(l);
    const now = Date.now();

    let priceBlock;
    if (auction) {
      const bids = (l.bids || []).length;
      priceBlock = html`<div class="mk-price">
        <span class="label-caps">${l.top ? 'Current bid' : 'Starting bid'}</span>
        <strong class="num">${usd(l.price)}</strong>
        <span class="mk-price__meta"
          >${bids ? `${bids} bid${bids === 1 ? '' : 's'}` : 'No bids yet'} · value
          ${usd(value)}${l.buyNow ? ` · Buy now ${usd(l.buyNow)}` : ''}</span
        >
        ${
          live
            ? raw(
                html`<span class="mk-clock${l.ends - now < 60000 ? ' is-soon' : ''}"
                  >${raw(icon('clock', { size: 15 }))}<span class="num" data-ends="${l.ends}"
                    >${countdown(l.ends - now)}</span
                  >
                  left</span
                >`,
              )
            : ''
        }
      </div>`;
    } else {
      priceBlock = html`<div class="mk-price">
        <span class="label-caps">${l.status === 'sold' ? 'Sold for' : 'Price'}</span>
        <strong class="num">${usd(l.status === 'sold' ? l.soldFor : l.price)}</strong>
        <span class="mk-price__meta"
          >Market value
          ${usd(value)}${deal >= 0.05 ? ` · ${Math.round(deal * 100)}% under` : deal <= -0.05 ? ` · ${Math.round(-deal * 100)}% over` : ''}${l.dropped && live ? raw(html` · <s>was ${usd(l.dropped)}</s>`) : ''}</span
        >
      </div>`;
    }

    // Who you're dealing with.
    const seller = l.mine
      ? `<div class="mk-seller-card"><span class="mk-seller-card__text"><strong>Your listing</strong><span>${l.watchers || 0} watching · listed ${since(l.at)}</span></span></div>`
      : html`<a class="mk-seller-card" href="/profile/${l.seller}" data-link>
          ${raw(avatar(l.seller, 36))}
          <span class="mk-seller-card__text"
            ><strong>@${l.seller}</strong
            ><span><span class="mk-star">★ ${c.rating.toFixed(1)}</span> · ${c.sales} sales</span></span
          >
          ${raw(icon('chevronRight', { size: 18 }))}
        </a>`;

    // What you can do.
    let actions = '';
    let subpanel = '';
    const leading = auction && market.leading(l);
    if (!live) {
      const won = l.buyer === ME;
      actions = html`<div class="mk-result ${won ? 'is-good' : ''}">
        ${raw(icon(won ? 'check' : 'info', { size: 18 }))}
        <span
          >${
            won
              ? `It’s yours: bought for ${usd(l.soldFor)}. It’s in your Vault.`
              : l.status === 'sold'
                ? l.mine
                  ? `Sold to @${l.buyer} for ${usd(l.soldFor)}. You got ${usd(l.soldFor * (1 - FEE))}.`
                  : `Sold to @${l.buyer} for ${usd(l.soldFor)}.`
                : l.mine
                  ? 'Ended without a sale. The cards are back in your Vault.'
                  : 'This listing has ended.'
          }</span
        >
        ${won ? raw('<button class="btn btn--secondary" type="button" data-act="vault">View in Vault</button>') : ''}
      </div>`;
    } else if (l.mine) {
      const offers = s.market.offers.filter((o) => o.listing === l.id && o.dir === 'in' && o.status === 'pending');
      actions = html`<div class="mk-actions">
        ${!auction ? raw('<button class="btn btn--secondary" type="button" data-act="mode" data-mode="price">Edit price</button>') : ''}
        <button class="btn btn--secondary" type="button" data-act="takedown" ${auction && l.top ? 'disabled' : ''}>
          Take down
        </button>
      </div>`;
      if (auction && l.reserve != null)
        actions += html`<p class="mk-note">
          ${l.top && l.price >= l.reserve ? 'Reserve met: it will sell to the top bidder.' : `Reserve ${usd(l.reserve)} not met yet.`}
        </p>`;
      if (offers.length)
        actions += `<ul class="mk-mini-offers">${offers
          .map(
            (o) =>
              html`<li>
                ${raw(avatar(o.with, 22))}<span class="mk-grow"
                  ><b>@${o.with}</b> offers <b class="num">${usd(o.amount)}</b></span
                >
                <button class="btn btn--primary" type="button" data-act="offer-accept" data-id="${o.id}">Accept</button>
                <button class="btn btn--ghost" type="button" data-act="offer-decline" data-id="${o.id}">Decline</button>
              </li>`,
          )
          .join('')}</ul>`;
      if (mode === 'price')
        subpanel = html`<form class="mk-sub" data-form="price" novalidate>
          <label class="mk-field"
            ><span class="label-caps">New price</span
            ><span class="mk-money"
              ><span>$</span
              ><input class="field" type="number" inputmode="decimal" step="0.01" min="0.5" value="${l.price}" /></span
          ></label>
          <p class="mk-note" data-live="price">
            You’d receive ${usd(l.price * (1 - FEE))} after the ${Math.round(FEE * 100)}% fee
          </p>
          <button class="btn btn--primary" type="submit">Save price</button>
        </form>`;
    } else if (auction) {
      const min = leading ? Math.round((l.top.max + increment(l.top.max)) * 100) / 100 : market.minBid(l);
      const status = leading
        ? `<p class="mk-result is-good">${icon('check', { size: 18 })}<span>You’re winning. Your max is ${usd(l.top.max)}.</span></p>`
        : l.myMax
          ? `<p class="mk-result is-bad">${icon('info', { size: 18 })}<span>You’ve been outbid. Bid again to get back in front.</span></p>`
          : '';
      actions = html`${raw(status)}
        <form class="mk-sub mk-sub--bid" data-form="bid" novalidate>
          <label class="mk-field"
            ><span class="label-caps">${leading ? 'Raise your max' : 'Your max bid'}</span
            ><span class="mk-money"
              ><span>$</span
              ><input
                class="field"
                type="number"
                inputmode="decimal"
                step="0.01"
                min="${min}"
                value="${min.toFixed(2)}" /></span
          ></label>
          <div class="mk-quick">
            <button class="chip" type="button" data-act="step" data-steps="0">Min ${usd(min)}</button>
            <button class="chip" type="button" data-act="step" data-steps="3">+3 steps</button>
            <button class="chip" type="button" data-act="step" data-steps="8">+8 steps</button>
          </div>
          <p class="mk-note" data-live="bid">
            We bid for you up to your max, one step at a time. You only pay one step over the next-highest bid.
          </p>
          <button class="btn btn--buy" type="submit">
            ${raw(icon('gavel', { size: 18 }))}${leading ? 'Raise max' : 'Place bid'}
          </button>
        </form>
        ${
          l.buyNow && l.price < l.buyNow
            ? raw(
                html`<button class="btn btn--secondary btn--block mk-buynow" type="button" data-act="buy">
                  Buy now for ${usd(l.buyNow)}
                </button>`,
              )
            : ''
        }`;
    } else {
      const pending = offer && offer.status === 'pending';
      const countered = offer && offer.status === 'countered';
      actions = html`<div class="mk-actions">
        <button class="btn btn--buy" type="button" data-act="mode" data-mode="buy">Buy now · ${usd(l.price)}</button>
        <button
          class="btn btn--secondary"
          type="button"
          data-act="mode"
          data-mode="offer"
          ${pending || countered ? 'disabled' : ''}
        >
          Make offer
        </button>
      </div>`;
      if (pending)
        subpanel = html`<div class="mk-sub mk-sub--status">
          <span class="mk-thinking">Your ${usd(offer.amount)} offer is with @${l.seller}<i></i><i></i><i></i></span>
          <button class="btn btn--ghost" type="button" data-act="withdraw">Withdraw</button>
        </div>`;
      else if (countered)
        subpanel = html`<div class="mk-sub mk-sub--status">
          <span>@${l.seller} countered your ${usd(offer.amount)} with <b class="num">${usd(offer.counter)}</b>.</span>
          <div class="mk-actions">
            <button class="btn btn--primary" type="button" data-act="take-counter">Pay ${usd(offer.counter)}</button>
            <button class="btn btn--ghost" type="button" data-act="withdraw">Decline</button>
          </div>
        </div>`;
      else if (mode === 'buy')
        subpanel = html`<div class="mk-sub">
          <p>
            Buy ${market.titleOf(l.items)} from @${l.seller} for <b class="num">${usd(l.price)}</b>? Your balance after:
            <b class="num">${usd(s.balance - l.price)}</b>.
          </p>
          <div class="mk-actions">
            <button class="btn btn--secondary" type="button" data-act="mode" data-mode="buy">Cancel</button>
            <button class="btn btn--primary" type="button" data-act="buy">Confirm purchase</button>
          </div>
        </div>`;
      else if (mode === 'offer')
        subpanel = html`<form class="mk-sub" data-form="offer" novalidate>
          <label class="mk-field"
            ><span class="label-caps">Your offer</span
            ><span class="mk-money"
              ><span>$</span
              ><input
                class="field"
                type="number"
                inputmode="decimal"
                step="0.01"
                min="${nice(l.price * 0.5)}"
                max="${l.price}"
                value="${nice(l.price * 0.9).toFixed(2)}"
            /></span>
          </label>
          <div class="mk-quick">
            <button class="chip" type="button" data-act="pct" data-pct="0.8">80%</button>
            <button class="chip" type="button" data-act="pct" data-pct="0.9">90%</button>
            <button class="chip" type="button" data-act="pct" data-pct="0.95">95%</button>
          </div>
          <p class="mk-note" data-live="offer">
            We hold the amount until @${l.seller} answers, usually within seconds. They may accept, counter or pass.
          </p>
          <button class="btn btn--primary" type="submit">Send offer</button>
        </form>`;
      if (!pending && !countered && offer && (offer.status === 'declined' || offer.status === 'expired'))
        subpanel += html`<p class="mk-note">
          Your last offer (${usd(offer.amount)}) was ${offer.status}. Try again closer to the price.
        </p>`;
    }

    const watchAlert = l.mine
      ? ''
      : html`<div class="mk-tools-row">
          <button
            class="btn btn--ghost${watching ? ' is-on' : ''}"
            type="button"
            data-act="watch"
            aria-pressed="${watching}"
          >
            ${raw(icon(watching ? 'heartOn' : 'heart', { size: 16 }))}${watching ? 'Watching' : 'Watch'}
          </button>
          ${
            l.items.length === 1
              ? raw(
                  html`<button class="btn btn--ghost" type="button" data-act="mode" data-mode="alert">
                    ${raw(icon('bell', { size: 16 }))}Price alert
                  </button>`,
                )
              : ''
          }
          <span class="mk-watchers">${l.watchers || 0} watching</span>
        </div>`;
    if (mode === 'alert' && !l.mine)
      subpanel = html`<form class="mk-sub" data-form="alert" novalidate>
        <label class="mk-field"
          ><span class="label-caps">Alert me when ${cardOf(lead.id).name} lists under</span
          ><span class="mk-money"
            ><span>$</span
            ><input
              class="field"
              type="number"
              inputmode="decimal"
              step="0.01"
              min="0.5"
              value="${nice(l.price * 0.9).toFixed(2)}" /></span
        ></label>
        <button class="btn btn--primary" type="submit">${raw(icon('bell', { size: 17 }))}Set alert</button>
      </form>`;

    const bidsList =
      auction && (l.bids || []).length
        ? html`<section class="mk-block">
            <h3 class="label-caps">Bid history</h3>
            <ol class="mk-bids">
              ${raw(
                l.bids
                  .slice(0, 8)
                  .map(
                    (b) =>
                      html`<li class="${b.by === ME ? 'is-me' : ''}">
                        ${raw(avatar(b.by, 18))}<span class="mk-grow"
                          >${handleOf(b.by)}${b.buyNow ? ' · Buy now' : ''}</span
                        ><b class="num">${usd(b.amount)}</b><time>${since(b.at)}</time>
                      </li>`,
                  )
                  .join(''),
              )}
            </ol>
          </section>`
        : '';

    const history = stats
      ? html`<section class="mk-block">
          <h3 class="label-caps">
            ${cardOf(lead.id).name} · ${tierName(lead.tier)} · ${lead.graded ? 'graded' : 'raw'} sales
          </h3>
          ${raw(spark(stats.series))}
          <dl class="mk-facts">
            <div>
              <dt>Floor</dt>
              <dd class="num">${stats.floor != null ? usd(stats.floor) : '—'}</dd>
            </div>
            <div>
              <dt>Last sale</dt>
              <dd class="num">${stats.last != null ? usd(stats.last) : '—'}</dd>
            </div>
            <div>
              <dt>7-day avg</dt>
              <dd class="num">${stats.avg != null ? usd(stats.avg) : '—'}</dd>
            </div>
            <div>
              <dt>Sales 24h</dt>
              <dd class="num">${stats.count24}</dd>
            </div>
          </dl>
        </section>`
      : html`<section class="mk-block">
          <h3 class="label-caps">In this bundle</h3>
          <ul class="mk-bundle">
            ${raw(
              l.items
                .map(
                  (it) =>
                    html`<li>
                      ${raw(thumb(it))}<span class="mk-grow"
                        ><strong>${cardOf(it.id).name}</strong
                        ><span>${it.graded ? cardOf(it.id).grade : 'Raw'}</span></span
                      ><b class="num">${usd(it.value)}</b>
                    </li>`,
                )
                .join(''),
            )}
          </ul>
        </section>`;

    return html`<button class="inspect__close icon-btn mk-detail__close" type="button" aria-label="Close" data-close>
        ${raw(icon('close', { size: 18 }))}
      </button>
      <div class="mk-detail__art tier-${tierClass(lead.tier)}">
        <div class="mk-detail__lift">${raw(art(l.items, true))}</div>
      </div>
      <div class="mk-detail__body">
        <p class="label-caps mk-detail__kind">
          ${raw(icon(auction ? 'gavel' : 'tag', { size: 13 }))}${auction ? 'Auction' : l.items.length > 1 ? 'Bundle' : 'Buy now'}${!live ? ` · ${status(l.status)[0]}` : ''}
        </p>
        <h2 class="mk-detail__title">${market.titleOf(l.items)}</h2>
        <p class="mk-detail__sub">${sub(l.items)}</p>
        ${raw(priceBlock)} ${raw(seller)} ${raw(actions)} ${raw(subpanel)}
        ${note ? raw(html`<p class="mk-error" role="alert">${note}</p>`) : ''} ${raw(watchAlert)} ${raw(bidsList)}
        ${raw(history)}
      </div>`;
  }

  function openTrade(id) {
    const s = session.state;
    const t = s.market.trades.find((x) => x.id === id);
    if (!t) {
      toast('That trade isn’t around any more');
      syncUrl();
      return;
    }
    if (tab !== 'trade') setTab('trade');
    const node = el('<div class="mk-trade-detail"></div>');
    let unsub = null;
    let last = '';
    const close = track(
      openDialog(node, {
        label: `Trade with @${t.with}`,
        className: 'overlay--confirm overlay--trade-one',
        onClose: dialogUrl(`/market/t/${id}`, () => unsub && unsub()),
      }),
    );
    const paint = () => {
      const st = session.state;
      const x = st && st.market.trades.find((y) => y.id === id);
      if (!x) return close();
      const print = x.status + (x.counter || '');
      if (print === last) return;
      last = print;
      node.innerHTML = `<div class="mk-trade-detail__head"><h2>${x.dir === 'in' ? 'Trade offer' : 'Your trade'}</h2><button class="dialog__close" type="button" data-close>Close</button></div>${tradeCard(st, x)}`;
    };
    unsub = session.on(paint);
    paint();
    node.addEventListener('click', (e) => {
      const b = e.target.closest('[data-trade-act]');
      if (!b) return;
      if (b.dataset.tradeAct === 'counter') close();
      tradeAction(b.dataset.tradeAct, b.dataset.id);
    });
  }

  // ---- the trade builder ----

  // Picking updates the cards in place (keeps focus and scroll position).
  function syncPicker(list, chosen, max) {
    $$('[data-pick]', list).forEach((b) => {
      const on = chosen.has(b.dataset.pick);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      b.disabled = !on && chosen.size >= max;
      $('.mk-pick__check', b).innerHTML = on ? icon('check', { size: 12 }) : '';
    });
  }

  function picker(items, chosen, max, label) {
    if (!items.length) return `<p class="mk-hint">${label}</p>`;
    return `<ul class="mk-pick">${items
      .map((it) => {
        const on = chosen.has(it.uid);
        const off = !on && chosen.size >= max;
        return html`<li>
          <button
            class="mk-pick__card${on ? ' is-on' : ''}"
            type="button"
            data-pick="${it.uid}"
            aria-pressed="${on}"
            ${off ? 'disabled' : ''}
          >
            ${raw(thumb(it))}<span class="mk-pick__value num">${usd(it.value)}</span
            ><span class="mk-pick__name">${cardOf(it.id).name}</span>
            <span class="mk-pick__check" aria-hidden="true">${raw(on ? icon('check', { size: 12 }) : '')}</span>
          </button>
        </li>`;
      })
      .join('')}</ul>`;
  }

  function openBuilder(handle, preset = {}) {
    const s = session.state;
    if (!s) return openAuth('login');
    const c = market.collector(handle);
    const give = new Set(preset.give || []);
    const get = new Set(preset.get || []);
    let cashMode = preset.cashGive ? 'add' : preset.cashGet ? 'ask' : 'none';
    let cash = preset.cashGive || preset.cashGet || 0;
    let q = '';
    const node = el('<div class="mk-builder"></div>');
    const close = track(openDialog(node, { label: `Trade with @${handle}`, className: 'overlay--builder' }));

    node.innerHTML = html`<header class="mk-builder__head">
        ${raw(avatar(handle, 40))}
        <div>
          <h2>Trade with @${handle}</h2>
          <p class="mk-hint">
            <span class="mk-star">★ ${c.rating.toFixed(1)}</span> · ${c.sales} sales · wants
            ${cardOf(c.wants[0]).name}${c.wants[1] !== c.wants[0] ? ` & ${cardOf(c.wants[1]).name}` : ''}
          </p>
        </div>
        <button class="dialog__close" type="button" data-close>Close</button>
      </header>
      <div class="mk-builder__cols">
        <section class="mk-builder__col" data-col="give">
          <h3><span>You give</span><span class="num" data-total="give">$0.00</span></h3>
          <label class="search mk-builder__search"
            ><span class="sr">Search your cards</span>${raw(icon('search', { size: 16 }))}<input
              type="search"
              placeholder="Search your Vault"
          /></label>
          <div class="mk-builder__list" data-list="give"></div>
        </section>
        <section class="mk-builder__col" data-col="get">
          <h3><span>You get</span><span class="num" data-total="get">$0.00</span></h3>
          <div class="mk-builder__list" data-list="get"></div>
        </section>
      </div>
      <div class="mk-builder__cash">
        <div class="seg" role="group" aria-label="Cash">
          <button class="chip" type="button" data-cash="none">No cash</button>
          <button class="chip" type="button" data-cash="add">I add cash</button>
          <button class="chip" type="button" data-cash="ask">I ask for cash</button>
        </div>
        <label class="mk-money mk-builder__amount"
          ><span>$</span
          ><input
            class="field"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            value="${cash ? cash.toFixed(2) : ''}"
            placeholder="0.00"
            aria-label="Cash amount"
        /></label>
      </div>
      <footer class="mk-builder__foot">
        <div class="mk-meter" aria-live="polite">
          <div class="mk-meter__bar"><i></i></div>
          <p class="mk-meter__text"></p>
        </div>
        <button class="btn btn--primary mk-builder__send" type="button">
          ${raw(icon('trade', { size: 18 }))}Send trade
        </button>
      </footer>`;

    const amount = $('.mk-builder__amount input', node);
    const listGive = $('[data-list="give"]', node);
    const listGet = $('[data-list="get"]', node);

    const paintLists = () => {
      const st = session.state;
      const vault = st.vault
        .filter((v) => !q || cardOf(v.id).name.toLowerCase().includes(q))
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, 60);
      listGive.innerHTML = picker(
        vault,
        give,
        MAX_SIDE,
        st.vault.length ? 'No cards match.' : 'Your Vault is empty: you can still offer cash.',
      );
      listGet.innerHTML = picker(
        market
          .inventory(st, handle)
          .slice()
          .sort((a, b) => b.value - a.value),
        get,
        MAX_SIDE,
        `@${handle} has nothing to trade right now.`,
      );
    };

    const terms = () => ({
      give: [...give],
      get: [...get],
      cashGive: cashMode === 'add' ? parseFloat(amount.value) || 0 : 0,
      cashGet: cashMode === 'ask' ? parseFloat(amount.value) || 0 : 0,
    });

    const paintMeter = () => {
      const st = session.state;
      $$('[data-cash]', node).forEach((b) => {
        const on = b.dataset.cash === cashMode;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      amount.closest('.mk-builder__amount').hidden = cashMode === 'none';
      const t = terms();
      const e = market.evaluateTrade(st, handle, t);
      $('[data-total="give"]', node).textContent = usd(e.giveValue);
      $('[data-total="get"]', node).textContent = usd(e.getValue);
      const pct = Math.max(0, Math.min(1, e.ratio / 1.3));
      const meter = $('.mk-meter', node);
      meter.dataset.verdict = e.verdict;
      $('.mk-meter__bar i', node).style.transform = `scaleX(${e.verdict === 'empty' ? 0 : pct.toFixed(3)})`;
      const text = {
        empty: 'Pick what you’d give and what you want.',
        great: 'A sure yes: they’ll take this.',
        fair: 'Likely yes.',
        close: 'Close: they’ll likely counter and ask for a bit more.',
        unlikely: 'Lopsided: they’ll probably pass.',
      }[e.verdict];
      const p = $('.mk-meter__text', node);
      p.innerHTML = html`${text}${
        e.verdict !== 'empty' && e.verdict !== 'great' && e.short && cashMode !== 'ask'
          ? raw(
              html` <button class="mk-meter__fix" type="button" data-fix="${e.short}">
                Add ${usd(e.short)} for a sure yes
              </button>`,
            )
          : ''
      }`;
      const send = $('.mk-builder__send', node);
      const okShape = (t.give.length || t.cashGive) && (t.get.length || t.cashGet) && (t.give.length || t.get.length);
      send.disabled = !okShape;
    };

    paintLists();
    paintMeter();

    node.addEventListener('click', (e) => {
      const pk = e.target.closest('[data-pick]');
      if (pk) {
        const list = pk.closest('[data-list]');
        const set = list.dataset.list === 'give' ? give : get;
        const id = pk.dataset.pick;
        if (set.has(id)) set.delete(id);
        else if (set.size < MAX_SIDE) set.add(id);
        syncPicker(list, set, MAX_SIDE);
        paintMeter();
        return;
      }
      const cm = e.target.closest('[data-cash]');
      if (cm) {
        cashMode = cm.dataset.cash;
        if (cashMode === 'none') amount.value = '';
        paintMeter();
        if (cashMode !== 'none') amount.focus();
        return;
      }
      const fix = e.target.closest('[data-fix]');
      if (fix) {
        const add = +fix.dataset.fix;
        cashMode = 'add';
        amount.value = ((parseFloat(amount.value) || 0) + add).toFixed(2);
        paintMeter();
        return;
      }
      if (e.target.closest('.mk-builder__send')) {
        const r = marketDo((st) => market.proposeTrade(st, handle, { ...terms(), replaces: preset.replaces || null }));
        if (!r.ok) return toast(errorText(r, 'trade'));
        toast(`Trade sent to @${handle}: they’ll answer in a few seconds`);
        close();
        if (tab !== 'trade') setTab('trade');
      }
    });
    amount.addEventListener('input', paintMeter);
    $('.mk-builder__search input', node).addEventListener('input', (e) => {
      q = e.target.value.trim().toLowerCase();
      paintLists();
    });
  }

  // ---- the sell flow ----

  function openSell(preset = []) {
    const s = session.state;
    if (!s) return openAuth('login');
    const chosen = new Set(preset.filter((u) => s.vault.some((v) => v.uid === u)));
    let kind = 'fixed';
    let duration = '5m';
    let q = '';
    const node = el('<div class="mk-sell"></div>');
    const close = track(openDialog(node, { label: 'List cards', className: 'overlay--builder' }));
    node.innerHTML = html`<header class="mk-builder__head">
        <span class="mk-sell__icon">${raw(icon('tag', { size: 22 }))}</span>
        <div>
          <h2>List on the Market</h2>
          <p class="mk-hint">Pick up to ${MAX_BUNDLE} cards. More than one sells as a bundle.</p>
        </div>
        <button class="dialog__close" type="button" data-close>Close</button>
      </header>
      <label class="search mk-builder__search"
        ><span class="sr">Search your cards</span>${raw(icon('search', { size: 16 }))}<input
          type="search"
          placeholder="Search your Vault"
      /></label>
      <div class="mk-builder__list mk-sell__list"></div>
      <div class="mk-sell__form">
        <div class="seg" role="group" aria-label="How to sell">
          <button class="chip is-on" type="button" data-kind="fixed" aria-pressed="true">Fixed price</button>
          <button class="chip" type="button" data-kind="auction" aria-pressed="false">Auction</button>
        </div>
        <div class="mk-sell__fixed">
          <label class="mk-field"
            ><span class="label-caps">Price</span
            ><span class="mk-money"
              ><span>$</span
              ><input class="field" name="price" type="number" inputmode="decimal" step="0.01" min="0.5" /></span
          ></label>
          <div class="mk-quick" data-suggest></div>
        </div>
        <div class="mk-sell__auction" hidden>
          <div class="mk-sell__row">
            <label class="mk-field"
              ><span class="label-caps">Starting bid</span
              ><span class="mk-money"
                ><span>$</span
                ><input class="field" name="start" type="number" inputmode="decimal" step="0.01" min="0.5" /></span
            ></label>
            <div class="mk-field">
              <span class="label-caps">Ends in</span>
              <div class="seg mk-durations">
                ${raw(DURATIONS.map((d) => `<button class="chip${d.id === duration ? ' is-on' : ''}" type="button" data-duration="${d.id}">${d.label}</button>`).join(''))}
              </div>
            </div>
          </div>
          <div class="mk-sell__row">
            <label class="mk-field"
              ><span class="label-caps">Reserve (optional)</span
              ><span class="mk-money"
                ><span>$</span
                ><input
                  class="field"
                  name="reserve"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0.5"
                  placeholder="None" /></span
            ></label>
            <label class="mk-field"
              ><span class="label-caps">Buy now (optional)</span
              ><span class="mk-money"
                ><span>$</span
                ><input
                  class="field"
                  name="buyNow"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0.5"
                  placeholder="None" /></span
            ></label>
          </div>
        </div>
        <dl class="mk-quote"></dl>
        <p class="mk-note" data-hint></p>
        <p class="mk-error" role="alert" hidden></p>
        <button class="btn btn--buy mk-sell__go" type="button" disabled>List card</button>
      </div>`;

    const list = $('.mk-sell__list', node);
    const field = (n) => $(`[name="${n}"]`, node);
    const err = $('.mk-error', node);
    let touched = false;

    const items = () => session.state.vault.filter((v) => chosen.has(v.uid));
    const paintList = () => {
      const st = session.state;
      const vault = st.vault
        .filter((v) => chosen.has(v.uid) || !q || cardOf(v.id).name.toLowerCase().includes(q))
        .slice()
        .sort((a, b) => (chosen.has(b.uid) ? 1 : 0) - (chosen.has(a.uid) ? 1 : 0) || b.value - a.value)
        .slice(0, 60);
      list.innerHTML = picker(
        vault,
        chosen,
        MAX_BUNDLE,
        st.vault.length ? 'No cards match.' : 'Your Vault is empty. Open a pack first.',
      );
    };
    const suggest = () => {
      const v = valueOf(items());
      if (!v) return;
      if (!touched) {
        field('price').value = nice(v).toFixed(2);
        field('start').value = nice(v * 0.6).toFixed(2);
      }
      $('[data-suggest]', node).innerHTML = [
        ['Quick sale', 0.95],
        ['Market', 1],
        ['Patient', 1.15],
      ]
        .map(
          ([l, k]) => `<button class="chip" type="button" data-set="${nice(v * k)}">${l} ${usd(nice(v * k))}</button>`,
        )
        .join('');
    };
    const paintQuote = () => {
      const its = items();
      const v = valueOf(its);
      const go = $('.mk-sell__go', node);
      err.hidden = true;
      if (!its.length) {
        $('.mk-quote', node).innerHTML = '';
        $('[data-hint]', node).textContent = 'Pick the cards you want to sell.';
        go.disabled = true;
        go.textContent = 'List card';
        return;
      }
      const amt = kind === 'fixed' ? parseFloat(field('price').value) || 0 : parseFloat(field('start').value) || 0;
      $('.mk-quote', node).innerHTML = html`<div>
          <dt>Market value</dt>
          <dd class="num">${usd(v)}</dd>
        </div>
        <div>
          <dt>${kind === 'fixed' ? 'Your price' : 'Starting bid'}</dt>
          <dd class="num">${usd(amt)}</dd>
        </div>
        <div>
          <dt>Fee (${Math.round(FEE * 100)}%)</dt>
          <dd class="num">−${usd(amt * FEE)}</dd>
        </div>
        <div class="is-net">
          <dt>${kind === 'fixed' ? 'You receive' : 'You receive at least'}</dt>
          <dd class="num">${usd(amt * (1 - FEE))}</dd>
        </div>`;
      const ratio = amt / v;
      $('[data-hint]', node).textContent =
        kind === 'fixed'
          ? ratio <= 1.1
            ? 'Priced to sell: collectors usually snap these up within a minute or two.'
            : ratio <= 1.25
              ? 'A little over value: it should sell in a while, or draw offers.'
              : 'Well over value: it may sit. Expect offers rather than sales.'
          : 'Bids come in faster near the end. A bid in the last 30 seconds adds time.';
      go.disabled = !(amt >= 0.5);
      go.textContent =
        its.length > 1 ? `List bundle of ${its.length}` : kind === 'fixed' ? `List for ${usd(amt)}` : 'Start auction';
    };

    paintList();
    suggest();
    paintQuote();

    node.addEventListener('click', (e) => {
      const pk = e.target.closest('[data-pick]');
      if (pk) {
        const id = pk.dataset.pick;
        if (chosen.has(id)) chosen.delete(id);
        else if (chosen.size < MAX_BUNDLE) chosen.add(id);
        syncPicker(list, chosen, MAX_BUNDLE);
        suggest();
        paintQuote();
        return;
      }
      const k = e.target.closest('[data-kind]');
      if (k) {
        kind = k.dataset.kind;
        $$('[data-kind]', node).forEach((b) => {
          b.classList.toggle('is-on', b === k);
          b.setAttribute('aria-pressed', String(b === k));
        });
        $('.mk-sell__fixed', node).hidden = kind !== 'fixed';
        $('.mk-sell__auction', node).hidden = kind !== 'auction';
        paintQuote();
        return;
      }
      const d = e.target.closest('[data-duration]');
      if (d) {
        duration = d.dataset.duration;
        $$('[data-duration]', node).forEach((b) => b.classList.toggle('is-on', b === d));
        return;
      }
      const set = e.target.closest('[data-set]');
      if (set) {
        field('price').value = (+set.dataset.set).toFixed(2);
        touched = true;
        paintQuote();
        return;
      }
      if (e.target.closest('.mk-sell__go')) {
        const num = (n) => (field(n).value === '' ? null : parseFloat(field(n).value));
        const its = items();
        const r = marketDo((st) =>
          market.list(st, {
            uids: its.map((x) => x.uid),
            kind,
            price: num('price'),
            start: num('start'),
            duration,
            reserve: num('reserve'),
            buyNow: num('buyNow'),
          }),
        );
        if (!r.ok) {
          err.hidden = false;
          err.textContent = r.error === 'buyNow' ? 'Buy now has to be above the starting bid.' : errorText(r);
          return;
        }
        toast(
          kind === 'fixed'
            ? `Listed ${market.titleOf(r.listing.items)} for ${usd(r.listing.price)}`
            : `Auction started for ${market.titleOf(r.listing.items)}`,
        );
        close();
        if (tab !== 'selling') setTab('selling');
      }
    });
    node.addEventListener('input', (e) => {
      if (e.target.name === 'price') touched = true;
      if (e.target.matches('.mk-builder__search input')) {
        q = e.target.value.trim().toLowerCase();
        paintList();
        return;
      }
      paintQuote();
    });
  }

  // ---- live updates ----

  const paintAll = () => {
    paintPulse();
    paintPanel();
  };
  if (qs.get('sell') != null) tab = 'selling';
  if (qs.get('with')) tab = 'trade';
  setTab(tab);
  paintPulse();
  requestAnimationFrame(moveBar);
  scope.on(window, 'resize', moveBar);
  scope.add(session.on(() => session.signedIn && paintAll()));

  // Countdowns tick in place, once a second.
  scope.timer(() => {
    const now = Date.now();
    $$('[data-ends]').forEach((n) => {
      const left = +n.dataset.ends - now;
      n.textContent = countdown(left);
      const badge = n.closest('.mk-badge, .mk-clock');
      if (badge) badge.classList.toggle('is-soon', left < 60000);
    });
  }, 1000);

  // Deep links and hand-offs from other pages.
  if (params.listing) openListing(params.listing);
  else if (params.trade) openTrade(params.trade);
  else if (qs.get('sell') != null) {
    openSell(qs.get('sell') ? [qs.get('sell')] : []);
    syncUrl();
  } else if (qs.get('with')) {
    openBuilder(qs.get('with'));
    syncUrl();
  }
}
