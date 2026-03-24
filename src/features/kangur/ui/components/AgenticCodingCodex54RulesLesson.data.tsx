import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import { useId } from 'react';

type SectionId = 'rules-execpolicy';

const RULES_PURPOSE = [
  'Rules kontroluja, ktore komendy Codex moze uruchamiac poza sandbox.',
  'Mechanizm jest eksperymentalny i moze sie zmieniac.',
] as const;

const PREFIX_RULE_FIELDS = [
  { title: 'pattern', description: 'Prefix komendy (lista argumentow).' },
  { title: 'decision', description: 'allow | prompt | forbidden (najostrzejsza wygrywa).' },
  { title: 'justification', description: 'Uzasadnienie widoczne w promptach.' },
  { title: 'match / not_match', description: 'Inline testy dla reguly.' },
] as const;

const RULE_STORAGE = [
  'Pliki `.rules` trzymasz w `~/.codex/rules/` (np. default.rules).',
  'Codex skanuje folder `rules/` w warstwach Team Config przy starcie.',
  'Dodanie allowlisty w TUI zapisuje wpis w `~/.codex/rules/default.rules`.',
] as const;

const SMART_APPROVALS = [
  'Przy eskalacji Codex moze zaproponowac `prefix_rule`.',
  'Zawsze sprawdzaj sugestie, zanim zaakceptujesz.',
] as const;

const SHELL_WRAPPERS = [
  'Dla prostych lancuchow (`&&`, `||`, `;`, `|`) Codex moze podzielic komendy.',
  'Przy skomplikowanych skryptach (zmienne, redirection) ocenia caly wpis.',
] as const;

const RULE_EXAMPLE = `prefix_rule(
  pattern = ["gh", "pr", "view"],
  decision = "prompt",
  justification = "Viewing PRs is allowed with approval",
)`;

const EXEC_POLICY_CHECK = [
  'codex execpolicy check --pretty \\',
  '  --rules ~/.codex/rules/default.rules \\',
  '  -- gh pr view 7888 --json title,body,comments',
].join('\n');

export const RulesDecisionVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-rules-decision-${baseId}-clip`;
  const panelGradientId = `agentic-rules-decision-${baseId}-panel`;
  const frameGradientId = `agentic-rules-decision-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: decyzje rules (allow, prompt, forbidden).'
      className='h-auto w-full'
      data-testid='agentic-rules-decision-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='140' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='342'
          y1='16'
          y2='148'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#faf5ff' />
          <stop offset='52%' stopColor='#f5f3ff' />
          <stop offset='100%' stopColor='#f8fafc' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='18'
          x2='342'
          y1='18'
          y2='18'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(168,85,247,0.82)' />
          <stop offset='50%' stopColor='rgba(196,181,253,0.82)' />
          <stop offset='100%' stopColor='rgba(168,85,247,0.8)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-rules-decision-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='140'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(168,85,247,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='84' cy='32' rx='76' ry='18' fill='rgba(196,181,253,0.18)' />
        <ellipse cx='286' cy='36' rx='74' ry='18' fill='rgba(168,85,247,0.12)' />
        <ellipse cx='184' cy='132' rx='96' ry='20' fill='rgba(139,92,246,0.1)' />

        <rect x='20' y='52' width='90' height='40' rx='14' fill='rgba(255,255,255,0.9)' stroke='#c4b5fd' strokeWidth='2' />
        <rect x='135' y='52' width='90' height='40' rx='14' fill='rgba(255,255,255,0.92)' stroke='#a78bfa' strokeWidth='2' />
        <rect x='250' y='52' width='90' height='40' rx='14' fill='rgba(245,243,255,0.94)' stroke='#8b5cf6' strokeWidth='2' />
        <rect x='34' y='64' width='22' height='8' rx='4' fill='rgba(168,85,247,0.18)' />
        <rect x='149' y='64' width='28' height='8' rx='4' fill='rgba(168,85,247,0.18)' />
        <rect x='264' y='64' width='24' height='8' rx='4' fill='rgba(139,92,246,0.18)' />

        <path d='M110 72 H135' stroke='#94a3b8' strokeWidth='2.5' fill='none' />
        <polygon points='135,72 127,67 127,77' fill='#94a3b8' />
        <path d='M225 72 H250' stroke='#8b5cf6' strokeWidth='2.5' fill='none' />
        <polygon points='250,72 242,67 242,77' fill='#8b5cf6' />

        <text x='38' y='76' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Allow</text>
        <text x='155' y='76' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Prompt</text>
        <text x='262' y='76' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Block</text>
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
        data-testid='agentic-rules-decision-frame'
      />
    </svg>
  );
};

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  'rules-execpolicy': [
    {
      title: 'Rules = kontrola komend',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Rules pozwalaja precyzyjnie sterowac, ktore komendy moga wyjsc poza
            sandbox.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption='Decyzja rule: allow, prompt albo forbidden.'
            maxWidthClassName='max-w-full'
          >
            <RulesDecisionVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {RULES_PURPOSE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'prefix_rule w praktyce',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najwazniejszy jest prefix komendy i decyzja: allow, prompt lub forbidden.
          </KangurLessonLead>
          <div className='grid gap-3 sm:grid-cols-2'>
            {PREFIX_RULE_FIELDS.map((item) => (
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
          <AgenticLessonCodeBlock accent='violet' title='Przyklad reguly' code={RULE_EXAMPLE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Gdzie trzymac rules',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Rules sa ladowane z lokalnych warstw oraz z Team Config.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {RULE_STORAGE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {SMART_APPROVALS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Shell wrappers i lancuchy',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Codex dzieli proste lancuchy komend, ale ostroznie traktuje zlozone
            skrypty.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {SHELL_WRAPPERS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Testuj execpolicy',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Przed wdrozeniem sprawdz, jak reguly dzialaja na realne komendy.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='violet'
            title='codex execpolicy check'
            code={EXEC_POLICY_CHECK}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Co oznacza decyzja `prompt` w rules?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='violet'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Komenda wymaga zgody użytkownika.', correct: true },
              { id: 'b', label: 'Komenda jest zawsze blokowana.' },
              { id: 'c', label: 'Komenda jest automatycznie dozwolona.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Rules Triage',
      content: <AgenticCodingMiniGame gameId='rules' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'rules-execpolicy',
    emoji: '🧷',
    title: 'Rules & Execpolicy',
    description: 'Allowlist komend i testowanie zasad.',
    slideCount: SLIDES['rules-execpolicy'].length,
  },
] as const;
