export const subscribeToSearchParams = (callback: () => void): (() => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};

export const getSearchSnapshot = (): string => {
  if (typeof window === 'undefined') return '';
  const openProductId = new URLSearchParams(window.location.search).get('openProductId');
  return openProductId === null ? '' : openProductId.trim();
};

export const getSearchServerSnapshot = (): string => '';
