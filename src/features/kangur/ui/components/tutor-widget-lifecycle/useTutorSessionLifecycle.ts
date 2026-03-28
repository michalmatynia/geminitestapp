'use client';

import { useEffect } from 'react';
import type { KangurAiTutorWidgetState } from '../KangurAiTutorWidget.state';
import { persistTutorSessionKey } from '../KangurAiTutorWidget.storage';

export function useTutorSessionLifecycle({
  tutorSessionKey,
  widgetState,
}: {
  tutorSessionKey: string | null;
  widgetState: KangurAiTutorWidgetState;
}) {
  const { previousSessionKeyRef, setHasNewMessage } = widgetState;

  useEffect(() => {
    if (!tutorSessionKey) return;
    persistTutorSessionKey(tutorSessionKey);
    if (previousSessionKeyRef.current && previousSessionKeyRef.current !== tutorSessionKey) {
      setHasNewMessage(false);
    }
    previousSessionKeyRef.current = tutorSessionKey;
  }, [previousSessionKeyRef, setHasNewMessage, tutorSessionKey]);
}
