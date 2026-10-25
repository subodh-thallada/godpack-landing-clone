// Sign-in screen. A layout-only recreation: no form here sends or keeps
// anything. Submitting just explains that sign-in is not part of the demo.
import { icon } from '../ui/icons.js';
import { html, raw, el, $, $$ } from '../ui/dom.js';
import { CARDS, slabArt } from '../data.js';
import { session } from '../session.js';

function column(ids, dir) {
  const items = ids.map((id) => `<img src="${slabArt(id)}" alt="" draggable="false">`).join('');
  return `<div class="wall__col wall__col--${dir}"><div class="wall__strip">${items}${items}</div></div>`;
}

export function showAuth({ mode = 'login', toast }) {
  if (document.querySelector('.auth')) return;
  const ids = CARDS.map((c) => c.id);
  const cols = [ids.slice(0, 5), ids.slice(5, 10), ids.slice(8).concat(ids.slice(0, 2))];
  const prevFocus = document.activeElement;

  const node = el(
    html`<div class="auth" role="dialog" aria-modal="true" aria-label="Log in or sign up">
      <div class="wall" aria-hidden="true">
        ${raw(column(cols[0], 'up') + column(cols[1], 'down') + column(cols[2], 'up'))}
      </div>
      <div class="auth__side">
        <button class="auth__close icon-btn" type="button" aria-label="Close">
          ${raw(icon('close', { size: 20 }))}
        </button>
        <div class="auth__form">
          <img class="auth__logo" src="/assets/logo.png" alt="Godpack" width="447" height="159" />
          <p class="auth__badge">Unofficial demo · not the real Godpack</p>
          <h1>Log in or sign up</h1>
          <p class="auth__sub">Fair packs for collectors</p>
          <div class="auth__providers">
            <button class="auth__provider" type="button" data-provider="Google">
              ${raw(icon('globe', { size: 18 }))}Continue with Google
            </button>
            <button class="auth__provider" type="button" data-provider="Apple">
              ${raw(icon('key', { size: 18 }))}Continue with Apple
            </button>
          </div>
          <div class="auth__or"><span>or</span></div>
          <button class="auth__demo" type="button">${raw(icon('sparkle', { size: 16 }))}Use the demo account</button>
          <div class="auth__or"><span>or</span></div>
          <form class="auth__email" novalidate>
            <label for="auth-email">Email</label>
            <input id="auth-email" class="field" type="email" placeholder="you@example.com" autocomplete="off" />
            <button class="btn btn--primary btn--block auth__submit" type="submit">Continue with email</button>
          </form>
          <p class="auth__legal">
            Demo recreation: sign-in is disabled and nothing you type is stored or sent. By continuing you agree to the
            <a href="/" data-demo>Terms of Service</a> and <a href="/" data-demo>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>`,
  );
  document.body.append(node);
  requestAnimationFrame(() => $('#auth-email', node).focus({ preventScroll: true }));

  const close = () => {
    node.classList.add('is-leaving');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      node.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    }, 240);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  $('.auth__close', node).addEventListener('click', close);

  const notice = () => toast('Sign-in is disabled in this demo — use the demo account');
  $('.auth__demo', node).addEventListener('click', () => {
    session.signIn();
    close();
    toast('Signed in to the demo account');
  });
  $$('.auth__provider', node).forEach((b) => b.addEventListener('click', notice));
  $('.auth__email', node).addEventListener('submit', (e) => {
    e.preventDefault();
    $('#auth-email', node).value = '';
    notice();
  });
  if (mode === 'signup') node.dataset.mode = 'signup';
}
