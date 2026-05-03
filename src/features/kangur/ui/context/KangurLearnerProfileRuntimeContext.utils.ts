import type { KangurScoreRecord, KangurUser } from '@kangur/platform';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type {
  KangurAssignmentPriority,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';

export const KANGUR_LEARNER_PROFILE_DAILY_GOAL_GAMES = 3;

export const getScopedMessageValue = (
  messages: Record<string, unknown> | undefined,
  namespace: string,
  key: string
): unknown => {
  const scopedPath = [...namespace.split('.'), ...key.split('.')];
  return scopedPath.reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, messages);
};

export const hasScopedMessage = (
  messages: Record<string, unknown> | undefined,
  namespace: string,
  key: string
): boolean => getScopedMessageValue(messages, namespace, key) !== undefined;

export const QUICK_START_OPERATIONS = new Set<KangurOperation>([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
]);

export const KANGUR_PROFILE_RECOMMENDATION_ACCENTS: Record<
  KangurAssignmentPriority,
  KangurAccent
> = {
  high: 'rose',
  medium: 'amber',
  low: 'emerald',
};

export const resolvePracticeDifficulty = (averageAccuracy: number): KangurDifficulty => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

export const getKangurLearnerProfileDisplayNameWithFallback = (
  user: KangurUser | null,
  localModeLabel: string
): string => user?.activeLearner?.displayName?.trim() || user?.full_name?.trim() || localModeLabel;

export const formatKangurProfileDateTime = (
  value: string,
  options?: {
    locale?: string | null | undefined;
    dateMissingLabel?: string | undefined;
  }
): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return options?.dateMissingLabel ?? 'Brak daty';
  }
  return parsed.toLocaleString(normalizeSiteLocale(options?.locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatKangurProfileDuration = (seconds: number): string => {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${`${remainingSeconds}`.padStart(2, '0')}s`;
};

export const buildKangurOperationPracticeHref = (
  basePath: string,
  operation: string,
  averageAccuracy: number
): string => {
  const params = new URLSearchParams({ quickStart: 'training' });

  if (QUICK_START_OPERATIONS.has(operation as KangurOperation)) {
    params.set('quickStart', 'operation');
    params.set('operation', operation);
    params.set('difficulty', resolvePracticeDifficulty(averageAccuracy));
  }

  return appendKangurUrlParams(
    createPageUrl('Game', basePath),
    Object.fromEntries(params),
    basePath
  );
};

export const buildKangurRecommendationHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const baseHref = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(baseHref, action.query, basePath) : baseHref;
};

export type KangurLearnerProfileScoreIdentity = {
  learnerId: string;
  userName: string;
  userEmail: string;
};

export type KangurLearnerProfileScoreState = {
  scores: KangurScoreRecord[];
  isLoadingScores: boolean;
  scoresError: string | null;
};

export const trimKangurText = (value: string | null | undefined): string => value?.trim() ?? '';

export const resolveLearnerProfileScoreIdentity = (
  user: KangurUser | null
): KangurLearnerProfileScoreIdentity => ({
  learnerId: trimKangurText(user?.activeLearner?.id),
  userName: trimKangurText(user?.full_name),
  userEmail: trimKangurText(user?.email),
});

export const hasLearnerProfileScoreIdentity = ({
  learnerId,
  userEmail,
  userName,
}: KangurLearnerProfileScoreIdentity): boolean =>
  learnerId.length > 0 || userName.length > 0 || userEmail.length > 0;

export const resolveLearnerProfileScoreLoadMode = ({
  cachedScores,
  scoreIdentity,
}: {
  cachedScores: KangurScoreRecord[] | null;
  scoreIdentity: KangurLearnerProfileScoreIdentity;
}): 'empty' | 'cached' | 'load' => {
  if (!hasLearnerProfileScoreIdentity(scoreIdentity)) {
    return 'empty';
  }
  return cachedScores === null ? 'load' : 'cached';
};

export const applyLearnerProfileScoreState = (
  setState: React.Dispatch<React.SetStateAction<KangurLearnerProfileScoreState>>,
  nextState: Partial<KangurLearnerProfileScoreState>
): void => {
  setState((current) => ({
    ...current,
    ...nextState,
  }));
};
