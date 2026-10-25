// Deposit: pick an amount, then continue. Nothing here takes payment
// details. Signed out, continuing opens the sign-in screen; with the demo
// account it adds the amount as demo credit (no real money).
import { icon } from '../ui/icons.js';
import { html, raw, $, $$ } from '../ui/dom.js';
import { viewHead } from '../main.js';
import { session } from '../session.js';
import { money } from '../data.js';

export const title = 'Deposit';

const PRESETS = [25, 50, 100];

export function mount(view, { scope, openAuth, toast }) {
  const me = session.state;
  view.innerHTML = html` ${raw(viewHead('Deposit'))}
    <div class="funds">
      <section class="panel funds__amount">
        <h2>Amount (USD)</h2>
        <label class="funds__field"
          ><span class="funds__currency">$</span
          ><input class="num" type="text" inputmode="decimal" value="25" aria-label="Deposit amount in US dollars"
        /></label>
        <div class="funds__presets" role="group" aria-label="Quick amounts">
          ${raw(PRESETS.map((v, i) => `<button class="funds__preset num${i === 0 ? ' is-on' : ''}" type="button" data-v="${v}" aria-pressed="${i === 0}">$${v}</button>`).join(''))}
          <button class="funds__preset funds__preset--custom" type="button" data-v="custom" aria-pressed="false">
            Custom
          </button>
        </div>
        <p class="funds__limits">$10 minimum · $100,000 maximum</p>
      </section>
      <section class="panel funds__pay">
        <h2>Payment</h2>
        <p class="funds__note">
          ${me ? 'Demo account: this adds demo credit. No payment is taken.' : 'Log in to add funds.'}
        </p>
        <button class="btn btn--primary btn--block funds__continue" type="button">
          ${me ? 'Add demo credit' : 'Continue to payment'}
        </button>
        <a class="funds__help" href="mailto:support@godpack.gg">Need help? Contact support</a>
        <div class="funds__or"><span>or</span></div>
        <button class="funds__crypto" type="button">
          <span>Deposit</span><span class="coin coin--usdc">USDC</span><span>or</span
          ><span class="coin coin--usdt">USDT</span>${raw(icon('arrowRight', { size: 16 }))}
        </button>
      </section>
    </div>`;

  const input = $('.funds__field input', view);
  const presets = $$('.funds__preset', view);
  const press = (btn) =>
    presets.forEach((b) => {
      b.classList.toggle('is-on', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  presets.forEach((b) =>
    scope.on(b, 'click', () => {
      press(b);
      if (b.dataset.v === 'custom') {
        input.value = '';
        input.focus();
      } else input.value = b.dataset.v;
      validate();
    }),
  );

  const field = $('.funds__field', view);
  const limits = $('.funds__limits', view);
  function validate() {
    const v = parseFloat(input.value.replace(/,/g, ''));
    const bad = input.value !== '' && (!isFinite(v) || v < 10 || v > 100000);
    field.classList.toggle('is-error', bad);
    limits.classList.toggle('is-error', bad);
    $('.funds__continue', view).disabled = bad || input.value === '';
  }
  scope.on(input, 'input', () => {
    input.value = input.value.replace(/[^\d.,]/g, '');
    const match = presets.find((b) => b.dataset.v === input.value);
    press(match || presets[presets.length - 1]);
    validate();
  });

  scope.on($('.funds__continue', view), 'click', () => {
    if (!me) {
      openAuth('login');
      return;
    }
    const v = Math.round(parseFloat(input.value.replace(/,/g, '')) * 100) / 100;
    if (!isFinite(v) || v < 10 || v > 100000) return;
    session.update((s) => {
      s.balance = Math.round((s.balance + v) * 100) / 100;
    });
    toast(`Added ${money(v)} demo credit`);
  });
  scope.on($('.funds__crypto', view), 'click', () =>
    me ? toast('Crypto deposits are not part of this demo') : openAuth('login'),
  );
}
