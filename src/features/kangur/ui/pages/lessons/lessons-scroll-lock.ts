'use client';

const LESSON_SCROLL_LOCK_DATA_KEY = 'kangurLessonScrollLock';
const LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW = 'kangurLessonPrevHtmlOverflow';
const LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW = 'kangurLessonPrevBodyOverflow';
const LESSON_SCROLL_LOCK_PREV_APP_OVERFLOW = 'kangurLessonPrevAppOverflow';

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

export const lockKangurLessonScroll = (): void => {
  const targets = getScrollLockTargets();
  if (!targets) return;

  const { html, body } = targets;
  if (html.dataset[LESSON_SCROLL_LOCK_DATA_KEY] !== 'true') {
    html.dataset[LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW] = html.style.overflow;
    body.dataset[LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW] = body.style.overflow;
    if (targets.app && !(LESSON_SCROLL_LOCK_PREV_APP_OVERFLOW in targets.app.dataset)) {
      targets.app.dataset[LESSON_SCROLL_LOCK_PREV_APP_OVERFLOW] = targets.app.style.overflow;
    }
  }

  html.dataset[LESSON_SCROLL_LOCK_DATA_KEY] = 'true';
  body.dataset[LESSON_SCROLL_LOCK_DATA_KEY] = 'true';
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  if (targets.app) {
    targets.app.dataset[LESSON_SCROLL_LOCK_DATA_KEY] = 'true';
    targets.app.style.overflow = 'hidden';
  }
};

export const unlockKangurLessonScroll = (): void => {
  const targets = getScrollLockTargets();
  if (!targets) return;

  const { html, body, app } = targets;
  if (html.dataset[LESSON_SCROLL_LOCK_DATA_KEY] !== 'true') {
    return;
  }

  const prevHtmlOverflow = html.dataset[LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW] ?? '';
  const prevBodyOverflow = body.dataset[LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW] ?? '';
  const prevAppOverflow =
    app?.dataset[LESSON_SCROLL_LOCK_PREV_APP_OVERFLOW] ?? '';

  html.style.overflow = prevHtmlOverflow;
  body.style.overflow = prevBodyOverflow;
  if (app) {
    app.style.overflow = prevAppOverflow;
  }

  delete html.dataset[LESSON_SCROLL_LOCK_DATA_KEY];
  delete body.dataset[LESSON_SCROLL_LOCK_DATA_KEY];
  if (app) {
    delete app.dataset[LESSON_SCROLL_LOCK_DATA_KEY];
  }
  delete html.dataset[LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW];
  delete body.dataset[LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW];
  if (app) {
    delete app.dataset[LESSON_SCROLL_LOCK_PREV_APP_OVERFLOW];
  }
};
