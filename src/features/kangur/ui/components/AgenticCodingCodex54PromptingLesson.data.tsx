import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME, KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  AgenticBriefContractAnimation,
  AgenticContextLensAnimation,
  AgenticDocsStackAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'prompting';

const PROMPT_FRAME = [
  { title: 'Goal', description: 'Co ma się zmienić lub powstać.' },
  { title: 'Context', description: 'Pliki, logi, zależności, tło biznesowe.' },
  { title: 'Constraints', description: 'Zakazy, limity, wymagane standardy.' },
  { title: 'Done when', description: 'Testy, proof i akceptacja zachowania.' },
] as const;

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
      title: 'Prompt = kontrakt kontekstu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najlepsze prompty mają cztery bloki. Ten format stabilizuje wynik i skraca
            iteracje.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption='Goal / Context / Constraints / Done when.'
            maxWidthClassName='max-w-full'
          >
            <AgenticBriefContractAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {PROMPT_FRAME.map((item) => (
              <KangurLessonInset key={item.title} accent='rose'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-rose-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-rose-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
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
] as const;
