// Battles: the store block in battle mode (seats, opponent, Lowest wins),
// then Open battles — other collectors' battles you can join and any
// battle you've posted (waiting for an opponent, with Cancel).
import { icon } from '../ui/icons.js';
import { html, raw, $, $$ } from '../ui/dom.js';
import { viewHead, avatarOf } from '../main.js';
import { storeMarkup, wireStore, initialPack } from '../ui/store.js';
import { PACKS, packArt, user, money } from '../data.js';
import { session, lobbyBattles, joinLobby, cancelBattle } from '../session.js';

export const title = 'Battles';

const EMPTY = 'No battles are open right now. Start one and it stays listed here for 15 minutes.';
const OPEN_FOR = 15 * 60000;
const clock = (ms) => {
  const left = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
};

function rows() {
  const s = session.state;
  if (!s) return [];
  const mine = s.battles
    .filter((b) => b.status === 'open')
    .map((b) => ({
      ...b,
      mine: true,
      host: s.handle,
      ends: b.at + OPEN_FOR,
      pack: PACKS.find((p) => p.id === b.pack),
    }));
  const others = lobbyBattles().map((b) => ({ ...b, pack: PACKS.find((p) => p.id === b.pack) }));
  return [...mine, ...others];
}

function row(b) {
  const me = session.state;
  const host = b.mine ? { handle: me.handle, color: me.color } : user(b.host);
  return html`<li class="ob surface${b.mine ? ' is-mine' : ''}" data-id="${b.id}" data-pack="${b.pack.name}">
    <div class="ob__host">
      ${raw(avatarOf(host, 40))}
      <div>
        ${
          b.mine
            ? raw(`<span class="ob__name">You</span><span class="num">Waiting for an opponent…</span>`)
            : raw(
                `<a class="ob__name" href="/profile/${host.handle}" data-link>@${host.handle}</a><span class="num">${b.record}</span>`,
              )
        }
      </div>
    </div>
    <div class="ob__pack">
      <img src="${packArt(b.pack, 240)}" alt="" width="34" height="48" />
      <div>
        <strong>${b.pack.name} × ${b.each}${b.lowest ? ' · Lowest wins' : ''}</strong
        ><span class="num"
          >${money(b.pack.price * b.each, { compact: true })} entry · winner takes ${b.each * 2} cards</span
        >
      </div>
    </div>
    <span class="ob__time num"
      ><span class="ob__clock">${clock(b.ends - Date.now())}</span>${raw(icon('clock', { size: 15 }))}</span
    >
    ${
      b.mine
        ? raw('<button class="btn btn--secondary ob__cancel" type="button">Cancel</button>')
        : raw('<button class="btn btn--primary ob__join" type="button">Join</button>')
    }
  </li>`;
}

export function mount(view, { scope, openAuth, navigate, toast }) {
  view.innerHTML = html` ${raw(viewHead('Battles', 'Two collectors open the same pack. The bigger total takes every card — or the smaller one, in Lowest wins battles.'))}
    ${raw(storeMarkup({ battle: true, index: initialPack(true) }))}
    <section class="open-battles">
      <div class="open-battles__head">
        <h2>
          ${raw(icon('battles', { size: 20 }))}<span>Open battles</span><span class="open-battles__count num"></span>
        </h2>
        <div class="open-battles__chips" role="group" aria-label="Filter by pack">
          ${raw(['All', 'Starter', 'Trainer', 'Arena', 'Master'].map((t, i) => `<button class="chip${i === 0 ? ' is-on' : ''}" type="button" aria-pressed="${i === 0}">${t}</button>`).join(''))}
        </div>
      </div>
      <ul class="obs"></ul>
      <div class="open-battles__empty"><p>${EMPTY}</p></div>
    </section>`;

  wireStore(view, { scope, openAuth, battle: true, navigate, toast });

  const list = $('.obs', view);
  const empty = $('.open-battles__empty', view);
  let filter = 'All';
  let shown = [];
  const paint = () => {
    const all = rows();
    shown = all.filter((b) => filter === 'All' || b.pack.name === filter);
    list.innerHTML = shown.map(row).join('');
    empty.hidden = shown.length > 0;
    $('p', empty).textContent = filter === 'All' ? EMPTY : `No ${filter} battles are open right now.`;
    $('.open-battles__count', view).textContent = `${all.length} open`;
  };
  paint();
  scope.add(session.on(paint));

  // Tick the countdowns in place; repaint when one runs out.
  scope.timer(() => {
    let expired = false;
    $$('.ob', list).forEach((li, i) => {
      const b = shown[i];
      if (!b) return;
      const left = b.ends - Date.now();
      $('.ob__clock', li).textContent = clock(left);
      if (left <= 0) expired = true;
    });
    if (expired) paint();
  }, 1000);

  const chips = $$('.open-battles__chips .chip', view);
  chips.forEach((c) =>
    scope.on(c, 'click', () => {
      chips.forEach((x) => {
        x.classList.toggle('is-on', x === c);
        x.setAttribute('aria-pressed', String(x === c));
      });
      filter = c.textContent;
      paint();
    }),
  );

  scope.on(list, 'click', async (e) => {
    const li = e.target.closest('.ob');
    if (!li) return;
    if (e.target.closest('.ob__cancel')) {
      cancelBattle(li.dataset.id);
      toast('Battle cancelled — entry refunded');
      return;
    }
    if (!e.target.closest('.ob__join')) return;
    const me = session.state;
    if (!me) {
      openAuth('login');
      return;
    }
    const b = shown.find((x) => x.id === li.dataset.id);
    const entry = b.pack.price * b.each;
    if (me.balance < entry) {
      toast(`Add ${money(entry - me.balance)} to join this battle`);
      navigate('/add-funds');
      return;
    }
    const joined = joinLobby(b.id);
    const { replayBattle } = await import('./feed.js');
    replayBattle({ id: joined.id, pack: joined.pack, each: joined.each, mine: true, opponent: joined.host });
  });
}
