import type {
  KangurAiTutorFollowUpAction,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  normalizeLessonComponentCandidate,
} from './adaptive.utils';
import type { KangurLessonFocusCandidate } from './adaptive.contracts';

export const resolveLessonFocusFromAction = (
  action: KangurAiTutorFollowUpAction | null | undefined
): KangurLessonFocusCandidate | null => {
  const componentId = normalizeLessonComponentCandidate(action?.query?.['focus']);
  if (!componentId) return null;

  return {
    componentId,
    title: action?.reason?.trim() || null,
  };
};
