'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  ArithmeticReverseAnimation,
  ArithmeticStepAnimation,
  FibonacciSumAnimation,
  GeometricDotsAnimation,
  GeometricGrowthAnimation,
  PatternCycleAnimation,
  PatternMissingAnimation,
  PatternUnitAnimation,
  RuleChecklistAnimation,
  RuleCheckAnimation,
} from './LogicalPatternsAnimations';
import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate, WidenLessonCopy } from './lesson-copy';

type SectionId = 'intro' | 'ciagi_arytm' | 'ciagi_geom' | 'strategie' | 'game_warsztat';
type SlideSectionId = Exclude<SectionId, 'game_warsztat'>;

const LOGICAL_PATTERNS_LESSON_COPY_PL = {
  lessonTitle: 'Wzorce i ciągi',
  sections: {
    intro: {
      title: 'Wzorce — wprowadzenie',
      description: 'Co to wzorzec? Kolory i kształty',
    },
    ciagi_arytm: {
      title: 'Ciągi arytmetyczne',
      description: 'Stała różnica co krok',
    },
    ciagi_geom: {
      title: 'Ciągi geometryczne i Fibonacci',
      description: 'Mnożenie i specjalne ciągi',
    },
    strategie: {
      title: 'Jak szukać reguły?',
      description: 'Strategia + podsumowanie',
    },
    game_warsztat: {
      title: 'Gra: Warsztat wzorców',
      description: 'Uzupełnij sekwencje i poznaj reguły',
    },
  },
  slides: {
    intro: {
      whatIsPattern: {
        title: 'Co to jest wzorzec?',
        lead:
          'Wzorzec to układ, który powtarza się według pewnej reguły. Gdy ją znajdziesz — możesz przewidzieć, co będzie dalej!',
        everywhereLabel: 'Wzorce są wszędzie:',
        examples: {
          alternatingColors: '🔴🔵🔴🔵 — naprzemienne kolory',
          increasingNumbers: '1, 2, 3, 4, 5 — każda liczba o 1 większa',
          repeatingShape: '♦️🔷♦️🔷 — powtarzający się kształt',
          weekdays: 'pon., wt., śr., czw. — dni tygodnia',
        },
      },
      colorsAndShapes: {
        title: 'Wzorce kolorów i kształtów',
        lead:
          'Wzorce mogą używać kolorów, kształtów lub obu naraz. Patrz na powtarzającą się grupę — to jest jednostka wzorca.',
        answerLabel: 'Odpowiedź:',
        examples: {
          ab: {
            label: 'Wzorzec AB',
            seq: '🔴 🔵 🔴 🔵 🔴 ❓',
            answer: '🔵',
          },
          aab: {
            label: 'Wzorzec AAB',
            seq: '⭐ ⭐ 🌙 ⭐ ⭐ ❓',
            answer: '🌙',
          },
          abbc: {
            label: 'Wzorzec ABBC',
            seq: '🟥 🟦 🟦 🟩 🟥 🟦 ❓',
            answer: '🟦',
          },
        },
      },
      patternUnit: {
        title: 'Jednostka wzorca',
        lead: 'Jednostka wzorca to najmniejszy fragment, który się powtarza.',
        caption: 'Zaznaczamy powtarzającą się parę i przesuwamy dalej.',
      },
      missingElement: {
        title: 'Uzupełnij brakujący element',
        lead: 'Gdy znasz jednostkę, możesz szybko uzupełnić brakujące miejsce.',
        caption: 'Wzorzec AAB powtarza się w tej samej kolejności.',
      },
      threeElementPattern: {
        title: 'Wzorzec trzy-elementowy',
        lead:
          'Czasem wzorzec ma trzy elementy, które powtarzają się w tej samej kolejności.',
        caption: 'Zaznacz cykl A-B-C i obserwuj, jak się powtarza.',
      },
    },
    ciagi_arytm: {
      addition: {
        title: 'Ciągi liczbowe — dodawanie',
        lead:
          'W ciągu liczbowym każda liczba powstaje z poprzedniej według tej samej zasady. Najczęściej dodajemy tę samą wartość.',
        answerLabel: 'Odpowiedź:',
        examples: {
          plusTwo: {
            hint: '+2 co krok',
            seq: '2, 4, 6, 8, 10, ❓',
            answer: '12',
          },
          plusFive: {
            hint: '+5 co krok',
            seq: '5, 10, 15, 20, ❓',
            answer: '25',
          },
          decreasingStep: {
            hint: '+10, +9, +8... (malejący krok)',
            seq: '1, 11, 20, 28, ❓',
            answer: '35 (krok maleje o 1)',
          },
        },
      },
      constantStep: {
        title: 'Stały krok',
        lead: 'W ciągu arytmetycznym dodajemy tę samą liczbę na każdym kroku.',
        caption: 'Ten sam krok powtarza się w każdym miejscu.',
      },
      decreasing: {
        title: 'Ciąg malejący',
        lead: 'W ciągu arytmetycznym możemy też odejmować stałą liczbę.',
        caption: 'Każdy krok to ten sam spadek.',
      },
    },
    ciagi_geom: {
      multiplicationFibonacci: {
        title: 'Ciągi liczbowe — mnożenie i Fibonacci',
        lead:
          'Gdy każda liczba jest wielokrotnością poprzedniej, ciąg rośnie bardzo szybko! To ciąg geometryczny.',
        answerLabel: 'Odpowiedź:',
        examples: {
          timesTwo: {
            hint: '×2 co krok',
            seq: '1, 2, 4, 8, 16, ❓',
            answer: '32',
          },
          timesThree: {
            hint: '×3 co krok',
            seq: '2, 6, 18, 54, ❓',
            answer: '162',
          },
          fibonacci: {
            hint: 'Ciąg Fibonacciego (a+b=c)',
            seq: '1, 1, 2, 3, 5, 8, ❓',
            answer: '13 (5+8=13)',
          },
        },
      },
      geometricGrowth: {
        title: 'Wzrost geometryczny',
        lead: 'Gdy iloraz jest stały, każdy wyraz rośnie szybciej od poprzedniego.',
        caption: 'Podwajanie daje coraz wyższe słupki.',
      },
      fibonacciMotion: {
        title: 'Fibonacci w ruchu',
        lead: 'Każdy wyraz to suma dwóch poprzednich.',
        caption: '3 + 5 daje 8.',
      },
      doublingDots: {
        title: 'Podwajanie w kropkach',
        lead: 'Geometria liczb może być widoczna jako rosnąca liczba kropek.',
        caption: 'Każdy etap to dwa razy więcej elementów.',
      },
    },
    strategie: {
      howToLookForRule: {
        title: 'Jak szukać reguły?',
        steps: {
          countUnit: 'Policz elementy jednostki — jak wiele przed powtórzeniem?',
          checkDifference: 'Sprawdź różnicę — odejmij sąsiednie liczby. Czy jest stała?',
          checkRatio: 'Sprawdź iloraz — podziel sąsiednie liczby. Czy jest stały?',
          previousRelation: 'Szukaj relacji dwóch poprzednich — jak Fibonacci.',
          verifyRule: 'Zweryfikuj regułę — sprawdź ją na wszystkich znanych elementach!',
        },
        exerciseLabel: 'Ćwiczenie:',
        exerciseSequence: '3, 6, 12, 24, ❓',
        exerciseAnswer: 'Iloraz: 2, 2, 2 — stały! Reguła: ×2 → 48',
      },
      checkDifferenceAndRatio: {
        title: 'Sprawdź różnicę i iloraz',
        lead:
          'Najpierw sprawdź różnicę, a jeśli nie działa, poszukaj stałego ilorazu.',
        caption: 'Dwie szybkie kontrole pomagają znaleźć regułę.',
      },
      checklist: {
        title: 'Lista kontrolna',
        lead: 'Zawsze przechodź po tych samych krokach, a reguła szybko się ujawni.',
        caption: 'Odhaczaj kolejne pomysły, aż znajdziesz właściwy.',
      },
      summary: {
        title: 'Podsumowanie',
        items: {
          repeatingUnit: '🔁 Wzorzec AB/AAB — powtarzająca się jednostka',
          arithmetic: '➕ Ciąg arytmetyczny — stała różnica między elementami',
          geometric: '✖️ Ciąg geometryczny — stały iloraz między elementami',
          fibonacci: '🌀 Fibonacci — suma dwóch poprzednich',
          strategy: '🔍 Strategia — szukaj różnicy, ilorazu lub relacji',
        },
        closing: 'Wzorce i ciągi to podstawa matematyki i informatyki!',
      },
    },
  },
  game: {
    stageTitle: 'Warsztat wzorców',
  },
} as const;

type LogicalPatternsLessonCopy = WidenLessonCopy<typeof LOGICAL_PATTERNS_LESSON_COPY_PL>;

const translateLogicalPatternsLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const localizeLogicalPatternsLessonCopy = <T,>(
  translate: LessonTranslate,
  source: T,
  prefix = ''
): WidenLessonCopy<T> => {
  if (typeof source === 'string') {
    return translateLogicalPatternsLesson(translate, prefix, source) as WidenLessonCopy<T>;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalPatternsLessonCopy(
        translate,
        item as unknown,
        prefix ? `${prefix}.${index}` : String(index)
      )
    );
    return localizedItems as WidenLessonCopy<T>;
  }

  if (source && typeof source === 'object') {
    return Object.fromEntries(
      Object.entries(source).map(([key, value]) => [
        key,
        localizeLogicalPatternsLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key
        ),
      ])
    ) as WidenLessonCopy<T>;
  }

  return source as WidenLessonCopy<T>;
};

const buildLogicalPatternsLessonCopy = (
  translate: LessonTranslate
): LogicalPatternsLessonCopy =>
  localizeLogicalPatternsLessonCopy(translate, LOGICAL_PATTERNS_LESSON_COPY_PL);

const buildLogicalPatternsSlides = (
  copy: LogicalPatternsLessonCopy
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: copy.slides.intro.whatIsPattern.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.whatIsPattern.lead}</KangurLessonLead>
          <KangurLessonCallout
            accent='violet'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='mb-2 font-semibold text-violet-700'>
              {copy.slides.intro.whatIsPattern.everywhereLabel}
            </p>
            <ul className='space-y-1'>
              {Object.values(copy.slides.intro.whatIsPattern.examples).map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.colorsAndShapes.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.colorsAndShapes.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.intro.colorsAndShapes.examples).map(({ label, seq, answer }) => (
              <KangurLessonCallout
                key={label}
                accent='slate'
                className='border-violet-100/90 text-center'
                padding='sm'
              >
                <KangurLessonCaption className='mb-1'>{label}</KangurLessonCaption>
                <p className='text-2xl tracking-widest'>{seq}</p>
                <p className='mt-1 text-sm font-bold text-violet-600'>
                  {copy.slides.intro.colorsAndShapes.answerLabel} {answer}
                </p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.patternUnit.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.patternUnit.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternUnitAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.patternUnit.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.missingElement.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.missingElement.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternMissingAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.missingElement.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.threeElementPattern.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.threeElementPattern.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternCycleAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.threeElementPattern.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  ciagi_arytm: [
    {
      title: copy.slides.ciagi_arytm.addition.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_arytm.addition.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.ciagi_arytm.addition.examples).map(({ hint, seq, answer }) => (
              <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                <KangurLessonCaption className='mb-1'>{hint}</KangurLessonCaption>
                <p className='text-lg font-extrabold text-violet-700'>{seq}</p>
                <KangurLessonCaption className='mt-1'>
                  {copy.slides.ciagi_arytm.addition.answerLabel} <b>{answer}</b>
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_arytm.constantStep.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_arytm.constantStep.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <ArithmeticStepAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_arytm.constantStep.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_arytm.decreasing.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_arytm.decreasing.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <ArithmeticReverseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_arytm.decreasing.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  ciagi_geom: [
    {
      title: copy.slides.ciagi_geom.multiplicationFibonacci.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.multiplicationFibonacci.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.ciagi_geom.multiplicationFibonacci.examples).map(
              ({ hint, seq, answer }) => (
                <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                  <KangurLessonCaption className='mb-1'>{hint}</KangurLessonCaption>
                  <p className='text-lg font-extrabold text-purple-700'>{seq}</p>
                  <KangurLessonCaption className='mt-1'>
                    {copy.slides.ciagi_geom.multiplicationFibonacci.answerLabel} <b>{answer}</b>
                  </KangurLessonCaption>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_geom.geometricGrowth.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.geometricGrowth.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <GeometricGrowthAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_geom.geometricGrowth.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_geom.fibonacciMotion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.fibonacciMotion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <FibonacciSumAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_geom.fibonacciMotion.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_geom.doublingDots.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.doublingDots.lead}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <GeometricDotsAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_geom.doublingDots.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  strategie: [
    {
      title: copy.slides.strategie.howToLookForRule.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='slate' className='w-full border-violet-200/85'>
            <ol className='list-inside list-decimal space-y-3 text-sm [color:var(--kangur-page-text)]'>
              {Object.values(copy.slides.strategie.howToLookForRule.steps).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <KangurLessonCaption>
              {copy.slides.strategie.howToLookForRule.exerciseLabel}{' '}
              <b>{copy.slides.strategie.howToLookForRule.exerciseSequence}</b>
            </KangurLessonCaption>
            <p className='mt-1 text-sm font-bold text-violet-600'>
              {copy.slides.strategie.howToLookForRule.exerciseAnswer}
            </p>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.strategie.checkDifferenceAndRatio.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.strategie.checkDifferenceAndRatio.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-28 w-72 max-w-full'>
              <RuleCheckAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.strategie.checkDifferenceAndRatio.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.strategie.checklist.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.strategie.checklist.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-28 w-72 max-w-full'>
              <RuleChecklistAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.strategie.checklist.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.strategie.summary.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              {Object.values(copy.slides.strategie.summary.items).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <p className='text-center font-bold text-violet-600'>
            {copy.slides.strategie.summary.closing}
          </p>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildLogicalPatternsSections = (copy: LogicalPatternsLessonCopy) => [
  {
    id: 'intro',
    emoji: '🔢',
    title: copy.sections.intro.title,
    description: copy.sections.intro.description,
  },
  {
    id: 'ciagi_arytm',
    emoji: '➕',
    title: copy.sections.ciagi_arytm.title,
    description: copy.sections.ciagi_arytm.description,
  },
  {
    id: 'ciagi_geom',
    emoji: '✖️',
    title: copy.sections.ciagi_geom.title,
    description: copy.sections.ciagi_geom.description,
  },
  {
    id: 'strategie',
    emoji: '🔍',
    title: copy.sections.strategie.title,
    description: copy.sections.strategie.description,
  },
  {
    id: 'game_warsztat',
    emoji: '🛠️',
    title: copy.sections.game_warsztat.title,
    description: copy.sections.game_warsztat.description,
    isGame: true,
  },
] as const;

export const SLIDES = buildLogicalPatternsSlides(LOGICAL_PATTERNS_LESSON_COPY_PL);
export const HUB_SECTIONS = buildLogicalPatternsSections(LOGICAL_PATTERNS_LESSON_COPY_PL);
const LOGICAL_PATTERNS_WORKSHOP_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'logical_patterns_workshop_lesson_stage'
);

export default function LogicalPatternsLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalPatterns');
  const copy = useMemo(
    () => buildLogicalPatternsLessonCopy((key) => translations(key as never)),
    [translations]
  );
  const sections = buildLogicalPatternsSections(copy);
  const slides = buildLogicalPatternsSlides(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_patterns'
      lessonEmoji='🔢'
      lessonTitle={copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      skipMarkFor={['game_warsztat']}
      games={[
        {
          sectionId: 'game_warsztat',
          stage: {
            accent: 'violet',
            icon: '🛠️',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-patterns-game-shell',
            title: copy.game.stageTitle,
          },
          runtime: LOGICAL_PATTERNS_WORKSHOP_RUNTIME,
        },
      ]}
    />
  );
}
