import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { AgenticBriefContractAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'prompt_patterns';

const BUGFIX_PROMPT = `Goal: Napraw migotanie fallbacku Suspense w React 19.2 na /albums.
Context: src/app/albums/page.tsx, repro: kliknij "Play", migotanie przez 300 ms.
Constraints: bez zmian UI, bez nowych deps.
Done when: testy przechodzą, brak migotania, diff zreviewowany.`;

const REFACTOR_PROMPT = `Goal: Refactor the retry logic into a shared utility used by notifications and webhooks.
Context: retry logic lives in notifications/* and webhooks/*; add a shared utility in shared/lib.
Constraints: No behavior changes unless explicitly documented. Prefer existing patterns and helper reuse. Update affected tests and type annotations.
Done when: Both call sites use the shared utility, tests pass, and the diff is reviewed for regressions.`;

const REVIEW_CHECKLIST = [
  'Czy brief ma jasny Goal/Context/Constraints/Done?',
  'Czy agent przedstawił dowód działania?',
  'Czy diff zawiera tylko uzgodniony scope?',
  'Czy ryzyka zostały opisane?',
] as const;

const REVIEW_PROMPT = `Review this change:
- Focus: regressions + missing tests
- Scope: only touched files
- Output: risks + recommended checks`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  prompt_patterns: [
    {
      title: 'Pattern: Bugfix',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Bugfix bez briefu to loteria. Poniższy wzór prowadzi agenta od kontekstu do
            dowodu naprawy.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='Cztery bloki briefu zawsze się powtarzają.'
            maxWidthClassName='max-w-full'
          >
            <AgenticBriefContractAnimation />
          </KangurLessonVisual>
          <AgenticLessonCodeBlock accent='indigo' title='Bugfix brief' code={BUGFIX_PROMPT} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Pattern: Refactor',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Refactor wymaga jeszcze większej precyzji. Ten wzór chroni przed
            niechcianą zmianą zachowania.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='indigo'
            title='Refactor brief'
            code={REFACTOR_PROMPT}
            caption='Format, który minimalizuje ryzyko regresji.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Pattern: Review & QA',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Review to ostatnia bramka jakości. Użyj checklisty zanim zaakceptujesz wynik.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {REVIEW_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='indigo'
            title='Review prompt'
            code={REVIEW_PROMPT}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Co najlepiej chroni refactor przed regresją?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='indigo'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Brak constraints.' },
              { id: 'b', label: 'Zdefiniowane Constraints i Done when.', correct: true },
              { id: 'c', label: 'Wielowątkowy prompt bez scope.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Prompt Patterns',
      content: <AgenticCodingMiniGame gameId='prompt_patterns' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'prompt_patterns',
    emoji: '📝',
    title: 'Prompt Patterns',
    description: 'Szablony promptów dla bugfix, refactor i review.',
    slideCount: SLIDES.prompt_patterns.length,
  },
] as const;
