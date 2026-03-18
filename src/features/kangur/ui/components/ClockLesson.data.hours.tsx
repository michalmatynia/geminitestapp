import type { LessonSlide } from './ClockLesson.types';
import { ClockFullHourStepAnimation, ClockHourHandSweepAnimation } from '@/features/kangur/ui/components/ClockLessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonStack } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_WRAP_ROW_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { AnalogClock } from './ClockLesson.visuals';

export const HOURS_SLIDES: LessonSlide[] = [
  {
    title: 'Co pokazuje krótka wskazówka?',
    tts: 'Krótka wskazówka pokazuje godzinę. Na tej sekcji patrzymy tylko na nią.',
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock
            hours={3}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='Krótka wskazówka na 3'
          />
          <AnalogClock
            hours={8}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='Krótka wskazówka na 8'
          />
        </div>
        <KangurLessonCallout accent='rose' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockHourHandSweepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Krótka wskazówka przeskakuje z godziny na godzinę.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Patrzymy na <strong className='text-red-600'>krótką wskazówkę</strong>. Ona mówi nam,
          która jest godzina.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Pełne godziny (:00)',
    tts: 'Gdy jest pełna godzina, odczytujemy tylko godzinę z krótkiej wskazówki.',
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock
            hours={1}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='1:00'
          />
          <AnalogClock
            hours={6}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='6:00'
          />
          <AnalogClock
            hours={11}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='11:00'
          />
        </div>
        <KangurLessonCallout accent='rose' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockFullHourStepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Pełna godzina jest wtedy, gdy długa wskazówka stoi na 12.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          W tej sekcji trenujemy tylko odczyt godziny: 1, 6, 11.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Szybki test godzin',
    tts: 'Spójrz na krótką wskazówkę i nazwij godzinę. Minuty pomijamy.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={9}
          minutes={0}
          highlightHour
          showMinuteHand={false}
          label='Jaka to godzina?'
        />
        <KangurLessonCallout accent='rose' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockHourHandSweepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Skup się na krótkiej wskazówce i nazwij godzinę.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='rose' className='max-w-xs text-left'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>Krok:</p>
          <KangurLessonCaption align='left' className='mt-1'>
            1. Znajdź krótką wskazówkę.
            <br />
            2. Odczytaj numer, na który pokazuje.
          </KangurLessonCaption>
          <p className='text-red-700 font-extrabold mt-2'>Wynik: 9:00</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];
