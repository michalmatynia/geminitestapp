import type { LessonSlide } from './ClockLesson.types';
import {
  ClockFiveMinuteStepsAnimation,
  ClockMinuteByMinuteAnimation,
  ClockMinuteHandSweepAnimation,
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

export const CLOCK_MINUTES_SLIDES_COPY_PL = {
  whatLongHand: {
    title: 'Co pokazuje długa wskazówka?',
    tts: 'Długa wskazówka pokazuje minuty. W tej sekcji skupiamy się tylko na minutach.',
    clockLabel: 'Długa wskazówka = minuty',
    animationCaption: 'Długa wskazówka robi pełny obrót w 60 minut.',
    caption: 'Długa wskazówka chodzi po tarczy i mówi, ile minut minęło.',
  },
  fiveMinuteMap: {
    title: 'Mapa minut co 5',
    tts: 'Każdy numer to kolejne pięć minut: 1 to 5, 2 to 10, 3 to 15 i tak dalej.',
    fifteenLabel: '3 = 15 min',
    thirtyLabel: '6 = 30 min',
    fortyFiveLabel: '9 = 45 min',
    animationCaption: 'Skaczemy co 5 minut: :00, :05, :10, :15...',
    caption: 'Zapamiętaj: każda kolejna liczba to +5 minut.',
  },
  quickTest: {
    title: 'Szybki test minut',
    tts: 'Patrz tylko na długą wskazówkę i nazwij minuty.',
    clockLabel: 'Jaka to liczba minut?',
    animationCaption: 'Każda mała kreska to 1 minuta.',
    stepTitle: 'Krok:',
    stepText: 'Długa wskazówka stoi przy 7.\n7 × 5 = 35 minut.',
    result: 'Wynik: :35',
  },
} as const;

export type ClockMinutesSlidesCopy = WidenLessonCopy<typeof CLOCK_MINUTES_SLIDES_COPY_PL>;

export const buildClockMinutesSlides = (copy: ClockMinutesSlidesCopy): LessonSlide[] => [
  {
    title: copy.whatLongHand.title,
    tts: copy.whatLongHand.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={12}
          minutes={20}
          highlightMinute
          showHourHand={false}
          label={copy.whatLongHand.clockLabel}
        />
        <KangurLessonCallout accent='emerald' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockMinuteHandSweepAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.whatLongHand.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          {copy.whatLongHand.caption}
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.fiveMinuteMap.title,
    tts: copy.fiveMinuteMap.tts,
    content: (
      <KangurLessonStack className='text-center'>
        <div className={cn(KANGUR_WRAP_ROW_ROOMY_CLASSNAME, 'justify-center')}>
          <AnalogClock
            hours={12}
            minutes={15}
            highlightMinute
            showHourHand={false}
            label={copy.fiveMinuteMap.fifteenLabel}
          />
          <AnalogClock
            hours={12}
            minutes={30}
            highlightMinute
            showHourHand={false}
            label={copy.fiveMinuteMap.thirtyLabel}
          />
          <AnalogClock
            hours={12}
            minutes={45}
            highlightMinute
            showHourHand={false}
            label={copy.fiveMinuteMap.fortyFiveLabel}
          />
        </div>
        <KangurLessonCallout accent='emerald' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockFiveMinuteStepsAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.fiveMinuteMap.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          {copy.fiveMinuteMap.caption}
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
          hours={12}
          minutes={35}
          highlightMinute
          showHourHand={false}
          label={copy.quickTest.clockLabel}
        />
        <KangurLessonCallout accent='emerald' className='mx-auto max-w-xs' padding='sm'>
          <div className='mx-auto h-24 w-32 max-w-full'>
            <ClockMinuteByMinuteAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.quickTest.animationCaption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='emerald' className='max-w-xs text-left'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>{copy.quickTest.stepTitle}</p>
          <KangurLessonCaption align='left' className='mt-1'>
            {copy.quickTest.stepText}
          </KangurLessonCaption>
          <p className='mt-2 font-extrabold text-green-700'>{copy.quickTest.result}</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

export const MINUTES_SLIDES: LessonSlide[] = buildClockMinutesSlides(CLOCK_MINUTES_SLIDES_COPY_PL);
