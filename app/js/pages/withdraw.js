// Withdraw. Signed out: the payout methods and a Withdraw button that asks
// you to log in. Signed in (demo): pick a method and an amount; the demo
// balance goes down and the request shows under Recent withdrawals.
// Nothing is ever paid out — it's pretend credit.
import { icon } from '../ui/icons.js';
import { html, raw, $, $$ } from '../ui/dom.js';
import { viewHead, refresh } from '../main.js';
import { session, withdraw } from '../session.js';
import { money } from '../data.js';

export const title = 'Withdraw';

const METHODS = [
  {
    id: 'crypto',
    name: 'Crypto',
    fee: '0.5% fee',
    rate: 0.005,
    notes: ['USDC or USDT on Base, Ethereum, Arbitrum or Solana', 'Only for balance you deposited in crypto'],
    icon: 'globe',
  },
  { id: 'venmo', name: 'Venmo', fee: '3% fee', rate: 0.03, notes: ['Instant transfer'], icon: 'bolt' },
  {
    id: 'card',
    name: 'Debit card',
    fee: '3% fee',
    rate: 0.03,
    notes: ['Instant transfer to an eligible card'],
    icon: 'card',
  },
  { id: 'bank', name: 'Bank transfer', fee: '3% fee', rate: 0.03, notes: ['Standard or same-day ACH'], icon: 'bank' },
];

const when = (t) =>
  new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function mount(view, { scope, openAuth, toast }) {
  const me = session.state;
  view.innerHTML = html` ${raw(viewHead('Withdraw'))}
    <div class="payout">
      <h2>Withdrawal options</h2>
      <p class="payout__note">The fee comes out of the amount you withdraw — nothing extra is charged.</p>
      <div class="payout__list" role="radiogroup" aria-label="Withdrawal method">
        ${raw(
          METHODS.map(
            (m, i) =>
              html`<button
                class="payout__method${i === 0 ? ' is-on' : ''}"
                type="button"
                role="radio"
                aria-checked="${i === 0}"
                data-id="${m.id}"
              >
                <span class="payout__icon payout__icon--${m.id}">${raw(icon(m.icon, { size: 18 }))}</span>
                <span class="payout__text"
                  ><span class="payout__row"><strong>${m.name}</strong><span class="payout__fee">${m.fee}</span></span
                  >${raw(m.notes.map((n) => `<span class="payout__sub">${n}</span>`).join(''))}</span
                >
                ${raw(i === 0 ? `<span class="payout__chev">${icon('chevronRight', { size: 18 })}</span>` : '')}
              </button>`,
          ).join(''),
        )}
      </div>
      <p class="payout__small">
        Arrival times for bank, card and Venmo payouts depend on your provider. Your first withdrawal may take a little
        longer while we confirm your details.
      </p>
      ${
        me
          ? raw(
              html`<label class="payout__amount">
                  <span>Amount</span>
                  <span class="payout__field"
                    ><span>$</span
                    ><input
                      class="num"
                      type="text"
                      inputmode="decimal"
                      placeholder="0.00"
                      aria-label="Withdrawal amount"
                    /><button type="button" class="payout__max">Max</button></span
                  >
                </label>
                <p class="payout__small payout__avail">
                  Available to withdraw: <strong class="num" data-avail>${money(me.balance)} USD</strong>
                  <span class="payout__receive" hidden>· You receive <strong class="num" data-receive></strong></span>
                </p>`,
            )
          : raw('<p class="payout__small">Log in to withdraw your available balance.</p>')
      }
      <button class="btn btn--primary payout__go" type="button">Withdraw</button>
      <a class="payout__help" href="mailto:support@godpack.gg">Need help with a withdrawal? Contact support</a>
      ${
        me && me.withdrawals.length
          ? raw(
              html`<section class="payout__history">
                <h3>Recent withdrawals</h3>
                <ul>
                  ${raw(me.withdrawals.map((w) => `<li><span><strong class="num">${money(w.amount)}</strong> via ${w.method}</span><span class="payout__state">Requested · ${when(w.at)}</span></li>`).join(''))}
                </ul>
              </section>`,
            )
          : ''
      }
    </div>`;

  const items = $$('.payout__method', view);
  const method = () => METHODS.find((m) => m.id === items.find((x) => x.classList.contains('is-on')).dataset.id);
  items.forEach((b) =>
    scope.on(b, 'click', () => {
      items.forEach((x) => {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-checked', String(x === b));
      });
      quote();
    }),
  );
  scope.on($('.payout__list', view), 'keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const at = items.findIndex((x) => x.classList.contains('is-on'));
    const n = (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[n].click();
    items[n].focus();
  });

  const input = $('.payout__field input', view);
  const amount = () => (input ? parseFloat(input.value.replace(/,/g, '')) : NaN);
  function quote() {
    if (!input) return;
    const v = amount();
    const ok = isFinite(v) && v >= 1 && v <= session.state.balance;
    $('.payout__go', view).disabled = !ok;
    $('.payout__field', view).classList.toggle('is-error', input.value !== '' && !ok);
    const r = $('.payout__receive', view);
    r.hidden = !ok;
    if (ok) $('[data-receive]', view).textContent = money(v * (1 - method().rate));
  }
  if (input) {
    scope.on(input, 'input', () => {
      input.value = input.value.replace(/[^\d.,]/g, '');
      quote();
    });
    scope.on($('.payout__max', view), 'click', () => {
      input.value = session.state.balance.toFixed(2);
      quote();
    });
    quote();
  }

  scope.on($('.payout__go', view), 'click', () => {
    if (!me) return openAuth('login');
    const v = Math.round(amount() * 100) / 100;
    withdraw(v, method().name);
    toast(`Withdrawal of ${money(v)} requested (demo — nothing is sent)`);
    refresh();
  });
}
