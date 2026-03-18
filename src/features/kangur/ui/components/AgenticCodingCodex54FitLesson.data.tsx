import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  AgenticDoDontAnimation,
  AgenticFitQuadrantAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'fit';

const GOOD_FITS = [
  'Bug fix z jasnym repro i konkretnymi plikami.',
  'Feature slice z wyraźnym Definition of Done.',
  'Refactor z określonym zakresem i testami.',
  'Migracja etapowa z checkpointami i rollbackiem.',
  'Codebase Q&A, review, release notes, CI triage.',
  'Powtarzalne workflow: importy, raporty, automatyzacje.',
] as const;

const WEAK_FITS = [
  'Problem jest niedookreślony lub bez acceptance criteria.',
  'Brak stabilnego test/build loop.',
  'Wymagane szerokie decyzje produktowe bez guardrails.',
  'Zbyt duży scope bez planu lub bez worktrees.',
  'Nadanie pełnej autonomii na starcie projektu.',
] as const;

const DECISION_CHECKLIST = [
  'Czy zakres jest jasny i ograniczony?',
  'Czy wiesz, jak zweryfikować wynik?',
  'Czy masz dostęp do testów i checków?',
  'Czy ryzyka są opisane i akceptowalne?',
] as const;

const FIT_DECISION_TEMPLATE = `Fit triage:
- Scope: clear / unclear
- Verification: tests / logs / none
- Risk: low / medium / high
- Decision: Codex / plan first / split task`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  fit: [
    {
      title: 'Gdzie Codex pasuje najlepiej',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najlepsze rezultaty daje, gdy zadanie ma wyraźne granice, ale nadal wymaga
            realnej pracy inżynierskiej: eksploracji, zmian, testów i review.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Dobry fit to jasny scope i weryfikacja w zasięgu ręki.'
            maxWidthClassName='max-w-full'
          >
            <AgenticDoDontAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
              {GOOD_FITS.map((item) => (
                <KangurLessonInset key={item} accent='sky'>
                  <KangurLessonCaption className='text-sky-950'>{item}</KangurLessonCaption>
                </KangurLessonInset>
              ))}
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Fit matrix',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Im bardziej klarowny scope i dowód weryfikacji, tym lepszy fit dla Codex.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Najlepszy fit to jasny scope + mocny proof.'
            maxWidthClassName='max-w-full'
          >
            <AgenticFitQuadrantAnimation />
          </KangurLessonVisual>
          <AgenticLessonCodeBlock accent='sky' title='Fit triage' code={FIT_DECISION_TEMPLATE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Gdzie potrzebujesz więcej kontroli',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Agent traci skuteczność, gdy nie ma jasnego scope, brakuje testów, albo zadanie
            wymaga głębokiego product judgment bez kryteriów akceptacji.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {WEAK_FITS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Szybka decyzja: użyć czy doprecyzować?',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli na poniższe pytania odpowiadasz “tak”, agentic coding jest dobrym
            wyborem. Jeśli nie - doprecyzuj brief lub zrób plan.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {DECISION_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Wybierz przykład zadania, które jest dobrym fit.
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='sky'
            question='Które zadanie najlepiej pasuje do agentic coding?'
            choices={[
              { id: 'a', label: 'Bugfix z jasnym repro i testami.', correct: true },
              { id: 'b', label: 'Duży projekt bez scope i bez testów.' },
              { id: 'c', label: 'Strategia produktu bez kryteriów akceptacji.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Fit Scanner',
      content: <AgenticCodingMiniGame gameId='fit' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'fit',
    emoji: '🧭',
    title: 'Fit & Limits',
    description: 'Wybierz zadania z jasnym scope i ścieżką weryfikacji.',
    slideCount: SLIDES.fit.length,
  },
] as const;
