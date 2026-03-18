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
  AgenticEvidencePackAnimation,
  AgenticOperatingLoopAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'review';

const VERIFY_CHECKLIST = [
  'Testy dodane lub zaktualizowane.',
  'Lint/typecheck uruchomione.',
  'Zachowanie potwierdzone w praktyce.',
  'Diff przejrzany pod kątem regresji.',
] as const;

const REVIEW_WORKFLOWS = [
  { title: 'Diff panel', description: 'Reviewuj zmiany bezpośrednio w Codex app.' },
  { title: '/review', description: 'Szybki review working tree w CLI.' },
  { title: 'Checklist', description: 'Własny code_review.md podpięty w AGENTS.md.' },
  { title: 'PR review', description: 'Traktuj zmiany jak normalny PR.' },
] as const;

const REVIEW_MODES = [
  'Review względem base branch (PR-style).',
  'Review niezatwierdzonych zmian.',
  'Review pojedynczego commitu.',
  'Custom instrukcje review.',
] as const;

const REVIEW_STANDARDS = [
  'Podpinaj `code_review.md` w AGENTS.md, aby standaryzować review.',
  'Codex może testować, sprawdzać i reviewować, nie tylko generować kod.',
] as const;

const DONE_SIGNAL = [
  'Co się zmieniło i gdzie (paths).',
  'Jakie testy/komendy zostały uruchomione.',
  'Jakie ryzyka pozostały.',
] as const;

const EVIDENCE_PACK = [
  'Diff: ścieżki + skrót zmian.',
  'Testy: komendy + wynik.',
  'Manual/prod check: krótki proof działania.',
] as const;

const EVIDENCE_LOG_EXAMPLE = `Evidence:
- Diff: src/features/billing/* (6 files)
- Tests: npm run test:smoke (pass)
- Manual: /admin/billing renders, no console errors
Risks: config edge-case pending follow-up`;

const DONE_TEMPLATE = `Summary:
- Changed: <paths + behavior>
- Tests: <commands + results>
- Risks: <open items>
Next: <optional follow-up>`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  review: [
    {
      title: 'Proof loop zamiast “looks good”',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            W agentic coding akceptujesz dopiero wtedy, gdy masz dowód działania.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='Plan → Execute → Verify.'
            maxWidthClassName='max-w-full'
          >
            <AgenticOperatingLoopAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {VERIFY_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Review workflows',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Użyj narzędzi review, żeby szybciej wychwycić regresje.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {REVIEW_WORKFLOWS.map((item) => (
              <KangurLessonInset key={item.title} accent='amber'>
                <p className='text-sm font-semibold text-amber-950'>{item.title}</p>
                <KangurLessonCaption className='mt-2 text-amber-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Tryby /review',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            /review ma kilka trybów - wybierz ten, który najlepiej pasuje do zadania.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {REVIEW_MODES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Spójne standardy review',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Formalne standardy review sprawiają, że agent działa przewidywalnie w
            każdym repo.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {REVIEW_STANDARDS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Evidence pack',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zbierz dowód w jednym pakiecie: diff, testy i manualny proof. To skraca
            review i zmniejsza ryzyko regresji.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='Dowód = diff + testy + proof.'
            maxWidthClassName='max-w-full'
          >
            <AgenticEvidencePackAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {EVIDENCE_PACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='amber'
            title='Evidence log'
            code={EVIDENCE_LOG_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Szablon podsumowania',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Używaj jednego szablonu końcowego - szybciej się skanuje i lepiej wspiera
            audyt.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='amber'
            title='Done summary template'
            code={DONE_TEMPLATE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Sygnatury “Done”',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dobre podsumowanie ma trzy elementy: zmiany, dowód i ryzyka.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {DONE_SIGNAL.map((item) => (
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
            Co jest wymagane do akceptacji zmian?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='amber'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Testy + review diffu + opis ryzyk.', correct: true },
              { id: 'b', label: 'Sama deklaracja, że działa.' },
              { id: 'c', label: 'Wyłącznie screenshot UI.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Evidence Pack',
      content: <AgenticCodingMiniGame gameId='review' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'review',
    emoji: '🔍',
    title: 'Review & Verification',
    description: 'Testy, diff review i checklisty jakości.',
    slideCount: SLIDES.review.length,
  },
] as const;
