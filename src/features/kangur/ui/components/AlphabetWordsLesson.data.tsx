import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'slowa' | 'game_words' | 'summary';

export const SLIDES: Record<Exclude<SectionId, 'game_words'>, LessonSlide[]> = {
  slowa: [
    {
      title: 'Pierwsze słowa',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Obrazki pomagają szybko zapamiętać nowe słowa.</KangurLessonLead>
          <KangurLessonCaption>
            Najpierw popatrz na obrazek, potem nazwij go na głos.
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
          <KangurLessonLead>Potrafisz połączyć obrazek z właściwym słowem.</KangurLessonLead>
          <KangurLessonCaption>
            Ćwicz kilka słów naraz, a szybciej zapamiętasz ich brzmienie.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'slowa',
    emoji: '📖',
    title: 'Poznaj słowa',
    description: 'Nazwij obrazek i zapamiętaj słowo',
    slideCount: SLIDES.slowa.length,
  },
  {
    id: 'game_words',
    emoji: '🎮',
    title: 'Gra słowa',
    description: 'Dopasuj obrazek do właściwego słowa',
    isGame: true,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
] as const;
