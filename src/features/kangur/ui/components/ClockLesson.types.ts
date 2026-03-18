import type { LessonSlide as LessonSlideSectionSlide } from '@/features/kangur/ui/components/LessonSlideSection';

export type SectionId = 'hours' | 'minutes' | 'combined';
export type TrainingCardId = 'game_hours' | 'game_minutes' | 'game_combined';
export type ClockHubId = SectionId | TrainingCardId;
export type ClockTrainingPanelId = 'learn' | 'pick_one' | 'pick_two' | 'challenge';
export type ClockChallengeMedal = 'gold' | 'silver' | 'bronze';
export type ClockPracticeTask = {
  hours: number;
  minutes: number;
};

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
