import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'wzorce' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  wzorce: [
    {
      title: 'Wzorce wprowadzenie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Wzorce to powtarzalne rytmy.</KangurLessonLead>
          <div className='text-left'>
            <p className='[color:var(--kangur-page-muted-text)]'>
              <span>Wzorce są wszędzie:</span>
            </p>
            <ul className='mt-2 list-disc pl-5 text-sm [color:var(--kangur-page-muted-text)]'>
              <li>w muzyce,</li>
              <li>w układach klocków,</li>
              <li>w kolorach i kształtach.</li>
            </ul>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Wzorce kolorów i kształtów',
      content: (
        <KangurLessonStack>
          <h3 className='text-lg font-semibold [color:var(--kangur-page-text)]'>
            Wzorce kolorów i kształtów
          </h3>
          <KangurLessonCaption>Wzorzec AB</KangurLessonCaption>
          <KangurLessonCaption>
            Czerwony, niebieski, czerwony, niebieski...
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
          <KangurLessonLead>Znajdź powtarzający się schemat.</KangurLessonLead>
          <KangurLessonCaption>
            Kiedy go zobaczysz, łatwiej przewidzieć kolejny element.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'wzorce',
    emoji: '🔁',
    title: 'Wzorce: wprowadzenie',
    description: 'Powtarzane rytmy i schematy',
    slideCount: SLIDES.wzorce.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
