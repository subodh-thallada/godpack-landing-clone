// App clone entry: shell (sidebar, scroller, chat dock), router and the
// services views share (navigation, toasts, sign-in, the account header).
import { icon } from './ui/icons.js';
import { html, raw, el, $, $$, Scope, store } from './ui/dom.js';
import { mountChat } from './ui/chat.js';
import {
  session,
  unread,
  markRead,
  openBattleCount,
  maybeGainFollower,
  lobbyBattles,
  refreshLobby,
  checkShipments,
} from './session.js';
import { money, USERS, PACKS } from './data.js';

const ROUTES = {
  '/packs': () => import('./pages/packs.js'),
  '/battles': () => import('./pages/battles.js'),
  '/vault': () => import('./pages/vault.js'),
  '/feed': () => import('./pages/feed.js'),
  '/rewards': () => import('./pages/rewards.js'),
  '/ship': () => import('./pages/ship.js'),
  '/add-funds': () => import('./pages/add-funds.js'),
  '/withdraw': () => import('./pages/withdraw.js'),
  '/profile': () => import('./pages/profile.js'),
};

// Paths that render another route's view (with extra state).
function resolve(path) {
  if (path === '/feed/following') return { route: '/feed', params: { tab: 'following' } };
  const slab = path.match(/^\/slab\/([\w-]+)$/);
  if (slab) return { route: '/vault', params: { card: slab[1] } };
  const prof = path.match(/^\/profile\/([\w-]+)$/);
  if (prof) return { route: '/profile', params: { handle: prof[1] } };
  return ROUTES[path] ? { route: path, params: {} } : { route: '/packs', params: {}, fallback: true };
}

const PRIMARY = [
  ['/packs', 'Packs', 'packs'],
  ['/battles', 'Battles', 'battles'],
  ['/vault', 'Vault', 'vault'],
  ['/feed', 'Feed', 'feed'],
  ['/rewards', 'Rewards', 'rewards'],
];
const SECONDARY = [
  ['/ship', 'Shipping', 'shipping'],
  ['/add-funds', 'Deposit', 'deposit'],
  ['/withdraw', 'Withdraw', 'withdraw'],
];

export const avatarOf = (u, size) =>
  `<span class="avatar" style="${size ? `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;` : ''}background:${u.color}">${u.handle[0].toUpperCase()}</span>`;

// ---------------------------------------------------------------- shell

function navLink([href, label, ico]) {
  return html`<a class="nav__item" href="${href}" data-link data-nav="${href}" aria-label="${label}">
    ${raw(icon(ico))}<span class="nav__label">${label}</span><span class="nav__count num" hidden></span>
  </a>`;
}

function buildShell() {
  const collapsed = store.get('collapsed', false);
  const moreClosed = store.get('moreClosed', false);
  const volume = store.get('volume', 100);
  return el(
    html`<div class="shell${collapsed ? ' is-collapsed' : ''}">
      <aside class="side" aria-label="Main">
        <div class="side__top">
          <a class="brand" href="/packs" data-link aria-label="Godpack home"
            ><img src="/assets/logo.png" alt="Godpack" width="447" height="159"
          /></a>
          <button class="side__toggle" type="button" aria-label="${collapsed ? 'Expand' : 'Collapse'} sidebar">
            ${raw(icon('chevronLeft', { size: 18 }))}
          </button>
        </div>
        <nav class="nav" aria-label="Sections">
          <span class="nav__marker" aria-hidden="true"></span>
          ${raw(PRIMARY.map(navLink).join(''))}
        </nav>
        <nav class="more${moreClosed ? ' is-closed' : ''}" aria-label="More">
          <button class="more__toggle" type="button" aria-expanded="${!moreClosed}">
            <span>More</span>${raw(icon('chevronUp', { size: 18 }))}
          </button>
          <div class="more__links">
            ${raw(SECONDARY.map(navLink).join(''))}
            <div class="volume">
              <button
                class="nav__item volume__btn"
                type="button"
                role="switch"
                aria-checked="${volume > 0}"
                aria-label="Sound effects"
              >
                ${raw(icon(volume > 0 ? 'sound' : 'mute'))}
              </button>
              <label class="slider"
                ><span class="sr">Volume</span>
                <span class="slider__rail"
                  ><span class="slider__fill" style="width:${volume}%"></span
                  ><span class="slider__thumb" style="left:${volume}%"></span
                ></span>
                <input type="range" min="0" max="100" value="${volume}" />
              </label>
            </div>
          </div>
        </nav>
        <div class="side__foot"></div>
      </aside>
      <div class="main">
        <main class="scroller" id="scroller"></main>
      </div>
    </div>`,
  );
}

function wireShell(shell) {
  const toggle = $('.side__toggle', shell);
  toggle.addEventListener('click', () => {
    const on = !shell.classList.contains('is-collapsed');
    shell.classList.toggle('is-collapsed', on);
    toggle.setAttribute('aria-label', on ? 'Expand sidebar' : 'Collapse sidebar');
    store.set('collapsed', on);
  });

  const more = $('.more', shell);
  $('.more__toggle', shell).addEventListener('click', (e) => {
    const closed = more.classList.toggle('is-closed');
    e.currentTarget.setAttribute('aria-expanded', String(!closed));
    store.set('moreClosed', closed);
  });

  const range = $('.slider input', shell);
  const fill = $('.slider__fill', shell);
  const thumb = $('.slider__thumb', shell);
  const muteBtn = $('.volume__btn', shell);
  let lastVolume = +range.value || 100;
  const setVolume = (v) => {
    range.value = v;
    fill.style.width = v + '%';
    thumb.style.left = v + '%';
    muteBtn.innerHTML = icon(v > 0 ? 'sound' : 'mute');
    muteBtn.setAttribute('aria-checked', String(v > 0));
    store.set('volume', +v);
  };
  range.addEventListener('input', () => {
    setVolume(+range.value);
    if (+range.value) lastVolume = +range.value;
  });
  muteBtn.addEventListener('click', () => setVolume(+range.value > 0 ? 0 : lastVolume || 100));
}

// Counts and the account button depend on the session.
function paintSide(shell) {
  const s = session.state;
  const counts = { '/battles': s ? lobbyBattles().length + openBattleCount() : 0, '/vault': s ? s.vault.length : null };
  $$('.nav__item[data-nav]', shell).forEach((a) => {
    const href = a.dataset.nav;
    const c = $('.nav__count', a);
    const label = $('.nav__label', a).textContent;
    if (href in counts && counts[href] != null) {
      c.hidden = false;
      c.textContent = counts[href];
      c.classList.toggle('is-alert', href === '/battles' && counts[href] > 0);
      a.setAttribute(
        'aria-label',
        href === '/battles' ? `${label}, ${counts[href]} open` : `${label}, ${counts[href]} cards`,
      );
    } else {
      c.hidden = true;
      a.setAttribute('aria-label', label);
    }
  });
  const foot = $('.side__foot', shell);
  foot.innerHTML = s
    ? html`<a class="account" href="/profile" data-link aria-label="Your profile, @${s.handle}">
        ${raw(avatarOf(s, 48))}
        <span class="account__text"><strong>${s.name}</strong><small>@${s.handle}</small></span>
      </a>`
    : '';
}

function markNav(shell, path, params = {}) {
  $$('.nav__item[data-link]', shell).forEach((a) => {
    if (a.getAttribute('href') === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const acct = $('.account', shell);
  if (acct) acct.toggleAttribute('aria-current', path === '/profile' && !params.handle);
  const idx = PRIMARY.findIndex(([href]) => href === path);
  const marker = $('.nav__marker', shell);
  marker.hidden = idx < 0;
  if (idx >= 0) marker.style.setProperty('--i', idx);
}

// ---------------------------------------------------------------- services

let toastHost;
export function toast(message) {
  if (!toastHost) {
    toastHost = el('<div class="toasts" role="status" aria-live="polite"></div>');
    document.body.append(toastHost);
  }
  const t = el(html`<div class="toast">${message}</div>`);
  toastHost.append(t);
  setTimeout(() => {
    t.classList.add('is-leaving');
    setTimeout(() => t.remove(), 220);
  }, 2600);
}

export async function openAuth(mode = 'login') {
  const { showAuth } = await import('./pages/auth.js');
  showAuth({ mode, toast });
}

// Header controls: Log in / Sign up when signed out; the bell and the
// wallet pill when signed in.
function accountControls() {
  const s = session.state;
  if (!s) {
    return `<div class="auth-btns">
        <button class="btn btn--secondary" type="button" data-auth="login">Log in</button>
        <button class="btn btn--primary" type="button" data-auth="signup">Sign up</button>
      </div>`;
  }
  return html`<div class="acct">
    <div class="notif">
      <button class="notif__bell" type="button" aria-label="Notifications" aria-expanded="false">
        ${raw(icon('bell', { size: 20 }))}<span class="notif__count num" ${unread() ? '' : ' hidden'}>${unread()}</span>
      </button>
    </div>
    <a
      class="wallet${s.balance <= 0 ? ' is-empty' : ''}"
      href="/add-funds"
      data-link
      aria-label="Balance ${money(s.balance)}. Add funds"
    >
      ${raw(icon('wallet', { size: 18 }))}<span class="wallet__amount num"
        >${money(s.balance, { compact: true }).replace(/\.00$/, '')}</span
      ><span class="wallet__add">${raw(icon('plus', { size: 18 }))}</span>
    </a>
  </div>`;
}

export function viewHead(title, sub, { avatar } = {}) {
  return html`<header class="view-head${avatar ? ' view-head--avatar' : ''}">
    ${avatar ? raw(`<div class="view-head__avatar">${avatar}</div>`) : ''}
    <div class="view-title-row">
      <h1>${title}</h1>
      ${raw(accountControls())}
    </div>
    ${sub ? raw(`<p class="view-sub">${sub}</p>`) : ''}
  </header>`;
}

const since = (t) => {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

function wireNotifications(root) {
  const bell = $('.notif__bell', root);
  if (!bell) return;
  let panel = null;
  const close = () => {
    if (!panel) return;
    const p = panel;
    panel = null;
    bell.setAttribute('aria-expanded', 'false');
    bell.classList.remove('is-open');
    p.classList.add('is-leaving');
    setTimeout(() => p.remove(), 180);
  };
  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel) {
      close();
      return;
    }
    const items = session.state.notifications || [];
    panel = el(
      html`<div class="notif__panel" role="dialog" aria-label="Notifications">
        <div class="notif__head">
          <h2>Notifications</h2>
          ${items.some((n) => !n.read) ? raw('<button class="notif__all" type="button">Mark all read</button>') : ''}
        </div>
        ${
          items.length
            ? raw(
                `<ul class="notif__list">${items
                  .map(
                    (n) =>
                      html`<li>
                        <a
                          class="notif__item${n.read ? '' : ' is-unread'}"
                          href="${n.href || '/packs'}"
                          data-id="${n.id}"
                        >
                          <strong>${n.title}</strong><span>${n.body}</span><time>${since(n.at)}</time>
                        </a>
                      </li>`,
                  )
                  .join('')}</ul>`,
              )
            : raw(
                `<div class="notif__empty">${icon('bell', { size: 24 })}<strong>No notifications yet</strong><span>Gifts, mentions and VIP upgrades will show up here.</span></div>`,
              )
        }
      </div>`,
    );
    bell.parentElement.append(panel);
    bell.setAttribute('aria-expanded', 'true');
    bell.classList.add('is-open');
    panel.addEventListener('click', (ev) => {
      if (ev.target.closest('.notif__all')) {
        ev.stopPropagation();
        markRead();
        panel.querySelectorAll('.is-unread').forEach((n) => n.classList.remove('is-unread'));
        ev.target.remove();
        return;
      }
      const item = ev.target.closest('.notif__item');
      if (!item) return;
      ev.preventDefault();
      markRead(item.dataset.id);
      close();
      navigate(item.getAttribute('href'));
    });
  });
  const onDoc = (e) => {
    if (panel && !e.target.closest('.notif')) close();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('click', onDoc);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('click', onDoc);
    document.removeEventListener('keydown', onKey);
  };
}

export function appFoot() {
  const link = (href, ico, label, attrs = '') =>
    `<a href="${href}" ${attrs}>${icon(ico, { size: 18 })}<span>${label}</span></a>`;
  return html`<footer class="app-foot">
    <div class="app-foot__cols">
      <nav class="app-foot__group" aria-label="Community">
        <h2>Community</h2>
        <div>
          ${raw(link('https://discord.gg/godpack', 'chat', 'Discord', 'target="_blank" rel="noopener"') + link('https://www.instagram.com/godpackgg/', 'camera', 'Instagram', 'target="_blank" rel="noopener"') + link('https://x.com/godpack', 'xmark', 'X', 'target="_blank" rel="noopener"'))}
        </div>
      </nav>
      <nav class="app-foot__group" aria-label="Support">
        <h2>Support</h2>
        <div>
          ${raw(link('mailto:support@godpack.gg', 'mail', 'support@godpack.gg') + link('/', 'file', 'Terms', 'data-demo') + link('/', 'shield', 'Privacy', 'data-demo'))}
        </div>
      </nav>
    </div>
    <p class="app-foot__legal">
      <a href="/">Unofficial recreation</a> by @subodh-thallada · demo data only<br />Not affiliated with Godpack
    </p>
  </footer>`;
}

// ---------------------------------------------------------------- router

let current = null;
let shellEl = null;

async function render(path, { push = false } = {}) {
  const resolved = resolve(path.split('?')[0]);
  const { route, params } = resolved;
  // Unknown paths (including /app itself) show Packs at its canonical URL.
  const full = resolved.fallback ? '/packs' : path;
  if (push) history.pushState({}, '', full);
  else if (location.pathname + location.search !== full) history.replaceState({}, '', full);
  markNav(shellEl, route, params);

  const mod = await ROUTES[route]();
  if (current) current.scope.dispose();
  const scroller = $('#scroller');
  const view = el(`<div class="view is-entering view--${route.slice(1)}"></div>`);
  const scope = new Scope();
  scroller.replaceChildren(view);
  scroller.scrollTop = 0;
  current = { path: full, route, params, scope };
  document.title = `${mod.title || 'Packs'} · Godpack app (unofficial recreation)`;
  mod.mount(view, { scope, navigate, toast, openAuth, params, session });
  const unwire = wireNotifications(view);
  if (unwire) scope.add(unwire);
  scroller.append(el(appFoot()));
  setTimeout(() => view.classList.remove('is-entering'), 400);
}

// Re-render the current view (after a state change the view can't patch in place).
export function refresh() {
  render(location.pathname + location.search);
}

export function navigate(path, { replace = false } = {}) {
  if (path === location.pathname + location.search) return;
  if (replace) {
    history.replaceState({}, '', path);
    render(path);
    return;
  }
  render(path, { push: true });
}

function boot() {
  session.boot();
  const app = $('#app');
  shellEl = buildShell();
  app.replaceChildren(shellEl);
  wireShell(shellEl);
  paintSide(shellEl);
  mountChat(document.body, { openAuth, session });

  // Sign-in / sign-out re-renders the view; balance and vault changes only
  // repaint the shell and the header controls.
  let wasIn = session.signedIn;
  session.on(() => {
    paintSide(shellEl);
    markNav(shellEl, current ? current.route : '/packs', current ? current.params : {});
    if (session.signedIn !== wasIn) {
      wasIn = session.signedIn;
      render(location.pathname + location.search);
      return;
    }
    const slot = $('.view-title-row > .acct', shellEl);
    if (slot) {
      const count = $('.notif__count', slot);
      const n = unread();
      if (count) {
        count.hidden = !n;
        if (count.textContent !== String(n) && n) {
          count.textContent = n;
          count.classList.remove('is-bump');
          void count.offsetWidth;
          count.classList.add('is-bump');
        }
      }
      const wallet = $('.wallet', slot);
      const s = session.state;
      wallet.classList.toggle('is-empty', s.balance <= 0);
      wallet.setAttribute('aria-label', `Balance ${money(s.balance)}. Add funds`);
      const amt = $('.wallet__amount', wallet);
      const next = money(s.balance, { compact: true }).replace(/\.00$/, '');
      if (amt.textContent !== next) {
        amt.textContent = next;
        wallet.classList.remove('is-credited');
        void wallet.offsetWidth;
        wallet.classList.add('is-credited');
      }
    }
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      navigate(link.getAttribute('href'));
      return;
    }
    const auth = e.target.closest('[data-auth]');
    if (auth) {
      e.preventDefault();
      openAuth(auth.dataset.auth);
      return;
    }
    const demo = e.target.closest('[data-demo]');
    if (demo) {
      e.preventDefault();
      toast('Not part of this demo');
    }
  });
  window.addEventListener('popstate', () => render(location.pathname + location.search));

  // ?demo=1 signs back into the demo after a log out; ?signout=1 logs out.
  const qs = new URLSearchParams(location.search);
  if (qs.has('demo') && !session.signedIn) session.signIn();
  if (qs.has('signout') && session.signedIn) session.signOut();
  wasIn = session.signedIn;

  // The world keeps moving while you browse: open battles come and go and,
  // after a while, someone follows you.
  setInterval(() => session.signedIn && refreshLobby(), 20000);
  setInterval(() => session.signedIn && checkShipments(), 5000);
  setTimeout(() => session.signedIn && maybeGainFollower(), 45000);

  // Battles you post get an opponent a few seconds later, wherever you are.
  setInterval(async () => {
    if (!session.signedIn) return;
    if (
      document.querySelector('.overlay, .auth') ||
      !document.querySelector('.demo-layer[hidden], body:not(:has(.demo-layer))')
    )
      return;
    const due = session.state.battles.find((b) => b.status === 'open' && Date.now() - b.at > 7000);
    if (!due) return;
    const opponent = USERS[Math.floor(Math.random() * USERS.length)].handle;
    session.update((st) => {
      const b = st.battles.find((x) => x.id === due.id);
      b.status = 'live';
      b.opponent = opponent;
    });
    toast(`@${opponent} joined your battle`);
    const { replayBattle } = await import('./pages/feed.js');
    replayBattle({
      id: due.id,
      pack: PACKS.find((p) => p.id === due.pack),
      each: due.each,
      lowest: due.lowest,
      mine: true,
      opponent,
    });
  }, 2000);
  render(location.pathname === '/' ? '/packs' : location.pathname + location.search);
}

boot();
