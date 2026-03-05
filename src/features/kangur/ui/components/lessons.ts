import type { ComponentType } from 'react';

import AddingLessonView from '@/features/kangur/ui/components/AddingLesson';
import CalendarLessonView from '@/features/kangur/ui/components/CalendarLesson';
import CalendarTrainingGameView from '@/features/kangur/ui/components/CalendarTrainingGame';
import ClockLessonView from '@/features/kangur/ui/components/ClockLesson';
import DivisionLessonView from '@/features/kangur/ui/components/DivisionLesson';
import MultiplicationLessonView from '@/features/kangur/ui/components/MultiplicationLesson';
import SubtractingLessonView from '@/features/kangur/ui/components/SubtractingLesson';

type LessonProps = {
  onBack: () => void;
};

type CalendarTrainingGameProps = {
  onFinish: () => void;
};

export const ClockLesson = ClockLessonView as ComponentType<LessonProps>;
export const CalendarLesson = CalendarLessonView as ComponentType<LessonProps>;
export const AddingLesson = AddingLessonView as ComponentType<LessonProps>;
export const SubtractingLesson = SubtractingLessonView as ComponentType<LessonProps>;
export const MultiplicationLesson = MultiplicationLessonView as ComponentType<LessonProps>;
export const DivisionLesson = DivisionLessonView as ComponentType<LessonProps>;
export const CalendarTrainingGame = CalendarTrainingGameView as ComponentType<CalendarTrainingGameProps>;
