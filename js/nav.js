// Feature menu for screens narrower than 1200px (wider screens show the
// links inline). The button toggles .site-menu; a tap outside, Escape,
// moving focus away or growing the window past 1200px closes it.
(() => {
  const btn = document.querySelector('.menu-btn');
  const menu = document.getElementById('site-menu');
  if (!btn || !menu) return;
  const links = [...menu.querySelectorAll('a')];

  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const set = (open, focusFirst = false) => {
    btn.setAttribute('aria-expanded', String(open));
    menu.toggleAttribute('data-open', open);
    if (open && focusFirst) links[0].focus();
  };

  // detail is 0 for keyboard clicks: move focus into the menu then.
  btn.addEventListener('click', (e) => set(!isOpen(), e.detail === 0));
  document.addEventListener('pointerdown', (e) => {
    if (isOpen() && !menu.contains(e.target) && !btn.contains(e.target)) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    set(false);
    btn.focus();
  });
  menu.addEventListener('focusout', (e) => {
    if (isOpen() && !menu.contains(e.relatedTarget) && e.relatedTarget !== btn) set(false);
  });
  const wide = matchMedia('(min-width: 1200px)');
  const onWide = () => wide.matches && set(false);
  if (wide.addEventListener) wide.addEventListener('change', onWide);
})();
