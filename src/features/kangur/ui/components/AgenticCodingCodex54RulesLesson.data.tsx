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

const EXEC_POLICY_CHECK = `codex execpolicy check --pretty \
  --rules ~/.codex/rules/default.rules \
  -- gh pr view 7888 --json title,body,comments`;

const RulesDecisionVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: decyzje rules (allow, prompt, forbidden).'
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
      .arrow {
        stroke: #94a3b8;
        stroke-width: 2;
        fill: none;
      }
    `}</style>
    <rect className='panel' height='36' rx='10' width='90' x='20' y='52' />
    <rect className='panel' height='36' rx='10' width='90' x='135' y='52' />
    <rect className='panel' height='36' rx='10' width='90' x='250' y='52' />
    <text className='label' x='38' y='74'>Allow</text>
    <text className='label' x='155' y='74'>Prompt</text>
    <text className='label' x='262' y='74'>Block</text>
    <path className='arrow' d='M110 70 H135' />
    <path className='arrow' d='M225 70 H250' />
  </svg>
);

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
