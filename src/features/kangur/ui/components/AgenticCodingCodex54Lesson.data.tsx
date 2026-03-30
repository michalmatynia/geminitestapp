import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
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
  AgenticOperatingLoopAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticDiagramFillGame from '@/features/kangur/ui/components/AgenticDiagramFillGame';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'foundations';

const STARTER_BRIEF = [
  {
    title: 'Goal',
    description: 'Co dokładnie ma dowieźć agent (bug, feature, refactor).',
  },
  {
    title: 'Context',
    description: 'Pliki, logi, ograniczenia, zależności i stan repo.',
  },
  {
    title: 'Constraints',
    description: 'Czego nie robić: brak nowych deps, brak zmian API, brak migracji.',
  },
  {
    title: 'Done when',
    description: 'Testy, checki, review diffu i akceptacja zachowania.',
  },
] as const;

const EXAMPLE_BRIEF = `Goal: Skróć czas odpowiedzi /api/report do <300 ms.
Context: src/app/api/report/handler.ts, logi w logs/report.log, obecnie ~900 ms.
Constraints: bez nowych deps, bez zmian kontraktu API, zachowaj telemetry.
Done when: średni czas <300 ms, testy API + lint przechodzą, diff reviewed.`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  foundations: [
    {
      title: 'Agentic coding to delegacja, nie generator',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Agentic coding to styl pracy: Ty dostarczasz intent i guardrails, Codex wykonuje
            zadanie end-to-end, a weryfikacja decyduje o jakości.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='Intent, guardrails i proof loop tworzą stałą pętlę jakości.'
            maxWidthClassName='max-w-full'
          >
            <AgenticOperatingLoopAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
              <KangurLessonInset accent='indigo'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500'>
                  Intent
                </div>
                <KangurLessonCaption className='mt-2'>
                  Cel i zakres, za które Ty odpowiadasz.
                </KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='indigo'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500'>
                  Guardrails
                </div>
                <KangurLessonCaption className='mt-2'>
                  Zakazane obszary, limity, wymagane standardy.
                </KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='indigo'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500'>
                  Execution
                </div>
                <KangurLessonCaption className='mt-2'>
                  Agent eksploruje, edytuje, testuje i raportuje.
                </KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='indigo'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500'>
                  Verification
                </div>
                <KangurLessonCaption className='mt-2'>
                  Dowód działania, nie obietnica.
                </KangurLessonCaption>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Model współpracy',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najlepszy mental model: Ty jesteś właścicielem decyzji, agent właścicielem
            wykonania. Weryfikacja zamyka pętlę.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-3`}>
            <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
              <p className='text-sm font-semibold text-indigo-950'>You own intent</p>
              <KangurLessonCaption className='mt-2'>
                Zakres, priorytety, ryzyko i definicja sukcesu.
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
              <p className='text-sm font-semibold text-indigo-950'>Codex owns execution</p>
              <KangurLessonCaption className='mt-2'>
                Eksploracja repo, zmiany, testy i summary diffu.
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
              <p className='text-sm font-semibold text-indigo-950'>Verification decides</p>
              <KangurLessonCaption className='mt-2'>
                Testy i review są gatekeeperem jakości.
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Brief, który działa',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najskuteczniejsze zadania zaczynają się od jasnego briefu. Format
            Goal / Context / Constraints / Done when działa jak kontrakt.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
              {STARTER_BRIEF.map((item) => (
                <KangurLessonInset key={item.title} accent='indigo'>
                  <div className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500'>
                    {item.title}
                  </div>
                  <KangurLessonCaption className='mt-2 text-indigo-950'>
                    {item.description}
                  </KangurLessonCaption>
                </KangurLessonInset>
              ))}
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przykład briefu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dobry brief skraca drogę do poprawnego rozwiązania. Ten przykład pokazuje
            pełny format z jasnym celem i kryteriami Done.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='Brief działa jak kontrakt między Tobą a agentem.'
            maxWidthClassName='max-w-full'
          >
            <AgenticBriefContractAnimation />
          </KangurLessonVisual>
          <AgenticLessonCodeBlock accent='indigo' title='Sample brief' code={EXAMPLE_BRIEF} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Sprawdź, czy pamiętasz kluczowy fundament agentic coding.
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='indigo'
            question='Co jest kluczowe w agentic coding?'
            choices={[
              { id: 'a', label: 'Generowanie jak największej ilości kodu.' },
              { id: 'b', label: 'Jasny brief, guardrails i proof loop.', correct: true },
              { id: 'c', label: 'Brak constraints i pełna autonomia.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Brief Builder',
      content: <AgenticCodingMiniGame gameId='foundations' />,
      panelClassName: 'w-full',
    },
    {
      title: 'Mini game: Loop Sketch',
      content: <AgenticDiagramFillGame gameId='operating_loop_arrow' />,
      panelClassName: 'w-full',
    },
    {
      title: 'Mini game: Contract Box',
      content: <AgenticDiagramFillGame gameId='brief_contract_box' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'foundations',
    emoji: '🤖',
    title: 'Foundations',
    description: 'Mindset, delegacja i briefy, które dają wynik.',
    slideCount: SLIDES.foundations.length,
  },
] as const;
