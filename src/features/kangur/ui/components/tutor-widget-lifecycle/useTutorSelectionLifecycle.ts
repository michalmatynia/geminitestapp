'use client';

import { useEffect } from 'react';
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
    const timeoutId = setTimeout(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [inputRef, isOpen, suppressFocus]);
}
