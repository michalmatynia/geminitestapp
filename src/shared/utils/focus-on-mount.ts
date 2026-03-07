export const focusOnMount = <T extends HTMLElement>(node: T | null): void => {
  if (!node || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (document.activeElement === node) {
    return;
  }

  if (!node.isConnected) {
    return;
  }

  node.focus();
};
