export const focusOnMount = (node: HTMLElement | null): void => {
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
