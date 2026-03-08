import { useCallback, useMemo, useState } from 'react';

export type LessonHubSectionProgress = {
  viewedCount: number;
  totalCount: number;
};

export const useLessonHubProgress = <SectionId extends string>(
  slideSections: Partial<Record<SectionId, readonly unknown[]>>
): {
  markSectionOpened: (sectionId: SectionId) => void;
  markSectionViewedCount: (sectionId: SectionId, viewedCount: number) => void;
  sectionProgress: Partial<Record<SectionId, LessonHubSectionProgress>>;
} => {
  const [viewedCounts, setViewedCounts] = useState<Partial<Record<SectionId, number>>>({});

  const markSectionViewedCount = useCallback(
    (sectionId: SectionId, viewedCount: number): void => {
      const totalCount = slideSections[sectionId]?.length ?? 0;
      if (totalCount === 0) {
        return;
      }

      const normalizedCount = Math.min(Math.max(Math.floor(viewedCount), 0), totalCount);
      if (normalizedCount === 0) {
        return;
      }

      setViewedCounts((previous) => {
        const currentCount = previous[sectionId] ?? 0;
        if (normalizedCount <= currentCount) {
          return previous;
        }

        return {
          ...previous,
          [sectionId]: normalizedCount,
        };
      });
    },
    [slideSections]
  );

  const markSectionOpened = useCallback(
    (sectionId: SectionId): void => {
      markSectionViewedCount(sectionId, 1);
    },
    [markSectionViewedCount]
  );

  const sectionProgress = useMemo(() => {
    const nextProgress: Partial<Record<SectionId, LessonHubSectionProgress>> = {};

    (Object.entries(slideSections) as Array<[SectionId, readonly unknown[]]>).forEach(
      ([sectionId, slides]) => {
        nextProgress[sectionId] = {
          totalCount: slides.length,
          viewedCount: Math.min(viewedCounts[sectionId] ?? 0, slides.length),
        };
      }
    );

    return nextProgress;
  }, [slideSections, viewedCounts]);

  return {
    markSectionOpened,
    markSectionViewedCount,
    sectionProgress,
  };
};
