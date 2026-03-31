import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import type { KangurRouteAction } from '@/features/kangur/shared/contracts/kangur';
import type {
  ParentDashboardDailyQuest,
  ParentDashboardLessonPanelCard,
  ParentDashboardProgressSnapshot,
  ParentDashboardRuntimeState,
  ProgressTranslations,
} from './KangurParentDashboardProgressWidget.types';
import { RECENT_ACTIVE_ASSIGNMENTS_LIMIT } from './KangurParentDashboardProgressWidget.constants';

export const buildAssignmentHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

export const formatProgressTimestamp = ({
  value,
  locale,
  fallback,
}: {
  value: string | null | undefined;
  locale: string;
  fallback: string;
}): string => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const normalizePanelLabel = (value: string | null | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback.replace(/_/g, ' ').trim();
};

export const resolveCompactActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 sm:w-auto sm:shrink-0'
    : 'w-full sm:w-auto sm:shrink-0';

export const buildProgressTaskKindLabels = (
  translations: ProgressTranslations
): Record<string, string> => ({
  game: translations('widgets.progress.taskKind.game'),
  lesson: translations('widgets.progress.taskKind.lesson'),
  test: translations('widgets.progress.taskKind.test'),
});

export const buildLessonPanelCards = ({
  lessonPanelProgress,
  lessons,
}: {
  lessonPanelProgress: NonNullable<ParentDashboardRuntimeState['progress']['lessonPanelProgress']>;
  lessons: ParentDashboardRuntimeState['lessons'];
}): ParentDashboardLessonPanelCard[] =>
  (lessons ?? [])
    .map((lesson) => {
      const panels = lessonPanelProgress[lesson.componentId] ?? {};
      const entries = Object.entries(panels);
      if (entries.length === 0) {
        return null;
      }

      const totals = entries.reduce(
        (acc, [, entry]) => ({
          viewed: acc.viewed + Math.min(entry.viewedCount, entry.totalCount),
          total: acc.total + entry.totalCount,
        }),
        { viewed: 0, total: 0 }
      );
      const percent = totals.total > 0 ? Math.round((totals.viewed / totals.total) * 100) : 0;

      return {
        lesson,
        percent,
        viewed: totals.viewed,
        total: totals.total,
        sections: entries
          .map(([sectionId, entry]) => ({
            id: sectionId,
            label: normalizePanelLabel(entry.label, sectionId),
            viewedCount: entry.viewedCount,
            totalCount: entry.totalCount,
          }))
          .sort((left, right) => left.label.localeCompare(right.label)),
      };
    })
    .filter((entry): entry is ParentDashboardLessonPanelCard => Boolean(entry));

export const resolveDailyQuestAccent = (
  dailyQuest: ParentDashboardDailyQuest
): 'amber' | 'emerald' | 'indigo' | 'slate' => {
  if (dailyQuest?.reward.status === 'claimed') {
    return 'emerald';
  }
  if (dailyQuest?.progress.status === 'completed') {
    return 'amber';
  }
  if (dailyQuest?.progress.status === 'in_progress') {
    return 'indigo';
  }
  return 'slate';
};

export const resolveDailyQuestAction = (dailyQuest: ParentDashboardDailyQuest) =>
  dailyQuest?.assignment.action ?? null;

export const resolveDailyQuestActionLabel = (
  dailyQuestAction: ReturnType<typeof resolveDailyQuestAction>
): string => dailyQuestAction?.label ?? '';

export const resolveDailyQuestDescription = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.assignment.description ?? '';

export const resolveDailyQuestLabel = ({
  dailyQuest,
  translations,
}: {
  dailyQuest: ParentDashboardDailyQuest;
  translations: ProgressTranslations;
}): string =>
  dailyQuest?.assignment.questLabel ??
  translations('widgets.progress.dailyQuest.questLabel');

export const resolveDailyQuestProgressLabel = (
  dailyQuest: ParentDashboardDailyQuest
): string => (dailyQuest ? `${dailyQuest.progress.percent}%` : '');

export const resolveDailyQuestProgressSummary = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.progress.summary ?? '';

export const resolveDailyQuestRewardAccent = ({
  dailyQuest,
  dailyQuestAccent,
}: {
  dailyQuest: ParentDashboardDailyQuest;
  dailyQuestAccent: ReturnType<typeof resolveDailyQuestAccent>;
}): 'amber' | 'emerald' | 'indigo' | 'slate' =>
  dailyQuest?.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent;

export const resolveDailyQuestRewardLabel = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.reward.label ?? '';

export const resolveDailyQuestTargetPage = (
  dailyQuestAction: ReturnType<typeof resolveDailyQuestAction>
) => dailyQuestAction?.page ?? null;

export const resolveDailyQuestTitle = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.assignment.title ?? '';

export const resolveDailyQuestHref = ({
  basePath,
  dailyQuestAction,
}: {
  basePath: string;
  dailyQuestAction: ReturnType<typeof resolveDailyQuestAction>;
}): string | null => (dailyQuestAction ? buildAssignmentHref(basePath, dailyQuestAction) : null);

export const buildActiveAssignments = (
  assignments: NonNullable<ParentDashboardRuntimeState['assignments']>
) =>
  assignments.filter(
    (assignment) => !assignment.archived && assignment.progress.status !== 'completed'
  );

export const buildRecentAssignments = (
  activeAssignments: ReturnType<typeof buildActiveAssignments>
) =>
  activeAssignments
    .slice()
    .sort((left, right) => {
      const leftTimestamp = Date.parse(left.progress.lastActivityAt ?? left.updatedAt);
      const rightTimestamp = Date.parse(right.progress.lastActivityAt ?? right.updatedAt);
      return rightTimestamp - leftTimestamp;
    })
    .slice(0, RECENT_ACTIVE_ASSIGNMENTS_LIMIT);

export const resolveMaxWeeklyGames = (
  weeklyActivity: ParentDashboardProgressSnapshot['weeklyActivity']
): number => Math.max(1, ...weeklyActivity.map((point: any) => point.games));

export const createProgressTimestampFormatter = ({
  fallback,
  locale,
}: {
  fallback: string;
  locale: string;
}) => (value: string | null | undefined): string =>
  formatProgressTimestamp({
    value,
    locale,
    fallback,
  });

export const resolveDailyQuestPresentation = ({
  basePath,
  dailyQuest,
  translations,
}: {
  basePath: string;
  dailyQuest: ParentDashboardDailyQuest;
  translations: ProgressTranslations;
}) => {
  const dailyQuestAction = resolveDailyQuestAction(dailyQuest);
  const dailyQuestAccent = resolveDailyQuestAccent(dailyQuest);

  return {
    accent: dailyQuestAccent,
    actionLabel: resolveDailyQuestActionLabel(dailyQuestAction),
    description: resolveDailyQuestDescription(dailyQuest),
    href: resolveDailyQuestHref({ basePath, dailyQuestAction }),
    label: resolveDailyQuestLabel({ dailyQuest, translations }),
    progressLabel: resolveDailyQuestProgressLabel(dailyQuest),
    progressSummary: resolveDailyQuestProgressSummary(dailyQuest),
    rewardAccent: resolveDailyQuestRewardAccent({ dailyQuest, dailyQuestAccent }),
    rewardLabel: resolveDailyQuestRewardLabel(dailyQuest),
    targetPage: resolveDailyQuestTargetPage(dailyQuestAction),
    title: resolveDailyQuestTitle(dailyQuest),
  };
};
