const SPOTLIGHT_DURATION_MS = 4_000;
const SCROLL_DELAY_MS = 80;
const SPOTLIGHT_PADDING = 8;

export type NavigationSpotlightResult = {
  element: HTMLElement;
  rect: DOMRect;
  cleanup: () => void;
};

const findAnchorElement = (anchorId: string): HTMLElement | null => {
  const byId = document.getElementById(anchorId);
  if (byId) {
    return byId;
  }

  const byDataAttr = document.querySelector<HTMLElement>(
    `[data-kangur-anchor-id="${CSS.escape(anchorId)}"]`
  );
  return byDataAttr ?? null;
};

const createSpotlightOverlay = (rect: DOMRect): HTMLDivElement => {
  const overlay = document.createElement('div');
  overlay.setAttribute('data-testid', 'kangur-ai-tutor-navigation-spotlight');
  overlay.setAttribute('data-navigation-spotlight', 'true');

  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left - SPOTLIGHT_PADDING}px`,
    top: `${rect.top - SPOTLIGHT_PADDING}px`,
    width: `${rect.width + SPOTLIGHT_PADDING * 2}px`,
    height: `${rect.height + SPOTLIGHT_PADDING * 2}px`,
    borderRadius: '12px',
    border: '2px solid rgba(251, 191, 36, 0.75)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    boxShadow: '0 0 0 6px rgba(251, 191, 36, 0.12)',
    pointerEvents: 'none',
    zIndex: '68',
    transition: 'opacity 300ms ease',
    opacity: '0',
  });

  return overlay;
};

export const scrollToAndSpotlightAnchor = (
  anchorId: string
): NavigationSpotlightResult | null => {
  const element = findAnchorElement(anchorId);
  if (!element) {
    return null;
  }

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  let overlay: HTMLDivElement | null = null;
  let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
  let removeTimer: ReturnType<typeof setTimeout> | null = null;

  const spotlightTimer = setTimeout(() => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    overlay = createSpotlightOverlay(rect);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      if (overlay) {
        overlay.style.opacity = '1';
      }
    });

    fadeOutTimer = setTimeout(() => {
      if (overlay) {
        overlay.style.opacity = '0';
      }

      removeTimer = setTimeout(() => {
        if (overlay?.parentNode) {
          overlay.parentNode.removeChild(overlay);
          overlay = null;
        }
      }, 320);
    }, SPOTLIGHT_DURATION_MS);
  }, SCROLL_DELAY_MS);

  const rect = element.getBoundingClientRect();

  const cleanup = (): void => {
    clearTimeout(spotlightTimer);
    if (fadeOutTimer) {
      clearTimeout(fadeOutTimer);
    }
    if (removeTimer) {
      clearTimeout(removeTimer);
    }
    if (overlay?.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
  };

  return { element, rect, cleanup };
};
