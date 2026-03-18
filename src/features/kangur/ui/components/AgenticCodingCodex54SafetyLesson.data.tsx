import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { AgenticApprovalGateAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'safety';

const SAFETY_PRINCIPLES = [
  'Sandbox najpierw, eskalacja dopiero gdy to konieczne.',
  'Każda eskalacja ma jasny powód i zakres.',
  'Minimalny dostęp + maksymalny ślad audytowy.',
] as const;

const ESCALATION_TRIGGERS = [
  'Potrzebujesz pobrać zależności lub uruchomić install.',
  'Testy lub build zapisują do katalogów poza workspace.',
  'Musisz odpalić narzędzia systemowe (np. Docker, GUI).',
  'Planowana operacja jest destrukcyjna lub trudna do cofnięcia.',
] as const;

const SAFETY_STACK = [
  'Sandbox ogranicza skutki uboczne (zapisy tylko w workspace).',
  'Approvals wymagają świadomej zgody na ryzykowne akcje.',
  'Summary + logi tworzą ślad audytowy po każdym tasku.',
] as const;

const RISK_SIGNALS = [
  'Wysoki wpływ + wysoka niepewność = potrzebna eskalacja.',
  'Każda eskalacja musi mieć opis zakresu i plan rollbacku.',
  'Ryzyko maleje, gdy masz testy lub twardy proof.',
] as const;

const SAFETY_AUDIT_LOG = `Decision log
- Action: run "npm run test:integration"
- Scope: workspace-write, no network
- Reason: weryfikacja refactoru przed merge
- Evidence: testy przeszły, log w załączniku`;

const SafetyLayersVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: warstwy bezpieczeństwa (sandbox, approvals, audit).'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 140'
  >
    <style>{`
      .layer {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .accent-1 { stroke: #94a3b8; }
      .accent-2 { stroke: #38bdf8; }
      .accent-3 { stroke: #22c55e; }
    `}</style>
    <rect className='layer accent-1' height='26' rx='10' width='250' x='55' y='24' />
    <rect className='layer accent-2' height='26' rx='10' width='250' x='55' y='58' />
    <rect className='layer accent-3' height='26' rx='10' width='250' x='55' y='92' />
    <text className='label' x='70' y='41'>Sandbox</text>
    <text className='label' x='70' y='75'>Approvals</text>
    <text className='label' x='70' y='109'>Audit trail</text>
  </svg>
);

const RiskMatrixVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: mapa ryzyka (wpływ x prawdopodobieństwo).'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 160'
  >
    <style>{`
      .cell {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .mid { fill: #e2e8f0; }
      .high {
        fill: #fde68a;
        stroke: #f59e0b;
      }
      .axis {
        stroke: #cbd5f5;
        stroke-width: 2;
      }
      .label {
        font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .muted {
        font: 600 8px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #64748b;
      }
    `}</style>
    <line className='axis' x1='70' x2='70' y1='24' y2='132' />
    <line className='axis' x1='70' x2='300' y1='132' y2='132' />
    <rect className='cell' height='44' rx='10' width='92' x='90' y='34' />
    <rect className='cell mid' height='44' rx='10' width='92' x='190' y='34' />
    <rect className='cell mid' height='44' rx='10' width='92' x='90' y='88' />
    <rect className='cell high' height='44' rx='10' width='92' x='190' y='88' />
    <text className='label' x='110' y='62'>Low</text>
    <text className='label' x='208' y='62'>Medium</text>
    <text className='label' x='104' y='116'>Medium</text>
    <text className='label' x='212' y='116'>High</text>
    <text className='muted' x='14' y='26'>Likelihood</text>
    <text className='muted' x='258' y='150'>Impact</text>
  </svg>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  safety: [
    {
      title: 'Safety = gate, nie hamulec',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Bezpieczeństwo w agentic coding to kontrola ryzyka, nie blokada. Approval
            gate pozwala działać szybko, ale z pełną świadomością konsekwencji.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Gate otwiera się tylko wtedy, gdy rozumiesz koszt i ryzyko.'
            maxWidthClassName='max-w-full'
          >
            <AgenticApprovalGateAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {SAFETY_PRINCIPLES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kiedy prosisz o eskalację',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Proś o wyższe uprawnienia tylko wtedy, gdy to konieczne i uzasadnione.
            To chroni repo i skraca review.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {ESCALATION_TRIGGERS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Safety stack',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Bezpieczne środowisko to trzy warstwy: sandbox, approvals i audyt.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Warstwy bezpieczeństwa działają razem.'
            maxWidthClassName='max-w-full'
          >
            <SafetyLayersVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {SAFETY_STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mapa ryzyka',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Im wyższe ryzyko, tym bardziej potrzebujesz approvals i twardego proofu.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Wysoki wpływ + wysoka niepewność = eskalacja.'
            maxWidthClassName='max-w-full'
          >
            <RiskMatrixVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {RISK_SIGNALS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ślad audytu w praktyce',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Log decyzji skraca review i pozwala szybko wrócić do kontekstu.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='slate'
            title='Decision log'
            code={SAFETY_AUDIT_LOG}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy prosisz o eskalację uprawnień?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='slate'
            question='Wybierz właściwą sytuację.'
            choices={[
              { id: 'a', label: 'Gdy musisz zainstalować zależności.', correct: true },
              { id: 'b', label: 'Gdy edytujesz opis w README.' },
              { id: 'c', label: 'Zawsze na starcie zadania.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Safety Gate',
      content: <AgenticCodingMiniGame gameId='safety' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'safety',
    emoji: '🛡️',
    title: 'Config & Safety',
    description: 'Approval gate, eskalacje i minimalny dostęp.',
    slideCount: SLIDES.safety.length,
  },
] as const;
