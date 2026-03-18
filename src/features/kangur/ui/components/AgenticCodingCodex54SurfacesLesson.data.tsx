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
  AgenticCliQueueTipAnimation,
  AgenticCodexCliCommandMapAnimation,
  AgenticSurfacePickerAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'surfaces' | 'cli';

const SURFACES = [
  {
    title: 'CLI',
    description: 'Najbliżej terminala i lokalnego repo. Idealne do krótkich iteracji.',
  },
  {
    title: 'IDE Extension',
    description: 'Najlepsza, gdy liczy się kontekst otwartych plików i selekcji.',
  },
  {
    title: 'App / Cloud',
    description: 'App: wątki równolegle, worktrees, automations. Cloud: zadania w tle.',
  },
  {
    title: 'API / Custom Harness',
    description: 'Własne workflow, agent harness i integracje produktowe.',
  },
] as const;

const CHOOSE_WHEN = [
  {
    title: 'CLI',
    description: 'Gdy pracujesz lokalnie i chcesz szybko iterować w repo.',
  },
  {
    title: 'IDE Extension',
    description: 'Gdy najważniejsze są pliki w edytorze i inline review.',
  },
  {
    title: 'App / Cloud',
    description: 'Gdy potrzebujesz wątków równoległych lub pracy w tle.',
  },
  {
    title: 'API',
    description: 'Gdy potrzebujesz własnych narzędzi, trace i automatyzacji.',
  },
] as const;

const CHECKLIST = [
  'Gdzie jest kontekst? (lokalnie vs. w edytorze)',
  'Czy potrzebujesz pracy w tle lub równolegle?',
  'Czy potrzebujesz izolacji zmian (worktree vs. lokalny projekt)?',
  'Czy zadanie wymaga niestandardowych integracji?',
  'Jak będziesz weryfikować wynik?',
] as const;

const WORKTREE_COMPARE = [
  {
    title: 'Local',
    description: 'Pracujesz w bieżącym projekcie; zmiany od razu w Twoim repo.',
  },
  {
    title: 'Worktree',
    description: 'Izolowana kopia projektu; bez konfliktu z lokalnym WIP.',
  },
] as const;

const CLI_COMMAND_GROUPS = [
  {
    title: 'Non-interactive',
    commands: ['codex exec', 'codex cloud', 'codex apply'],
  },
  {
    title: 'Sesje',
    commands: ['codex resume', 'codex fork'],
  },
  {
    title: 'Integracje',
    commands: ['codex mcp', 'codex mcp-server', 'codex app-server'],
  },
  {
    title: 'Narzędzia',
    commands: [
      'codex completion',
      'codex sandbox',
      'codex execpolicy',
      'codex features',
      'codex app',
      'codex login/logout',
      'codex debug app-server',
    ],
  },
] as const;

const EXEC_MODE_FLAGS = [
  '--skip-git-repo-check',
  '--output-schema',
  '--json',
  '--output-last-message',
  '--ephemeral',
] as const;

const CLOUD_MODE_FLAGS = ['cloud exec --env <ENV_ID>', 'cloud exec --attempts 3', 'cloud list --json'] as const;

const CLI_GLOBAL_FLAGS = [
  { title: '-a / --ask-for-approval', description: 'Ustaw policy: untrusted | on-request | never.' },
  { title: '-s / --sandbox', description: 'Tryb: read-only | workspace-write | danger-full-access.' },
  { title: '--full-auto', description: 'Skrót: on-request + workspace-write.' },
  { title: '--yolo', description: 'Omija approvals i sandbox (tylko w izolacji).' },
  { title: '--add-dir', description: 'Dodaje dodatkowe writable roots.' },
  { title: '-C / --cd', description: 'Start w wybranym katalogu projektu.' },
  { title: '-m / --model', description: 'Wymuś konkretny model dla sesji.' },
  { title: '--search', description: 'Włącza live web search w sesji.' },
  { title: '-i / --image', description: 'Dołącza obrazy do pierwszego promptu.' },
  { title: '--no-alt-screen', description: 'Zachowuje scrollback w terminalu.' },
] as const;

const CLI_TIPS = [
  'Tab kolejkuje follow-up podczas pracy, Enter wstrzykuje instrukcję do bieżącej tury.',
  '`@` uruchamia file search, a `!` wykonuje lokalną komendę z outputem w rozmowie.',
  '`--cd` i `--add-dir` pomagają ustawić scope workspace przed startem.',
  'Aktywuj autouzupełnianie: `codex completion zsh|bash|fish`.',
] as const;

const SURFACE_DECISION_EXAMPLE = `Surface choice:
- Need open-file context? -> IDE Extension
- Need long-running or parallel? -> App / Cloud
- Need tight local loop? -> CLI
- Need custom tools? -> API harness`;

const LessonCodeBlock = ({
  title,
  code,
}: {
  title?: string;
  code: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='emerald'
    className='border-emerald-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
  </KangurLessonInset>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  surfaces: [
    {
      title: 'Wybór powierzchni pracy',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Codex działa na różnych powierzchniach. Wybór zależy od tego, gdzie jest
            kontekst i jak długo potrwa zadanie.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption='Wybierz powierzchnię, która daje najwięcej kontekstu.'
            maxWidthClassName='max-w-full'
          >
            <AgenticSurfacePickerAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {SURFACES.map((item) => (
              <KangurLessonInset key={item.title} accent='emerald'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-emerald-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kiedy wybrać konkretny tryb',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najprościej: wybierz powierzchnię, która minimalizuje tarcie w Twoim
            workflow i maksymalizuje kontekst.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            {CHOOSE_WHEN.map((item) => (
              <KangurLessonCallout key={item.title} accent='emerald' padding='sm' className='text-left'>
                <p className='text-sm font-semibold text-emerald-950'>{item.title}</p>
                <KangurLessonCaption className='mt-2 text-emerald-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Checklist do decyzji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli nie wiesz od czego zacząć, przejdź przez krótką checklistę.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-emerald-950'>
              {CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <LessonCodeBlock title='Surface decision' code={SURFACE_DECISION_EXAMPLE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Worktree vs Local',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            W Codex app możesz uruchamiać wątki na lokalnym projekcie albo w izolowanym
            worktree. To najprostszy sposób na uniknięcie konfliktów.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {WORKTREE_COMPARE.map((item) => (
              <KangurLessonInset key={item.title} accent='emerald'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-emerald-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jaka powierzchnia najlepiej pasuje do długiego zadania i pracy w tle?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='emerald'
            question='Wybierz najlepszą powierzchnię.'
            choices={[
              { id: 'a', label: 'CLI' },
              { id: 'b', label: 'App / Cloud', correct: true },
              { id: 'c', label: 'IDE Extension' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
  cli: [
    {
      title: 'Codex CLI = centrum sterowania',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            CLI to najszybsza droga do agentic coding w repo. Masz pełną kontrolę nad
            kontekstem, sesjami i integracjami.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption='Komendy CLI pokrywają run, review, integracje i narzędzia pomocnicze.'
            maxWidthClassName='max-w-full'
          >
            <AgenticCodexCliCommandMapAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <KangurLessonCaption className='text-emerald-950'>
              CLI łączy tryb interaktywny z batch workflow (exec/review/apply) i zarządzaniem sesjami.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mapa komend',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Podziel komendy na cztery bloki: non-interactive, sesje, integracje i narzędzia.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            {CLI_COMMAND_GROUPS.map((group) => (
              <KangurLessonCallout key={group.title} accent='emerald' padding='sm' className='text-left'>
                <p className='text-sm font-semibold text-emerald-950'>{group.title}</p>
                <ul className='mt-2 space-y-1 text-xs text-emerald-950'>
                  {group.commands.map((command) => (
                    <li key={command}>
                      <code>{command}</code>
                    </li>
                  ))}
                </ul>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Exec, Cloud, Apply: tryby batch',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Batch workflow przyspiesza powtarzalne zadania. Użyj exec do pracy lokalnej,
            cloud do uruchomień w tle, a apply do przeniesienia diffu.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
            <KangurLessonInset accent='emerald'>
              <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                codex exec
              </div>
              <ul className='mt-2 space-y-1 text-xs text-emerald-950'>
                {EXEC_MODE_FLAGS.map((flag) => (
                  <li key={flag}>
                    <code>{flag}</code>
                  </li>
                ))}
              </ul>
            </KangurLessonInset>
            <KangurLessonInset accent='emerald'>
              <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                codex cloud
              </div>
              <ul className='mt-2 space-y-1 text-xs text-emerald-950'>
                {CLOUD_MODE_FLAGS.map((flag) => (
                  <li key={flag}>
                    <code>{flag}</code>
                  </li>
                ))}
              </ul>
            </KangurLessonInset>
            <KangurLessonInset accent='emerald'>
              <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                codex apply
              </div>
              <KangurLessonCaption className='mt-2 text-emerald-950'>
                Użyj <code>codex apply &lt;TASK_ID&gt;</code>, aby nałożyć diff z zadania cloud.
              </KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Global flags i tipy interaktywne',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Globalne flagi odpowiadają za kontekst, model i ergonomię. Tipy interaktywne
            minimalizują tarcie w dłuższych sesjach.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {CLI_GLOBAL_FLAGS.map((flag) => (
              <KangurLessonInset key={flag.title} accent='emerald'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                  {flag.title}
                </div>
                <KangurLessonCaption className='mt-2 text-emerald-950'>
                  {flag.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonVisual
            accent='emerald'
            caption='Kolejkuj wiadomości bez przerywania bieżącego zadania.'
            maxWidthClassName='max-w-full'
          >
            <AgenticCliQueueTipAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-emerald-950'>
              {CLI_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
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
    id: 'surfaces',
    emoji: '🧩',
    title: 'Surfaces',
    description: 'CLI, IDE, Cloud i API - wybierz najlepszą powierzchnię.',
    slideCount: SLIDES.surfaces.length,
  },
  {
    id: 'cli',
    emoji: '⌨️',
    title: 'Codex CLI',
    description: 'Komendy, flagi i tipy, które przyspieszają pracę.',
    slideCount: SLIDES.cli.length,
  },
] as const;
