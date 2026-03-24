'use client';

import { useCallback, useRef } from 'react';

import {
  recordKangurLessonPanelProgress,
  recordKangurLessonPanelTime,
} from '@/features/kangur/ui/services/progress';
import * as KangurSubjectFocusContext from '@/features/kangur/ui/context/KangurSubjectFocusContext';

import { useLessonHubProgress, type LessonHubSectionProgress } from './useLessonHubProgress';

type UseKangurLessonPanelProgressOptions<SectionId extends string> = {
  lessonKey: string;
  slideSections: Partial<Record<SectionId, readonly unknown[]>>;
  sectionLabels?: Partial<Record<SectionId, string>>;
};

type UseKangurLessonPanelProgressResult<SectionId extends string> = {
  markSectionOpened: (sectionId: SectionId) => void;
  markSectionViewedCount: (sectionId: SectionId, viewedCount: number) => void;
  recordPanelTime: (
    sectionId: SectionId,
    panelIndex: number,
    seconds: number,
    panelTitle?: string | null
  ) => void;
  sectionProgress: Partial<Record<SectionId, LessonHubSectionProgress>>;
};

const useLegacySubjectFocusState = (): { subjectKey: string | null } | null => {
  const legacyFocus = KangurSubjectFocusContext.useKangurSubjectFocus?.();
  return legacyFocus ? { subjectKey: legacyFocus.subjectKey ?? null } : null;
};

const useResolvedSubjectFocusState = Object.prototype.hasOwnProperty.call(
  KangurSubjectFocusContext,
  'useOptionalKangurSubjectFocusState'
)
  ? (KangurSubjectFocusContext as {
      useOptionalKangurSubjectFocusState: () => { subjectKey: string | null } | null;
    }).useOptionalKangurSubjectFocusState
  : useLegacySubjectFocusState;

export const useKangurLessonPanelProgress = <SectionId extends string>({
  lessonKey,
  slideSections,
  sectionLabels,
}: UseKangurLessonPanelProgressOptions<SectionId>): UseKangurLessonPanelProgressResult<SectionId> => {
  const subjectFocusState = useResolvedSubjectFocusState();
  const subjectKey = subjectFocusState?.subjectKey ?? null;
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(slideSections);
  const sessionIdRef = useRef<string>(
    `lesson-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
  const sessionStartedAtRef = useRef<string>(new Date().toISOString());

  const persistProgress = useCallback(
    (sectionId: SectionId, viewedCount: number): void => {
      const totalCount = slideSections[sectionId]?.length ?? 0;
      if (totalCount <= 0) {
        return;
      }

      recordKangurLessonPanelProgress({
        lessonKey,
        sectionId,
        viewedCount,
        totalCount,
        label: sectionLabels?.[sectionId],
      }, { ownerKey: subjectKey });
    },
    [lessonKey, sectionLabels, slideSections, subjectKey]
  );

  const handleSectionViewedCount = useCallback(
    (sectionId: SectionId, viewedCount: number): void => {
      markSectionViewedCount(sectionId, viewedCount);
      persistProgress(sectionId, viewedCount);
    },
    [markSectionViewedCount, persistProgress]
  );

  const handleSectionOpened = useCallback(
    (sectionId: SectionId): void => {
      markSectionOpened(sectionId);
      persistProgress(sectionId, 1);
    },
    [markSectionOpened, persistProgress]
  );

  const handlePanelTime = useCallback(
    (sectionId: SectionId, panelIndex: number, seconds: number, panelTitle?: string | null): void => {
      recordKangurLessonPanelTime({
        lessonKey,
        sectionId,
        panelId: `panel-${panelIndex + 1}`,
        panelTitle,
        seconds,
        sessionId: sessionIdRef.current,
        sessionStartedAt: sessionStartedAtRef.current,
      }, { ownerKey: subjectKey });
    },
    [lessonKey, subjectKey]
  );

  return {
    markSectionOpened: handleSectionOpened,
    markSectionViewedCount: handleSectionViewedCount,
    recordPanelTime: handlePanelTime,
    sectionProgress,
  };
};
