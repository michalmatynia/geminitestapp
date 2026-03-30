import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import { activitySlides } from './WebDevelopmentReactComponentsLesson.data.activity';
import { componentsSlides } from './WebDevelopmentReactComponentsLesson.data.components';
import { compositionSlides } from './WebDevelopmentReactComponentsLesson.data.composition';
import { fragmentSlides } from './WebDevelopmentReactComponentsLesson.data.fragment';
import { profilerSlides } from './WebDevelopmentReactComponentsLesson.data.profiler';
import { strictModeSlides } from './WebDevelopmentReactComponentsLesson.data.strict-mode';
import { summarySlides } from './WebDevelopmentReactComponentsLesson.data.summary';
import { suspenseSlides } from './WebDevelopmentReactComponentsLesson.data.suspense';

type SectionId =
  | 'components'
  | 'fragment'
  | 'profiler'
  | 'strict_mode'
  | 'suspense'
  | 'activity'
  | 'composition'
  | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  components: componentsSlides,
  fragment: fragmentSlides,
  profiler: profilerSlides,
  strict_mode: strictModeSlides,
  suspense: suspenseSlides,
  activity: activitySlides,
  composition: compositionSlides,
  summary: summarySlides,
};

export const HUB_SECTIONS = [
  {
    id: 'components',
    emoji: '⚛️',
    title: 'Components',
    description: 'Wbudowane komponenty Reacta i własne funkcje',
    slideCount: SLIDES.components.length,
  },
  {
    id: 'fragment',
    emoji: '🧩',
    title: 'Fragment',
    description: 'Grupowanie JSX bez wrappera i canary refy',
    slideCount: SLIDES.fragment.length,
  },
  {
    id: 'profiler',
    emoji: '📊',
    title: 'Profiler',
    description: 'Pomiar wydajności renderu i onRender callback',
    slideCount: SLIDES.profiler.length,
  },
  {
    id: 'strict_mode',
    emoji: '🛡️',
    title: 'StrictMode',
    description: 'Dodatkowe kontrole w dev i typowe pułapki',
    slideCount: SLIDES.strict_mode.length,
  },
  {
    id: 'suspense',
    emoji: '⏳',
    title: 'Suspense',
    description: 'Fallback, granice i wspierane źródła danych',
    slideCount: SLIDES.suspense.length,
  },
  {
    id: 'activity',
    emoji: '🫥',
    title: 'Activity',
    description: 'Ukrywanie UI, zachowanie stanu i pre-rendering',
    slideCount: SLIDES.activity.length,
  },
  {
    id: 'composition',
    emoji: '🧱',
    title: 'Kompozycja i propsy',
    description: 'Składanie interfejsu z mniejszych części',
    slideCount: SLIDES.composition.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
