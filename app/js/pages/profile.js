// Profile (demo account): header with stats, actions, the portfolio card
// (value, change, range chips, area chart with a hover crosshair), pack
// activity and the vaulted grid. Signed out, it asks you to log in.
import { icon } from '../ui/icons.js';
import { html, raw, el, $, $$ } from '../ui/dom.js';
import { viewHead, avatarOf, navigate as go } from '../main.js';
import { cardArt, slabArt, money, USERS } from '../data.js';
import { session, cardOf, vaultValue, portfolioSeries } from '../session.js';
import { openDialog } from '../ui/dialogs.js';

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

export function mount(view, { scope, openAuth, toast, navigate }) {
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

  view.innerHTML = html` ${raw(viewHead(me.name, `<span class="profile-stats">@${me.handle} · <strong class="num">${me.vault.length}</strong> Vaulted · <button class="link" type="button" data-list="followers"><strong class="num">${me.followers}</strong> Followers</button> · <button class="link" type="button" data-list="following"><strong class="num">${me.following}</strong> Following</button></span>`, { avatar: avatarOf(me, 72) }))}
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
          <dd class="num">${me.opened}</dd>
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
        <div class="sort">
          <button class="sort__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
            <span class="label-caps">Sort</span
            ><span class="sort__value">${sort}</span>${raw(icon('chevronDown', { size: 16 }))}
          </button>
          <ul class="sort__menu" role="listbox" hidden>
            ${raw(SORTS.map((s, i) => `<li role="option" tabindex="-1" aria-selected="${i === 0}">${s}</li>`).join(''))}
          </ul>
        </div>
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
    let list = me.vault.slice();
    if (sort === SORTS[1]) list.sort((a, b) => b.value - a.value);
    if (sort === SORTS[2]) list.sort((a, b) => a.value - b.value);
    grid.innerHTML = list.length
      ? `<div class="card-grid">${list
          .map((v, i) => {
            const c = cardOf(v);
            return `<div class="vault-cell" style="--n:${i}"><button class="tile tile--vault tier-${v.tier === 'common' ? 'base' : v.tier}" type="button" data-uid="${v.uid}" aria-label="${c.name}, ${money(v.value)}"><span class="tile__art"><span class="thumb${v.graded ? ' is-slab' : ''} glow-${v.tier === 'common' ? 'base' : v.tier}"><img src="${v.graded ? slabArt(c.id) : cardArt(c.id, 'small')}" alt="" loading="lazy"></span></span><span class="tile__cap"><span class="tile__value num">${money(v.value)}</span><span class="tile__name">${c.name}</span></span></button></div>`;
          })
          .join('')}</div>`
      : '<div class="empty surface"><h3>Nothing vaulted yet</h3><p>Cards you keep from packs show up here.</p></div>';
  }
  paintGrid();
  scope.on(grid, 'click', (e) => {
    const t = e.target.closest('.tile');
    if (t) navigate('/slab/' + t.dataset.uid);
  });

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
    $('.sort__value', view).textContent = sort = li.textContent;
    closeMenu();
    paintGrid();
  });
  scope.on(document, 'click', (e) => {
    if (!e.target.closest('.sort')) closeMenu();
  });

  // ---- actions ----
  scope.on($('.profile-actions', view), 'click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'share') {
      if (navigator.clipboard) navigator.clipboard.writeText(location.origin + '/profile').catch(() => {});
      toast('Profile link copied');
    }
    if (act === 'discord') toast('Discord linking is not part of this demo');
    if (act === 'logout') {
      session.signOut();
      toast('Signed out of the demo account');
      go('/packs');
    }
    if (act === 'edit') {
      const node = el(
        html`<form class="confirm edit-profile">
          <h2>Edit profile</h2>
          <label class="edit-profile__field"
            ><span>Display name</span><input class="field" name="name" maxlength="24" value="${me.name}"
          /></label>
          <p class="edit-profile__note">Saved in this browser only.</p>
          <div class="confirm__row">
            <button class="btn btn--secondary" type="button" data-close>Cancel</button
            ><button class="btn btn--primary" type="submit">Save</button>
          </div>
        </form>`,
      );
      const close = openDialog(node, { label: 'Edit profile', className: 'overlay--confirm' });
      node.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const name = node.name.value.trim();
        if (name)
          session.update((s) => {
            s.name = name;
          });
        close();
        $('.view-title-row h1', view).textContent = session.state.name;
        toast('Profile updated');
      });
    }
  });

  // Followers / following lists (invented collectors).
  scope.on(view, 'click', (e) => {
    const b = e.target.closest('[data-list]');
    if (!b) return;
    const people = b.dataset.list === 'followers' ? USERS.slice(0, me.followers) : USERS.slice(5, 5 + me.following);
    const node = el(
      html`<div class="people">
        <div class="odds__head">
          <h2>${b.dataset.list === 'followers' ? 'Followers' : 'Following'}</h2>
          <button class="dialog__close" type="button" data-close>Close</button>
        </div>
        <ul>
          ${raw(people.map((u) => `<li>${avatarOf(u, 36)}<span><strong>@${u.handle}</strong>${u.vip ? `<span class="badge-vip">VIP ${u.vip}</span>` : ''}</span></li>`).join(''))}
        </ul>
      </div>`,
    );
    openDialog(node, { label: b.dataset.list, className: 'overlay--people' });
  });
}
