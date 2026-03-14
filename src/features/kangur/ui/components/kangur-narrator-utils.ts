import { normalizeKangurLessonNarrationText } from '@/features/kangur/tts/script';

const KANGUR_NARRATOR_IGNORED_SELECTOR = [
  'button',
  'input',
  'select',
  'textarea',
  'audio',
  'video',
  'svg',
  'img',
  '[data-kangur-tts-ignore="true"]',
].join(', ');

export const extractNarrationTextFromElement = (element: HTMLElement | null): string => {
  if (!element) {
    return '';
  }

  const cloned = element.cloneNode(true) as HTMLElement;
  cloned.querySelectorAll(KANGUR_NARRATOR_IGNORED_SELECTOR).forEach((node) => node.remove());

  return normalizeKangurLessonNarrationText(cloned.innerText || cloned.textContent || '');
};
