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
  AgenticApprovalGateAnimation,
  AgenticApprovalScopeMapAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'approvals';

const DEFAULTS = [
  'Network access jest wyłączony domyślnie.',
  'Sandbox ogranicza zapisy do workspace.',
  'Approval policy decyduje, kiedy agent pyta o zgodę.',
] as const;

const NETWORK_CONTROLS = [
  'Włącz sieć w workspace-write tylko, gdy to konieczne.',
  'Web search działa na cache index (domyślnie).',
  'Ustaw web_search=live lub disabled w razie potrzeby.',
  'Traktuj wyniki z web search jako nieufne.',
] as const;

const PROTECTED_PATHS = [
  '.git (read-only)',
  '.agents (read-only)',
  '.codex (read-only)',
] as const;

const APPROVAL_TIPS = [
  'Opisuj cel i dokładną komendę.',
  'Proś o minimalny zakres uprawnień.',
  'Jeśli to jednorazowe, poproś o approval tylko dla tej komendy.',
] as const;

const ESCALATION_PLAYBOOK = [
  'Startuj od read-only i eskaluj tylko gdy to konieczne.',
  'Jeśli potrzeba zapisu, opisz dokładny katalog lub pliki.',
  'Dla powtarzalnych komend podaj prefix rule.',
] as const;

const APPROVAL_REQUEST_EXAMPLE = `Request approval:
- Action: run "npm run test:smoke"
- Scope: workspace-write, no network
- Reason: validate the refactor before merge

User approval: ✅ allow once`;

const ESCALATION_REQUEST_EXAMPLE = `Request approval:
- Action: run "npm run docs:structure:check"
- Scope: workspace-write, no network
- Reason: verify doc placement rules
- Prefix rule: ["npm", "run", "docs:structure:check"]`;

const ApprovalTiersVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: poziomy dostępu (read-only, workspace-write, network).'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 140'
  >
    <style>{`
      .panel {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .tier-1 { stroke: #94a3b8; }
      .tier-2 { stroke: #38bdf8; }
      .tier-3 { stroke: #f97316; }
      .badge {
        font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #64748b;
      }
    `}</style>
    <rect className='panel tier-1' height='70' rx='14' width='100' x='20' y='40' />
    <rect className='panel tier-2' height='70' rx='14' width='100' x='130' y='40' />
    <rect className='panel tier-3' height='70' rx='14' width='100' x='240' y='40' />
    <text className='label' x='38' y='70'>Read-only</text>
    <text className='badge' x='40' y='92'>Default</text>
    <text className='label' x='138' y='70'>Workspace</text>
    <text className='badge' x='150' y='92'>Write</text>
    <text className='label' x='258' y='70'>Network</text>
    <text className='badge' x='252' y='92'>Higher risk</text>
  </svg>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  approvals: [
    {
      title: 'Domyślna postura bezpieczeństwa',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Codex startuje bez dostępu do sieci i działa w sandboxie. Approvals
            pozwalają podnosić dostęp tylko wtedy, gdy to uzasadnione.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Approval gate chroni przed niekontrolowanymi akcjami.'
            maxWidthClassName='max-w-full'
          >
            <AgenticApprovalGateAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {DEFAULTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Poziomy dostępu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Podnoś dostęp stopniowo: od read-only, przez workspace-write, aż po sieć.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Minimalny dostęp = mniejsze ryzyko.'
            maxWidthClassName='max-w-full'
          >
            <ApprovalTiersVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {APPROVAL_TIPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Playbook eskalacji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Eskaluj dostęp tylko wtedy, gdy to uzasadnione. Zawsze opisuj minimalny
            scope i powód, żeby przyspieszyć decyzję.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Minimalny dostęp → szybsze approvals.'
            maxWidthClassName='max-w-full'
          >
            <AgenticApprovalScopeMapAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {ESCALATION_PLAYBOOK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='slate'
            title='Scoped approval request'
            code={ESCALATION_REQUEST_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Network access i web search',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Sieć i web search to zwiększone ryzyko. Włączaj je tylko, gdy naprawdę
            potrzebujesz zewnętrznych danych.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {NETWORK_CONTROLS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przykład requestu approval',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Prosty format requestu przyspiesza decyzje i zmniejsza liczbę pytań zwrotnych.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='slate'
            title='Approval request'
            code={APPROVAL_REQUEST_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Chronione ścieżki w workspace',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Nawet w workspace-write część katalogów pozostaje tylko do odczytu.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
            {PROTECTED_PATHS.map((item) => (
              <KangurLessonInset key={item} accent='slate'>
                <KangurLessonCaption className='text-slate-950'>{item}</KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'approvals',
    emoji: '🔒',
    title: 'Approvals & Network',
    description: 'Sandbox, approvals i kontrola dostępu do sieci.',
    slideCount: SLIDES.approvals.length,
  },
] as const;
