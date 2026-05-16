import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { safeClearTimeout, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';
import { extractNarrationTextFromElement } from '../../kangur-narrator-utils';

export function useNarrationObserverEffect(input: {
  observationKey: string;
  setTutorNarrationObservedText: (value: string) => void;
  shouldEnableTutorNarration: boolean;
  tutorNarrationRootRef: RefObject<HTMLDivElement | null>;
  guestIntroNarrationRootRef?: RefObject<HTMLDivElement | null>;
  preferGuestIntroRoot?: boolean;
}): void {
  const {
    observationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
    guestIntroNarrationRootRef,
    preferGuestIntroRoot,
  } = input;

  useLayoutEffect(() => {
    let timeoutId: SafeTimerId | null = null;

    const clearNarrationTimeout = (): void => {
      if (timeoutId !== null) {
        safeClearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    if (!shouldEnableTutorNarration) {
      setTutorNarrationObservedText('');
      return clearNarrationTimeout;
    }

    const rootRef =
      preferGuestIntroRoot === true && guestIntroNarrationRootRef !== undefined
        ? guestIntroNarrationRootRef
        : tutorNarrationRootRef;
    const root = rootRef.current;
    if (root === null) {
      setTutorNarrationObservedText('');
      return clearNarrationTimeout;
    }

    const updateText = (): void => {
      setTutorNarrationObservedText(extractNarrationTextFromElement(root));
    };

    const observer = new MutationObserver(() => {
      clearNarrationTimeout();
      timeoutId = safeSetTimeout(updateText, 120);
    });

    updateText();

    if (typeof MutationObserver !== 'undefined') {
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      if (typeof MutationObserver !== 'undefined') observer.disconnect();
      clearNarrationTimeout();
    };
  }, [
    observationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
    guestIntroNarrationRootRef,
    preferGuestIntroRoot,
  ]);
}
