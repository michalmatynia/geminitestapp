type UserAction = {
  type: string;
  target: string;
  timestamp: string;
  x?: number;
  y?: number;
  textContent?: string;
};

let lastAction: UserAction | null = null;
const MAX_ACTIONS_HISTORY = 5;
const actionHistory: UserAction[] = [];

const getSelector = (element: Element | null): string => {
  if (!element) return 'unknown';
  let str = element.tagName.toLowerCase();
  if (element.id) str += `#${element.id}`;
  if (element.classList && element.classList.length > 0) {
    str += `.${Array.from(element.classList).join('.')}`;
  }
  return str;
};

const getSafeText = (element: Element | null): string | undefined => {
  if (!element) return undefined;
  // Only capture text for buttons or links, avoid inputs/paragraphs which might have PII
  const tag = element.tagName.toLowerCase();
  if (tag === 'button' || tag === 'a' || tag === 'span' || tag === 'div') {
    const text = element.textContent?.slice(0, 50) || '';
    return text.length > 0 ? text : undefined;
  }
  return undefined;
};

let isInitialized = false;

export const initUserActionTracker = (): void => {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  const handler = (event: Event) => {
    try {
      const target = event.target as Element;
      // Skip frequent non-interactions if needed, but click/change/submit are key.

      const action: UserAction = {
        type: event.type,
        target: getSelector(target),
        timestamp: new Date().toISOString(),
      };

      if (event instanceof MouseEvent) {
        action.x = event.clientX;
        action.y = event.clientY;
      }

      const text = getSafeText(target);
      if (text) action.textContent = text;

      lastAction = action;
      actionHistory.unshift(action);
      if (actionHistory.length > MAX_ACTIONS_HISTORY) {
        actionHistory.pop();
      }
    } catch {
      // safe fail
    }
  };

  // Capture phase to ensure we catch it even if stopped propagation (mostly)
  window.addEventListener('click', handler, { capture: true, passive: true });
  window.addEventListener('submit', handler, { capture: true, passive: true });
  window.addEventListener('change', handler, { capture: true, passive: true });
};

export const getLastUserAction = (): UserAction | null => lastAction;

export const getUserActionHistory = (): UserAction[] => [...actionHistory];
