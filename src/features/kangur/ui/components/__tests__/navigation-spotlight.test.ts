import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scrollToAndSpotlightAnchor } from '../KangurAiTutorWidget.navigation-spotlight';

// Helpers
const makeElement = (id?: string, dataAttr?: string): HTMLElement => {
  const el = document.createElement('div');
  if (id) el.id = id;
  if (dataAttr) el.dataset['kangurAnchorId'] = dataAttr;
  document.body.appendChild(el);
  return el;
};

const getOverlay = (): HTMLElement | null =>
  document.querySelector('[data-navigation-spotlight="true"]');

describe('scrollToAndSpotlightAnchor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document.body, 'appendChild');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('element lookup', () => {
    it('returns null when no element matches the anchorId', () => {
      const result = scrollToAndSpotlightAnchor('nonexistent-anchor');
      expect(result).toBeNull();
    });

    it('finds element by id', () => {
      const el = makeElement('my-anchor');
      const result = scrollToAndSpotlightAnchor('my-anchor');
      expect(result).not.toBeNull();
      expect(result?.element).toBe(el);
      result?.cleanup();
    });

    it('finds element by data-kangur-anchor-id attribute', () => {
      const el = makeElement(undefined, 'section-math');
      const result = scrollToAndSpotlightAnchor('section-math');
      expect(result).not.toBeNull();
      expect(result?.element).toBe(el);
      result?.cleanup();
    });

    it('prefers id match over data-attribute match', () => {
      const byId = makeElement('target');
      makeElement(undefined, 'target');
      const result = scrollToAndSpotlightAnchor('target');
      expect(result?.element).toBe(byId);
      result?.cleanup();
    });
  });

  describe('result shape', () => {
    it('returns element, rect, and cleanup function', () => {
      makeElement('test-anchor');
      const result = scrollToAndSpotlightAnchor('test-anchor');
      expect(result).not.toBeNull();
      expect(result?.element).toBeInstanceOf(HTMLElement);
      expect(result?.rect).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
      expect(typeof result?.cleanup).toBe('function');
      result?.cleanup();
    });

    it('scrolls the element into view', () => {
      const el = makeElement('scroll-target');
      const scrollSpy = vi.spyOn(el, 'scrollIntoView');
      scrollToAndSpotlightAnchor('scroll-target')?.cleanup();
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });
  });

  describe('spotlight overlay lifecycle', () => {
    it('does not append overlay before scroll delay elapses', () => {
      makeElement('overlay-anchor');
      scrollToAndSpotlightAnchor('overlay-anchor');
      expect(getOverlay()).toBeNull();
    });

    it('appends overlay after scroll delay', () => {
      const el = makeElement('overlay-anchor');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(10, 20, 200, 100)
      );
      scrollToAndSpotlightAnchor('overlay-anchor');
      vi.advanceTimersByTime(80);
      const overlay = getOverlay();
      expect(overlay).not.toBeNull();
      expect(overlay?.getAttribute('data-testid')).toBe('kangur-ai-tutor-navigation-spotlight');
      expect(overlay).toHaveClass('kangur-chat-spotlight-frame');
      expect(overlay?.style.borderRadius).toBe('var(--kangur-chat-spotlight-radius-md, 22px)');
      expect(overlay?.style.border).toBe(
        '2px solid var(--kangur-chat-spotlight-border, rgba(251, 191, 36, 0.75))'
      );
      expect(overlay?.style.boxShadow).toBe(
        '0 0 0 6px var(--kangur-chat-spotlight-shadow, rgba(251, 191, 36, 0.12))'
      );
    });

    it('does not append overlay when element has zero dimensions', () => {
      const el = makeElement('zero-size-anchor');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0));
      scrollToAndSpotlightAnchor('zero-size-anchor');
      vi.advanceTimersByTime(80);
      expect(getOverlay()).toBeNull();
    });

    it('positions overlay with padding around the element rect', () => {
      const el = makeElement('positioned-anchor');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 100, 300, 150)
      );
      scrollToAndSpotlightAnchor('positioned-anchor');
      vi.advanceTimersByTime(80);
      const overlay = getOverlay() as HTMLElement;
      expect(overlay.style.left).toBe('42px');   // 50 - 8 padding
      expect(overlay.style.top).toBe('92px');    // 100 - 8 padding
      expect(overlay.style.width).toBe('316px'); // 300 + 8*2
      expect(overlay.style.height).toBe('166px'); // 150 + 8*2
    });

    it('removes overlay after spotlight duration + fade-out', () => {
      const el = makeElement('fade-anchor');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 50));
      scrollToAndSpotlightAnchor('fade-anchor');
      vi.advanceTimersByTime(80);
      expect(getOverlay()).not.toBeNull();
      vi.advanceTimersByTime(4_000 + 320);
      expect(getOverlay()).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('cleanup before scroll delay prevents overlay from appearing', () => {
      makeElement('cleanup-early');
      const result = scrollToAndSpotlightAnchor('cleanup-early');
      result?.cleanup();
      vi.advanceTimersByTime(80 + 100);
      expect(getOverlay()).toBeNull();
    });

    it('cleanup after overlay is shown removes it immediately', () => {
      const el = makeElement('cleanup-late');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 50));
      const result = scrollToAndSpotlightAnchor('cleanup-late');
      vi.advanceTimersByTime(80);
      expect(getOverlay()).not.toBeNull();
      result?.cleanup();
      expect(getOverlay()).toBeNull();
    });

    it('calling cleanup twice does not throw', () => {
      makeElement('double-cleanup');
      const result = scrollToAndSpotlightAnchor('double-cleanup');
      expect(() => {
        result?.cleanup();
        result?.cleanup();
      }).not.toThrow();
    });
  });
});
