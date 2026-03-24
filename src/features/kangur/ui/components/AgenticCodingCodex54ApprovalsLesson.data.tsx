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
import { useId } from 'react';

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

export const ApprovalTiersVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-approval-tiers-${baseId}-clip`;
  const panelGradientId = `agentic-approval-tiers-${baseId}-panel`;
  const frameGradientId = `agentic-approval-tiers-${baseId}-frame`;
  const tierOneGradientId = `agentic-approval-tiers-${baseId}-one`;
  const tierTwoGradientId = `agentic-approval-tiers-${baseId}-two`;
  const tierThreeGradientId = `agentic-approval-tiers-${baseId}-three`;

  return (
    <svg
      aria-label='Diagram: poziomy dostępu (read-only, workspace-write, network).'
      className='h-auto w-full'
      data-testid='agentic-approval-tiers-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='140' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='20'
          x2='340'
          y1='16'
          y2='148'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='52%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='18'
          x2='342'
          y1='18'
          y2='18'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(148,163,184,0.82)' />
          <stop offset='50%' stopColor='rgba(56,189,248,0.82)' />
          <stop offset='100%' stopColor='rgba(249,115,22,0.82)' />
        </linearGradient>
        <linearGradient id={tierOneGradientId} x1='28' x2='120' y1='38' y2='124' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.95)' />
          <stop offset='100%' stopColor='rgba(226,232,240,0.92)' />
        </linearGradient>
        <linearGradient id={tierTwoGradientId} x1='136' x2='228' y1='38' y2='124' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.96)' />
          <stop offset='100%' stopColor='rgba(224,242,254,0.96)' />
        </linearGradient>
        <linearGradient id={tierThreeGradientId} x1='244' x2='336' y1='38' y2='124' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.96)' />
          <stop offset='100%' stopColor='rgba(255,237,213,0.96)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-approval-tiers-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='140'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(148,163,184,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='72' cy='36' rx='76' ry='22' fill='rgba(148,163,184,0.14)' />
        <ellipse cx='186' cy='126' rx='92' ry='24' fill='rgba(56,189,248,0.12)' />
        <ellipse cx='298' cy='38' rx='72' ry='20' fill='rgba(249,115,22,0.14)' />

        <line x1='120' y1='80' x2='132' y2='80' stroke='#94a3b8' strokeWidth='3' strokeLinecap='round' />
        <polygon points='132,80 124,75 124,85' fill='#94a3b8' />
        <line x1='228' y1='80' x2='240' y2='80' stroke='#38bdf8' strokeWidth='3' strokeLinecap='round' />
        <polygon points='240,80 232,75 232,85' fill='#38bdf8' />

        <rect
          x='24'
          y='36'
          width='96'
          height='76'
          rx='18'
          fill={`url(#${tierOneGradientId})`}
          stroke='#94a3b8'
          strokeWidth='2'
        />
        <rect x='36' y='48' width='54' height='10' rx='5' fill='rgba(148,163,184,0.22)' />
        <rect x='36' y='88' width='44' height='9' rx='4.5' fill='rgba(148,163,184,0.14)' />
        <circle cx='98' cy='56' r='7' fill='rgba(148,163,184,0.24)' />

        <rect
          x='132'
          y='36'
          width='96'
          height='76'
          rx='18'
          fill={`url(#${tierTwoGradientId})`}
          stroke='#38bdf8'
          strokeWidth='2'
        />
        <rect x='144' y='48' width='58' height='10' rx='5' fill='rgba(56,189,248,0.2)' />
        <rect x='144' y='88' width='42' height='9' rx='4.5' fill='rgba(56,189,248,0.12)' />
        <circle cx='206' cy='56' r='7' fill='rgba(56,189,248,0.22)' />

        <rect
          x='240'
          y='36'
          width='96'
          height='76'
          rx='18'
          fill={`url(#${tierThreeGradientId})`}
          stroke='#f97316'
          strokeWidth='2'
        />
        <rect x='252' y='48' width='60' height='10' rx='5' fill='rgba(249,115,22,0.2)' />
        <rect x='252' y='88' width='50' height='9' rx='4.5' fill='rgba(249,115,22,0.12)' />
        <circle cx='314' cy='56' r='7' fill='rgba(249,115,22,0.24)' />

        <text
          x='36'
          y='73'
          fontSize='11'
          fontWeight='700'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#0f172a'
        >
          Read-only
        </text>
        <text
          x='36'
          y='103'
          fontSize='9'
          fontWeight='600'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#64748b'
        >
          Default
        </text>
        <text
          x='144'
          y='73'
          fontSize='11'
          fontWeight='700'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#0f172a'
        >
          Workspace
        </text>
        <text
          x='154'
          y='103'
          fontSize='9'
          fontWeight='600'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#64748b'
        >
          Write
        </text>
        <text
          x='252'
          y='73'
          fontSize='11'
          fontWeight='700'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#0f172a'
        >
          Full access
        </text>
        <text
          x='248'
          y='103'
          fontSize='9'
          fontWeight='600'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#64748b'
        >
          Higher risk
        </text>
      </g>

      <rect
        x='18'
        y='18'
        width='324'
        height='124'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-approval-tiers-frame'
      />
    </svg>
  );
};

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
            supportingContent={
              <ul className='space-y-2 text-sm text-slate-950'>
                {DEFAULTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <AgenticApprovalGateAnimation />
          </KangurLessonVisual>
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
            supportingContent={
              <ul className='space-y-2 text-sm text-slate-950'>
                {APPROVAL_TIPS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <ApprovalTiersVisual />
          </KangurLessonVisual>
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
            supportingContent={
              <ul className='space-y-2 text-sm text-slate-950'>
                {ESCALATION_PLAYBOOK.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <AgenticApprovalScopeMapAnimation />
          </KangurLessonVisual>
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
