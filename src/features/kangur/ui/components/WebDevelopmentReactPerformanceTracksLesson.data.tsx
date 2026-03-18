import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'metrics' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Performance Tracks w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Performance Tracks pomagają zrozumieć, co dzieje się podczas renderowania i
            gdzie pojawiają się koszty wydajności.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            To punkt wyjścia do optymalizacji w większych aplikacjach.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  metrics: [
    {
      title: 'Co obserwować',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Skup się na tym, które komponenty renderują się najczęściej i ile czasu to zajmuje.
            To pomaga ustalić priorytety optymalizacji.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Najdroższe rendery.</li>
              <li>Powtarzające się re-rendery.</li>
              <li>Granice Suspense i Profilera.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach przełożymy to na realne scenariusze optymalizacji.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Performance Tracks pokazują, gdzie React traci czas.
          </KangurLessonLead>
          <KangurLessonCaption>
            Masz bazę — czas przejść do praktyki.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '📈',
    title: 'Performance Tracks Basics',
    description: 'Wprowadzenie do śledzenia wydajności',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'metrics',
    emoji: '🎯',
    title: 'Metryki',
    description: 'Co warto obserwować',
    slideCount: SLIDES.metrics.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
