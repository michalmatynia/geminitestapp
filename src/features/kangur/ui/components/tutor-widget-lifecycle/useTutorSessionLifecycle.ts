'use client';

import { useEffect } from 'react';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorWidgetState } from '../KangurAiTutorWidget.state';
import { clearPersistedTutorSessionKey, persistTutorSessionKey } from '../KangurAiTutorWidget.storage';
import type { TutorSurface } from '../KangurAiTutorWidget.types';

export function useTutorSessionLifecycle({
  allowCrossPagePersistence,
  getContextSwitchNotice,
  isOpen,
  sessionContext,
  tutorContent,
  tutorSessionKey,
  widgetState,
}: {
  allowCrossPagePersistence: boolean;
  getContextSwitchNotice: (input: {
    assignmentId: string | null | undefined;
    assignmentSummary?: string | null | undefined;
    contentId: string | null | undefined;
    questionId: string | null | undefined;
    questionProgressLabel?: string | null | undefined;
    surface: TutorSurface | null | undefined;
    title?: string | null | undefined;
    tutorContent: KangurAiTutorContent;
  }) => {
    detail: string | null;
    target: string;
    title: string;
  } | null;
  isOpen: boolean;
  sessionContext: KangurAiTutorConversationContext | null | undefined;
  tutorContent: KangurAiTutorContent;
  tutorSessionKey: string | null;
  widgetState: KangurAiTutorWidgetState;
}) {
  const {
    previousSessionKeyRef,
    setContextSwitchNotice,
    setHasNewMessage,
    setInputValue,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
  } = widgetState;

  useEffect(() => {
    if (!tutorSessionKey) {
      return;
    }

    const previousSessionKey = allowCrossPagePersistence ? previousSessionKeyRef.current : null;
    if (previousSessionKey && previousSessionKey !== tutorSessionKey) {
      setHasNewMessage(false);
      setInputValue('');
      setSelectionConversationContext(null);
      setSelectionGuidanceHandoffText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionContainerRect(null);
      setContextSwitchNotice(
        isOpen
          ? getContextSwitchNotice({
              tutorContent,
              surface: sessionContext?.surface,
              title: sessionContext?.title ?? null,
              contentId: sessionContext?.contentId ?? null,
              questionProgressLabel: sessionContext?.questionProgressLabel ?? null,
              questionId: sessionContext?.questionId ?? null,
              assignmentSummary: sessionContext?.assignmentSummary ?? null,
              assignmentId: sessionContext?.assignmentId ?? null,
            })
          : null
      );
    }

    previousSessionKeyRef.current = tutorSessionKey;
    if (allowCrossPagePersistence) {
      persistTutorSessionKey(tutorSessionKey);
    } else {
      clearPersistedTutorSessionKey();
    }
  }, [
    allowCrossPagePersistence,
    getContextSwitchNotice,
    isOpen,
    previousSessionKeyRef,
    sessionContext?.assignmentId,
    sessionContext?.assignmentSummary,
    sessionContext?.contentId,
    sessionContext?.questionId,
    sessionContext?.questionProgressLabel,
    sessionContext?.surface,
    sessionContext?.title,
    setContextSwitchNotice,
    setHasNewMessage,
    setInputValue,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    tutorContent,
    tutorSessionKey,
  ]);

  useEffect(() => {
    if (allowCrossPagePersistence) {
      return;
    }

    clearPersistedTutorSessionKey();
    previousSessionKeyRef.current = tutorSessionKey;
  }, [allowCrossPagePersistence, previousSessionKeyRef, tutorSessionKey]);
}
