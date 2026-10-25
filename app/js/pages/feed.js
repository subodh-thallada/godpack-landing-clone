// Feed: All (everyone's pulls, yours included), Following (pulls from the
// collectors you follow), Battles (finished battles with replays) and
// Leaderboard (best pulls / volume). @names link to profiles.
import { icon } from '../ui/icons.js';
import { html, raw, el, $, $$, reducedMotion } from '../ui/dom.js';
import { viewHead } from '../main.js';
import { PACKS, CARDS, USERS, pullsFor, pullsOf, profileOf, cardArt, slabArt, money, seeded, user } from '../data.js';
import { openInspect, openDialog } from '../ui/dialogs.js';
import { session, settleBattle, myPulls, toggleFollow, postChat } from '../session.js';

export const title = 'Feed';

const TABS = ['All', 'Following', 'Battles', 'Leaderboard'];
const short = (m) => (m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`);
const avatar = (u, size = 24) =>
  `<span class="avatar" style="width:${size}px;height:${size}px;background:${u.color}">${u.handle[0].toUpperCase()}</span>`;

export const profileHref = (u) => (u.self ? '/profile' : `/profile/${u.handle}`);

// A mixed timeline across all packs plus your own pulls, newest first.
function timeline() {
  const all = PACKS.flatMap((p, i) =>
    pullsFor(p, 8, 40 + i * 13).map((h) => ({ ...h, minutesAgo: h.minutesAgo * 2 + i })),
  );
  return [...myPulls(), ...all].sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, 30);
}

// Pulls from the collectors you follow, newest first.
function followingTimeline() {
  const s = session.state;
  if (!s) return [];
  return s.following
    .flatMap((h) => pullsOf(h, 6))
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 30);
}

function post(h, latest) {
  const packName = PACKS.find((p) => p.id === h.pack).name;
  const slab = h.pack === 'master' || h.pack === 'arena';
  return html`<li>
    <article class="post tier-${h.tier === 'common' ? 'base' : h.tier}${latest ? ' is-latest' : ''}">
      <button class="post__art" type="button" aria-label="Inspect ${h.card.name}">
        <span class="thumb${slab ? ' is-slab' : ''}"
          ><img src="${slab ? slabArt(h.card.id) : cardArt(h.card.id, 'small')}" alt="" loading="lazy"
        /></span>
      </button>
      <div class="post__meta">
        <a class="post__who" href="${profileHref(h.user)}" data-link
          >${raw(avatar(h.user))}<span>@${h.user.handle}</span>${h.user.self ? raw('<span class="post__you">You</span>') : ''}</a
        >
        <span class="post__verb">pulled</span>
        <div class="post__when">
          ${latest ? raw('<span class="post__badge">Latest pull</span>') : ''}
          <time>${short(h.minutesAgo)}</time>
          <button class="icon-btn post__share" type="button" aria-label="Share pull">
            ${raw(icon('share', { size: 18 }))}
          </button>
        </div>
      </div>
      <div class="post__text">
        <strong>${h.card.name}</strong>
        <span class="post__sub"
          >${slab ? 'Graded · ' + h.card.grade : 'Raw · NM'} · <a href="/packs" data-link>${packName}</a></span
        >
      </div>
      <div class="post__value">
        <span class="label-caps">Pull value</span><strong class="num">${money(h.value, { compact: true })}</strong>
      </div>
    </article>
  </li>`;
}

function battles() {
  const r = seeded(91);
  return Array.from({ length: 9 }, (_, i) => {
    const pack = PACKS[Math.floor(r() * 3)];
    const each = 1 + Math.floor(r() * 4);
    const a = USERS[Math.floor(r() * USERS.length)];
    let b = USERS[Math.floor(r() * USERS.length)];
    if (b === a) b = USERS[(USERS.indexOf(a) + 3) % USERS.length];
    return { pack, each, a, b, lowest: r() < 0.25, minutes: 20 + i * 7 + Math.floor(r() * 5), seed: 200 + i };
  });
}

function battleRow(bt, i) {
  return html`<li style="--n:${i}">
    <div class="bt">
      <a class="bt__side" href="/profile/${bt.a.handle}" data-link
        >${raw(avatar(bt.a, 32))}<span>@${bt.a.handle}</span></a
      >
      <span class="bt__vs">vs</span>
      <a class="bt__side" href="/profile/${bt.b.handle}" data-link
        >${raw(avatar(bt.b, 32))}<span>@${bt.b.handle}</span></a
      >
      <span class="bt__info"
        ><strong
          >${bt.pack.name} · ${bt.each} pack${bt.each > 1 ? 's' : ''} each${bt.lowest ? ' · Lowest wins' : ''}</strong
        ><span>$${bt.pack.price * bt.each} each · ${bt.minutes}m ago</span></span
      >
      <span class="bt__actions"
        ><button class="btn btn--secondary btn--sm bt__share" type="button">Share</button
        ><button class="btn btn--primary btn--sm bt__replay" type="button" data-i="${i}">Replay</button></span
      >
    </div>
  </li>`;
}

function leaders(range, mode) {
  const r = seeded(500 + range * 7 + (mode === 'volume' ? 99 : 0));
  return Array.from({ length: 12 }, () => {
    const u = USERS[Math.floor(r() * USERS.length)];
    const card = CARDS[Math.floor(r() * CARDS.length)];
    return { u, card, mult: Math.round(48 - r() * 30), volume: Math.round(20000 * Math.pow(r(), 1.5)) };
  }).sort((a, b) => (mode === 'volume' ? b.volume - a.volume : b.mult - a.mult));
}

function leaderRow(l, i, mode) {
  const medal =
    i < 3
      ? `<span class="medal medal--${['gold', 'silver', 'bronze'][i]}">${i + 1}</span>`
      : `<span class="rank num">${i + 1}</span>`;
  const right =
    mode === 'volume'
      ? `<span class="lb__score"><strong class="num">$${l.volume.toLocaleString('en-US')}</strong><span class="label-caps">Opened</span></span>`
      : `<span class="lb__score"><strong class="num">${l.mult}×</strong><span class="label-caps">Card / pack</span></span><span class="thumb lb__card"><img src="${cardArt(l.card.id, 'small')}" alt="" loading="lazy"></span>`;
  return html`<li style="--n:${i}">
    <div class="lb">
      ${raw(medal)}${raw(avatar(l.u, 36))}<a class="lb__who" href="/profile/${l.u.handle}" data-link
        ><strong>@${l.u.handle}</strong><span>${mode === 'volume' ? 'Packs opened' : l.card.name}</span></a
      >${raw(right)}
    </div>
  </li>`;
}

export function mount(view, { scope, openAuth, toast, params: routeParams = {} }) {
  const params = new URLSearchParams(location.search);
  let tab = Math.max(
    0,
    TABS.findIndex((t) => t.toLowerCase() === (routeParams.tab || params.get('tab') || 'all')),
  );
  if (tab === 1 && !session.signedIn) tab = 0;

  view.innerHTML = html` ${raw(viewHead('Feed'))}
    <div class="tabs" role="tablist" aria-label="Feed">
      ${raw(TABS.map((t, i) => `<button role="tab" type="button" id="feed-tab-${t.toLowerCase()}" aria-selected="${i === tab}" tabindex="${i === tab ? 0 : -1}">${t}</button>`).join(''))}
      <span class="tabs__bar" aria-hidden="true"></span>
    </div>
    <div class="feed-panel" role="tabpanel"></div>`;

  const panel = $('.feed-panel', view);
  const bar = $('.tabs__bar', view);
  const tabs = $$('[role=tab]', view);
  let data = timeline();
  let feedTimer = 0;

  const moveBar = () => {
    const t = tabs[tab];
    bar.style.width = t.offsetWidth + 'px';
    bar.style.transform = `translateX(${t.offsetLeft}px)`;
  };

  function showAll() {
    panel.innerHTML = html`<section class="day">
      <h2 class="day__label">Today</h2>
      <ol class="posts">
        ${raw(data.map((h, i) => post(h, i === 0)).join(''))}
      </ol>
    </section>`;
    wirePosts($('.posts', panel), () => data);
  }

  // Inspect a pull, or share it (copy a link or post it to Global Chat).
  function wirePosts(list, items) {
    list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const h = items()[[...list.children].indexOf(li)];
      const share = e.target.closest('.post__share');
      if (share) {
        shareMenu(share, h, { toast, openAuth });
        return;
      }
      if (e.target.closest('.post__art')) openInspect(h);
    });
  }

  function showBattles() {
    const list = battles();
    panel.innerHTML = html`<section class="day">
      <div class="day__head">
        <h2 class="day__label">Today</h2>
        <button class="day__refresh" type="button">Refresh</button>
      </div>
      <ol class="bts">
        ${raw(list.map(battleRow).join(''))}
      </ol>
    </section>`;
    $('.day__refresh', panel).addEventListener('click', () => {
      showBattles();
      toast('Up to date');
    });
    $('.bts', panel).addEventListener('click', (e) => {
      if (e.target.closest('.bt__share')) toast('Link copied');
      const b = e.target.closest('.bt__replay');
      if (b) replayBattle(list[+b.dataset.i]);
    });
  }

  function showLeaderboard() {
    let mode = 'best',
      range = 1;
    const ranges = ['1 hour', '1 day', '7 days', '1 month', 'All time'];
    panel.innerHTML = html`<div class="lb-tools">
        <div class="seg" role="group" aria-label="Ranking">
          <button class="chip is-on" type="button" data-mode="best" aria-pressed="true">Best pulls</button>
          <button class="chip" type="button" data-mode="volume" aria-pressed="false">Volume</button>
        </div>
        <div class="seg" role="group" aria-label="Time range">
          ${raw(ranges.map((r, i) => `<button class="chip${i === range ? ' is-on' : ''}" type="button" data-range="${i}" aria-pressed="${i === range}">${r}</button>`).join(''))}
        </div>
      </div>
      <ol class="lbs"></ol>`;
    const paint = () => {
      $('.lbs', panel).innerHTML = leaders(range, mode)
        .map((l, i) => leaderRow(l, i, mode))
        .join('');
    };
    panel.addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      if (c.dataset.mode) mode = c.dataset.mode;
      if (c.dataset.range) range = +c.dataset.range;
      $$('.chip', c.parentElement).forEach((x) => {
        x.classList.toggle('is-on', x === c);
        x.setAttribute('aria-pressed', String(x === c));
      });
      paint();
    });
    paint();
  }

  function showFollowing() {
    const items = followingTimeline();
    const s = session.state;
    const suggest = USERS.filter((u) => !s.following.includes(u.handle)).slice(0, 5);
    const suggestions = html`<section class="suggest surface">
      <h3>Collectors to follow</h3>
      <ul>
        ${raw(
          suggest
            .map((u) => {
              const p = profileOf(u.handle);
              return `<li><a class="suggest__who" href="/profile/${u.handle}" data-link>${avatar(u, 36)}<span><strong>@${u.handle}</strong><span>${p.bio}</span></span></a><button class="btn btn--primary btn--sm suggest__follow" type="button" data-h="${u.handle}">Follow</button></li>`;
            })
            .join(''),
        )}
      </ul>
    </section>`;
    const count = s.following.length;
    panel.innerHTML = items.length
      ? html`<section class="day">
            <h2 class="day__label">Following ${count} ${count === 1 ? 'collector' : 'collectors'}</h2>
            <ol class="posts">
              ${raw(items.map((h, i) => post(h, i === 0)).join(''))}
            </ol>
          </section>
          ${raw(suggest.length ? suggestions : '')}`
      : html`<div class="empty surface feed-empty">
            ${raw(icon('feed', { size: 28 }))}
            <h3>No activity from people you follow yet</h3>
            <p>Follow collectors from their profiles and their pulls will show up here.</p>
          </div>
          ${raw(suggestions)}`;
    const list = $('.posts', panel);
    if (list) wirePosts(list, () => items);
  }

  // "Collectors to follow" buttons (Following tab only).
  scope.on(panel, 'click', (e) => {
    const b = e.target.closest('.suggest__follow');
    if (!b || tab !== 1) return;
    toggleFollow(b.dataset.h);
    toast(`Following @${b.dataset.h}`);
    showFollowing();
  });

  function select(i, push = true) {
    if (i === 1 && !session.signedIn) {
      openAuth('login');
      return;
    }
    tab = i;
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    moveBar();
    panel.classList.remove('is-in');
    void panel.offsetWidth;
    panel.classList.add('is-in');
    [showAll, showFollowing, showBattles, showLeaderboard][i]();
    if (push)
      history.replaceState(
        {},
        '',
        i === 0 ? '/feed' : i === 1 ? '/feed/following' : `/feed?tab=${TABS[i].toLowerCase()}`,
      );
  }

  tabs.forEach((t, i) => scope.on(t, 'click', () => select(i)));
  scope.on($('.tabs', view), 'keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    let n = tab + (e.key === 'ArrowRight' ? 1 : -1);
    if (n === 1) n += e.key === 'ArrowRight' ? 1 : -1;
    n = (n + TABS.length) % TABS.length;
    select(n);
    tabs[n].focus();
  });
  scope.on(window, 'resize', moveBar);
  requestAnimationFrame(moveBar);
  select(tab, false);

  // New pulls slide in at the top of All.
  if (!reducedMotion()) {
    let seed = 900;
    feedTimer = scope.timer(() => {
      if (tab !== 0) return;
      const pack = PACKS[Math.floor(Math.random() * 2)];
      const h = { ...pullsFor(pack, 1, seed++)[0], minutesAgo: 0 };
      data = [h, ...data].slice(0, 30);
      const list = $('.posts', panel);
      if (!list) return;
      const old = list.querySelector('.is-latest');
      if (old) {
        old.classList.remove('is-latest');
        const badge = old.querySelector('.post__badge');
        if (badge) badge.remove();
      }
      const li = el(post(h, true));
      li.classList.add('is-new');
      list.prepend(li);
      if (list.children.length > 30) list.lastElementChild.remove();
    }, 9000);
  }
}

// A small popover under a post's share button.
export function shareMenu(anchor, h, { toast, openAuth }) {
  document.querySelectorAll('.share-menu').forEach((m) => m.remove());
  const menu = el(
    html`<div class="share-menu" role="menu">
      <button type="button" role="menuitem" data-share="link">${raw(icon('copy', { size: 16 }))}Copy link</button>
      <button type="button" role="menuitem" data-share="chat">
        ${raw(icon('chat', { size: 16 }))}Share to Global Chat
      </button>
    </div>`,
  );
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + 6}px`;
  menu.style.left = `${Math.max(8, r.right - menu.offsetWidth)}px`;
  const outside = (e) => {
    if (!menu.contains(e.target)) close();
  };
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', outside, true);
  };
  setTimeout(() => document.addEventListener('pointerdown', outside, true));
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-share]');
    if (!b) return;
    close();
    if (b.dataset.share === 'link') {
      if (navigator.clipboard) navigator.clipboard.writeText(`${location.origin}/feed`).catch(() => {});
      toast('Link copied');
      return;
    }
    if (!session.signedIn) return openAuth('login');
    postChat({ type: 'pull', card: h.card.id, value: h.value, pack: h.pack, by: h.user.handle });
    toast('Shared to Global Chat');
  });
}

// Battle replay: both sides' cards turn over one by one, totals count up,
// and the winner is crowned. With `mine`, side A is the demo account and a
// win moves every card into its vault.
export function replayBattle(bt) {
  if (bt.mine) {
    const me = session.state;
    const opp = bt.opponent ? user(bt.opponent) : USERS[Math.floor(Math.random() * USERS.length)];
    bt = {
      ...bt,
      a: { handle: me.handle, color: me.color },
      b: opp,
      lowest: !!bt.lowest,
      seed: Math.floor(Math.random() * 1e6),
    };
  }
  const r = seeded(bt.seed);
  const draw = () =>
    Array.from({ length: bt.each }, () => ({
      card: CARDS[Math.floor(r() * CARDS.length)],
      value: bt.pack.range[0] + (bt.pack.price * 2.2 - bt.pack.range[0]) * Math.pow(r(), 1.7),
    }));
  const A = draw(),
    B = draw();
  const sum = (xs) => xs.reduce((s, x) => s + x.value, 0);
  const aWins = bt.lowest ? sum(A) < sum(B) : sum(A) > sum(B);
  const side = (u, cards, cls) =>
    html`<div class="rp__side ${cls}">
      <div class="rp__who">${raw(avatar(u, 32))}<strong>@${u.handle}</strong></div>
      <div class="rp__cards">
        ${raw(cards.map((c, i) => `<div class="rp__card" style="--n:${i}"><div class="rp__flip"><span class="rp__back"></span><img src="${cardArt(c.card.id, 'small')}" alt="${c.card.name}"></div><span class="rp__val num">${money(c.value)}</span></div>`).join(''))}
      </div>
      <div class="rp__total">
        <span class="label-caps">Total</span><strong class="num" data-total="${sum(cards).toFixed(2)}">$0.00</strong>
      </div>
    </div>`;
  const node = el(
    html`<div class="rp">
      <div class="odds__head">
        <h2>${bt.pack.name} battle${bt.lowest ? ' · Lowest wins' : ''}</h2>
        <button class="dialog__close" type="button" data-close>Close</button>
      </div>
      <div class="rp__arena">
        ${raw(side(bt.a, A, aWins ? 'is-win' : 'is-lose'))}<span class="rp__vs">VS</span
        >${raw(side(bt.b, B, aWins ? 'is-lose' : 'is-win'))}
      </div>
      <p class="rp__result">@${aWins ? bt.a.handle : bt.b.handle} takes all ${bt.each * 2} cards</p>
    </div>`,
  );
  openDialog(node, { label: 'Battle replay', className: 'overlay--replay' });
  const cards = $$('.rp__card', node);
  const order = [];
  for (let i = 0; i < bt.each; i++) order.push(cards[i], cards[bt.each + i]);
  order.forEach((c, k) => setTimeout(() => c.classList.add('is-shown'), 500 + k * 420));
  const done = 500 + order.length * 420 + 300;
  $$('[data-total]', node).forEach((t) => {
    const target = +t.dataset.total,
      t0 = performance.now() + done - 700;
    const step = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 700));
      t.textContent = money(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && node.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  setTimeout(() => {
    node.classList.add('is-done');
    if (!bt.mine) return;
    const cards = [...A, ...B].map((c) => ({ ...c, graded: bt.pack.slabs, pack: bt.pack.id }));
    settleBattle(bt.id, { won: aWins, cards, opponent: bt.b.handle });
  }, done + 200);
}
