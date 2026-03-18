import type { LessonSlide } from './ClockLesson.types';
import { ClockCombinedHandsAnimation, ClockHalfPastAnimation, ClockQuarterAnimation } from '@/features/kangur/ui/components/ClockLessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonStack } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_WRAP_ROW_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { AnalogClock } from './ClockLesson.visuals';

export const COMBINED_SLIDES: LessonSlide[] = [
  {
    title: 'Jak łączyć obie wskazówki?',
    tts: 'Najpierw czytamy godzinę z krótkiej wskazówki, potem minuty z długiej.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock hours={8} minutes={30} label='Przykład: 8:30' />
        <KangurLessonCallout accent='indigo' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockCombinedHandsAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Krótka wskazówka pokazuje godzinę, długa minuty.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='indigo' className='max-w-xs text-left space-y-2'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>Kroki:</p>
          <KangurLessonCaption align='left'>
            1. Krótka wskazówka: godzina = 8
          </KangurLessonCaption>
          <KangurLessonCaption align='left'>
            2. Długa wskazówka: minuty = 30
          </KangurLessonCaption>
          <p className='text-indigo-700 font-extrabold'>Wynik: 8:30</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Kwadrans po i kwadrans do',
    tts: 'Długa wskazówka na 3 to kwadrans po, a na 9 to kwadrans do następnej godziny.',
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock hours={5} minutes={15} label='5:15 - kwadrans po 5' />
          <AnalogClock hours={5} minutes={45} label='5:45 - kwadrans do 6' />
        </div>
        <KangurLessonCallout accent='indigo' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockQuarterAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Minuty 15 i 45 to kwadranse.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Odczytujemy godzinę i minuty jednocześnie.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Gotowy/a na ćwiczenie',
    tts: 'Teraz potrafisz czytać godziny i minuty razem. Przejdź do ćwiczenia.',
    content: (
      <KangurLessonStack className='text-center'>
        <div className='text-7xl'>✨</div>
        <KangurLessonCallout accent='indigo' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockHalfPastAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Pół godziny to :30, długa wskazówka na 6.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Brawo! Umiesz:
          <br />
          🔴 czytać godziny,
          <br />
          🟢 czytać minuty,
          <br />
          ✅ łączyć obie wskazówki w pełny czas.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
];
