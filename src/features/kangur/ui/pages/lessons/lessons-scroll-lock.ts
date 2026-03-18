'use client';

const LESSON_SCROLL_LOCK_DATA_KEY = 'kangurLessonScrollLock';
const LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW = 'kangurLessonPrevHtmlOverflow';
const LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW = 'kangurLessonPrevBodyOverflow';

const getScrollLockTargets = (): { html: HTMLElement; body: HTMLElement } | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const html = document.documentElement;
  const body = document.body;
  if (!(html instanceof HTMLElement) || !(body instanceof HTMLElement)) {
    return null;
  }

  return { html, body };
};

export const lockKangurLessonScroll = (): void => {
  const targets = getScrollLockTargets();
  if (!targets) return;

  const { html, body } = targets;
  if (html.dataset[LESSON_SCROLL_LOCK_DATA_KEY] !== 'true') {
    html.dataset[LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW] = html.style.overflow;
    body.dataset[LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW] = body.style.overflow;
  }

  html.dataset[LESSON_SCROLL_LOCK_DATA_KEY] = 'true';
  body.dataset[LESSON_SCROLL_LOCK_DATA_KEY] = 'true';
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
};

export const unlockKangurLessonScroll = (): void => {
  const targets = getScrollLockTargets();
  if (!targets) return;

  const { html, body } = targets;
  if (html.dataset[LESSON_SCROLL_LOCK_DATA_KEY] !== 'true') {
    return;
  }

  const prevHtmlOverflow = html.dataset[LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW] ?? '';
  const prevBodyOverflow = body.dataset[LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW] ?? '';

  html.style.overflow = prevHtmlOverflow;
  body.style.overflow = prevBodyOverflow;

  delete html.dataset[LESSON_SCROLL_LOCK_DATA_KEY];
  delete body.dataset[LESSON_SCROLL_LOCK_DATA_KEY];
  delete html.dataset[LESSON_SCROLL_LOCK_PREV_HTML_OVERFLOW];
  delete body.dataset[LESSON_SCROLL_LOCK_PREV_BODY_OVERFLOW];
};
