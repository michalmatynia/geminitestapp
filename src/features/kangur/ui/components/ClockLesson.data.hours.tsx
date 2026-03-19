import type { LessonSlide } from './ClockLesson.types';
import {
  ClockFullHourStepAnimation,
  ClockHourHandSweepAnimation,
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

export const CLOCK_HOURS_SLIDES_COPY_PL = {
  whatShortHand: {
    title: 'Co pokazuje krótka wskazówka?',
    tts: 'Krótka wskazówka pokazuje godzinę. Na tej sekcji patrzymy tylko na nią.',
    clockThreeLabel: 'Krótka wskazówka na 3',
    clockEightLabel: 'Krótka wskazówka na 8',
    animationCaption: 'Krótka wskazówka przeskakuje z godziny na godzinę.',
    caption:
      'Patrzymy na krótką wskazówkę. Ona mówi nam, która jest godzina.',
  },
  fullHours: {
    title: 'Pełne godziny (:00)',
    tts: 'Gdy jest pełna godzina, odczytujemy tylko godzinę z krótkiej wskazówki.',
    oneLabel: '1:00',
    sixLabel: '6:00',
    elevenLabel: '11:00',
    animationCaption: 'Pełna godzina jest wtedy, gdy długa wskazówka stoi na 12.',
    caption: 'W tej sekcji trenujemy tylko odczyt godziny: 1, 6, 11.',
  },
  quickTest: {
    title: 'Szybki test godzin',
    tts: 'Spójrz na krótką wskazówkę i nazwij godzinę. Minuty pomijamy.',
    clockLabel: 'Jaka to godzina?',
    animationCaption: 'Skup się na krótkiej wskazówce i nazwij godzinę.',
    stepTitle: 'Krok:',
    stepText: '1. Znajdź krótką wskazówkę.\n2. Odczytaj numer, na który pokazuje.',
    result: 'Wynik: 9:00',
  },
} as const;

export type ClockHoursSlidesCopy = WidenLessonCopy<typeof CLOCK_HOURS_SLIDES_COPY_PL>;

export const buildClockHoursSlides = (copy: ClockHoursSlidesCopy): LessonSlide[] => [
  {
    title: copy.whatShortHand.title,
    tts: copy.whatShortHand.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock
            hours={3}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label={copy.whatShortHand.clockThreeLabel}
          />
          <AnalogClock
            hours={8}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label={copy.whatShortHand.clockEightLabel}
          />
        </div>
        <KangurLessonCallout accent='rose' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockHourHandSweepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.whatShortHand.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          {copy.whatShortHand.caption}
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.fullHours.title,
    tts: copy.fullHours.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock
            hours={1}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label={copy.fullHours.oneLabel}
          />
          <AnalogClock
            hours={6}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label={copy.fullHours.sixLabel}
          />
          <AnalogClock
            hours={11}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label={copy.fullHours.elevenLabel}
          />
        </div>
        <KangurLessonCallout accent='rose' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockFullHourStepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.fullHours.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          {copy.fullHours.caption}
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.quickTest.title,
    tts: copy.quickTest.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={9}
          minutes={0}
          highlightHour
          showMinuteHand={false}
          label={copy.quickTest.clockLabel}
        />
        <KangurLessonCallout accent='rose' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockHourHandSweepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.quickTest.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='rose' className='max-w-xs text-left'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>{copy.quickTest.stepTitle}</p>
          <KangurLessonCaption align='left' className='mt-1'>
            {copy.quickTest.stepText}
          </KangurLessonCaption>
          <p className='mt-2 font-extrabold text-red-700'>{copy.quickTest.result}</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

export const HOURS_SLIDES: LessonSlide[] = buildClockHoursSlides(CLOCK_HOURS_SLIDES_COPY_PL);
