import type {
  KangurLessonComponentId,
  KangurRoutePage,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAiTutorCoachingFrame,
  KangurAiTutorFollowUpAction,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';

export type KangurAiTutorAdaptiveGuidance = {
  instructions: string;
  followUpActions: KangurAiTutorFollowUpAction[];
  coachingFrame: KangurAiTutorCoachingFrame | null;
};

export type KangurCompletedFollowUp = {
  label: string;
  reason: string | null;
  page: KangurRoutePage | null;
};

export type KangurLessonFocusCandidate = {
  componentId: KangurLessonComponentId;
  title: string | null;
};
