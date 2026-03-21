'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import GeometryPerimeterDrawingGame from '@/features/kangur/ui/components/GeometryPerimeterDrawingGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  GeometryPerimeterOppositeSidesAnimation,
  GeometryPerimeterSidesAnimation,
  GeometryPerimeterSumAnimation,
  GeometryPerimeterTraceAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate, WidenLessonCopy } from './lesson-copy';

type SectionId = 'intro' | 'kwadrat' | 'prostokan' | 'podsumowanie' | 'game_draw';
type SlideSectionId = Exclude<SectionId, 'game_draw'>;

const GEOMETRY_PERIMETER_LESSON_COPY_PL = {
  lessonTitle: 'Obwód figur',
  sections: {
    intro: {
      title: 'Co to obwód?',
      description: 'Definicja i zasada liczenia',
    },
    kwadrat: {
      title: 'Obwód kwadratu',
      description: 'Wzór: 4 × a',
    },
    prostokan: {
      title: 'Obwód prostokata',
      description: 'Wzór: 2 × (a + b)',
    },
    podsumowanie: {
      title: 'Podsumowanie',
      description: 'Wszystkie wzory razem',
    },
    game: {
      title: 'Gra: Rysuj obwód',
      description: 'Rysuj po kratkach i wybieraj obwód',
    },
  },
  slides: {
    intro: {
      title: 'Co to jest obwód?',
      lead: 'Obwód to długosc całej krawędzi figury. Dodajemy wszystkie boki.',
      callout: 'Idziemy dookoła figury i sumujemy.',
      caption: 'Obwód mierzymy w centymetrach (cm), metrach (m) itp.',
    },
    kwadrat: {
      title: 'Obwód kwadratu',
      sideLabel: 'Każdy bok ma 3 cm',
      equation: 'Obwód = 3 + 3 + 3 + 3 = 12 cm',
      formulaTitle: 'Wzór dla kwadratu:',
      formulaCaption: 'gdzie a to długosc boku',
      example: 'Przykład: a = 5 cm → O = 4 × 5 = 20 cm',
    },
    prostokan: {
      title: 'Obwód prostokąta',
      sidesLabel: 'Boki: 6 cm, 4 cm, 6 cm, 4 cm',
      equation: 'Obwód = 6 + 4 + 6 + 4 = 20 cm',
      formulaTitle: 'Wzór dla prostokata:',
      formulaCaption: 'gdzie a i b to długosci boków',
      example: 'Przykład: a=6, b=4 → O = 2 × (6+4) = 20 cm',
      oppositeCaption: 'Przeciwległe boki są równe — dodaj pary.',
      sumCaption: 'Dodaj wszystkie długości: O = 6 + 4 + 6 + 4 = 20',
    },
    podsumowanie: {
      summaryTitle: 'Podsumowanie',
      item1: 'Obwód to suma wszystkich boków.',
      item2: 'Dla kwadratu: O = 4 × a',
      item3: 'Dla prostokąta: O = 2 × (a + b)',
      item4: 'Jednostka obwodu to np. cm lub m.',
      item5: 'Zawsze sprawdź, czy dodałeś każdy bok tylko raz.',
      traceTitle: 'Podsumowanie w ruchu',
      traceCaption: 'Obwód to pełne okrążenie figury.',
      sidesTitle: 'Podsumowanie: pary boków',
      sidesCaption: 'Dodaj pary boków: a + a, b + b.',
    },
  },
  game: {
    stageTitle: 'Gra: Rysuj obwód',
  },
} as const;

type GeometryPerimeterLessonCopy = WidenLessonCopy<typeof GEOMETRY_PERIMETER_LESSON_COPY_PL>;

const translateGeometryPerimeterLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const buildGeometryPerimeterLessonCopy = (
  translate: LessonTranslate
): GeometryPerimeterLessonCopy => ({
  lessonTitle: translateGeometryPerimeterLesson(
    translate,
    'lessonTitle',
    GEOMETRY_PERIMETER_LESSON_COPY_PL.lessonTitle
  ),
  sections: {
    intro: {
      title: translateGeometryPerimeterLesson(
        translate,
        'sections.intro.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.intro.title
      ),
      description: translateGeometryPerimeterLesson(
        translate,
        'sections.intro.description',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.intro.description
      ),
    },
    kwadrat: {
      title: translateGeometryPerimeterLesson(
        translate,
        'sections.kwadrat.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.kwadrat.title
      ),
      description: translateGeometryPerimeterLesson(
        translate,
        'sections.kwadrat.description',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.kwadrat.description
      ),
    },
    prostokan: {
      title: translateGeometryPerimeterLesson(
        translate,
        'sections.prostokan.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.prostokan.title
      ),
      description: translateGeometryPerimeterLesson(
        translate,
        'sections.prostokan.description',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.prostokan.description
      ),
    },
    podsumowanie: {
      title: translateGeometryPerimeterLesson(
        translate,
        'sections.podsumowanie.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.podsumowanie.title
      ),
      description: translateGeometryPerimeterLesson(
        translate,
        'sections.podsumowanie.description',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.podsumowanie.description
      ),
    },
    game: {
      title: translateGeometryPerimeterLesson(
        translate,
        'sections.game.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.game.title
      ),
      description: translateGeometryPerimeterLesson(
        translate,
        'sections.game.description',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.sections.game.description
      ),
    },
  },
  slides: {
    intro: {
      title: translateGeometryPerimeterLesson(
        translate,
        'slides.intro.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.intro.title
      ),
      lead: translateGeometryPerimeterLesson(
        translate,
        'slides.intro.lead',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.intro.lead
      ),
      callout: translateGeometryPerimeterLesson(
        translate,
        'slides.intro.callout',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.intro.callout
      ),
      caption: translateGeometryPerimeterLesson(
        translate,
        'slides.intro.caption',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.intro.caption
      ),
    },
    kwadrat: {
      title: translateGeometryPerimeterLesson(
        translate,
        'slides.kwadrat.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.kwadrat.title
      ),
      sideLabel: translateGeometryPerimeterLesson(
        translate,
        'slides.kwadrat.sideLabel',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.kwadrat.sideLabel
      ),
      equation: translateGeometryPerimeterLesson(
        translate,
        'slides.kwadrat.equation',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.kwadrat.equation
      ),
      formulaTitle: translateGeometryPerimeterLesson(
        translate,
        'slides.kwadrat.formulaTitle',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.kwadrat.formulaTitle
      ),
      formulaCaption: translateGeometryPerimeterLesson(
        translate,
        'slides.kwadrat.formulaCaption',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.kwadrat.formulaCaption
      ),
      example: translateGeometryPerimeterLesson(
        translate,
        'slides.kwadrat.example',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.kwadrat.example
      ),
    },
    prostokan: {
      title: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.title',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.title
      ),
      sidesLabel: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.sidesLabel',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.sidesLabel
      ),
      equation: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.equation',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.equation
      ),
      formulaTitle: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.formulaTitle',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.formulaTitle
      ),
      formulaCaption: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.formulaCaption',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.formulaCaption
      ),
      example: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.example',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.example
      ),
      oppositeCaption: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.oppositeCaption',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.oppositeCaption
      ),
      sumCaption: translateGeometryPerimeterLesson(
        translate,
        'slides.prostokan.sumCaption',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.prostokan.sumCaption
      ),
    },
    podsumowanie: {
      summaryTitle: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.summaryTitle',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.summaryTitle
      ),
      item1: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.item1',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.item1
      ),
      item2: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.item2',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.item2
      ),
      item3: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.item3',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.item3
      ),
      item4: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.item4',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.item4
      ),
      item5: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.item5',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.item5
      ),
      traceTitle: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.traceTitle',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.traceTitle
      ),
      traceCaption: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.traceCaption',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.traceCaption
      ),
      sidesTitle: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.sidesTitle',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.sidesTitle
      ),
      sidesCaption: translateGeometryPerimeterLesson(
        translate,
        'slides.podsumowanie.sidesCaption',
        GEOMETRY_PERIMETER_LESSON_COPY_PL.slides.podsumowanie.sidesCaption
      ),
    },
  },
  game: {
    stageTitle: translateGeometryPerimeterLesson(
      translate,
      'game.stageTitle',
      GEOMETRY_PERIMETER_LESSON_COPY_PL.game.stageTitle
    ),
  },
});

const buildGeometryPerimeterSlides = (
  copy: GeometryPerimeterLessonCopy
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: copy.slides.intro.title,
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>{copy.slides.intro.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber'>
            <div className='mx-auto h-20 w-32 max-w-full'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <p className='mt-2 text-sm text-amber-700'>{copy.slides.intro.callout}</p>
          </KangurLessonCallout>
          <KangurLessonCaption>{copy.slides.intro.caption}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  kwadrat: [
    {
      title: copy.slides.kwadrat.title,
      content: (
        <KangurLessonStack className='kangur-panel-gap text-center' gap='sm'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <div className='mx-auto h-20 w-32 max-w-full'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <p className='[color:var(--kangur-page-text)]'>{copy.slides.kwadrat.sideLabel}</p>
            <p className='mt-2 text-xl font-bold text-amber-700'>{copy.slides.kwadrat.equation}</p>
          </KangurLessonCallout>
          <KangurLessonCallout
            accent='amber'
            className='text-center text-sm [color:var(--kangur-page-text)]'
            padding='sm'
          >
            <p className='font-bold text-amber-700'>{copy.slides.kwadrat.formulaTitle}</p>
            <p className='mt-1 text-lg font-extrabold'>O = 4 × a</p>
            <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
              {copy.slides.kwadrat.formulaCaption}
            </p>
          </KangurLessonCallout>
          <KangurLessonCaption>{copy.slides.kwadrat.example}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  prostokan: [
    {
      title: copy.slides.prostokan.title,
      content: (
        <KangurLessonStack className='kangur-panel-gap text-center' gap='sm'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <div className='mx-auto h-20 w-32 max-w-full'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <p className='[color:var(--kangur-page-text)]'>{copy.slides.prostokan.sidesLabel}</p>
            <p className='mt-2 text-xl font-bold text-amber-700'>
              {copy.slides.prostokan.equation}
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout
            accent='amber'
            className='text-center text-sm [color:var(--kangur-page-text)]'
            padding='sm'
          >
            <p className='font-bold text-amber-700'>{copy.slides.prostokan.formulaTitle}</p>
            <p className='mt-1 text-lg font-extrabold'>O = 2 × (a + b)</p>
            <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
              {copy.slides.prostokan.formulaCaption}
            </p>
          </KangurLessonCallout>
          <KangurLessonCaption>{copy.slides.prostokan.example}</KangurLessonCaption>
          <KangurLessonCallout accent='amber'>
            <div className='mx-auto h-20 w-32 max-w-full'>
              <GeometryPerimeterOppositeSidesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.prostokan.oppositeCaption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber'>
            <div className='mx-auto h-20 w-36 max-w-full'>
              <GeometryPerimeterSumAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.prostokan.sumCaption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: copy.slides.podsumowanie.summaryTitle,
      content: (
        <div className='space-y-3'>
          {[
            copy.slides.podsumowanie.item1,
            copy.slides.podsumowanie.item2,
            copy.slides.podsumowanie.item3,
            copy.slides.podsumowanie.item4,
            copy.slides.podsumowanie.item5,
          ].map((text) => (
            <KangurLessonCallout
              key={text}
              accent='amber'
              className='text-sm [color:var(--kangur-page-text)]'
              padding='sm'
            >
              ✅ {text}
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
    {
      title: copy.slides.podsumowanie.traceTitle,
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='mx-auto h-24 w-36 max-w-full'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.podsumowanie.traceCaption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: copy.slides.podsumowanie.sidesTitle,
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='mx-auto h-24 w-36 max-w-full'>
              <GeometryPerimeterSidesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.podsumowanie.sidesCaption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
});

const buildGeometryPerimeterSections = (copy: GeometryPerimeterLessonCopy) => [
  {
    id: 'intro',
    emoji: '📏',
    title: copy.sections.intro.title,
    description: copy.sections.intro.description,
  },
  {
    id: 'kwadrat',
    emoji: '🟥',
    title: copy.sections.kwadrat.title,
    description: copy.sections.kwadrat.description,
  },
  {
    id: 'prostokan',
    emoji: '▭',
    title: copy.sections.prostokan.title,
    description: copy.sections.prostokan.description,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: copy.sections.podsumowanie.title,
    description: copy.sections.podsumowanie.description,
  },
  {
    id: 'game_draw',
    emoji: '✍️',
    title: copy.sections.game.title,
    description: copy.sections.game.description,
    isGame: true,
  },
];

export const SLIDES = buildGeometryPerimeterSlides(GEOMETRY_PERIMETER_LESSON_COPY_PL);
export const HUB_SECTIONS = buildGeometryPerimeterSections(GEOMETRY_PERIMETER_LESSON_COPY_PL);

export default function GeometryPerimeterLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.geometryPerimeter');
  const copy = useMemo(() => buildGeometryPerimeterLessonCopy(translations), [translations]);
  const localizedSlides = useMemo(() => buildGeometryPerimeterSlides(copy), [copy]);
  const localizedSections = useMemo(() => buildGeometryPerimeterSections(copy), [copy]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='geometry_perimeter'
      lessonEmoji='📏'
      lessonTitle={copy.lessonTitle}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-amber-reverse'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-500'
      dotDoneClass='bg-amber-300'
      completionSectionId='podsumowanie'
      autoRecordComplete
      scorePercent={100}
      skipMarkFor={['game_draw']}
      games={[
        {
          sectionId: 'game_draw',
          stage: {
            accent: 'amber',
            title: copy.game.stageTitle,
            icon: '✍️',
            maxWidthClassName: 'max-w-sm',
            headerTestId: 'geometry-perimeter-game-header',
            shellTestId: 'geometry-perimeter-game-shell',
          },
          render: ({ onFinish }) => <GeometryPerimeterDrawingGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
