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

const createMonitoringCandidate = ({
  basePath,
  entry,
  lessonKey,
  lessonTitle,
  sectionId,
}: {
  basePath: string;
  entry: NonNullable<KangurProgressState['lessonPanelProgress']>[string][string];
  lessonKey: string;
  lessonTitle: string;
  sectionId: string;
}): LiveStateCandidate | null => {
  const updatedAt = entry.sessionUpdatedAt ?? entry.lastViewedAt ?? entry.sessionStartedAt ?? null;
  const updatedAtMs = parseTimestampMs(updatedAt);
  if (!updatedAtMs) {
    return null;
  }

  return {
    source: 'monitoring',
    updatedAtMs,
    title: lessonTitle,
    href: buildLessonHref(basePath, lessonKey),
    context: {
      lessonTitle,
      sectionLabel: normalizeLabel(entry.label, sectionId),
    },
  };
};

const resolveNewerLiveStateCandidate = (
  current: LiveStateCandidate | null,
  next: LiveStateCandidate | null
): LiveStateCandidate | null => {
  if (!next) {
    return current;
  }
  if (!current || next.updatedAtMs > current.updatedAtMs) {
    return next;
  }
  return current;
};

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

  for (const [lessonKey, sections] of Object.entries(lessonPanelProgress)) {
    const lessonTitle = lessonsById.get(lessonKey)?.title ?? lessonFallbackLabel;
    for (const [sectionId, entry] of Object.entries(sections ?? {})) {
      latest = resolveNewerLiveStateCandidate(
        latest,
        createMonitoringCandidate({
          basePath,
          entry,
          lessonKey,
          lessonTitle,
          sectionId,
        })
      );
    }
  }

  return latest;
};

const resolveObservabilityDescription = ({
  isOnline,
  title,
  translate,
}: {
  isOnline: boolean;
  title: string;
  translate: BuildKangurLearnerLiveStateInput['translate'];
}): string => {
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
};

const resolveActivityLogDescription = ({
  candidate,
  isOnline,
  title,
  translate,
}: {
  candidate: LiveStateCandidate;
  isOnline: boolean;
  title: string;
  translate: BuildKangurLearnerLiveStateInput['translate'];
}): string => {
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
};

const resolveMonitoringDescription = ({
  candidate,
  title,
  translate,
}: {
  candidate: LiveStateCandidate;
  title: string;
  translate: BuildKangurLearnerLiveStateInput['translate'];
}): string => {
  const lessonTitle =
    candidate.context?.lessonTitle ?? (title || translate('hero.activity.lessonFallback'));
  const sectionLabel = candidate.context?.sectionLabel;
  const detail = sectionLabel ? `${lessonTitle} · ${sectionLabel}` : lessonTitle;
  return translate('hero.activity.description.monitoring.recentWithDetail', { detail });
};

const resolveMonitoringDetail = ({
  candidate,
  title,
  translate,
}: {
  candidate: LiveStateCandidate;
  title: string;
  translate: BuildKangurLearnerLiveStateInput['translate'];
}): string => {
  const lessonFallback = title || translate('hero.activity.lessonFallback');
  const lessonTitle = candidate.context?.lessonTitle ?? lessonFallback;
  const sectionLabel = candidate.context?.sectionLabel;
  return sectionLabel ? `${lessonTitle} · ${sectionLabel}` : lessonTitle;
};

const resolveCandidateDescription = (
  candidate: LiveStateCandidate,
  status: LiveStateStatus,
  translate: BuildKangurLearnerLiveStateInput['translate']
): string => {
  const isOnline = status === 'online';
  const title = candidate.title?.trim() ?? '';

  if (candidate.source === 'observability') {
    return resolveObservabilityDescription({ isOnline, title, translate });
  }

  if (candidate.source === 'activity_log') {
    return resolveActivityLogDescription({ candidate, isOnline, title, translate });
  }

  const detail = resolveMonitoringDetail({ candidate, title, translate });
  return isOnline
    ? translate('hero.activity.description.monitoring.currentWithDetail', { detail })
    : resolveMonitoringDescription({ candidate, title, translate });
};

const buildEmptyLiveState = (
  input: BuildKangurLearnerLiveStateInput,
  status: 'loading' | 'offline'
): KangurLearnerLiveState => ({
  status,
  label: input.translate(
    status === 'loading' ? 'hero.activity.status.loading' : 'hero.activity.status.offline'
  ),
  description: input.translate(
    status === 'loading' ? 'hero.activity.loadingDescription' : 'hero.activity.offlineDescription'
  ),
  href: null,
  showLink: false,
  isOnline: false,
  updatedAt: null,
  source: 'none',
});

const appendObservabilityCandidate = ({
  activityStatus,
  candidates,
  nowMs,
}: {
  activityStatus: KangurLearnerActivityStatus | null;
  candidates: LiveStateCandidate[];
  nowMs: number;
}): void => {
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
    return;
  }

  if (activityStatus?.isOnline) {
    candidates.push({
      source: 'observability',
      updatedAtMs: nowMs,
      title: null,
      href: null,
      isOnlineHint: true,
    });
  }
};

const appendOptionalLiveStateCandidate = (
  candidates: LiveStateCandidate[],
  candidate: LiveStateCandidate | null
): void => {
  if (candidate) {
    candidates.push(candidate);
  }
};

const resolveLessonsById = (
  lessons: BuildKangurLearnerLiveStateInput['lessons']
): Map<string, Pick<KangurLesson, 'componentId' | 'title'>> =>
  new Map(lessons.map((lesson) => [lesson.componentId, lesson] as const));

const buildLiveStateCandidates = (
  input: BuildKangurLearnerLiveStateInput,
  lessonsById: Map<string, Pick<KangurLesson, 'componentId' | 'title'>>,
  nowMs: number
): LiveStateCandidate[] => {
  const candidates: LiveStateCandidate[] = [];
  appendObservabilityCandidate({
    activityStatus: input.activityStatus,
    candidates,
    nowMs,
  });
  appendOptionalLiveStateCandidate(
    candidates,
    resolveLatestOpenedTask(input.progress.openedTasks ?? [])
  );
  appendOptionalLiveStateCandidate(
    candidates,
    resolveLatestMonitoringEntry(
      input.progress.lessonPanelProgress ?? {},
      lessonsById,
      input.basePath,
      input.translate('hero.activity.lessonFallback')
    )
  );
  return candidates;
};

const resolveBestLiveStateCandidate = (candidates: LiveStateCandidate[]): LiveStateCandidate | null => {
  const sourcePriority: Record<LiveStateCandidate['source'], number> = {
    observability: 3,
    activity_log: 2,
    monitoring: 1,
  };
  const [firstCandidate, ...remainingCandidates] = candidates;
  if (!firstCandidate) {
    return null;
  }

  return remainingCandidates.reduce((best, current) => {
    if (current.updatedAtMs !== best.updatedAtMs) {
      return current.updatedAtMs > best.updatedAtMs ? current : best;
    }
    return sourcePriority[current.source] > sourcePriority[best.source] ? current : best;
  }, firstCandidate);
};

const resolveLiveStateStatus = (
  candidate: LiveStateCandidate,
  nowMs: number
): { status: LiveStateStatus; isOnline: boolean } => {
  const ageMs = Math.max(0, nowMs - candidate.updatedAtMs);
  const withinOnlineWindow = ageMs <= ONLINE_THRESHOLD_MS;
  const withinRecentWindow = ageMs <= RECENT_THRESHOLD_MS;
  const isOnline =
    candidate.source === 'observability'
      ? Boolean(candidate.isOnlineHint) && withinOnlineWindow
      : withinOnlineWindow;
  return {
    status: isOnline ? 'online' : withinRecentWindow ? 'recent' : 'offline',
    isOnline,
  };
};

const resolveLiveStateStatusLabel = (
  status: LiveStateStatus,
  translate: BuildKangurLearnerLiveStateInput['translate']
): string => {
  if (status === 'online') {
    return translate('hero.activity.status.online');
  }
  if (status === 'recent') {
    return translate('hero.activity.status.recent');
  }
  return translate('hero.activity.status.offline');
};

export const buildKangurLearnerLiveState = (
  input: BuildKangurLearnerLiveStateInput
): KangurLearnerLiveState => {
  const nowMs = input.now ? input.now.getTime() : Date.now();
  const lessonsById = resolveLessonsById(input.lessons);
  const candidates = buildLiveStateCandidates(input, lessonsById, nowMs);

  if (candidates.length === 0) {
    return buildEmptyLiveState(input, input.isActivityLoading ? 'loading' : 'offline');
  }

  const bestCandidate = resolveBestLiveStateCandidate(candidates);
  if (!bestCandidate) {
    return buildEmptyLiveState(input, 'offline');
  }

  const { status, isOnline } = resolveLiveStateStatus(bestCandidate, nowMs);
  const label = resolveLiveStateStatusLabel(status, input.translate);
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
