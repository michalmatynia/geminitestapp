import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import type {
  KangurLessonComponentId,
  KangurRoutePage,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAiTutorLearnerMemory,
  KangurAiTutorFollowUpAction,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  LESSON_COMPONENT_IDS,
  LESSON_COMPONENT_TO_PRACTICE_OPERATION,
  PRACTICE_OPERATION_TO_LESSON_COMPONENT,
} from './adaptive.constants';
import type { KangurCompletedFollowUp } from './adaptive.contracts';

export const normalizeComparableValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeLessonComponentCandidate = (
  value: string | null | undefined
): KangurLessonComponentId | null => {
  const normalizedValue = normalizeComparableValue(value);
  if (!normalizedValue) return null;

  const withoutLessonPrefix = normalizedValue.startsWith('lesson-')
    ? normalizedValue.slice('lesson-'.length)
    : normalizedValue;
  if (LESSON_COMPONENT_IDS.has(withoutLessonPrefix as KangurLessonComponentId)) {
    return withoutLessonPrefix as KangurLessonComponentId;
  }

  return (
    PRACTICE_OPERATION_TO_LESSON_COMPONENT[
      withoutLessonPrefix as keyof typeof PRACTICE_OPERATION_TO_LESSON_COMPONENT
    ] ?? null
  );
};

export const resolveLessonFocusTitle = (
  componentId: KangurLessonComponentId,
  preferredTitle?: string | null
): string => preferredTitle?.trim() || KANGUR_LESSON_LIBRARY[componentId].title;

export const resolvePracticeDifficulty = (averageAccuracy: number): 'easy' | 'medium' | 'hard' => {
  if (averageAccuracy >= 85) return 'hard';
  if (averageAccuracy >= 70) return 'medium';
  return 'easy';
};

export const buildTrainingQueryFromLessonComponent = (
  componentId: KangurLessonComponentId,
  averageAccuracy: number
): Record<string, string> => {
  const operation = LESSON_COMPONENT_TO_PRACTICE_OPERATION[componentId];
  if (!operation) return { quickStart: 'training' };

  return {
    quickStart: 'operation',
    operation,
    difficulty: resolvePracticeDifficulty(averageAccuracy),
  };
};

export const parseCompletedFollowUp = (
  memory: KangurAiTutorLearnerMemory | null | undefined
): KangurCompletedFollowUp | null => {
  const rawAction = memory?.lastRecommendedAction?.trim();
  if (rawAction?.startsWith('Completed follow-up:') !== true) return null;

  const payload = rawAction.slice('Completed follow-up:'.length).trim();
  if (!payload) return null;

  const separatorIndex = payload.indexOf(':');
  const label = separatorIndex === -1 ? payload.trim() : payload.slice(0, separatorIndex).trim();
  const reason = separatorIndex === -1 ? null : payload.slice(separatorIndex + 1).trim() || null;
  const normalizedLabel = normalizeComparableValue(label);
  if (!normalizedLabel) return null;

  const intervention = memory?.lastSuccessfulIntervention?.trim();
  const pageMatch = intervention?.match(/\bon (Game|Lessons|ParentDashboard|LearnerProfile)\.?$/u);
  const pageFromIntervention = pageMatch?.[1] as KangurRoutePage | null;
  
  const inferredPage = pageFromIntervention ?? (
    normalizedLabel === 'otwórz lekcje' ? 'Lessons' : 
    (normalizedLabel === 'uruchom trening' || normalizedLabel === 'zagraj teraz' || normalizedLabel === 'zagraj dziś' || normalizedLabel === 'kontynuuj grę' ? 'Game' : null)
  );

  return {
    label: normalizedLabel,
    reason: normalizeComparableValue(reason),
    page: inferredPage,
  };
};

export const isCompletedFollowUpMatch = (
  completedFollowUp: KangurCompletedFollowUp | null,
  action: KangurAiTutorFollowUpAction | null | undefined
): boolean => {
  if (!completedFollowUp || !action) return false;
  const actionLabel = normalizeComparableValue(action.label);
  if (!actionLabel || actionLabel !== completedFollowUp.label) return false;
  if (!completedFollowUp.reason) return true;
  return normalizeComparableValue(action.reason) === completedFollowUp.reason;
};

export const matchesLessonComponent = (
  componentId: string,
  candidates: Array<string | null | undefined>
): boolean => {
  const normalizedComponent = normalizeComparableValue(componentId);
  if (!normalizedComponent) return false;

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeComparableValue(candidate);
    if (!normalizedCandidate) return false;
    return (
      normalizedCandidate === normalizedComponent ||
      normalizedCandidate.endsWith(`-${normalizedComponent}`) ||
      normalizedCandidate.endsWith(`_${normalizedComponent}`) ||
      normalizedCandidate.endsWith(`:${normalizedComponent}`) ||
      normalizedCandidate.endsWith(`/${normalizedComponent}`)
    );
  });
};
