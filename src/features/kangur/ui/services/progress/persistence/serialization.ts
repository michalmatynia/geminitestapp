import { 
  type KangurProgressState
} from '@/features/kangur/ui/types';

export const cloneProgress = (progress: KangurProgressState): KangurProgressState => {
  return {
    ...progress,
    badges: [...progress.badges],
    operationsPlayed: [...progress.operationsPlayed],
    lessonMastery: Object.fromEntries(
      Object.entries(progress.lessonMastery).map(([key, value]) => [key, { ...value }])
    ),
    openedTasks: progress.openedTasks.map((entry) => ({ ...entry })),
    lessonPanelProgress: Object.fromEntries(
      Object.entries(progress.lessonPanelProgress ?? {}).map(([lessonKey, sections]) => [
        lessonKey,
        Object.fromEntries(
          Object.entries(sections ?? {}).map(([sectionId, entry]) => [
            sectionId,
            {
              ...entry,
              ...(entry.panelTimes
                ? {
                    panelTimes: Object.fromEntries(
                      Object.entries(entry.panelTimes).map(([panelId, panel]) => [
                        panelId,
                        { ...panel },
                      ])
                    ),
                  }
                : {}),
            },
          ])
        ),
      ])
    ),
    activityStats: Object.fromEntries(
      Object.entries(progress.activityStats ?? {}).map(([key, value]) => [key, { ...value }])
    ),
  };
};

export const normalizeOwnerKey = (ownerKey: string | null | undefined): string | null => {
  const normalized = typeof ownerKey === 'string' ? ownerKey.trim() : '';
  return normalized.length > 0 ? normalized : null;
};
