import type { LessonSlide } from './ClockLesson.types';
import { ClockFiveMinuteStepsAnimation, ClockMinuteByMinuteAnimation, ClockMinuteHandSweepAnimation } from '@/features/kangur/ui/components/ClockLessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonStack } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_WRAP_ROW_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { AnalogClock } from './ClockLesson.visuals';

export const MINUTES_SLIDES: LessonSlide[] = [
  {
    title: 'Co pokazuje długa wskazówka?',
    tts: 'Długa wskazówka pokazuje minuty. W tej sekcji skupiamy się tylko na minutach.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={12}
          minutes={20}
          highlightMinute
          showHourHand={false}
          label='Długa wskazówka = minuty'
        />
        <KangurLessonCallout accent='emerald' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockMinuteHandSweepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Długa wskazówka robi pełny obrót w 60 minut.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          <strong className='text-green-600'>Długa wskazówka</strong> chodzi po tarczy i mówi,
          ile minut minęło.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Mapa minut co 5',
    tts: 'Każdy numer to kolejne pięć minut: 1 to 5, 2 to 10, 3 to 15 i tak dalej.',
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock
            hours={12}
            minutes={15}
            highlightMinute
            showHourHand={false}
            label='3 = 15 min'
          />
          <AnalogClock
            hours={12}
            minutes={30}
            highlightMinute
            showHourHand={false}
            label='6 = 30 min'
          />
          <AnalogClock
            hours={12}
            minutes={45}
            highlightMinute
            showHourHand={false}
            label='9 = 45 min'
          />
        </div>
        <KangurLessonCallout accent='emerald' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockFiveMinuteStepsAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Skaczemy co 5 minut: :00, :05, :10, :15...
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Zapamiętaj: każda kolejna liczba to +5 minut.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Szybki test minut',
    tts: 'Patrz tylko na długą wskazówkę i nazwij minuty.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={12}
          minutes={35}
          highlightMinute
          showHourHand={false}
          label='Jaka to liczba minut?'
        />
        <KangurLessonCallout accent='emerald' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockMinuteByMinuteAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Każda mała kreska to 1 minuta.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='emerald' className='max-w-xs text-left'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>Krok:</p>
          <KangurLessonCaption align='left' className='mt-1'>
            Długa wskazówka stoi przy 7.
            <br />
            7 × 5 = 35 minut.
          </KangurLessonCaption>
          <p className='text-green-700 font-extrabold mt-2'>Wynik: :35</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];
