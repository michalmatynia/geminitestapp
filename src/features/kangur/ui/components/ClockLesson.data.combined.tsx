import type { LessonSlide } from './ClockLesson.types';
import {
  ClockCombinedHandsAnimation,
  ClockHalfPastAnimation,
  ClockQuarterAnimation,
} from '@/features/kangur/ui/components/ClockLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_WRAP_ROW_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { AnalogClock } from './ClockLesson.visuals';
import type { WidenLessonCopy } from './ClockLesson.i18n';

export const CLOCK_COMBINED_SLIDES_COPY_PL = {
  combineHands: {
    title: 'Jak łączyć obie wskazówki?',
    tts: 'Najpierw czytamy godzinę z krótkiej wskazówki, potem minuty z długiej.',
    clockLabel: 'Przykład: 8:30',
    animationCaption: 'Krótka wskazówka pokazuje godzinę, długa minuty.',
    stepsTitle: 'Kroki:',
    step1: '1. Krótka wskazówka: godzina = 8',
    step2: '2. Długa wskazówka: minuty = 30',
    result: 'Wynik: 8:30',
  },
  quarterPastQuarterTo: {
    title: 'Kwadrans po i kwadrans do',
    tts: 'Długa wskazówka na 3 to kwadrans po, a na 9 to kwadrans do następnej godziny.',
    quarterPastLabel: '5:15 - kwadrans po 5',
    quarterToLabel: '5:45 - kwadrans do 6',
    animationCaption: 'Minuty 15 i 45 to kwadranse.',
    caption: 'Odczytujemy godzinę i minuty jednocześnie.',
  },
  readyForPractice: {
    title: 'Gotowy/a na ćwiczenie',
    tts: 'Teraz potrafisz czytać godziny i minuty razem. Przejdź do ćwiczenia.',
    animationCaption: 'Pół godziny to :30, długa wskazówka na 6.',
    caption:
      'Brawo! Umiesz:\n🔴 czytać godziny,\n🟢 czytać minuty,\n✅ łączyć obie wskazówki w pełny czas.',
  },
} as const;

export type ClockCombinedSlidesCopy = WidenLessonCopy<typeof CLOCK_COMBINED_SLIDES_COPY_PL>;

export const buildClockCombinedSlides = (copy: ClockCombinedSlidesCopy): LessonSlide[] => [
  {
    title: copy.combineHands.title,
    tts: copy.combineHands.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock hours={8} minutes={30} label={copy.combineHands.clockLabel} />
        <KangurLessonCallout accent='indigo' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockCombinedHandsAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.combineHands.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='indigo' className='max-w-xs space-y-2 text-left'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>{copy.combineHands.stepsTitle}</p>
          <KangurLessonCaption align='left'>{copy.combineHands.step1}</KangurLessonCaption>
          <KangurLessonCaption align='left'>{copy.combineHands.step2}</KangurLessonCaption>
          <p className='font-extrabold text-indigo-700'>{copy.combineHands.result}</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.quarterPastQuarterTo.title,
    tts: copy.quarterPastQuarterTo.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock hours={5} minutes={15} label={copy.quarterPastQuarterTo.quarterPastLabel} />
          <AnalogClock hours={5} minutes={45} label={copy.quarterPastQuarterTo.quarterToLabel} />
        </div>
        <KangurLessonCallout accent='indigo' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockQuarterAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.quarterPastQuarterTo.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          {copy.quarterPastQuarterTo.caption}
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.readyForPractice.title,
    tts: copy.readyForPractice.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <div className='text-7xl'>✨</div>
        <KangurLessonCallout accent='indigo' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockHalfPastAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.readyForPractice.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs whitespace-pre-line leading-relaxed'>
          {copy.readyForPractice.caption}
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
];

export const COMBINED_SLIDES: LessonSlide[] = buildClockCombinedSlides(CLOCK_COMBINED_SLIDES_COPY_PL);
