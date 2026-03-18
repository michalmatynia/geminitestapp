import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { AgenticApprovalGateAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

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

const PREFIX_RULES = [
  'npm run test',
  'npm run build',
  'npx vitest run',
  'docker compose up',
  'git add',
] as const;

const APPROVAL_POLICIES = [
  {
    title: 'untrusted',
    description: 'Tylko zaufane komendy bez pytania; reszta wymaga zgody.',
  },
  {
    title: 'on-request',
    description: 'Agent sam decyduje, kiedy poprosić o approval.',
  },
  {
    title: 'never',
    description: 'Brak pytań o approval; ryzyko musi być świadome.',
  },
] as const;

const SANDBOX_POLICIES = [
  { title: 'read-only', description: 'Brak zapisów, tylko odczyt.' },
  { title: 'workspace-write', description: 'Zapis wyłącznie w workspace.' },
  { title: 'danger-full-access', description: 'Pełny dostęp - tylko w izolowanym środowisku.' },
] as const;

const CLI_SAFETY_SHORTCUTS = [
  '`--full-auto` = `-a on-request` + `--sandbox workspace-write`.',
  'Unikaj `--dangerously-bypass-approvals-and-sandbox` bez zewnętrznego sandboxu.',
  '`codex sandbox` uruchamia polecenia w izolacji systemowej.',
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

const SAFE_CLI_EXAMPLE = `# Bezpieczny start
codex --sandbox workspace-write --ask-for-approval on-request "Refactor auth middleware."

# Eskalacja tylko gdy potrzebna
Request approval to run: npm run test:integration
Scope: workspace-write, no network`;

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

const LessonCodeBlock = ({
  title,
  code,
}: {
  title?: string;
  code: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='slate'
    className='border-slate-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
  </KangurLessonInset>
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
      title: 'Prefix rules i minimalny dostęp',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Prefix rules pozwalają automatycznie akceptować bezpieczne komendy. Im
            węższy prefix, tym lepsza kontrola.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {PREFIX_RULES.map((rule) => (
              <KangurLessonInset key={rule} accent='slate'>
                <KangurLessonChip accent='slate'>{rule}</KangurLessonChip>
                <KangurLessonCaption className='mt-3 text-left'>
                  Zakres ograniczony do powtarzalnych, bezpiecznych akcji.
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'CLI: approval i sandboxing',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Tryby approval i sandbox są dostępne w CLI jako proste flagi. Dobierz je
            do poziomu ryzyka zadania.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {APPROVAL_POLICIES.map((policy) => (
              <KangurLessonInset key={policy.title} accent='slate'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  {policy.title}
                </div>
                <KangurLessonCaption className='mt-2 text-slate-900'>
                  {policy.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {SANDBOX_POLICIES.map((policy) => (
              <KangurLessonInset key={policy.title} accent='slate'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  {policy.title}
                </div>
                <KangurLessonCaption className='mt-2 text-slate-900'>
                  {policy.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-900'>
              {CLI_SAFETY_SHORTCUTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przykład bezpiecznego startu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zacznij od bezpiecznych ustawień, a eskalację rób tylko z jasnym powodem.
          </KangurLessonLead>
          <LessonCodeBlock title='Safe CLI flow' code={SAFE_CLI_EXAMPLE} />
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
          <LessonCodeBlock title='Decision log' code={SAFETY_AUDIT_LOG} />
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
