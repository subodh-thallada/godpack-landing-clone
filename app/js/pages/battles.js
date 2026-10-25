// Battles: the store block in battle mode (seats, opponent, Lowest wins),
// then the list of open battles with tier filters. Signed in, one demo
// battle is open to join, with a live countdown.
import { icon } from '../ui/icons.js';
import { html, raw, $, $$ } from '../ui/dom.js';
import { viewHead } from '../main.js';
import { storeMarkup, wireStore, initialPack } from '../ui/store.js';
import { PACKS, packArt, user } from '../data.js';
import { session } from '../session.js';

export const title = 'Battles';

const EMPTY = 'No battles are open right now. Start one and it stays listed here for 15 minutes.';

function openRow(b, left) {
  const m = Math.floor(left / 60),
    sec = String(left % 60).padStart(2, '0');
  return html`<li class="ob surface" data-pack="${b.pack.id}">
    <div class="ob__host">
      <span class="avatar" style="width:40px;height:40px;font-size:16px;background:${b.host.color}"
        >${b.host.handle[0].toUpperCase()}</span
      >
      <div><a class="ob__name" href="/feed" data-link>@${b.host.handle}</a><span class="num">${b.record}</span></div>
    </div>
    <div class="ob__pack">
      <img src="${packArt(b.pack, 240)}" alt="" width="34" height="48" />
      <div>
        <strong>${b.pack.name} × ${b.each}</strong
        ><span class="num">$${b.pack.price * b.each} entry · winner takes ${b.each * 2} cards</span>
      </div>
    </div>
    <span class="ob__time num"><span class="ob__clock">${m}:${sec}</span>${raw(icon('clock', { size: 15 }))}</span>
    <button class="btn btn--primary ob__join" type="button">Join</button>
  </li>`;
}

export function mount(view, { scope, openAuth, navigate, toast }) {
  const signedIn = session.signedIn;
  const open = signedIn
    ? [
        {
          host: user('pixelmint'),
          record: '0–0',
          pack: PACKS[1],
          each: 10,
          ends: Date.now() + 12 * 60 * 1000 + 39 * 1000,
        },
      ]
    : [];
  view.innerHTML = html` ${raw(viewHead('Battles', 'Two collectors open the same pack. The bigger total takes every card — or the smaller one, in Lowest wins battles.'))}
    ${raw(storeMarkup({ battle: true, index: initialPack(true) }))}
    <section class="open-battles">
      <div class="open-battles__head">
        <h2>
          ${raw(icon('battles', { size: 20 }))}<span>Open battles</span
          ><span class="open-battles__count num">${open.length} open</span>
        </h2>
        <div class="open-battles__chips" role="group" aria-label="Filter by pack">
          ${raw(['All', 'Starter', 'Trainer', 'Arena', 'Master'].map((t, i) => `<button class="chip${i === 0 ? ' is-on' : ''}" type="button" aria-pressed="${i === 0}">${t}</button>`).join(''))}
        </div>
      </div>
      <ul class="obs"></ul>
      <div class="open-battles__empty" ${open.length ? ' hidden' : ''}><p>${EMPTY}</p></div>
    </section>`;

  wireStore(view, { scope, openAuth, battle: true, navigate, toast });

  const list = $('.obs', view);
  const empty = $('.open-battles__empty', view);
  let filter = 'All';
  const paint = () => {
    const now = Date.now();
    const shown = open.filter((b) => b.ends > now && (filter === 'All' || b.pack.name === filter));
    list.innerHTML = shown.map((b) => openRow(b, Math.ceil((b.ends - now) / 1000))).join('');
    empty.hidden = shown.length > 0;
    $('p', empty).textContent = filter === 'All' ? EMPTY : `No ${filter} battles are open right now.`;
    $('.open-battles__count', view).textContent = `${open.filter((b) => b.ends > now).length} open`;
  };
  paint();
  // Tick the countdowns without rebuilding the rows.
  scope.timer(() => {
    const now = Date.now();
    $$('.ob', list).forEach((row, i) => {
      const b = open.filter((x) => filter === 'All' || x.pack.name === filter)[i];
      if (!b) return;
      const left = Math.max(0, Math.ceil((b.ends - now) / 1000));
      $('.ob__clock', row).textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (!left) paint();
    });
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
    if (!e.target.closest('.ob__join')) return;
    const b = open[0];
    const me = session.state;
    if (!me) {
      openAuth('login');
      return;
    }
    const entry = b.pack.price * b.each;
    if (me.balance < entry) {
      toast(`Add ${'$' + (entry - me.balance).toFixed(2).replace(/\.00$/, '')} to join this battle`);
      navigate('/add-funds');
      return;
    }
    session.update((s) => {
      s.balance = Math.round((s.balance - entry) * 100) / 100;
    });
    const { replayBattle } = await import('./feed.js');
    replayBattle({ pack: b.pack, each: b.each, mine: true });
    open.splice(0, 1);
    paint();
  });
}
