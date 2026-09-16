export const aliases: Record<string, string> = {
  '/catalogo': '/productos',
  '/pedidos': '/cuenta/pedidos',
  '/direcciones': '/cuenta/direcciones',
  '/favoritos': '/cuenta/favoritos',
};
export function canonicalPath(path: string) {
  const [base, query] = path.split('?');
  return (aliases[base] || base) + (query ? '?' + query : '');
}
export function currentRoute() {
  const url = location.pathname;
  return canonicalPath(url + location.search);
}
export function navigate(path: string) {
  history.pushState(null, '', canonicalPath(path));
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function installRouter() {
  if (location.hash.startsWith('#/'))
    history.replaceState(null, '', canonicalPath(location.hash.slice(1)));
  const click = (event: MouseEvent) => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href]',
    );
    if (
      !anchor ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target ||
      anchor.hasAttribute('download')
    )
      return;
    const url = new URL(anchor.href);
    if (url.origin !== location.origin || url.hash) return;
    event.preventDefault();
    navigate(url.pathname + url.search);
  };
  document.addEventListener('click', click);
  return () => document.removeEventListener('click', click);
}
