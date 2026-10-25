// Global Chat dock: a bar pinned to the bottom-right that expands into a
// message panel. Signed out, the composer only offers to log in. Signed in
// (demo), you can post messages and share pulls; they're kept in this
// browser with the rest of the demo account. While the dock is collapsed,
// new messages raise an unread badge. The dock can be dragged by its grip;
// the online count drifts and a few new (invented) messages arrive.
import { icon } from './icons.js';
import { html, raw, el, $, store, reducedMotion } from './dom.js';
import { CHAT, CHAT_LATER, CARDS, PACKS, user, cardArt, slabArt, money } from '../data.js';

function avatar(u) {
  return `<span class="avatar" style="background:${u.color}">${u.handle[0].toUpperCase()}</span>`;
}

const ago = (m) => (m == null || m < 1 ? 'just now' : `${m}m ago`);

// A shared pull: the card, who pulled it from which pack, and its value.
function pullCard(m) {
  const card = CARDS.find((c) => c.id === m.card) || CARDS[0];
  const pack = PACKS.find((p) => p.id === m.pack) || PACKS[0];
  const graded = pack.slabs;
  return `<a class="msg__pull" href="/profile/${m.by}" data-link><span class="thumb${graded ? ' is-slab' : ''}"><img src="${graded ? slabArt(card.id) : cardArt(card.id, 'small')}" alt=""></span><span class="msg__pull-text"><strong>${card.name}</strong><span>Pulled by @${m.by} · ${pack.name}</span><span class="msg__pull-value num">${money(m.value)}</span></span></a>`;
}

function message(m, fresh) {
  const u = m.self || user(m.u);
  const href = m.self ? '/profile' : `/profile/${u.handle}`;
  return el(
    html`<li class="msg${fresh ? ' is-fresh' : ''}">
      <a href="${href}" data-link class="msg__avatar" aria-label="@${u.handle}">${raw(avatar(u))}</a>
      <div class="msg__body">
        <div class="msg__meta">
          <a class="msg__name" href="${href}" data-link>@${u.handle}</a>
          ${u.vip ? raw(`<span class="badge-vip">VIP ${u.vip}</span>`) : ''}
          <time class="msg__time">${ago(m.m)}</time>
        </div>
        ${m.type === 'pull' ? raw(`<p class="msg__text">Shared a pull</p>${pullCard(m)}`) : raw(`<p class="msg__text">${escapeText(m.t)}</p>`)}
        ${m.reacts ? raw(`<span class="msg__react">✨ <span class="num">${m.reacts}</span></span>`) : ''}
      </div>
    </li>`,
  );
}

const escapeText = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function mountChat(host, { openAuth, session }) {
  const open = store.get('chatOpen', false);
  const dock = el(
    html`<section class="dock${open ? ' is-open' : ''}" aria-label="Global Chat">
      <div class="dock__bar">
        <button class="dock__grip" type="button" aria-label="Move Global Chat">
          ${raw(icon('grip', { size: 18 }))}
        </button>
        <button
          class="dock__head"
          type="button"
          aria-expanded="${open}"
          aria-label="${open ? 'Hide' : 'Show'} Global Chat"
        >
          <span class="dock__title">Global Chat</span>
          <span class="dock__unread num" hidden></span>
          <span class="dock__online"><i></i><span class="num">23</span> online</span>
          <span class="dock__chev">${raw(icon('chevronUp', { size: 18 }))}</span>
        </button>
      </div>
      <div class="dock__panel">
        <ol class="dock__log" aria-live="polite"></ol>
        <form class="dock__compose">
          <button type="button" class="dock__login">Log in to chat</button>
          <input
            class="dock__input"
            type="text"
            maxlength="200"
            placeholder="Message"
            aria-label="Message Global Chat"
            hidden
          />
          <button type="submit" class="dock__send" aria-label="Send" disabled>
            ${raw(icon('send', { size: 16 }))}
          </button>
        </form>
      </div>
    </section>`,
  );
  host.append(dock);

  const log = $('.dock__log', dock);
  const head = $('.dock__head', dock);
  const badge = $('.dock__unread', dock);
  const isOpen = () => dock.classList.contains('is-open');
  const scrollDown = (smooth) => log.scrollTo({ top: log.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });

  // Unread: messages that arrive while the dock is collapsed.
  let unread = session && session.signedIn && !open ? 3 : 0;
  const paintBadge = () => {
    badge.hidden = !unread || isOpen();
    badge.textContent = unread > 99 ? '99+' : unread;
  };
  paintBadge();

  // Seed messages, then your own (kept with the demo account).
  CHAT.slice()
    .reverse()
    .forEach((m) => log.append(message(m)));
  let rendered = 0;
  const me = () => session && session.state;
  const renderMine = (fresh) => {
    const mine = me() ? me().chat : [];
    if (mine.length < rendered) rendered = 0;
    mine.slice(rendered).forEach((m) => {
      log.append(
        message(
          {
            ...m,
            m: Math.floor((Date.now() - m.at) / 60000),
            self: { handle: me().handle, color: me().color, vip: 0 },
          },
          fresh,
        ),
      );
    });
    const added = mine.length - rendered;
    rendered = mine.length;
    return added;
  };
  renderMine(false);
  requestAnimationFrame(() => scrollDown(false));

  const setOpen = (on) => {
    dock.classList.toggle('is-open', on);
    head.setAttribute('aria-expanded', String(on));
    head.setAttribute('aria-label', `${on ? 'Hide' : 'Show'} Global Chat`);
    store.set('chatOpen', on);
    if (on) {
      unread = 0;
      requestAnimationFrame(() => scrollDown(false));
    }
    paintBadge();
  };
  head.addEventListener('click', () => setOpen(!isOpen()));
  $('.dock__login', dock).addEventListener('click', () => openAuth('login'));

  const input = $('.dock__input', dock);
  const send = $('.dock__send', dock);
  const paintComposer = () => {
    const on = !!(session && session.signedIn);
    $('.dock__login', dock).hidden = on;
    input.hidden = !on;
    send.disabled = !on || !input.value.trim();
  };
  paintComposer();
  if (session) {
    session.on(() => {
      paintComposer();
      if (renderMine(true)) {
        if (!isOpen()) setOpen(true);
        scrollDown(true);
      }
    });
  }
  input.addEventListener('input', paintComposer);
  $('.dock__compose', dock).addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !session || !session.signedIn) return;
    const { postChat } = await import('../session.js');
    input.value = '';
    postChat({ type: 'text', t: text });
    paintComposer();
  });

  // Drag by the grip; a double-click on it puts the dock back.
  const grip = $('.dock__grip', dock);
  let drag = null;
  grip.addEventListener('pointerdown', (e) => {
    const r = dock.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    grip.setPointerCapture(e.pointerId);
    dock.classList.add('is-dragging');
  });
  grip.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const w = dock.offsetWidth,
      h = dock.offsetHeight;
    const x = Math.min(window.innerWidth - w - 4, Math.max(4, e.clientX - drag.dx));
    const y = Math.min(window.innerHeight - h, Math.max(4, e.clientY - drag.dy));
    dock.dataset.moved = '';
    dock.style.left = x + 'px';
    dock.style.top = y + 'px';
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';
  });
  const endDrag = () => {
    drag = null;
    dock.classList.remove('is-dragging');
  };
  grip.addEventListener('pointerup', endDrag);
  grip.addEventListener('pointercancel', endDrag);
  grip.addEventListener('dblclick', () => {
    delete dock.dataset.moved;
    dock.style.left = dock.style.top = dock.style.right = dock.style.bottom = '';
  });

  // Live feel: drifting presence and an occasional new message.
  const count = $('.dock__online .num', dock);
  let online = 23;
  setInterval(() => {
    online = Math.max(14, Math.min(34, online + Math.round((Math.random() - 0.5) * 3)));
    count.textContent = online;
  }, 9000);
  let next = 0;
  if (!reducedMotion()) {
    setInterval(() => {
      const m = CHAT_LATER[next++ % CHAT_LATER.length];
      const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
      log.append(message({ ...m, m: 0 }, true));
      while (log.children.length > 60) log.firstElementChild.remove();
      if (nearBottom) scrollDown(true);
      if (!isOpen() && session && session.signedIn) {
        unread += 1;
        paintBadge();
      }
    }, 14000);
  }
  return dock;
}
