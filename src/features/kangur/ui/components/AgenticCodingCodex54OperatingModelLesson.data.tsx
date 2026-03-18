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
  AgenticOperatingLoopAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'operating_model';

const BRIEF_TEMPLATE = [
  { title: 'Goal', description: 'Jaki outcome ma dowieźć agent.' },
  { title: 'Context', description: 'Pliki, logi, zależności i tło biznesowe.' },
  { title: 'Constraints', description: 'Limity: brak deps, zachować API, bez migracji.' },
  { title: 'Done when', description: 'Testy, lint/typecheck, review diffu i potwierdzenie zachowania.' },
] as const;

const PLAN_WHEN = [
  'Wymagania są niepełne lub niejasne.',
  'Zmiana dotyczy wielu systemów lub warstw.',
  'Ryzyko migracji lub regresji jest wysokie.',
  'Zadanie może pójść w kilka kierunków.',
] as const;

const UNIT_OF_WORK = [
  { good: 'Jedna funkcja, jeden bug, jedna migracja etapu.', bad: '"Zrób cały backend i frontend".' },
  { good: 'Jeden review pass lub jedna refaktoryzacja modułu.', bad: '"Napraw wszystko w projekcie".' },
  { good: 'Jedno powtarzalne workflow.', bad: '"Zautomatyzuj wszystko naraz".' },
] as const;

const PROOF_LOOP = [
  'Testy dodane lub zaktualizowane.',
  'Lint/typecheck uruchomione.',
  'Diff przejrzany pod kątem regresji.',
  'Opisane ryzyka i pozostałe ograniczenia.',
] as const;

const EXAMPLE_BRIEF = `Goal: Refactor the retry logic into a shared utility used by notifications and webhooks.
Context: retry logic lives in notifications/* and webhooks/*; add a shared utility in shared/lib.
Constraints: No behavior changes unless explicitly documented. Prefer existing patterns and helper reuse. Update affected tests and type annotations.
Done when: Both call sites use the shared utility, tests pass, and the diff is reviewed for regressions.`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  operating_model: [
    {
      title: 'Brief = kontrakt pracy agenta',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najlepszy operating model zaczyna się od briefu. To nie prompt - to kontrakt.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption='Kontrakt briefu prowadzi agenta przez jasne etapy.'
            maxWidthClassName='max-w-full'
          >
            <AgenticBriefContractAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {BRIEF_TEMPLATE.map((item) => (
              <KangurLessonInset key={item.title} accent='violet'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-violet-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-violet-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Plan first, gdy jest niejasno',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy zadanie jest nieostre lub ryzykowne, plan jest obowiązkowy. Krótki plan
            redukuje ryzyko i ułatwia akceptację.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {PLAN_WHEN.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przykład briefu: refaktor retry logic',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dobry brief jest krótki, ale zawiera wszystkie warunki brzegowe i dowód
            działania. Poniżej przykład gotowy do użycia.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='violet'
            title='Refactor brief'
            code={EXAMPLE_BRIEF}
            caption='To dokładnie ten format, który minimalizuje ryzyko regresji.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Jednostka pracy musi być spójna',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dobra jednostka pracy to jeden spójny outcome. Zbyt szeroki scope zabija jakość.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-3`}>
            {UNIT_OF_WORK.map((item) => (
              <KangurLessonInset key={item.good} accent='violet'>
                <p className='text-sm font-semibold text-violet-950'>Dobry scope</p>
                <KangurLessonCaption className='mt-2 text-violet-950'>{item.good}</KangurLessonCaption>
                <p className='mt-4 text-sm font-semibold text-violet-950'>Zły scope</p>
                <KangurLessonCaption className='mt-2 text-violet-950'>{item.bad}</KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Proof loop: dowód, nie obietnica',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Agentic coding kończy się wtedy, gdy masz dowód działania. “Wygląda dobrze”
            to za mało.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption='Plan → Execute → Verify domyka pętlę jakości.'
            maxWidthClassName='max-w-full'
          >
            <AgenticOperatingLoopAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {PROOF_LOOP.map((item) => (
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
            Jak najprościej opisać „Done when”?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='violet'
            question='Co najlepiej opisuje „Done when”?'
            choices={[
              { id: 'a', label: 'Agent mówi, że skończył.' },
              { id: 'b', label: 'Testy + review diffu + potwierdzenie zachowania.', correct: true },
              { id: 'c', label: 'Tylko commit i push.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'operating_model',
    emoji: '🔁',
    title: 'Operating Model',
    description: 'Brief, plan, spójna jednostka pracy i proof loop.',
    slideCount: SLIDES.operating_model.length,
  },
] as const;
