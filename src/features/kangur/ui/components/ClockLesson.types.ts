import type { LessonSlide as LessonSlideSectionSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import type {
  ClockChallengeMedal as SharedClockChallengeMedal,
  ClockTask as SharedClockTask,
  ClockTrainingSectionId as SharedClockTrainingSectionId,
} from './clock-training/types';

export type SectionId = SharedClockTrainingSectionId;
export type TrainingCardId = string;
export type ClockHubId = SectionId | TrainingCardId;
export type ClockTrainingPanelId = 'learn' | 'pick_one' | 'pick_two' | 'challenge';
export type ClockChallengeMedal = SharedClockChallengeMedal;
export type ClockPracticeTask = SharedClockTask;

export type LessonSlide = LessonSlideSectionSlide & {
  tts: string;
};

export type LessonSection = {
  id: SectionId;
  title: string;
  subtitle: string;
  slides: LessonSlide[];
};

export type ClockHubSection = {
  id: ClockHubId;
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};
