// Vault. Signed out: stats placeholders, toolbar and an empty state.
// Signed in (demo): the card grid with auto-sell timers, search / filter /
// sort, a select mode with a sell tray, and a card detail modal at
// /slab/:id with Sell and Ship. Selling only moves demo credit.
import { icon } from '../ui/icons.js';
import { html, raw, el, $, $$ } from '../ui/dom.js';
import { viewHead } from '../main.js';
import { cardArt, slabArt, money } from '../data.js';
import { session, cardOf, vaultValue, saleTimer, sell } from '../session.js';
import { openDialog } from '../ui/dialogs.js';

export const title = 'Vault';

const SORTS = ['Recent', 'Value: high to low', 'Value: low to high', 'Name'];
const FEE = 0.05;

function tile(v, i, selecting, selected) {
  const c = cardOf(v);
  const tier = v.tier === 'common' ? 'base' : v.tier;
  return html`<div class="vault-cell" style="--n:${i}">
    <button
      class="tile tile--vault tier-${tier}${selected ? ' is-selected' : ''}"
      type="button"
      data-uid="${v.uid}"
      aria-pressed="${selecting ? String(selected) : 'false'}"
      aria-label="${c.name}, ${money(v.value)}"
    >
      <span class="sale-timer num">${saleTimer(v)}</span>
      ${selecting ? raw(`<span class="tile__check" aria-hidden="true">${selected ? icon('check', { size: 14 }) : ''}</span>`) : ''}
      <span class="tile__art"
        ><span class="thumb${v.graded ? ' is-slab' : ''} glow-${v.tier === 'common' ? 'base' : v.tier}"
          ><img
            src="${v.graded ? slabArt(c.id) : cardArt(c.id, 'small')}"
            alt=""
            loading="lazy"
            draggable="false" /></span
      ></span>
      <span class="tile__cap"
        ><span class="tile__value num">${money(v.value)}</span><span class="tile__name">${c.name}</span></span
      >
    </button>
  </div>`;
}

export function mount(view, { scope, openAuth, toast, navigate, params = {} }) {
  const signedIn = session.signedIn;
  view.innerHTML = html` ${raw(viewHead('Vault', 'Sell or ship the cards you own. Cards you leave unclaimed auto-sell after 7 days.'))}
    <div class="vault-stats surface">
      <div class="stat"><span class="label-caps">Cards</span><strong class="num" data-stat="count">—</strong></div>
      <div class="stat">
        <span class="label-caps">Vault value</span><strong class="num stat--money" data-stat="value">—</strong>
      </div>
      <button class="btn btn--secondary vault-stats__sell" type="button">
        ${raw(icon('cash', { size: 18 }))}Sell all
      </button>
    </div>
    <div class="vault-tools">
      <label class="search"
        ><span class="sr">Search your cards</span>${raw(icon('search', { size: 18 }))}<input
          type="search"
          placeholder="Search your cards"
      /></label>
      <div class="vault-tools__chips" role="group" aria-label="Card type">
        <button class="chip is-on" type="button" aria-pressed="true" data-f="all">All</button>
        <button class="chip" type="button" aria-pressed="false" data-f="graded">Graded</button>
        <button class="chip" type="button" aria-pressed="false" data-f="raw">Raw</button>
      </div>
      <span class="vault-tools__gap"></span>
      <button class="btn btn--ghost btn--sm vault-select" type="button">
        ${raw(icon('check', { size: 16 }))}<span>Select</span>
      </button>
      <div class="sort">
        <button class="sort__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
          <span class="label-caps">Sort</span
          ><span class="sort__value">Recent</span>${raw(icon('chevronDown', { size: 16 }))}
        </button>
        <ul class="sort__menu" role="listbox" hidden>
          ${raw(SORTS.map((s, i) => `<li role="option" tabindex="-1" aria-selected="${i === 0}">${s}</li>`).join(''))}
        </ul>
      </div>
    </div>
    <div class="vault-body"></div>
    <div class="sell-tray" aria-hidden="true">
      <div class="sell-tray__count"><strong class="num">0</strong><span>selected</span></div>
      <dl class="sell-tray__quote">
        <div>
          <dt>Sale price</dt>
          <dd class="num" data-q="price">$0</dd>
        </div>
        <div>
          <dt>Selling fee (5%)</dt>
          <dd class="num" data-q="fee">−$0</dd>
        </div>
        <div class="is-net">
          <dt>You receive</dt>
          <dd class="num" data-q="net">$0</dd>
        </div>
      </dl>
      <button class="btn btn--ghost sell-tray__clear" type="button">Clear</button>
      <button class="btn btn--primary sell-tray__go" type="button">
        ${raw(icon('cash', { size: 18 }))}<span>Sell selected for $0</span>
      </button>
    </div>`;

  const body = $('.vault-body', view);
  const tray = $('.sell-tray', view);
  let filter = 'all',
    query = '',
    sort = 'Recent',
    selecting = false;
  const selected = new Set();

  const items = () => {
    let list = session.state ? session.state.vault.slice() : [];
    if (filter !== 'all') list = list.filter((v) => (filter === 'graded' ? v.graded : !v.graded));
    if (query) list = list.filter((v) => cardOf(v).name.toLowerCase().includes(query));
    if (sort === 'Value: high to low') list.sort((a, b) => b.value - a.value);
    if (sort === 'Value: low to high') list.sort((a, b) => a.value - b.value);
    if (sort === 'Name') list.sort((a, b) => cardOf(a).name.localeCompare(cardOf(b).name));
    return list;
  };

  function paint() {
    const s = session.state;
    $('[data-stat="count"]', view).textContent = s ? s.vault.length : '—';
    $('[data-stat="value"]', view).textContent = s ? money(vaultValue()) : '—';
    if (!s) {
      body.innerHTML = html`<div class="empty surface">
        ${raw(icon('vault', { size: 36 }))}
        <h3>Your Vault</h3>
        <p>Every card you keep lands here. Log in to see and manage your collection.</p>
      </div>`;
      return;
    }
    const list = items();
    if (!list.length) {
      body.innerHTML = html`<div class="empty surface">
        ${raw(icon('vault', { size: 36 }))}
        <h3>${s.vault.length ? 'No cards match' : 'Your Vault is empty'}</h3>
        <p>
          ${s.vault.length ? 'Try a different search or filter.' : 'Open a pack and the cards you keep will land here.'}
        </p>
        ${s.vault.length ? '' : raw('<a class="btn btn--primary" href="/packs" data-link style="min-width:0;margin-top:6px">Open packs</a>')}
      </div>`;
    } else {
      body.innerHTML = `<div class="card-grid">${list.map((v, i) => tile(v, i, selecting, selected.has(v.uid))).join('')}</div>`;
    }
    paintTray();
  }

  function paintTray() {
    const s = session.state;
    const chosen = s ? s.vault.filter((v) => selected.has(v.uid)) : [];
    const price = chosen.reduce((a, v) => a + v.value, 0);
    $('.sell-tray__count strong', view).textContent = chosen.length;
    $('[data-q="price"]', view).textContent = money(price, { compact: true });
    $('[data-q="fee"]', view).textContent = '−' + money(price * FEE, { compact: true });
    $('[data-q="net"]', view).textContent = money(price * (1 - FEE), { compact: true });
    $('.sell-tray__go span', view).textContent = `Sell selected for ${money(price * (1 - FEE), { compact: true })}`;
    $('.sell-tray__go', view).disabled = !chosen.length;
    tray.classList.toggle('is-open', selecting);
    tray.setAttribute('aria-hidden', String(!selecting));
  }

  function setSelecting(on) {
    selecting = on;
    if (!on) selected.clear();
    $('.vault-select span', view).textContent = on ? 'Done' : 'Select';
    $('.vault-select', view).classList.toggle('is-on', on);
    paint();
  }

  paint();
  scope.add(session.on(() => paint()));

  // Toolbar.
  const chips = $$('.vault-tools__chips .chip', view);
  chips.forEach((c) =>
    scope.on(c, 'click', () => {
      chips.forEach((x) => {
        x.classList.toggle('is-on', x === c);
        x.setAttribute('aria-pressed', String(x === c));
      });
      filter = c.dataset.f;
      paint();
    }),
  );
  scope.on($('.search input', view), 'input', (e) => {
    query = e.target.value.trim().toLowerCase();
    paint();
  });

  const trigger = $('.sort__trigger', view);
  const menu = $('.sort__menu', view);
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
    paint();
  });
  scope.on(document, 'click', (e) => {
    if (!e.target.closest('.sort')) closeMenu();
  });

  scope.on($('.vault-select', view), 'click', () => {
    if (!signedIn) {
      toast('Log in to select cards');
      return;
    }
    setSelecting(!selecting);
  });
  scope.on($('.sell-tray__clear', view), 'click', () => {
    selected.clear();
    paint();
  });
  scope.on($('.sell-tray__go', view), 'click', () => {
    const uids = [...selected];
    const got = sell(uids);
    toast(`Sold ${uids.length} card${uids.length > 1 ? 's' : ''} for ${money(got)}`);
    setSelecting(false);
  });

  scope.on($('.vault-stats__sell', view), 'click', () => {
    if (!session.signedIn) {
      openAuth('login');
      return;
    }
    const s = session.state;
    if (!s.vault.length) {
      toast('Your Vault is empty');
      return;
    }
    const total = vaultValue();
    const node = el(
      html`<div class="confirm">
        <h2>Sell all ${s.vault.length} cards?</h2>
        <p>
          You'll receive <strong class="num">${money(total * (1 - FEE))}</strong> after the 5% selling fee. Demo credit
          only.
        </p>
        <div class="confirm__row">
          <button class="btn btn--secondary" type="button" data-close>Cancel</button
          ><button class="btn btn--primary confirm__go" type="button">Sell all</button>
        </div>
      </div>`,
    );
    const close = openDialog(node, { label: 'Sell all', className: 'overlay--confirm' });
    $('.confirm__go', node).addEventListener('click', () => {
      const got = sell(s.vault.map((v) => v.uid));
      toast(`Sold everything for ${money(got)}`);
      close();
    });
  });

  // Tiles: toggle selection, or open the card modal.
  scope.on(body, 'click', (e) => {
    const t = e.target.closest('.tile--vault');
    if (!t) return;
    if (selecting) {
      if (selected.has(t.dataset.uid)) selected.delete(t.dataset.uid);
      else selected.add(t.dataset.uid);
      paint();
      return;
    }
    navigate('/slab/' + t.dataset.uid);
  });

  if (params.card) openCard(params.card, { navigate, toast });
}

// Card detail at /slab/:id. Closing returns to /vault.
function openCard(uid, { navigate, toast }) {
  const s = session.state;
  const v = s && s.vault.find((x) => x.uid === uid);
  if (!v) {
    navigate('/vault', { replace: true });
    return;
  }
  const c = cardOf(v);
  const node = el(
    html`<div class="slab-modal">
      <button class="inspect__close icon-btn" type="button" aria-label="Close" data-close>
        ${raw(icon('close', { size: 18 }))}
      </button>
      <div class="slab-modal__art${v.graded ? ' is-slab' : ''}">
        <img src="${v.graded ? slabArt(c.id, 'large') : cardArt(c.id)}" alt="${c.name}" />
      </div>
      <p class="slab-modal__value num">${money(v.value)}</p>
      <p class="slab-modal__name">${c.name}</p>
      <div class="slab-modal__actions">
        <button class="btn btn--secondary slab-modal__sell" type="button">
          ${raw(icon('cash', { size: 18 }))}Sell
        </button>
        <button class="btn btn--secondary slab-modal__ship" type="button">
          ${raw(icon('shipping', { size: 18 }))}Ship
        </button>
      </div>
    </div>`,
  );
  let leaving = false;
  const close = openDialog(node, {
    label: c.name,
    className: 'overlay--slab',
    onClose: () => {
      if (!leaving && location.pathname.startsWith('/slab/')) navigate('/vault', { replace: true });
    },
  });
  $('.slab-modal__sell', node).addEventListener('click', () => {
    const got = sell([v.uid]);
    toast(`Sold ${c.name} for ${money(got)}`);
    close();
  });
  $('.slab-modal__ship', node).addEventListener('click', () => toast('Shipping is disabled in this demo'));
  const art = $('.slab-modal__art', node);
  node.addEventListener('pointermove', (e) => {
    const r = node.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    art.style.transform = `perspective(900px) rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
  });
  node.addEventListener('pointerleave', () => {
    art.style.transform = '';
  });
}
