// The store block shared by Packs and Battles: a pack stage on the left
// (step between tiers, foil follows the pointer) and an order panel on the
// right (quantity, tier menu, value range + odds, a call to action).
import { icon } from './icons.js';
import { html, raw, el, $, $$, store } from './dom.js';
import { PACKS, packArt, money, priceLabel } from '../data.js';
import { openOdds, openDialog } from './dialogs.js';
import { session, openPacks, sell, cardOf, postBattle } from '../session.js';

const rangeText = (r) => `${money(r[0], { compact: true })} – ${money(r[1], { compact: true })}`;

// The tier to show first: ?pack=<id> (from landing-page links) wins over
// the last tier used, which is remembered per mode.
export function initialPack(battle = false) {
  const asked = new URLSearchParams(location.search).get('pack');
  const fromUrl = PACKS.findIndex((p) => p.id === asked);
  if (fromUrl >= 0) {
    store.set(battle ? 'battlePack' : 'pack', fromUrl);
    return fromUrl;
  }
  return Math.min(PACKS.length - 1, Math.max(0, store.get(battle ? 'battlePack' : 'pack', 0)));
}

export function storeMarkup({ battle = false, safe = false, index = 0 }) {
  const me = session.state;
  const youSeat = me
    ? `<div class="seat is-me"><span class="avatar seat__avatar" style="background:${me.color}">${me.handle[0].toUpperCase()}</span><div><strong>You</strong><span>@${me.handle}</span></div></div>`
    : `<div class="seat"><span class="seat__open">${icon('plus', { size: 18 })}</span><div><strong>You</strong><span>Open seat</span></div></div>`;
  const seats = battle
    ? html`<div class="seats">
        ${raw(youSeat)}
        <span class="seats__vs">VS</span>
        <div class="seat seat--right">
          <div><strong>Anyone</strong><span>Open seat</span></div>
          <span class="seat__open">${raw(icon('plus', { size: 18 }))}</span>
        </div>
      </div>`
    : '';
  const safeToggle = battle
    ? ''
    : html`<div class="safe">
        <button class="safe__switch" type="button" role="switch" aria-checked="${safe}" aria-label="Safe mode">
          <span class="safe__label">Safe</span><span class="switch"></span>
        </button>
        <span class="safe__help has-tip"
          ><button class="safe__mark" type="button" aria-label="What is Safe?">?</button
          ><span class="tip safe__tip" role="tooltip">Higher floor, still 100% EV</span></span
        >
      </div>`;
  const opponent = battle
    ? html`<div class="opponent">
          <span class="label-caps">Opponent</span>
          <div class="opponent__chips">
            <button class="chip is-on" type="button" aria-pressed="true" data-opp="anyone">Anyone</button>
            <button class="chip opponent__search" type="button" aria-pressed="false" data-opp="search">
              <span>Search</span>${raw(icon('chevronDown', { size: 14 }))}
            </button>
          </div>
        </div>
        <button class="rule" type="button" role="switch" aria-checked="false">
          <span>Lowest wins</span><span class="switch"></span>
        </button>`
    : '';

  return html`<section class="shop${battle ? ' shop--battle' : ''}">
    <div class="stage surface${safe ? ' is-safe' : ''}">
      <div class="stage__glow" aria-hidden="true"></div>
      <div class="stage__glow stage__glow--safe" aria-hidden="true"></div>
      <button class="icon-btn stage__step stage__step--prev" type="button" aria-label="Previous pack">
        ${raw(icon('chevronLeft', { size: 24 }))}
      </button>
      <div class="stage__packs">
        ${raw(
          PACKS.map(
            (p, i) => `<div class="pack${i === index ? ' is-active' : ''}" data-i="${i}">
          <img class="pack__img" src="${packArt(p, 720)}" alt="${p.name} pack" draggable="false">
          <span class="pack__foil" style="--mask:url(${packArt(p, 480)})"></span>
        </div>`,
          ).join(''),
        )}
      </div>
      <button class="icon-btn stage__step stage__step--next" type="button" aria-label="Next pack">
        ${raw(icon('chevronRight', { size: 24 }))}
      </button>
      ${raw(seats)}${raw(safeToggle)}
    </div>

    <div class="order panel">
      <div class="order__head">
        <h2>${battle ? 'Start a battle' : 'Open packs'}</h2>
        <div class="qty">
          <button type="button" class="qty__btn" data-step="-1" aria-label="Remove one pack">
            ${raw(icon('minus'))}
          </button>
          <label class="qty__val num"
            ><input type="text" inputmode="numeric" value="1" aria-label="Number of packs" /><span
              >${battle ? 'pack each' : 'pack'}</span
            ></label
          >
          <button type="button" class="qty__btn" data-step="1" aria-label="Add one pack">${raw(icon('plus'))}</button>
        </div>
      </div>
      <div class="tiers">
        <span class="label-caps">Pack tier</span>
        <button class="tiers__trigger" type="button" aria-haspopup="listbox" aria-expanded="false"></button>
        <ul class="tiers__menu" role="listbox" hidden></ul>
      </div>
      ${raw(opponent)}
      <div class="order__foot">
        <div class="range">
          <div><span class="range__label">Value range per pack</span><strong class="range__value num"></strong></div>
          <button class="btn btn--outline range__odds" type="button">${raw(icon('info', { size: 16 }))}Odds</button>
        </div>
        <button class="btn btn--buy" type="button"></button>
        ${battle ? raw('<p class="order__note">Nothing is charged until someone joins. The winner takes all 2 cards; equal totals keep their own. No fee.</p>') : ''}
      </div>
    </div>
  </section>`;
}

// Wires the markup produced above. onTier(index, loading) fires on changes.
export function wireStore(root, { scope, openAuth, battle = false, onTier, navigate, toast }) {
  let index = initialPack(battle);
  let safe = !battle && store.get('safe', false);
  let qty = 1;

  const stage = $('.stage', root);
  const packs = $$('.pack', root);
  const prev = $('.stage__step--prev', root);
  const next = $('.stage__step--next', root);
  const trigger = $('.tiers__trigger', root);
  const menu = $('.tiers__menu', root);
  const rangeVal = $('.range__value', root);
  const buy = $('.btn--buy', root);
  const qtyInput = $('.qty__val input', root);
  const qtyLabel = $('.qty__val span', root);
  const unit = battle ? 'each' : '';

  const pack = () => PACKS[index];
  const cost = () => pack().price * qty;
  const cta = () => {
    const me = session.state;
    if (!battle) return `Open for ${priceLabel(cost())}`;
    if (!me) return 'Sign up to battle';
    const short = cost() - me.balance;
    return short > 0
      ? `Add ${priceLabel(Math.ceil(short * 100) / 100)} to battle`
      : `Start battle for ${priceLabel(cost())}`;
  };

  function paint(loading) {
    const p = pack();
    trigger.innerHTML = html`<span class="tiers__name">${p.name}</span>
      <span class="tiers__price"
        ><strong class="num">${priceLabel(p.price)}</strong><span class="tiers__mult num">up to ${p.mult}×</span></span
      >
      <span class="tiers__chev">${raw(icon('chevronDown', { size: 16 }))}</span>`;
    trigger.setAttribute('aria-label', `Pack tier: ${p.name}`);
    rangeVal.textContent = loading ? 'Loading…' : rangeText(safe ? p.safeRange : p.range);
    buy.textContent = cta();
    buy.disabled = !!loading;
    prev.disabled = index === 0;
    next.disabled = index === PACKS.length - 1;
    menu.innerHTML = PACKS.map(
      (t, i) =>
        html`<li role="option" aria-selected="${i === index}" tabindex="-1" data-i="${i}">
          <span class="tiers__row"
            ><span class="tiers__name">${t.name}</span><strong class="num">${priceLabel(t.price)}</strong></span
          >
          <span class="tiers__row tiers__row--sub"
            ><span class="num">${rangeText(safe ? t.safeRange : t.range)}</span
            ><span class="tiers__mult num">up to ${t.mult}×</span></span
          >
        </li>`,
    ).join('');
  }

  let loadTimer = 0;
  function select(i, { animate = true } = {}) {
    const from = index;
    index = Math.max(0, Math.min(PACKS.length - 1, i));
    store.set(battle ? 'battlePack' : 'pack', index);
    packs.forEach((node, k) => {
      node.classList.remove('is-active', 'from-left', 'from-right', 'to-left', 'to-right');
      if (k === index)
        node.classList.add(
          'is-active',
          ...(animate && from !== index ? [index > from ? 'from-right' : 'from-left'] : []),
        );
      else if (k === from && animate && from !== index) node.classList.add(index > from ? 'to-left' : 'to-right');
    });
    // The live app fetches the tier here; mirror its short loading state.
    paint(animate);
    if (onTier) onTier(index, animate);
    clearTimeout(loadTimer);
    if (animate)
      loadTimer = scope.later(() => {
        paint(false);
        if (onTier) onTier(index, false);
      }, 520);
  }

  // Foil and tilt follow the pointer.
  const box = $('.stage__packs', root);
  scope.on(box, 'pointermove', (e) => {
    const active = packs[index];
    const r = active.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width,
      y = (e.clientY - r.top) / r.height;
    active.style.setProperty('--mx', x.toFixed(3));
    active.style.setProperty('--my', y.toFixed(3));
    active.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
    active.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
    active.classList.add('is-hover');
  });
  scope.on(box, 'pointerleave', () => {
    const active = packs[index];
    active.classList.remove('is-hover');
    active.style.setProperty('--rx', '0deg');
    active.style.setProperty('--ry', '0deg');
  });
  scope.on(box, 'click', () => buy.click());
  scope.on(prev, 'click', () => select(index - 1));
  scope.on(next, 'click', () => select(index + 1));
  scope.on(stage, 'keydown', (e) => {
    if (e.key === 'ArrowLeft') select(index - 1);
    if (e.key === 'ArrowRight') select(index + 1);
  });

  const safeSwitch = $('.safe__switch', root);
  if (safeSwitch)
    scope.on(safeSwitch, 'click', () => {
      safe = !safe;
      store.set('safe', safe);
      safeSwitch.setAttribute('aria-checked', String(safe));
      stage.classList.toggle('is-safe', safe);
      paint(false);
      if (onTier) onTier(index, false);
    });

  const setQty = (n) => {
    qty = Math.max(1, Math.min(10, n || 1));
    qtyInput.value = qty;
    qtyLabel.textContent = (qty === 1 ? 'pack' : 'packs') + (unit ? ' ' + unit : '');
    $('.qty__btn[data-step="-1"]', root).disabled = qty === 1;
    $('.qty__btn[data-step="1"]', root).disabled = qty === 10;
    buy.textContent = cta();
  };
  $$('.qty__btn', root).forEach((b) => scope.on(b, 'click', () => setQty(qty + +b.dataset.step)));
  scope.on(qtyInput, 'input', () => {
    qtyInput.value = qtyInput.value.replace(/\D/g, '').slice(0, 2);
  });
  scope.on(qtyInput, 'change', () => setQty(parseInt(qtyInput.value, 10)));

  const closeMenu = () => {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.classList.remove('is-open');
  };
  const openMenu = () => {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('is-open');
    const sel = menu.querySelector('[aria-selected="true"]');
    if (sel) sel.focus({ preventScroll: true });
  };
  scope.on(trigger, 'click', (e) => {
    e.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });
  scope.on(menu, 'click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    closeMenu();
    if (+li.dataset.i !== index) select(+li.dataset.i);
    trigger.focus();
  });
  scope.on(menu, 'keydown', (e) => {
    const items = $$('li', menu);
    const at = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(items.length - 1, at + 1)].focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(0, at - 1)].focus();
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.activeElement.click();
    }
    if (e.key === 'Escape') {
      closeMenu();
      trigger.focus();
    }
  });
  scope.on(document, 'click', (e) => {
    if (!menu.hidden && !e.target.closest('.tiers')) closeMenu();
  });

  scope.on($('.range__odds', root), 'click', () => openOdds(pack(), safe));
  scope.on(buy, 'click', () => {
    const me = session.state;
    if (!me) {
      openAuth('signup');
      return;
    }
    if (me.balance < cost()) {
      toast(battle ? 'Add funds to start a battle' : 'Add funds to open packs');
      navigate('/add-funds');
      return;
    }
    if (battle) {
      const rule = $('.rule', root);
      startBattle(pack(), qty, !!rule && rule.getAttribute('aria-checked') === 'true', toast, navigate);
      return;
    }
    ceremony(pack(), qty, packs[index], toast);
  });
  scope.add(
    session.on(() => {
      buy.textContent = cta();
    }),
  );

  // Battle-only controls.
  $$('.opponent__chips .chip', root).forEach((chip) =>
    scope.on(chip, 'click', () => {
      if (chip.dataset.opp === 'search') {
        openAuth('login');
        return;
      }
      $$('.opponent__chips .chip', root).forEach((c) => {
        c.classList.toggle('is-on', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      });
    }),
  );
  const rule = $('.rule', root);
  if (rule)
    scope.on(rule, 'click', () => {
      const on = rule.getAttribute('aria-checked') !== 'true';
      rule.setAttribute('aria-checked', String(on));
      stage.classList.toggle('is-lowest', on);
    });

  setQty(1);
  select(index, { animate: false });
  return {
    get index() {
      return index;
    },
    get safe() {
      return safe;
    },
    pack,
  };
}

// ---- Signed-in actions ----

const CEREMONY_PACKS = ['arena', 'master', 'starter', 'trainer'];

function layer() {
  let l = document.querySelector('.demo-layer');
  if (!l) {
    l = document.createElement('div');
    l.className = 'demo-layer';
    l.hidden = true;
    document.body.append(l);
  }
  return l;
}

// Charge the demo balance (or use a free pack), move the pulls into the
// vault and reveal the best one with the pack-opening ceremony. Several
// packs end on a results sheet with every card.
export async function ceremony(pack, qty, packEl, toast, { free = false } = {}) {
  const pulls = openPacks(pack, qty, { free });
  const best = pulls.reduce((a, b) => (b.value > a.value ? b : a));
  const card = cardOf(best);
  await import('./ceremony.js');
  const idx = Math.max(0, CEREMONY_PACKS.indexOf(pack.art));
  await window.PackDemo.preload(idx).catch(() => {});
  const box = packEl ? packEl.getBoundingClientRect() : null;
  const host = layer();
  host.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  let after = null;
  const single = [
    {
      label: `Sell for ${money(best.value * 0.95)}`,
      onClick: () => {
        sell([best.uid]);
        toast(`Sold ${card.name} for ${money(best.value * 0.95)}`);
      },
    },
    { label: 'Keep', primary: true, onClick: () => toast(`${card.name} is in your Vault`) },
  ];
  const several = [
    { label: 'Keep all', onClick: () => toast(`${pulls.length} cards added to your Vault`) },
    {
      label: `See all ${pulls.length} cards`,
      primary: true,
      onClick: () => (after = () => showResults(pack, pulls, toast)),
    },
  ];
  window.PackDemo.open({
    root: host,
    pack: idx,
    from: box ? { x: box.left, y: box.top, w: box.width, h: box.height } : null,
    card: { id: card.id, name: card.name, value: best.value, tier: best.tier },
    actions: pulls.length > 1 ? several : single,
    onClose: () => {
      host.hidden = true;
      document.documentElement.style.overflow = '';
      if (after) after();
    },
  });
}

// Every card from a multi-pack open, best first, with sell / keep.
function showResults(pack, pulls, toast) {
  const sorted = pulls.slice().sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, p) => s + p.value, 0);
  const spent = pack.price * pulls.length;
  const node = el(
    html`<div class="results">
      <div class="odds__head">
        <h2>${pulls.length} ${pack.name} packs</h2>
        <button class="dialog__close" type="button" data-close>Done</button>
      </div>
      <p class="results__sum">
        Pulled <strong class="num">${money(total)}</strong> from
        <span class="num">${money(spent, { compact: true })}</span>
        <span class="results__delta num ${total >= spent ? 'is-up' : 'is-down'}"
          >${total >= spent ? '+' : '−'}${money(Math.abs(total - spent))}</span
        >
      </p>
      <ul class="results__grid">
        ${raw(
          sorted
            .map((p, i) => {
              const c = cardOf(p);
              return `<li style="--n:${i}" data-uid="${p.uid}"><span class="thumb${p.graded ? ' is-slab' : ''} glow-${p.tier === 'common' ? 'base' : p.tier}"><img src="${p.graded ? `/assets/slabs/${c.id}-400.webp` : `/app/assets/cards/${c.id}-200.webp`}" alt=""></span><span class="results__value num">${money(p.value)}</span><span class="results__name">${c.name}</span><button class="btn btn--secondary btn--sm results__sell" type="button">Sell</button></li>`;
            })
            .join(''),
        )}
      </ul>
      <div class="confirm__row">
        <button class="btn btn--secondary results__sellall" type="button">Sell all for ${money(total * 0.95)}</button>
        <button class="btn btn--primary" type="button" data-close>Keep all</button>
      </div>
    </div>`,
  );
  const close = openDialog(node, { label: 'Your pulls', className: 'overlay--results' });
  node.addEventListener('click', (e) => {
    const one = e.target.closest('.results__sell');
    if (one) {
      const li = one.closest('li');
      const got = sell([li.dataset.uid]);
      toast(`Sold for ${money(got)}`);
      li.classList.add('is-sold');
      one.disabled = true;
      one.textContent = 'Sold';
      return;
    }
    if (e.target.closest('.results__sellall')) {
      const left = [...node.querySelectorAll('li:not(.is-sold)')].map((li) => li.dataset.uid);
      const got = sell(left);
      toast(`Sold ${left.length} cards for ${money(got)}`);
      close();
    }
  });
}

// Post a battle: pay the entry now and wait in Open battles for someone to
// join (main.js brings an opponent in a few seconds later).
function startBattle(pack, qty, lowest, toast, navigate) {
  postBattle(pack, qty, lowest);
  toast('Battle posted — waiting for an opponent');
  if (location.pathname !== '/battles') navigate('/battles');
}
