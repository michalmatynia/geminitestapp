import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'rules';

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

const LessonCodeBlock = ({
  title,
  code,
}: {
  title?: string;
  code: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='violet'
    className='border-violet-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
  </KangurLessonInset>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  rules: [
    {
      title: 'Rules = kontrola komend',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Rules pozwalaja precyzyjnie sterowac, ktore komendy moga wyjsc poza
            sandbox.
          </KangurLessonLead>
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
          <LessonCodeBlock title='Przyklad reguly' code={RULE_EXAMPLE} />
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
          <LessonCodeBlock title='codex execpolicy check' code={EXEC_POLICY_CHECK} />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'rules-execpolicy',
    emoji: '🧷',
    title: 'Rules & Execpolicy',
    description: 'Allowlist komend i testowanie zasad.',
    slideCount: SLIDES.rules.length,
  },
] as const;
