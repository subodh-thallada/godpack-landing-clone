// Global Chat dock: a bar pinned to the bottom-right that expands into a
// message panel. Signed out, the composer only offers to log in; with the
// demo account you can type, and messages stay in this browser. The dock
// can be dragged by its grip; the online count drifts and a few new
// (invented) messages arrive over time.
import { icon } from './icons.js';
import { html, raw, el, $, store, reducedMotion } from './dom.js';
import { CHAT, CHAT_LATER, user } from '../data.js';

function avatar(u) {
  return `<span class="avatar" style="background:${u.color}">${u.handle[0].toUpperCase()}</span>`;
}

function message(m, fresh) {
  const u = m.self || user(m.u);
  return el(
    html`<li class="msg${fresh ? ' is-fresh' : ''}">
      ${raw(avatar(u))}
      <div class="msg__body">
        <div class="msg__meta">
          <span class="msg__name">@${u.handle}</span>
          ${u.vip ? raw(`<span class="badge-vip">VIP ${u.vip}</span>`) : ''}
          <time class="msg__time">${m.m == null ? 'just now' : m.m === 0 ? 'just now' : `${m.m}m ago`}</time>
        </div>
        <p class="msg__text">${m.t}</p>
        ${m.reacts ? raw(`<span class="msg__react">✨ <span class="num">${m.reacts}</span></span>`) : ''}
      </div>
    </li>`,
  );
}

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
            placeholder="Say something…"
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
  CHAT.slice()
    .reverse()
    .forEach((m) => log.append(message(m)));
  const scrollDown = () => {
    log.scrollTop = log.scrollHeight;
  };
  requestAnimationFrame(scrollDown);

  const head = $('.dock__head', dock);
  const setOpen = (on) => {
    dock.classList.toggle('is-open', on);
    head.setAttribute('aria-expanded', String(on));
    head.setAttribute('aria-label', `${on ? 'Hide' : 'Show'} Global Chat`);
    store.set('chatOpen', on);
    if (on) requestAnimationFrame(scrollDown);
  };
  head.addEventListener('click', () => setOpen(!dock.classList.contains('is-open')));
  $('.dock__login', dock).addEventListener('click', () => openAuth('login'));
  const input = $('.dock__input', dock);
  const send = $('.dock__send', dock);
  const paintComposer = () => {
    const on = session && session.signedIn;
    $('.dock__login', dock).hidden = on;
    input.hidden = !on;
    send.disabled = !on || !input.value.trim();
  };
  paintComposer();
  if (session) session.on(paintComposer);
  input.addEventListener('input', paintComposer);
  $('.dock__compose', dock).addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !session || !session.signedIn) return;
    const me = session.state;
    log.append(message({ t: text, m: 0, self: { handle: me.handle, color: me.color, vip: 0 } }, true));
    input.value = '';
    paintComposer();
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
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
      while (log.children.length > 40) log.firstElementChild.remove();
      if (nearBottom) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    }, 14000);
  }
  return dock;
}
