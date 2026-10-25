// Shipping (signed out): an empty shipments panel and the shipping details
// card with two expandable sections.
import { icon } from '../ui/icons.js';
import { html, raw, $$ } from '../ui/dom.js';
import { viewHead } from '../main.js';
import { session } from '../session.js';

export const title = 'Shipping';

const MORE = [
  [
    'Destinations & import fees',
    'We ship to the United States and Canada. Any import duties or taxes charged on arrival in Canada are paid by the recipient.',
  ],
  [
    'Returns & refunds',
    'Cards ship exactly as graded or listed, so shipped cards can’t be returned. If a package arrives damaged, contact support within 7 days with photos.',
  ],
];

export function mount(view, { scope }) {
  const me = session.state;
  const main = me
    ? html`<section class="surface ship__main">
        <h2>No shipments yet</h2>
        <p>Open a card in your Vault and choose Ship to get started.</p>
        <a class="btn btn--secondary" href="/vault" data-link style="min-width:0">View Vault</a>
      </section>`
    : html`<section class="surface ship__main">
        <h2>Your shipments</h2>
        <p>Log in to send a card from your Vault and follow its delivery.</p>
        <button class="btn btn--primary" type="button" data-auth="login">Ship a card</button>
      </section>`;
  view.innerHTML = html` ${raw(viewHead(me ? 'Shipments' : 'Shipping', me ? '0 shipments' : ''))}
    <div class="ship">
      ${raw(main)}
      <aside class="panel ship__info">
        <h2>Shipping details</h2>
        <div class="ship__rates">
          <div>
            <span>United States</span><strong class="num">$5<small>USD</small></strong>
          </div>
          <div>
            <span>Canada</span><strong class="num">$10<small>USD</small></strong>
          </div>
        </div>
        <p class="ship__per">Per card · One card per shipment</p>
        <div class="ship__block">
          <h3>Dispatch &amp; delivery</h3>
          <p>
            Cards leave by USPS within 2–3 business days of your request. U.S. deliveries usually arrive within a week
            of dispatch; Canadian delivery times depend on customs. Tracking is added to the shipment as soon as it
            moves.
          </p>
        </div>
        ${raw(
          MORE.map(
            ([q, a]) =>
              html`<details class="ship__more">
                <summary>${q}${raw(icon('chevronRight', { size: 18 }))}</summary>
                <p>${a}</p>
              </details>`,
          ).join(''),
        )}
        <a class="ship__support" href="mailto:support@godpack.gg"
          >${raw(icon('mail', { size: 18 }))}Contact shipping support</a
        >
      </aside>
    </div>`;

  // Only one section open at a time.
  const items = $$('.ship__more', view);
  items.forEach((d) =>
    scope.on(d, 'toggle', () => {
      if (d.open)
        items.forEach((o) => {
          if (o !== d) o.open = false;
        });
    }),
  );
}
