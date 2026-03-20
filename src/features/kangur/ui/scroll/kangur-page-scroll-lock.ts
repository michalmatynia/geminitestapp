'use client';

const PAGE_SCROLL_LOCK_DATA_KEY = 'kangurPageScrollLock';
const PAGE_SCROLL_LOCK_PREV_HTML_OVERFLOW = 'kangurPrevHtmlOverflow';
const PAGE_SCROLL_LOCK_PREV_BODY_OVERFLOW = 'kangurPrevBodyOverflow';
const PAGE_SCROLL_LOCK_PREV_APP_OVERFLOW = 'kangurPrevAppOverflow';

let pageScrollLockCount = 0;

const getScrollLockTargets = (): {
  html: HTMLElement;
  body: HTMLElement;
  app?: HTMLElement;
} | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const html = document.documentElement;
  const body = document.body;
  const app = document.getElementById('app-content') ?? undefined;
  if (!(html instanceof HTMLElement) || !(body instanceof HTMLElement)) {
    return null;
  }

  return { html, body, app: app instanceof HTMLElement ? app : undefined };
};

const applyPageScrollLock = (): void => {
  const targets = getScrollLockTargets();
  if (!targets) return;

  const { html, body } = targets;
  if (html.dataset[PAGE_SCROLL_LOCK_DATA_KEY] !== 'true') {
    html.dataset[PAGE_SCROLL_LOCK_PREV_HTML_OVERFLOW] = html.style.overflow;
    body.dataset[PAGE_SCROLL_LOCK_PREV_BODY_OVERFLOW] = body.style.overflow;
    if (targets.app && !(PAGE_SCROLL_LOCK_PREV_APP_OVERFLOW in targets.app.dataset)) {
      targets.app.dataset[PAGE_SCROLL_LOCK_PREV_APP_OVERFLOW] = targets.app.style.overflow;
    }
  }

  html.dataset[PAGE_SCROLL_LOCK_DATA_KEY] = 'true';
  body.dataset[PAGE_SCROLL_LOCK_DATA_KEY] = 'true';
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  if (targets.app) {
    targets.app.dataset[PAGE_SCROLL_LOCK_DATA_KEY] = 'true';
    targets.app.style.overflow = 'hidden';
  }
};

const clearPageScrollLock = (): void => {
  const targets = getScrollLockTargets();
  if (!targets) return;

  const { html, body, app } = targets;
  if (html.dataset[PAGE_SCROLL_LOCK_DATA_KEY] !== 'true') {
    return;
  }

  const prevHtmlOverflow = html.dataset[PAGE_SCROLL_LOCK_PREV_HTML_OVERFLOW] ?? '';
  const prevBodyOverflow = body.dataset[PAGE_SCROLL_LOCK_PREV_BODY_OVERFLOW] ?? '';
  const prevAppOverflow = app?.dataset[PAGE_SCROLL_LOCK_PREV_APP_OVERFLOW] ?? '';

  html.style.overflow = prevHtmlOverflow;
  body.style.overflow = prevBodyOverflow;
  if (app) {
    app.style.overflow = prevAppOverflow;
  }

  delete html.dataset[PAGE_SCROLL_LOCK_DATA_KEY];
  delete body.dataset[PAGE_SCROLL_LOCK_DATA_KEY];
  if (app) {
    delete app.dataset[PAGE_SCROLL_LOCK_DATA_KEY];
  }
  delete html.dataset[PAGE_SCROLL_LOCK_PREV_HTML_OVERFLOW];
  delete body.dataset[PAGE_SCROLL_LOCK_PREV_BODY_OVERFLOW];
  if (app) {
    delete app.dataset[PAGE_SCROLL_LOCK_PREV_APP_OVERFLOW];
  }
};

export const lockKangurPageVerticalScroll = (): void => {
  if (pageScrollLockCount === 0) {
    applyPageScrollLock();
  }
  pageScrollLockCount += 1;
};

export const unlockKangurPageVerticalScroll = (): void => {
  if (pageScrollLockCount <= 0) {
    return;
  }

  pageScrollLockCount -= 1;
  if (pageScrollLockCount > 0) {
    return;
  }

  clearPageScrollLock();
};
