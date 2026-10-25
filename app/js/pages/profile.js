// Profiles.
//   /profile          your own: stats, actions, the portfolio card (value,
//                     change, range chips, chart with a hover crosshair),
//                     pack activity and the vaulted grid.
//   /profile/:handle  another collector: bio, stats, Follow / Following,
//                     Share, and their collection.
// Followers / Following open the Connections dialog.
import { icon } from '../ui/icons.js';
import { html, raw, el, $, $$ } from '../ui/dom.js';
import { viewHead, avatarOf, navigate as go } from '../main.js';
import { cardArt, slabArt, money, USERS, profileOf, pullsOf, seeded } from '../data.js';
import {
  session,
  cardOf,
  vaultValue,
  portfolioSeries,
  toggleFollow,
  isFollowing,
  market,
  marketOf,
} from '../session.js';
import { openDialog, openInspect } from '../ui/dialogs.js';

export const title = 'Profile';

const RANGES = ['1D', '7D', '1M', '3M', '1Y', 'All'];
const SORTS = ['Most recent', 'Value: high to low', 'Value: low to high'];

function fmtTime(t, range) {
  const d = new Date(t);
  if (range === '1D') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(range === '1Y' || range === 'All' ? { year: '2-digit' } : {}),
  });
}

function tileHtml(v, i) {
  const c = cardOf(v);
  const tier = v.tier === 'common' ? 'base' : v.tier;
  const graded = v.graded != null ? v.graded : v.pack === 'arena' || v.pack === 'master';
  return `<div class="vault-cell" style="--n:${i}"><button class="tile tile--vault tier-${tier}" type="button" data-uid="${v.uid}" aria-label="${c.name}, ${money(v.value)}"><span class="tile__art"><span class="thumb${graded ? ' is-slab' : ''} glow-${tier}"><img src="${graded ? slabArt(c.id) : cardArt(c.id, 'small')}" alt="" loading="lazy"></span></span><span class="tile__cap"><span class="tile__value num">${money(v.value)}</span><span class="tile__name">${c.name}</span></span></button></div>`;
}

const sortList = (list, sort) => {
  const out = list.slice();
  if (sort === SORTS[1]) out.sort((a, b) => b.value - a.value);
  if (sort === SORTS[2]) out.sort((a, b) => a.value - b.value);
  return out;
};

function sortMenu(view, scope, label, onPick) {
  const trigger = $('.sort__trigger', view),
    menu = $('.sort__menu', view);
  const closeMenu = () => {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  scope.on(trigger, 'click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    trigger.setAttribute('aria-expanded', String(!menu.hidden));
  });
  scope.on(menu, 'click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    $$('li', menu).forEach((x) => x.setAttribute('aria-selected', String(x === li)));
    $('.sort__value', view).textContent = li.textContent;
    closeMenu();
    onPick(li.textContent);
  });
  scope.on(document, 'click', (e) => {
    if (!e.target.closest('.sort')) closeMenu();
  });
}

const sortMarkup = (first) =>
  html`<div class="sort">
    <button class="sort__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
      <span class="label-caps">Sort</span
      ><span class="sort__value">${first}</span>${raw(icon('chevronDown', { size: 16 }))}
    </button>
    <ul class="sort__menu" role="listbox" hidden>
      ${raw(SORTS.map((s, i) => `<li role="option" tabindex="-1" aria-selected="${i === 0}">${s}</li>`).join(''))}
    </ul>
  </div>`;

// ---------------------------------------------------------------- connections

// Who follows / is followed by `handle`. Yours come from the session; other
// collectors get a stable sample of the invented community.
function connectionsOf(handle) {
  const me = session.state;
  if (me && handle === me.handle) return { followers: me.followers, following: me.following };
  const r = seeded(handle.length * 131 + handle.charCodeAt(0));
  const others = USERS.map((u) => u.handle).filter((h) => h !== handle);
  const pick = (n) => others.filter(() => r() < n / others.length).slice(0, n);
  const followers = pick(5);
  if (me && isFollowing(handle) && !followers.includes(me.handle)) followers.unshift(me.handle);
  return { followers, following: pick(4) };
}

export function openConnections(handle, tab, { openAuth, toast }) {
  let current = tab;
  const node = el(
    html`<div class="conn">
      <div class="odds__head">
        <h2>Connections</h2>
        <button class="icon-btn conn__close" type="button" aria-label="Close" data-close>
          ${raw(icon('close', { size: 18 }))}
        </button>
      </div>
      <div class="tabs conn__tabs" role="tablist">
        <button role="tab" type="button" data-tab="followers">Followers</button>
        <button role="tab" type="button" data-tab="following">Following</button>
        <span class="tabs__bar" aria-hidden="true"></span>
      </div>
      <ul class="conn__list"></ul>
    </div>`,
  );
  const close = openDialog(node, { label: 'Connections', className: 'overlay--people' });
  const list = $('.conn__list', node);
  const bar = $('.tabs__bar', node);
  const paint = () => {
    const me = session.state;
    $$('[role=tab]', node).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === current)));
    const active = $(`[data-tab="${current}"]`, node);
    bar.style.width = active.offsetWidth + 'px';
    bar.style.transform = `translateX(${active.offsetLeft}px)`;
    const people = connectionsOf(handle)[current];
    list.innerHTML = people.length
      ? people
          .map((h) => {
            const isMe = me && h === me.handle;
            const u = isMe
              ? { handle: me.handle, color: me.color, vip: 0 }
              : profileOf(h) || { handle: h, color: '#555', vip: 0 };
            const following = isFollowing(h);
            return `<li><a class="conn__who" href="/profile/${h}" data-link>${avatarOf(u, 36)}<span><strong>@${h}</strong>${u.vip ? `<span class="badge-vip">VIP ${u.vip}</span>` : ''}${isMe ? '<span class="conn__you">You</span>' : ''}</span></a>${isMe ? '' : `<button class="btn btn--sm ${following ? 'btn--secondary' : 'btn--primary'} conn__follow" type="button" data-h="${h}">${following ? 'Following' : 'Follow'}</button>`}</li>`;
          })
          .join('')
      : `<li class="conn__empty muted">${current === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</li>`;
  };
  node.addEventListener('click', (e) => {
    const t = e.target.closest('[role=tab]');
    if (t) {
      current = t.dataset.tab;
      paint();
      return;
    }
    const f = e.target.closest('.conn__follow');
    if (f) {
      if (!session.signedIn) return openAuth('login');
      const now = toggleFollow(f.dataset.h);
      toast(now ? `Following @${f.dataset.h}` : `Unfollowed @${f.dataset.h}`);
      paint();
      return;
    }
    if (e.target.closest('.conn__who')) close();
  });
  requestAnimationFrame(paint);
}

// ---------------------------------------------------------------- mount

export function mount(view, ctx) {
  const me = session.state;
  const handle = ctx.params && ctx.params.handle;
  if (handle && (!me || handle !== me.handle)) return mountOther(view, ctx, handle);
  return mountMine(view, ctx);
}

function mountOther(view, { scope, openAuth, toast, navigate }, handle) {
  const p = profileOf(handle);
  if (!p) {
    view.innerHTML = html`${raw(viewHead('Profile'))}
      <div class="empty surface">
        <h3>Collector not found</h3>
        <p>@${handle} isn't part of this demo.</p>
      </div>`;
    return;
  }
  document.title = `@${handle}'s collection · Godpack app (unofficial recreation)`;
  const pulls = pullsOf(handle, 10);
  let sort = SORTS[0];

  view.innerHTML = html`${raw(
      viewHead(
        handle,
        `<span class="profile-handle">@${handle}</span>${p.bio ? `<span class="profile-bio">${p.bio}</span>` : ''}<span class="collector-stats"><span><strong class="num">${pulls.length.toLocaleString('en-US')}</strong> Vaulted</span><button type="button" data-list="followers"><strong class="num" data-followers>${p.followers + (isFollowing(handle) ? 1 : 0)}</strong> Followers</button><button type="button" data-list="following"><strong class="num">${p.following}</strong> Following</button><span><strong class="num">${p.packsOpened.toLocaleString('en-US')}</strong> Packs opened</span></span>`,
        { avatar: avatarOf(p, 72) },
      ),
    )}
    <div class="profile-actions">
      <button class="btn profile-follow" type="button"></button>
      <button class="btn btn--secondary" type="button" data-act="trade">
        ${raw(icon('trade', { size: 17 }))}Trade
      </button>
      <button class="btn btn--secondary" type="button" data-act="share">
        ${raw(icon('share', { size: 17 }))}Share profile
      </button>
    </div>
    <section class="profile-market" hidden>
      <div class="section-head"><h2 class="profile-vaulted__title">On the Market</h2></div>
      <div class="card-grid profile-market__grid"></div>
    </section>
    <div class="section-head profile-vaulted">
      <h2 class="profile-vaulted__title">Collection</h2>
      <div class="profile-vaulted__tools">${raw(sortMarkup('Recent'))}</div>
    </div>
    <div class="profile-grid"></div>`;
  if (p.vip)
    $('.view-title-row h1', view).insertAdjacentHTML('beforeend', ` <span class="badge-vip">VIP ${p.vip}</span>`);

  const follow = $('.profile-follow', view);
  const paintFollow = () => {
    const on = isFollowing(handle);
    follow.textContent = on ? 'Following' : 'Follow';
    follow.className = `btn profile-follow ${on ? 'btn--secondary' : 'btn--primary'}`;
    follow.setAttribute('aria-pressed', String(on));
    $('[data-followers]', view).textContent = p.followers + (on ? 1 : 0);
  };
  paintFollow();
  scope.on(follow, 'click', () => {
    if (!session.signedIn) return openAuth('login');
    const now = toggleFollow(handle);
    toast(now ? `Following @${handle} — their pulls will show in Following` : `Unfollowed @${handle}`);
    paintFollow();
  });
  scope.add(session.on(paintFollow));

  // Their live listings on the Market.
  const onMarket = $('.profile-market', view);
  const paintMarket = () => {
    if (!session.signedIn) return;
    marketOf();
    const list = market.browse(session.state, { seller: handle, sort: 'Newest' });
    onMarket.hidden = !list.length;
    $('.profile-market__grid', view).innerHTML = list
      .map((l, i) => {
        const it = l.items[0];
        const c = cardOf(it);
        const tier = it.tier === 'common' ? 'base' : it.tier;
        const label = l.items.length > 1 ? `${c.name} + ${l.items.length - 1} more` : c.name;
        return html`<div class="vault-cell" style="--n:${i}">
          <a
            class="tile tile--vault tier-${tier}"
            href="/market/l/${l.id}"
            data-link
            aria-label="${label}, ${money(l.price)}"
          >
            <span class="sale-timer">${l.kind === 'auction' ? 'Auction' : 'Buy now'}</span>
            <span class="tile__art"
              ><span class="thumb${it.graded ? ' is-slab' : ''} glow-${tier}"
                ><img src="${it.graded ? slabArt(c.id) : cardArt(c.id, 'small')}" alt="" loading="lazy" /></span
            ></span>
            <span class="tile__cap"
              ><span class="tile__value num">${money(l.price)}</span><span class="tile__name">${label}</span></span
            >
          </a>
        </div>`;
      })
      .join('');
  };
  paintMarket();

  const grid = $('.profile-grid', view);
  const paintGrid = () => {
    const list = sortList(pulls, sort);
    grid.innerHTML = `<div class="card-grid">${list.map(tileHtml).join('')}</div>`;
  };
  paintGrid();
  sortMenu(view, scope, 'Recent', (s) => {
    sort = s;
    paintGrid();
  });
  scope.on(grid, 'click', (e) => {
    const t = e.target.closest('.tile');
    if (t) openInspect(pulls.find((x) => x.uid === t.dataset.uid));
  });

  scope.on(view, 'click', (e) => {
    const b = e.target.closest('[data-list]');
    if (b) openConnections(handle, b.dataset.list, { openAuth, toast });
    if (e.target.closest('[data-act="trade"]')) {
      if (!session.signedIn) return openAuth('login');
      navigate(`/market?with=${handle}`);
      return;
    }
    if (e.target.closest('[data-act="share"]')) {
      if (navigator.clipboard) navigator.clipboard.writeText(`${location.origin}/profile/${handle}`).catch(() => {});
      toast('Profile link copied');
    }
  });
}

function mountMine(view, { scope, openAuth, toast, navigate }) {
  const me = session.state;
  if (!me) {
    view.innerHTML = html`${raw(viewHead('Profile'))}
      <div class="empty surface">
        ${raw(icon('feed', { size: 32 }))}
        <h3>Your profile</h3>
        <p>Log in to see your portfolio, pack activity and the cards you've vaulted.</p>
        <button class="btn btn--primary" type="button" data-auth="login" style="min-width:0;margin-top:6px">
          Log in
        </button>
      </div>`;
    return;
  }

  let range = '1D';
  let sort = SORTS[0];

  const stats = () =>
    `<span class="profile-stats">@${me.handle} · <strong class="num">${me.vault.length.toLocaleString('en-US')}</strong> Vaulted · <button class="link" type="button" data-list="followers"><strong class="num">${me.followers.length.toLocaleString('en-US')}</strong> ${me.followers.length === 1 ? 'Follower' : 'Followers'}</button> · <button class="link" type="button" data-list="following"><strong class="num">${me.following.length}</strong> Following</button></span>${me.bio ? `<span class="profile-bio">${me.bio}</span>` : ''}`;

  view.innerHTML = html` ${raw(viewHead(me.name, stats(), { avatar: avatarOf(me, 72) }))}
    <div class="profile-actions">
      <button class="btn btn--secondary" type="button" data-act="edit">
        ${raw(icon('pencil', { size: 17 }))}Edit profile
      </button>
      <button class="btn btn--secondary" type="button" data-act="share">
        ${raw(icon('share', { size: 17 }))}Share profile
      </button>
      <button class="btn btn--secondary" type="button" data-act="discord">
        ${raw(icon('chat', { size: 17 }))}Connect Discord
      </button>
      <button class="btn btn--ghost profile-logout" type="button" data-act="logout">
        ${raw(icon('logout', { size: 17 }))}<span>Log out</span>
      </button>
    </div>

    <section class="portfolio surface">
      <div class="portfolio__head">
        <div>
          <span class="label-caps">Portfolio</span>
          <strong class="portfolio__total num"></strong>
          <span class="portfolio__change num"></span>
          <span class="portfolio__split num"></span>
        </div>
        <div class="seg portfolio__ranges" role="group" aria-label="Chart range">
          ${raw(RANGES.map((r) => `<button class="chip${r === range ? ' is-on' : ''}" type="button" aria-pressed="${r === range}" data-r="${r}">${r}</button>`).join(''))}
        </div>
      </div>
      <div class="chart" aria-label="Portfolio value over time" role="img">
        <svg class="chart__svg" preserveAspectRatio="none"></svg>
        <div class="chart__tip" hidden></div>
      </div>
      <div class="chart__dates"><span></span><span></span></div>
      <div class="portfolio__activity">
        <h3>Pack activity</h3>
        <span class="label-caps">Past day</span>
      </div>
      <dl class="portfolio__stats">
        <div class="pstat pstat--opens">
          <dt>Packs opened</dt>
          <dd class="num">${me.opened.toLocaleString('en-US')}</dd>
        </div>
        <div class="pstat pstat--largest">
          <dt>Largest pull</dt>
          <dd>
            ${raw(me.largest ? `<span class="pstat__amount num">${money(me.largest.value)}</span><span class="pstat__note">${cardOf(me.largest).name}</span>` : '<span class="pstat__amount num">—</span><span class="pstat__note">No pulls this period</span>')}
          </dd>
        </div>
      </dl>
      <div class="portfolio__notes">
        <p>Cash + cards at daily value.</p>
        <p>Where a daily price isn't available, cards use their last recorded value.</p>
      </div>
    </section>

    <div class="section-head profile-vaulted">
      <h2 class="profile-vaulted__title">Vaulted</h2>
      <div class="profile-vaulted__tools">
        <a class="link" href="/vault" data-link>Manage Vault</a>
        ${raw(sortMarkup(SORTS[0]))}
      </div>
    </div>
    <div class="profile-grid"></div>`;

  // ---- portfolio chart ----
  const svg = $('.chart__svg', view);
  const tip = $('.chart__tip', view);
  const chartBox = $('.chart', view);
  let pts = [];

  function drawChart(animate) {
    pts = portfolioSeries(range);
    const W = chartBox.clientWidth || 800,
      H = 220;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const vals = pts.map((p) => p[1]);
    // Scale from zero so small moves read as small, as on the live chart.
    const lo = 0;
    const hi = Math.max(1, ...vals) * 1.06;
    const x = (i) => (i / (pts.length - 1)) * W;
    const y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('');
    const up = vals[vals.length - 1] >= vals[0];
    chartBox.classList.toggle('is-up', up);
    chartBox.classList.toggle('is-down', !up);
    svg.innerHTML = `<defs><linearGradient id="pf-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".2"/><stop offset="1" stop-color="currentColor" stop-opacity=".015"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75, 1].map((g) => `<line x1="0" x2="${W}" y1="${(H * g).toFixed(1)}" y2="${(H * g).toFixed(1)}" class="chart__grid"/>`).join('')}
      <path d="${line}L${W} ${H}L0 ${H}Z" fill="url(#pf-fill)" class="chart__area"/>
      <path d="${line}" class="chart__line" pathLength="1"/>
      <line class="chart__cross" x1="0" x2="0" y1="0" y2="${H}" visibility="hidden"/>
      <circle class="chart__dot" r="4.5" visibility="hidden"/>`;
    if (animate) (chartBox.classList.remove('is-drawn'), void chartBox.offsetWidth, chartBox.classList.add('is-drawn'));
    const total = me.balance + vaultValue();
    const change = total - vals[0];
    $('.portfolio__total', view).textContent = money(total);
    const ch = $('.portfolio__change', view);
    ch.textContent = `${change >= 0 ? '+' : '−'}${money(Math.abs(change))}`;
    ch.classList.toggle('is-down', change < 0);
    $('.portfolio__split', view).textContent =
      `Cash ${money(me.balance, { compact: true })} · Cards ${money(vaultValue())}`;
    const [d0, d1] = $$('.chart__dates span', view);
    d0.textContent = fmtTime(pts[0][0], range);
    d1.textContent = fmtTime(pts[pts.length - 1][0], range);
    svg._scale = { x, y, W };
  }

  scope.on(svg, 'pointermove', (e) => {
    if (!svg._scale) return;
    const r = svg.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(fx * (pts.length - 1))));
    const { x, y, W } = svg._scale;
    const px = x(i),
      py = y(pts[i][1]);
    const cross = $('.chart__cross', svg),
      dot = $('.chart__dot', svg);
    cross.setAttribute('x1', px);
    cross.setAttribute('x2', px);
    cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', px);
    dot.setAttribute('cy', py);
    dot.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = html`<strong class="num">${money(pts[i][1])}</strong
      ><span>${fmtTime(pts[i][0], range === '1D' ? '1D' : '7D')}</span>`;
    const left = (px / W) * r.width;
    tip.style.left = Math.max(60, Math.min(r.width - 60, left)) + 'px';
    tip.style.top = Math.max(0, (py / 220) * r.height - 54) + 'px';
  });
  scope.on(svg, 'pointerleave', () => {
    tip.hidden = true;
    $$('.chart__cross, .chart__dot', svg).forEach((n) => n.setAttribute('visibility', 'hidden'));
  });

  const ranges = $$('.portfolio__ranges .chip', view);
  ranges.forEach((c) =>
    scope.on(c, 'click', () => {
      ranges.forEach((x) => {
        x.classList.toggle('is-on', x === c);
        x.setAttribute('aria-pressed', String(x === c));
      });
      range = c.dataset.r;
      $('.portfolio__activity .label-caps', view).textContent = {
        '1D': 'Past day',
        '7D': 'Past week',
        '1M': 'Past month',
        '3M': 'Past 3 months',
        '1Y': 'Past year',
        All: 'All time',
      }[range];
      drawChart(true);
    }),
  );
  requestAnimationFrame(() => drawChart(true));
  scope.on(window, 'resize', () => drawChart(false));

  // ---- vaulted grid ----
  const grid = $('.profile-grid', view);
  function paintGrid() {
    const list = sortList(me.vault, sort);
    grid.innerHTML = list.length
      ? `<div class="card-grid">${list.map(tileHtml).join('')}</div>`
      : '<div class="empty surface"><h3>Nothing vaulted yet</h3><p>Cards you keep from packs show up here.</p></div>';
  }
  paintGrid();
  scope.on(grid, 'click', (e) => {
    const t = e.target.closest('.tile');
    if (t) navigate('/slab/' + t.dataset.uid);
  });
  sortMenu(view, scope, SORTS[0], (s) => {
    sort = s;
    paintGrid();
  });

  // Follow counts change while you're here (someone follows you, or you
  // follow back from Connections).
  scope.add(
    session.on(() => {
      if (!session.state) return;
      const sub = $('.view-sub', view);
      if (sub) sub.innerHTML = stats();
    }),
  );

  // ---- actions ----
  scope.on($('.profile-actions', view), 'click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'share') {
      if (navigator.clipboard) navigator.clipboard.writeText(`${location.origin}/profile/${me.handle}`).catch(() => {});
      toast('Profile link copied');
    }
    if (act === 'discord') toast('Discord linking is not part of this demo');
    if (act === 'logout') {
      session.signOut();
      toast('Logged out of the demo account');
      go('/packs');
    }
    if (act === 'edit') {
      const node = el(
        html`<form class="confirm edit-profile">
          <h2>Edit profile</h2>
          <label class="edit-profile__field"
            ><span>Display name</span><input class="field" name="name" maxlength="24" value="${me.name}"
          /></label>
          <label class="edit-profile__field"
            ><span>Bio</span
            ><input class="field" name="bio" maxlength="80" value="${me.bio || ''}" placeholder="A line about you"
          /></label>
          <p class="edit-profile__note">Saved in this browser only.</p>
          <div class="confirm__row">
            <button class="btn btn--ghost edit-profile__reset" type="button">Reset demo data</button>
            <button class="btn btn--secondary" type="button" data-close>Cancel</button
            ><button class="btn btn--primary" type="submit">Save</button>
          </div>
        </form>`,
      );
      const close = openDialog(node, { label: 'Edit profile', className: 'overlay--confirm' });
      $('.edit-profile__reset', node).addEventListener('click', () => {
        session.reset();
        close();
        toast('Demo data reset');
        go('/packs');
      });
      node.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const name = node.name.value.trim();
        const bio = node.bio.value.trim();
        session.update((s) => {
          if (name) s.name = name;
          s.bio = bio;
        });
        close();
        $('.view-title-row h1', view).textContent = session.state.name;
        $('.view-sub', view).innerHTML = stats();
        toast('Profile updated');
      });
    }
  });

  scope.on(view, 'click', (e) => {
    const b = e.target.closest('[data-list]');
    if (b) openConnections(me.handle, b.dataset.list, { openAuth, toast });
  });
}
