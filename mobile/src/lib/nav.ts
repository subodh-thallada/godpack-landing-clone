// Navigation helpers. Tab destinations switch the existing tabs instead of
// stacking a second copy of them on top.
import { type Href, router } from 'expo-router';

const TABS = ['/packs', '/battles', '/market', '/vault', '/feed', '/rewards'];

export function go(href: string) {
  if (TABS.includes(href.split('?')[0])) {
    if (router.canDismiss()) router.dismissAll();
    router.navigate(href as Href);
    return;
  }
  router.push(href as Href);
}

export const back = (fallback = '/packs') => (router.canGoBack() ? router.back() : go(fallback));
