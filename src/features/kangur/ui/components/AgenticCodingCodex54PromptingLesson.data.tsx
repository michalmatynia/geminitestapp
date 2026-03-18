import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  AgenticContextLensAnimation,
  AgenticDocsStackAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'prompting' | 'prompt_trim_game';

const PLAN_OPTIONS = [
  { title: 'Plan mode', description: 'Gdy zadanie jest złożone lub niejasne.' },
  { title: 'Interview first', description: 'Poproś agenta, żeby zadał pytania.' },
  { title: 'PLANS.md', description: 'Użyj szablonu planu dla długich zadań.' },
] as const;

const CONTEXT_TIPS = [
  'Otwarte pliki i selekcje skracają prompt.',
  'Używaj @file, gdy chcesz wskazać konkretny plik.',
  'Podawaj konkretne ścieżki i błędy zamiast ogólników.',
] as const;

const DELTA_TIPS = [
  'Dopisz tylko różnicę, nie cały prompt od zera.',
  'Wskaż dokładny plik/fragment i co ma zostać bez zmian.',
  'Poproś o krótki proof: diff + testy + ryzyka.',
] as const;

const FILE_REFERENCE_EXAMPLE = `Use @app/editor.tsx as a reference to add a new tab named "Resources".
Then read the list from @resources.ts and render it in the new tab.`;

const PROMPT_DELTA_EXAMPLE = `Follow-up (delta):
- Update only src/features/pricing/PricingCards.tsx.
- Keep API shape and tests unchanged.
- Provide a diff summary + remaining risks.`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  prompting: [
    {
      title: 'Plan, gdy zadanie jest trudne',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli scope jest rozmyty, planowanie jest najlepszą inwestycją w jakość.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-3`}>
            {PLAN_OPTIONS.map((item) => (
              <KangurLessonCallout key={item.title} accent='rose' padding='sm' className='text-left'>
                <p className='text-sm font-semibold text-rose-950'>{item.title}</p>
                <KangurLessonCaption className='mt-2 text-rose-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Context = krótszy prompt',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy agent widzi otwarte pliki i selekcje, możesz pisać krócej, a wynik jest
            bardziej precyzyjny.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption='Kontekst to szybszy i trafniejszy wynik.'
            maxWidthClassName='max-w-full'
          >
            <AgenticDocsStackAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='rose' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-rose-950'>
              {CONTEXT_TIPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='rose'
            title='@file example'
            code={FILE_REFERENCE_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Delta prompt = szybsza iteracja',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy wynik jest blisko, dopisz krótką deltę zamiast pisać cały prompt od nowa.
            To trzyma scope i skraca czas iteracji.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption='Soczewka kontekstu skupia się na konkretnych plikach.'
            maxWidthClassName='max-w-full'
          >
            <AgenticContextLensAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='rose' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-rose-950'>
              {DELTA_TIPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='rose'
            title='Delta prompt'
            code={PROMPT_DELTA_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy warto użyć delta prompt?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='rose'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy wynik jest blisko i chcesz doprecyzować.', correct: true },
              { id: 'b', label: 'Gdy nie masz żadnego kontekstu.' },
              { id: 'c', label: 'Gdy chcesz całkowicie zmienić temat.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
  prompt_trim_game: [
    {
      title: 'Mini game: Prompt Contract',
      content: <AgenticCodingMiniGame gameId='prompting' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'prompting',
    emoji: '🎯',
    title: 'Prompting & Context',
    description: 'Kontekst, planowanie i krótsze prompty w praktyce.',
    slideCount: SLIDES.prompting.length,
  },
  {
    id: 'prompt_trim_game',
    emoji: '✂️',
    title: 'Prompt Trim Game',
    description: 'Kliknij zbędne słowa i skróć prompt do perfekcyjnego formatu.',
    isGame: true,
  },
] as const;
