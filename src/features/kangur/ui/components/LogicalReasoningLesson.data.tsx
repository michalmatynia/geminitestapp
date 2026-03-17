import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'jesli' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  jesli: [
    {
      title: 'Wnioskowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wnioskowanie to wyciąganie nowych wniosków z informacji.
          </KangurLessonLead>
          <KangurLessonCaption>
            Gdy znamy zasady, potrafimy dojść do odpowiedzi.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Jeśli… to…',
      content: (
        <KangurLessonStack>
          <h3 className='text-lg font-semibold [color:var(--kangur-page-text)]'>Jeśli… to…</h3>
          <KangurLessonCaption>
            NIE znaczy, że zawsze się uda, ale jest to dobra wskazówka.
          </KangurLessonCaption>
          <KangurLessonCaption>
            Sprawdź, czy zasada pasuje do sytuacji.
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
          <KangurLessonLead>Wnioskowanie to myślenie krok po kroku.</KangurLessonLead>
          <KangurLessonCaption>
            Łącz fakty i sprawdzaj swoje wnioski.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'jesli',
    emoji: '💡',
    title: 'Wnioskowanie: jeśli… to…',
    description: 'Zasady i ich skutki',
    slideCount: SLIDES.jesli.length,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.podsumowanie.length,
  },
];
