import { appendKangurUrlParams, getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import type { KangurLearnerActivityStatus } from '@kangur/platform';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const RECENT_THRESHOLD_MS = 15 * 60 * 1000;

const ACTIVITY_KIND_LABELS: Record<string, string> = {
  game: 'hero.activity.kind.game',
  lesson: 'hero.activity.kind.lesson',
  test: 'hero.activity.kind.test',
};

type LiveStateSource = 'observability' | 'activity_log' | 'monitoring' | 'none';
type LiveStateStatus = 'loading' | 'online' | 'recent' | 'offline';

type LiveStateCandidate = {
  source: Exclude<LiveStateSource, 'none'>;
  updatedAtMs: number;
  title: string | null;
  href: string | null;
  kind?: string;
  isOnlineHint?: boolean;
  context?: {
    lessonTitle?: string;
    sectionLabel?: string;
  };
};

export type KangurLearnerLiveState = {
  status: LiveStateStatus;
  label: string;
  description: string;
  href: string | null;
  showLink: boolean;
  isOnline: boolean;
  updatedAt: string | null;
  source: LiveStateSource;
};

type BuildKangurLearnerLiveStateInput = {
  activityStatus: KangurLearnerActivityStatus | null;
  isActivityLoading: boolean;
  progress: Pick<KangurProgressState, 'openedTasks' | 'lessonPanelProgress'>;
  lessons: Array<Pick<KangurLesson, 'componentId' | 'title'>>;
  basePath: string;
  locale: string;
  translate: (key: string, values?: Record<string, string | number>) => string;
  now?: Date;
};

const parseTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeLabel = (value: string | null | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback.replace(/_/g, ' ').trim();
};

const formatRelativeTime = (timestampMs: number, nowMs: number, locale: string): string | null => {
  if (!Number.isFinite(timestampMs) || !Number.isFinite(nowMs)) {
    return null;
  }
  const diffMs = nowMs - timestampMs;
  if (diffMs < 0) {
    return null;
  }
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffMs < 45 * 1000) {
    return formatter.format(0, 'second');
  }
  const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
  if (diffMinutes < 60) {
    return formatter.format(-diffMinutes, 'minute');
  }
  const diffHours = Math.max(1, Math.round(diffMinutes / 60));
  if (diffHours < 24) {
    return formatter.format(-diffHours, 'hour');
  }
  const diffDays = Math.max(1, Math.round(diffHours / 24));
  return formatter.format(-diffDays, 'day');
};

const appendTimeHint = (description: string, timeLabel: string | null): string => {
  if (!timeLabel) {
    return description;
  }
  const normalized = description.trim().replace(/[.\s]+$/u, '');
  return `${normalized} (${timeLabel}).`;
};

const buildLessonHref = (basePath: string, lessonKey: string): string =>
  appendKangurUrlParams(createPageUrl('Lessons', basePath), { focus: lessonKey }, basePath);

const resolveLatestOpenedTask = (
  openedTasks: NonNullable<KangurProgressState['openedTasks']>
): LiveStateCandidate | null => {
  let latest: LiveStateCandidate | null = null;
  openedTasks.forEach((task) => {
    const updatedAtMs = parseTimestampMs(task.openedAt);
    if (!updatedAtMs) {
      return;
    }
    if (!latest || updatedAtMs > latest.updatedAtMs) {
      latest = {
        source: 'activity_log',
        updatedAtMs,
        title: task.title,
        href: task.href,
        kind: task.kind,
      };
    }
  });
  return latest;
};

const resolveLatestMonitoringEntry = (
  lessonPanelProgress: NonNullable<KangurProgressState['lessonPanelProgress']>,
  lessonsById: Map<string, Pick<KangurLesson, 'componentId' | 'title'>>,
  basePath: string,
  lessonFallbackLabel: string
): LiveStateCandidate | null => {
  let latest: LiveStateCandidate | null = null;
  Object.entries(lessonPanelProgress).forEach(([lessonKey, sections]) => {
    Object.entries(sections ?? {}).forEach(([sectionId, entry]) => {
      const updatedAt =
        entry.sessionUpdatedAt ?? entry.lastViewedAt ?? entry.sessionStartedAt ?? null;
      const updatedAtMs = parseTimestampMs(updatedAt);
      if (!updatedAtMs) {
        return;
      }
      if (!latest || updatedAtMs > latest.updatedAtMs) {
        const lessonTitle = lessonsById.get(lessonKey)?.title ?? lessonFallbackLabel;
        const sectionLabel = normalizeLabel(entry.label, sectionId);
        latest = {
          source: 'monitoring',
          updatedAtMs,
          title: lessonTitle,
          href: buildLessonHref(basePath, lessonKey),
          context: {
            lessonTitle,
            sectionLabel,
          },
        };
      }
    });
  });
  return latest;
};

const resolveCandidateDescription = (
  candidate: LiveStateCandidate,
  status: LiveStateStatus,
  translate: BuildKangurLearnerLiveStateInput['translate']
): string => {
  const isOnline = status === 'online';
  const title = candidate.title?.trim() ?? '';

  if (candidate.source === 'observability') {
    if (title) {
      return translate(
        isOnline
          ? 'hero.activity.description.observability.currentWithTitle'
          : 'hero.activity.description.observability.recentWithTitle',
        { title }
      );
    }
    return isOnline
      ? translate('hero.activity.description.observability.currentGeneric')
      : translate('hero.activity.description.observability.offlineGeneric');
  }

  if (candidate.source === 'activity_log') {
    if (title) {
      return translate(
        isOnline
          ? 'hero.activity.description.activityLog.currentWithTitle'
          : 'hero.activity.description.activityLog.recentWithTitle',
        { title }
      );
    }
    const kindLabel = translate(
      ACTIVITY_KIND_LABELS[candidate.kind ?? ''] ?? 'hero.activity.kind.default'
    );
    return isOnline
      ? translate('hero.activity.description.activityLog.currentByKind', { kind: kindLabel })
      : translate('hero.activity.description.activityLog.recentByKind', { kind: kindLabel });
  }

  const lessonTitle =
    candidate.context?.lessonTitle ?? (title || translate('hero.activity.lessonFallback'));
  const sectionLabel = candidate.context?.sectionLabel;
  const detail = sectionLabel ? `${lessonTitle} · ${sectionLabel}` : lessonTitle;
  return isOnline
    ? translate('hero.activity.description.monitoring.currentWithDetail', { detail })
    : translate('hero.activity.description.monitoring.recentWithDetail', { detail });
};

export const buildKangurLearnerLiveState = (
  input: BuildKangurLearnerLiveStateInput
): KangurLearnerLiveState => {
  const nowMs = input.now ? input.now.getTime() : Date.now();
  const lessonsById = new Map(
    input.lessons.map((lesson) => [lesson.componentId, lesson] as const)
  );
  const candidates: LiveStateCandidate[] = [];
  const activityStatus = input.activityStatus;

  if (activityStatus?.snapshot) {
    const updatedAtMs = parseTimestampMs(activityStatus.snapshot.updatedAt);
    if (updatedAtMs) {
      candidates.push({
        source: 'observability',
        updatedAtMs,
        title: activityStatus.snapshot.title,
        href: activityStatus.snapshot.href,
        kind: activityStatus.snapshot.kind,
        isOnlineHint: activityStatus.isOnline,
      });
    }
  } else if (activityStatus?.isOnline) {
    candidates.push({
      source: 'observability',
      updatedAtMs: nowMs,
      title: null,
      href: null,
      isOnlineHint: true,
    });
  }

  const openedTasks = input.progress.openedTasks ?? [];
  const latestOpenedTask = resolveLatestOpenedTask(openedTasks);
  if (latestOpenedTask) {
    candidates.push(latestOpenedTask);
  }

  const lessonPanelProgress = input.progress.lessonPanelProgress ?? {};
  const latestMonitoringEntry = resolveLatestMonitoringEntry(
    lessonPanelProgress,
    lessonsById,
    input.basePath,
    input.translate('hero.activity.lessonFallback')
  );
  if (latestMonitoringEntry) {
    candidates.push(latestMonitoringEntry);
  }

  if (candidates.length === 0) {
    if (input.isActivityLoading) {
      return {
        status: 'loading',
        label: input.translate('hero.activity.status.loading'),
        description: input.translate('hero.activity.loadingDescription'),
        href: null,
        showLink: false,
        isOnline: false,
        updatedAt: null,
        source: 'none',
      };
    }
    return {
      status: 'offline',
      label: input.translate('hero.activity.status.offline'),
      description: input.translate('hero.activity.offlineDescription'),
      href: null,
      showLink: false,
      isOnline: false,
      updatedAt: null,
      source: 'none',
    };
  }

  const sourcePriority: Record<LiveStateCandidate['source'], number> = {
    observability: 3,
    activity_log: 2,
    monitoring: 1,
  };

  const [firstCandidate, ...remainingCandidates] = candidates;
  if (!firstCandidate) {
    return {
      status: 'offline',
      label: input.translate('hero.activity.status.offline'),
      description: input.translate('hero.activity.offlineDescription'),
      href: null,
      showLink: false,
      isOnline: false,
      updatedAt: null,
      source: 'none',
    };
  }

  const bestCandidate = remainingCandidates.reduce((best, current) => {
    if (!best) {
      return current;
    }
    if (current.updatedAtMs !== best.updatedAtMs) {
      return current.updatedAtMs > best.updatedAtMs ? current : best;
    }
    return sourcePriority[current.source] > sourcePriority[best.source] ? current : best;
  }, firstCandidate);

  const ageMs = Math.max(0, nowMs - bestCandidate.updatedAtMs);
  const withinOnlineWindow = ageMs <= ONLINE_THRESHOLD_MS;
  const withinRecentWindow = ageMs <= RECENT_THRESHOLD_MS;
  const isOnline =
    bestCandidate.source === 'observability'
      ? Boolean(bestCandidate.isOnlineHint) && withinOnlineWindow
      : withinOnlineWindow;
  const status: LiveStateStatus = isOnline ? 'online' : withinRecentWindow ? 'recent' : 'offline';
  const label =
    status === 'online'
      ? input.translate('hero.activity.status.online')
      : status === 'recent'
        ? input.translate('hero.activity.status.recent')
        : input.translate('hero.activity.status.offline');
  const timeLabel = formatRelativeTime(bestCandidate.updatedAtMs, nowMs, input.locale);
  const description = appendTimeHint(
    resolveCandidateDescription(bestCandidate, status, input.translate),
    timeLabel
  );
  const href = bestCandidate.href ?? null;
  const showLink = Boolean(href && (status === 'online' || status === 'recent'));

  return {
    status,
    label,
    description,
    href,
    showLink,
    isOnline,
    updatedAt: new Date(bestCandidate.updatedAtMs).toISOString(),
    source: bestCandidate.source,
  };
};
