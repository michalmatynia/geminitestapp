'use client';

import { useCallback, useMemo, useRef } from 'react';

import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
  recordKangurLessonPanelProgress,
  recordKangurLessonPanelTime,
} from '@/features/kangur/ui/services/progress';
import { useLessonHubProgress, type LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type LessonSectionInput<SectionId extends string> = {
  id: SectionId;
  title?: string;
  isGame?: boolean;
  slideCount?: number;
};

type UseKangurLessonSubsectionProgressOptions<SectionId extends string> = {
  lessonId: string;
  sections: ReadonlyArray<LessonSectionInput<SectionId>>;
};

type UseKangurLessonSubsectionProgressResult<SectionId extends string> = {
  markSectionOpened: (sectionId: SectionId) => void;
  markSectionViewedCount: (sectionId: SectionId, viewedCount: number) => void;
  sectionProgress: Partial<Record<SectionId, LessonHubSectionProgress>>;
};

type UseLessonTimeTrackingOptions = {
  lessonId: string;
  scorePercent?: number;
};

type UseLessonTimeTrackingResult = {
  recordPanelTime: (
    sectionId: string,
    panelIndex: number,
    seconds: number,
    panelTitle?: string | null
  ) => void;
  recordComplete: () => Promise<void>;
};

const normalizeLessonKey = (lessonId: string): string => lessonId.trim().replace(/-/g, '_');

export const useKangurLessonSubsectionProgress = <SectionId extends string>({
  lessonId,
  sections,
}: UseKangurLessonSubsectionProgressOptions<SectionId>): UseKangurLessonSubsectionProgressResult<SectionId> => {
  const lessonKey = useMemo(() => normalizeLessonKey(lessonId), [lessonId]);
  const sectionLabels = useMemo(
    () =>
      Object.fromEntries(
        sections.map((section) => [section.id, section.title ?? section.id])
      ) as Partial<Record<SectionId, string>>,
    [sections]
  );
  const slideSections = useMemo(() => {
    const entries: Array<[SectionId, readonly unknown[]]> = [];

    sections.forEach((section) => {
      if (section.isGame) {
        return;
      }

      const slideCount = Math.max(0, Math.floor(section.slideCount ?? 0));
      entries.push([section.id, Array.from({ length: slideCount })]);
    });

    return Object.fromEntries(entries) as Partial<Record<SectionId, readonly unknown[]>>;
  }, [sections]);

  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(slideSections);

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
        label: sectionLabels[sectionId],
      });
    },
    [lessonKey, sectionLabels, slideSections]
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

  return {
    markSectionOpened: handleSectionOpened,
    markSectionViewedCount: handleSectionViewedCount,
    sectionProgress,
  };
};

export const useLessonTimeTracking = ({
  lessonId,
  scorePercent = 100,
}: UseLessonTimeTrackingOptions): UseLessonTimeTrackingResult => {
  const lessonKey = useMemo(() => normalizeLessonKey(lessonId), [lessonId]);
  const sessionIdRef = useRef<string>(
    `lesson-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
  const sessionStartedAtRef = useRef<string>(new Date().toISOString());

  const recordPanelTime = useCallback(
    (sectionId: string, panelIndex: number, seconds: number, panelTitle?: string | null): void => {
      recordKangurLessonPanelTime({
        lessonKey,
        sectionId,
        panelId: `panel-${panelIndex + 1}`,
        panelTitle: panelTitle ?? undefined,
        seconds,
        sessionId: sessionIdRef.current,
        sessionStartedAt: sessionStartedAtRef.current,
      });
    },
    [lessonKey]
  );

  const recordComplete = useCallback(async (): Promise<void> => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, lessonKey, scorePercent);
    addXp(reward.xp, reward.progressUpdates);
  }, [lessonKey, scorePercent]);

  return {
    recordPanelTime,
    recordComplete,
  };
};
