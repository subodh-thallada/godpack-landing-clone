// Withdraw (signed out): the payout methods as a radio list, then a
// Withdraw button that asks you to log in.
import { icon } from '../ui/icons.js';
import { html, raw, $, $$ } from '../ui/dom.js';
import { viewHead } from '../main.js';
import { session } from '../session.js';
import { money } from '../data.js';

export const title = 'Withdraw';

const METHODS = [
  {
    id: 'crypto',
    name: 'Crypto',
    fee: '0.5% fee',
    notes: ['USDC or USDT on Base, Ethereum, Arbitrum or Solana', 'Only for balance you deposited in crypto'],
    icon: 'globe',
  },
  { id: 'venmo', name: 'Venmo', fee: '3% fee', notes: ['Instant transfer'], icon: 'bolt' },
  { id: 'card', name: 'Debit card', fee: '3% fee', notes: ['Instant transfer to an eligible card'], icon: 'card' },
  { id: 'bank', name: 'Bank transfer', fee: '3% fee', notes: ['Standard or same-day ACH'], icon: 'bank' },
];

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
      <p class="payout__small">
        ${me ? raw(`Available to withdraw: <strong class="num">${money(me.balance)} USD</strong>`) : 'Log in to withdraw your available balance.'}
      </p>
      <button class="btn btn--primary payout__go" type="button">Withdraw</button>
      <a class="payout__help" href="mailto:support@godpack.gg">Need help with a withdrawal? Contact support</a>
    </div>`;

  const items = $$('.payout__method', view);
  items.forEach((b) =>
    scope.on(b, 'click', () =>
      items.forEach((x) => {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-checked', String(x === b));
      }),
    ),
  );
  scope.on($('.payout__list', view), 'keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const at = items.findIndex((x) => x.classList.contains('is-on'));
    const n = (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[n].click();
    items[n].focus();
  });
  scope.on($('.payout__go', view), 'click', () =>
    me ? toast('Withdrawals are disabled in this demo') : openAuth('login'),
  );
}
