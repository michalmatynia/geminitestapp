'use client';

import { useEffect } from 'react';
import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import type { KangurAiTutorWidgetState } from '../ai-tutor-widget/KangurAiTutorWidget.state';

export function useTutorSelectionLifecycle({
  isOpen,
  suppressFocus,
  widgetState,
}: {
  isOpen: boolean;
  suppressFocus: boolean;
  widgetState: KangurAiTutorWidgetState;
}) {
  const { inputRef } = widgetState;

  useEffect(() => {
    if (!isOpen || suppressFocus) return;
    const timeoutId = safeSetTimeout(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 150);
    return () => safeClearTimeout(timeoutId);
  }, [inputRef, isOpen, suppressFocus]);
}
