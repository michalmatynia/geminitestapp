
import AddingLessonView from '@/features/kangur/ui/components/AddingLesson';
import AlphabetBasicsLessonView from '@/features/kangur/ui/components/AlphabetBasicsLesson';
import AlphabetSyllablesLessonView from '@/features/kangur/ui/components/AlphabetSyllablesLesson';
import AlphabetWordsLessonView from '@/features/kangur/ui/components/AlphabetWordsLesson';
import CalendarLessonView from '@/features/kangur/ui/components/CalendarLesson';
import CalendarTrainingGameView from '@/features/kangur/ui/components/CalendarTrainingGame';
import ClockLessonView from '@/features/kangur/ui/components/ClockLesson';
import DivisionLessonView from '@/features/kangur/ui/components/DivisionLesson';
import GeometryBasicsLessonView from '@/features/kangur/ui/components/GeometryBasicsLesson';
import GeometryPerimeterLessonView from '@/features/kangur/ui/components/GeometryPerimeterLesson';
import GeometryShapesLessonView from '@/features/kangur/ui/components/GeometryShapesLesson';
import GeometrySymmetryLessonView from '@/features/kangur/ui/components/GeometrySymmetryLesson';
import EnglishArticlesLessonView from '@/features/kangur/ui/components/EnglishArticlesLesson';
import EnglishLessonView from '@/features/kangur/ui/components/EnglishLesson';
import EnglishPartsOfSpeechLessonView from '@/features/kangur/ui/components/EnglishPartsOfSpeechLesson';
import EnglishPrepositionsLessonView from '@/features/kangur/ui/components/EnglishPrepositionsLesson';
import EnglishSentenceStructureLessonView from '@/features/kangur/ui/components/EnglishSentenceStructureLesson';
import EnglishSubjectVerbAgreementLessonView from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementLesson';
import LogicalAnalogiesLessonView from '@/features/kangur/ui/components/LogicalAnalogiesLesson';
import LogicalClassificationLessonView from '@/features/kangur/ui/components/LogicalClassificationLesson';
import LogicalPatternLessonView from '@/features/kangur/ui/components/LogicalPatternsLesson';
import LogicalReasoningLessonView from '@/features/kangur/ui/components/LogicalReasoningLesson';
import LogicalThinkingLessonView from '@/features/kangur/ui/components/LogicalThinkingLesson';
import MultiplicationLessonView from '@/features/kangur/ui/components/MultiplicationLesson';
import SubtractingLessonView from '@/features/kangur/ui/components/SubtractingLesson';

import type { ComponentType } from 'react';

type LessonProps = {
  onBack?: () => void;
};

type CalendarTrainingGameProps = {
  onFinish: () => void;
};

export const ClockLesson = ClockLessonView as ComponentType<LessonProps>;
export const CalendarLesson = CalendarLessonView as ComponentType<LessonProps>;
export const AddingLesson = AddingLessonView as ComponentType<LessonProps>;
export const AlphabetBasicsLesson = AlphabetBasicsLessonView as ComponentType<LessonProps>;
export const AlphabetSyllablesLesson = AlphabetSyllablesLessonView as ComponentType<LessonProps>;
export const AlphabetWordsLesson = AlphabetWordsLessonView as ComponentType<LessonProps>;
export const SubtractingLesson = SubtractingLessonView as ComponentType<LessonProps>;
export const MultiplicationLesson = MultiplicationLessonView as ComponentType<LessonProps>;
export const DivisionLesson = DivisionLessonView as ComponentType<LessonProps>;
export const GeometryBasicsLesson = GeometryBasicsLessonView as ComponentType<LessonProps>;
export const GeometryShapesLesson = GeometryShapesLessonView as ComponentType<LessonProps>;
export const GeometrySymmetryLesson = GeometrySymmetryLessonView as ComponentType<LessonProps>;
export const GeometryPerimeterLesson = GeometryPerimeterLessonView as ComponentType<LessonProps>;
export const LogicalThinkingLesson = LogicalThinkingLessonView as ComponentType<LessonProps>;
export const LogicalPatternsLesson = LogicalPatternLessonView as ComponentType<LessonProps>;
export const LogicalClassificationLesson =
  LogicalClassificationLessonView as ComponentType<LessonProps>;
export const LogicalReasoningLesson = LogicalReasoningLessonView as ComponentType<LessonProps>;
export const LogicalAnalogiesLesson = LogicalAnalogiesLessonView as ComponentType<LessonProps>;
export const EnglishArticlesLesson = EnglishArticlesLessonView as ComponentType<LessonProps>;
export const EnglishLesson = EnglishLessonView as ComponentType<LessonProps>;
export const EnglishPartsOfSpeechLesson =
  EnglishPartsOfSpeechLessonView as ComponentType<LessonProps>;
export const EnglishPrepositionsLesson =
  EnglishPrepositionsLessonView as ComponentType<LessonProps>;
export const EnglishSentenceStructureLesson =
  EnglishSentenceStructureLessonView as ComponentType<LessonProps>;
export const EnglishSubjectVerbAgreementLesson =
  EnglishSubjectVerbAgreementLessonView as ComponentType<LessonProps>;
export const CalendarTrainingGame =
  CalendarTrainingGameView as ComponentType<CalendarTrainingGameProps>;
