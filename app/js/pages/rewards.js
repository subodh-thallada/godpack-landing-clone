// Rewards: the VIP card and tier table on the left; free packs, referral
// cash, invites and the daily check-in on the right. Signed in (demo), the
// card carries your handle, the table shows progress to the next tier and
// check-ins advance a local streak.
import { icon } from '../ui/icons.js';
import { html, raw, $, $$ } from '../ui/dom.js';
import { viewHead, refresh } from '../main.js';
import { VIP_LEVELS, PACKS, packArt, money } from '../data.js';
import { session, nextVip } from '../session.js';

export const title = 'Rewards';

const vol = (v) => (v === 0 ? 'No minimum' : '$' + v.toLocaleString('en-US') + '+');
const DAY = 86400000;
const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function untilMidnight() {
  const left = startOfDay(Date.now()) + DAY - Date.now();
  return `${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m left today`;
}

export function mount(view, { scope, openAuth, toast }) {
  const me = session.state;
  const next = me ? nextVip(me.volume) : null;
  const checkedToday = me && me.lastCheckIn >= startOfDay(Date.now());

  const tierState = me
    ? html`<div class="rw-next">
        <div class="rw-next__row">
          <strong>Next: ${next ? next[1] : 'Top tier'}</strong
          ><span class="num"
            >${money(me.volume, { compact: true })} / ${next ? '$' + next[0].toLocaleString('en-US') : '—'}</span
          >
        </div>
        <span class="rw-next__bar"
          ><i style="--w:${next ? Math.max(1, (me.volume / next[0]) * 100).toFixed(1) : 100}%"></i
        ></span>
        <p>
          ${next ? `$${(next[0] - me.volume).toLocaleString('en-US')} more in pack volume for a ${next[2]}% sell-back fee.` : 'You are at the top tier.'}
        </p>
      </div>`
    : html`<div class="rw-tiers__state">
        <p>Log in to see your tier, your fee and how close you are to the next one.</p>
        <button class="btn btn--primary" type="button" data-auth="login" style="min-width:0">Log in</button>
      </div>`;

  view.innerHTML = html` ${raw(viewHead('Rewards'))}
    <div class="rw">
      <div class="rw__col">
        <button class="vip" type="button" aria-label="Your VIP card: Standard, 5% sell-back fee. Click to flip.">
          <span class="vip__tilt"
            ><span class="vip__flip">
              <span class="vip__face vip__front">
                <span class="vip__grain"></span>
                <svg class="vip__arc" viewBox="0 0 450 284" aria-hidden="true">
                  <ellipse
                    cx="310"
                    cy="270"
                    rx="268"
                    ry="136"
                    fill="none"
                    stroke="rgb(255 255 255 / 0.07)"
                    stroke-width="1.2"
                    transform="rotate(-18 310 270)"
                  />
                </svg>
                <span class="vip__sheen"></span>
                <span class="vip__body">
                  <span class="vip__top"
                    ><img src="/assets/logo.png" alt="" class="vip__mark" /><span class="vip__tier"
                      >STANDARD</span
                    ></span
                  >
                  <span class="vip__fee"
                    ><span class="vip__rate num">5%</span><span class="vip__cap">Sell-back fee</span></span
                  >
                  <span class="vip__bottom"
                    >${me ? raw(`<span class="vip__holder">@${me.handle.toUpperCase()}</span>`) : ''}<span
                      class="vip__tag"
                      >VIP</span
                    ></span
                  >
                </span>
              </span>
              <span class="vip__face vip__back">
                <span class="vip__grain"></span>
                <span class="vip__stripe"></span>
                <img src="/assets/logo.png" alt="" class="vip__mark vip__mark--back" />
              </span> </span
          ></span>
        </button>
        <section class="rw-panel rw-tiers">
          ${raw(tierState)}
          <table class="rw-table">
            <caption class="sr">
              VIP tiers by rolling 30-day pack volume and sell-back fee
            </caption>
            <thead>
              <tr>
                <th scope="col">Tier</th>
                <th scope="col">30-day volume</th>
                <th scope="col">Sell-back fee</th>
              </tr>
            </thead>
            <tbody>
              ${raw(VIP_LEVELS.map(([n, v, f], i) => `<tr${me && i === 0 ? ' class="is-current"' : ''}><th scope="row">${n}${me && i === 0 ? ' <span class="rw-current">Current</span>' : ''}</th><td class="num">${vol(v)}</td><td class="num">${f}%</td></tr>`).join(''))}
            </tbody>
          </table>
          <p class="rw-tiers__rules">
            Paid pack purchases count toward your volume. Free packs, deposits and refunds don't.
          </p>
        </section>
      </div>

      <div class="rw__col">
        <div class="rw-tiles">
          <section class="rw-panel rw-tile">
            <div class="rw-tile__main">
              <div>
                <strong class="rw-value num${me ? ' is-set' : ''}">${me ? `${me.freePacks || 0}×` : '—'}</strong
                ><span class="rw-label">Free packs</span>
              </div>
              ${me ? raw(me.freePacks ? '<button class="btn rw-gold rw-open-free" type="button">Open free pack</button>' : '<span class="rw-hint">Invite a friend to earn one</span>') : raw('<button class="btn rw-gold" type="button" data-auth="signup">Sign up</button>')}
            </div>
            <div class="rw-stack" aria-hidden="true">
              ${raw(
                PACKS.slice(0, 3)
                  .map((p, i) => `<img src="${packArt(p, 240)}" alt="" class="${i ? 'is-parked' : ''}">`)
                  .join(''),
              )}
            </div>
          </section>
          <section class="rw-panel rw-tile">
            <div class="rw-tile__main">
              <div>
                <strong class="rw-value num${me ? ' is-set' : ''}">${me ? '$0' : '—'}</strong
                ><span class="rw-label">Referral cash</span>
              </div>
              <span class="rw-hint">${me ? '$0 earned so far' : 'Log in to see your earnings'}</span>
            </div>
          </section>
          <section class="rw-panel rw-invite">
            <h2>Invite friends</h2>
            <div class="rw-invite__stats">
              <div><strong>10%</strong><span>of their fees, for life</span></div>
              <div><strong>10%</strong><span>off fees for them</span></div>
              <div><strong>Up to 5 packs</strong><span>plus one for each friend</span></div>
            </div>
            <div class="rw-invite__link">
              <label class="rw-link"
                ><span class="rw-link__tag">Link</span
                ><input
                  type="text"
                  readonly
                  ${raw(me ? `value="${location.host}/r/${me.handle}"` : 'placeholder="Log in to get your invite link"')}
                /><button type="button" class="rw-link__copy" data-copy="link">Copy</button></label
              >
              ${me ? raw(`<label class="rw-link rw-link--code"><span class="rw-link__tag">Code</span><input type="text" readonly value="${me.handle.toUpperCase()}"><button type="button" class="rw-link__copy" data-copy="code">Copy</button></label>`) : ''}
              <button class="btn btn--primary rw-share" type="button">Share</button>
            </div>
          </section>
        </div>

        <section class="rw-panel rw-daily">
          <div class="rw-daily__head">
            <h2>Daily check-in</h2>
            ${me ? raw(`<span class="rw-daily__timer num">${untilMidnight()}</span>`) : ''}
          </div>
          <p class="rw-daily__sub">Check in seven days in a row to earn a free pack.</p>
          ${me ? raw(`<strong class="rw-streak num">${me.streak}-day streak</strong>`) : raw('<strong class="rw-value rw-value--sm num">—</strong>')}
          <ol class="streak" aria-label="Seven-day streak">
            ${raw(
              [1, 2, 3, 4, 5, 6]
                .map((d) => {
                  const done = me && d <= me.streak;
                  const today = me && d === me.streak + (checkedToday ? 0 : 1);
                  return `<li class="streak__day${done ? ' is-done' : ''}${today ? ' is-today' : ''}"><span class="num">${done ? icon('check', { size: 16 }) : d}</span>${today ? '<em>Today</em>' : ''}</li>`;
                })
                .join(''),
            )}
            <li class="streak__prize">
              <span class="streak__pack"
                ><img src="${packArt(PACKS[0], 240)}" alt="" /><span class="streak__lock"
                  >${raw(icon('key', { size: 11 }))}</span
                ></span
              ><span>Free pack</span>
            </li>
          </ol>
          <p class="rw-daily__hint">
            ${me ? (checkedToday ? 'Checked in today. Come back tomorrow to keep the streak going.' : 'Check in once a day to build your streak.') : 'Log in to start a streak and claim rewards.'}
          </p>
          <button class="btn btn--buy rw-checkin" type="button" ${checkedToday ? ' disabled' : ''}>
            ${checkedToday ? 'Checked in' : 'Check in'}
          </button>
        </section>
      </div>
    </div>`;

  // VIP card: tilts toward the pointer, flips on click.
  const card = $('.vip', view);
  const tilt = $('.vip__tilt', view);
  scope.on(card, 'pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.transform = `rotateY(${(x * 12).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg)`;
    card.style.setProperty('--sx', (x + 0.5).toFixed(3));
  });
  scope.on(card, 'pointerleave', () => {
    tilt.style.transform = '';
  });
  scope.on(card, 'click', () => card.classList.toggle('is-flipped'));

  // A free pack opens a Starter pack at no cost, with the full ceremony.
  const openFree = $('.rw-open-free', view);
  if (openFree)
    scope.on(openFree, 'click', async () => {
      const { ceremony } = await import('../ui/store.js');
      const art = $('.rw-stack img:not(.is-parked)', view);
      ceremony(PACKS[0], 1, art, toast, { free: true });
    });
  scope.add(
    session.on(() => {
      const s = session.state;
      if (!s) return;
      const v = $('.rw-tile .rw-value', view);
      if (v) v.textContent = `${s.freePacks || 0}×`;
      if (openFree && !s.freePacks)
        openFree.replaceWith(
          Object.assign(document.createElement('span'), {
            className: 'rw-hint',
            textContent: 'Invite a friend to earn one',
          }),
        );
    }),
  );

  const stack = $$('.rw-stack img', view);
  let top = 0;
  scope.timer(() => {
    stack[top].classList.add('is-parked');
    top = (top + 1) % stack.length;
    stack[top].classList.remove('is-parked');
  }, 3200);

  $$('.rw-link__copy', view).forEach((b) =>
    scope.on(b, 'click', () => {
      if (!me) {
        openAuth('login');
        return;
      }
      const input = b.parentElement.querySelector('input');
      if (navigator.clipboard) navigator.clipboard.writeText(input.value).catch(() => {});
      toast(b.dataset.copy === 'code' ? 'Code copied' : 'Link copied');
    }),
  );
  scope.on($('.rw-share', view), 'click', () => (me ? toast('Link copied') : openAuth('login')));

  scope.on($('.rw-checkin', view), 'click', () => {
    if (!me) {
      openAuth('login');
      return;
    }
    session.update((s) => {
      const yesterday = startOfDay(Date.now()) - DAY;
      s.streak = s.lastCheckIn >= yesterday ? s.streak + 1 : 1;
      s.lastCheckIn = Date.now();
      if (s.streak >= 7) {
        s.streak = 0;
        s.freePacks = (s.freePacks || 0) + 1;
      }
    });
    toast(
      session.state.streak === 0
        ? 'Seven days! A free pack is waiting for you'
        : `Checked in — ${session.state.streak}-day streak`,
    );
    // Re-render to show the new streak with the fill animation.
    const day = view.querySelectorAll('.streak__day')[Math.max(0, session.state.streak - 1)];
    if (day) day.classList.add('is-filling');
    scope.later(refresh, 650);
  });
  if (me)
    scope.timer(() => {
      const t = $('.rw-daily__timer', view);
      if (t) t.textContent = untilMidnight();
    }, 30000);
}
