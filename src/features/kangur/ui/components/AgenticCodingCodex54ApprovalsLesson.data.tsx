import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  AgenticApprovalGateAnimation,
  AgenticApprovalScopeMapAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticDiagramFillGame from '@/features/kangur/ui/components/AgenticDiagramFillGame';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'approvals' | 'approval_gate_game';

const DEFAULTS = [
  'W bezpiecznych presetach sieć startuje wyłączona.',
  'Sandbox ogranicza zapisy do workspace, gdy jest włączony.',
  'Approval policy decyduje, kiedy agent pyta o zgodę.',
  'Read-only oznacza planowanie bez zmian w repo.',
] as const;

const NETWORK_CONTROLS = [
  'Web search może działać w trybie cache lub live, zależnie od konfiguracji.',
  'Włącz live search tylko wtedy, gdy potrzebujesz aktualnych danych.',
  'Traktuj wyniki z web search jako nieufne.',
  'Network access włączaj tylko, gdy to konieczne.',
] as const;

const APPROVAL_TIPS = [
  'Zacznij od read-only, przejdź do workspace-write dopiero gdy to potrzebne.',
  'Full access (`danger-full-access`) tylko w izolowanym środowisku.',
  '`--full-auto` to bezpieczniejszy preset: workspace-write + on-request.',
] as const;

const APP_TOOL_APPROVALS = [
  'App/MCP tool calls z side effects mogą wymagać approval nawet bez shell command.',
  'Destrukcyjne narzędzia zawsze wymagają zgody, nawet jeśli deklarują read-only.',
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

const APPROVAL_GATE_STEPS = [
  'Kliknij akcję, aby ją zaznaczyć.',
  'Zdecyduj: wymaga approval czy jest bezpieczna.',
  'Sprawdź, czy zachowałeś minimalny scope.',
] as const;

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
    <text className='label' x='252' y='70'>Full access</text>
    <text className='badge' x='246' y='92'>Higher risk</text>
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
            Podnoś dostęp stopniowo: od read-only, przez workspace-write, aż po pełny dostęp.
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
      title: 'App/MCP approvals',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Approvals dotyczą nie tylko shell commandów. Narzędzia zewnętrzne też mogą
            wymagać zgody.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {APP_TOOL_APPROVALS.map((item) => (
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
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Co powinno znaleźć się w dobrym requestcie approval?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='slate'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Akcja, zakres i powód.', correct: true },
              { id: 'b', label: 'Tylko nazwa komendy.' },
              { id: 'c', label: 'Lista wszystkich plików w repo.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Approval Ladder',
      content: <AgenticCodingMiniGame gameId='approvals' />,
      panelClassName: 'w-full',
    },
    {
      title: 'Mini game: Approval Chart',
      content: <AgenticDiagramFillGame gameId='approval_tiers_chart' />,
      panelClassName: 'w-full',
    },
  ],
  approval_gate_game: [
    {
      title: 'Approval Gate Game',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Przeprowadź akcje przez approval gate i oceń, czy wymagają zgody.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {APPROVAL_GATE_STEPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
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
  {
    id: 'approval_gate_game',
    emoji: '🛡️',
    title: 'Approval Gate',
    description: 'Zdecyduj, które akcje wymagają zgody.',
    isGame: true,
  },
] as const;
