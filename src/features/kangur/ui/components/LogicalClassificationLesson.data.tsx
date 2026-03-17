import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'wstep' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  wstep: [
    {
      title: 'Wstęp',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Klasyfikacja to układanie rzeczy w grupy.
          </KangurLessonLead>
          <KangurLessonCaption>
            Szukamy cech wspólnych i porządkujemy elementy.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Grupowanie według cech',
      content: (
        <KangurLessonStack>
          <h3 className='text-lg font-semibold [color:var(--kangur-page-text)]'>
            Grupowanie według cech
          </h3>
          <KangurLessonCaption>Cecha: mają skrzydła</KangurLessonCaption>
          <KangurLessonCaption>
            Ptaki pasują, ale ryby już nie.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Grupuj rzeczy według wspólnych cech.</KangurLessonLead>
          <KangurLessonCaption>
            Dzięki temu łatwiej znaleźć różnice.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'wstep',
    emoji: '📦',
    title: 'Klasyfikacja: wstęp',
    description: 'Porządkowanie rzeczy',
    slideCount: SLIDES.wstep.length,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.podsumowanie.length,
  },
];
