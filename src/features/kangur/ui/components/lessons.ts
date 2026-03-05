import type { ComponentType } from 'react';

import AddingLessonLegacy from '@/features/kangur/legacy/components/lessons/AddingLessons';
import CalendarLessonLegacy from '@/features/kangur/legacy/components/lessons/CalendarLessson';
import CalendarTrainingGameLegacy from '@/features/kangur/legacy/components/lessons/CalendarTrainingGame';
import ClockLessonLegacy from '@/features/kangur/legacy/components/lessons/ClockLesson';
import DivisionLessonView from '@/features/kangur/ui/components/DivisionLesson';
import MultiplicationLessonView from '@/features/kangur/ui/components/MultiplicationLesson';
import SubtractingLessonView from '@/features/kangur/ui/components/SubtractingLesson';

type LessonProps = {
  onBack: () => void;
};

type CalendarTrainingGameProps = {
  onFinish: () => void;
};

export const ClockLesson = ClockLessonLegacy as ComponentType<LessonProps>;
export const CalendarLesson = CalendarLessonLegacy as ComponentType<LessonProps>;
export const AddingLesson = AddingLessonLegacy as ComponentType<LessonProps>;
export const SubtractingLesson = SubtractingLessonView as ComponentType<LessonProps>;
export const MultiplicationLesson = MultiplicationLessonView as ComponentType<LessonProps>;
export const DivisionLesson = DivisionLessonView as ComponentType<LessonProps>;
export const CalendarTrainingGame = CalendarTrainingGameLegacy as ComponentType<CalendarTrainingGameProps>;
