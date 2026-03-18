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
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'app_workflows';

const LOCAL_VS_WORKTREE = [
  {
    title: 'Local',
    description: 'Pracujesz w bieżącym projekcie; zmiany od razu w repo.',
  },
  {
    title: 'Worktree',
    description: 'Izolowana kopia repo, idealna do równoległych wątków.',
  },
  {
    title: 'Cloud',
    description: 'Tryb zdalny w Codex app, gdy nie potrzebujesz lokalnego checkoutu.',
  },
] as const;

const GIT_TOOLS = [
  'Diff pane pokazuje zmiany i pozwala dodawać inline komentarze.',
  'Możesz stage/revertować pojedyncze chunki lub całe pliki.',
  'Commit, push i tworzenie PR-ów działają bez opuszczania app.',
  'Zaawansowane operacje Git robisz w wbudowanym terminalu.',
] as const;

const TERMINAL_TIPS = [
  'Każdy wątek ma terminal przypięty do projektu lub worktree.',
  'Terminal służy do uruchamiania skryptów i walidacji zmian.',
  'Codex może czytać output terminala i reagować na błędy.',
] as const;

const AUTOMATION_FLOW = [
  'Automations działają w tle - app musi być uruchomiona.',
  'Możesz łączyć automations ze skills.',
  'Automations w repo Git działają w dedykowanych worktree.',
  'Model i reasoning mogą zostać domyślne lub wybrane ręcznie.',
] as const;

const SYNC_FEATURES = [
  'Synchronizacja wątków między app i IDE extension.',
  'Auto-context współdzielony między powierzchniami.',
  'Łatwe przełączanie się między wątkami i projektami.',
] as const;

const APP_SERVER_FEATURES = [
  '`codex app-server` uruchamia lokalny App Server do custom UI/harness.',
  'API obejmuje m.in. `thread/*`, `turn/start`, `turn/steer`, `review/start`, `command/exec`.',
  'Event stream (`thread/*`, `turn/*`, `item/*`) pozwala renderować postęp na żywo.',
] as const;

const AUTOMATION_PROMPT_EXAMPLE = `Automation: Nightly quality scan
Schedule: 02:00 Mon-Fri
Goal: Run "npm run lint" and summarize warnings
Constraints: Read-only, no code changes
Done when: Summary + attached logs`;

const APP_SERVER_EXAMPLE = `codex app-server`;

const WorktreeSplitVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: repo główne z lokalnym wątkiem i worktree.'
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
      .line {
        stroke: #94a3b8;
        stroke-width: 2;
        fill: none;
      }
      .highlight {
        stroke: #14b8a6;
      }
    `}</style>
    <rect className='panel' height='40' rx='12' width='140' x='110' y='20' />
    <text className='label' x='148' y='44'>Main repo</text>
    <path className='line' d='M180 60 V84' />
    <path className='line' d='M180 84 H80' />
    <path className='line highlight' d='M180 84 H280' />
    <rect className='panel' height='40' rx='12' width='120' x='20' y='92' />
    <rect className='panel' height='40' rx='12' width='120' x='220' y='92' />
    <text className='label' x='48' y='116'>Local</text>
    <text className='label' x='244' y='116'>Worktree</text>
  </svg>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  app_workflows: [
    {
      title: 'Worktree = izolacja zmian',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Codex app pozwala uruchamiać wątki w trybie Local, Worktree lub Cloud.
            Worktree to najprostsza ochrona przed konfliktami zmian.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Worktree daje bezpieczną izolację zmian.'
            maxWidthClassName='max-w-full'
          >
            <WorktreeSplitVisual />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
            {LOCAL_VS_WORKTREE.map((item) => (
              <KangurLessonInset key={item.title} accent='teal'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-teal-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-teal-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Built-in Git tools',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            App ma wbudowane narzędzia Git, które przyspieszają review i commitowanie.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {GIT_TOOLS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Wbudowany terminal',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Terminal w wątku pozwala uruchamiać skrypty i szybko walidować zmiany bez
            przełączania kontekstu.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {TERMINAL_TIPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Automations w Codex app',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Automations uruchamiają powtarzalne zadania w tle. Najpierw przetestuj
            prompt manualnie, potem ustaw harmonogram.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {AUTOMATION_FLOW.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='teal'
            title='Przykład automation'
            code={AUTOMATION_PROMPT_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Sync z IDE extension',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Wątki i auto-context mogą być współdzielone pomiędzy app i IDE extension.
            To dobry sposób na płynne przełączanie się między trybami.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {SYNC_FEATURES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'App Server jako własny harness',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy potrzebujesz własnej UI lub integracji, App Server daje pełny dostęp do
            wątków, turnów i eventów.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {APP_SERVER_FEATURES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='teal'
            title='Start lokalnego App Servera'
            code={APP_SERVER_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy najlepiej użyć worktree w Codex app?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='teal'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy chcesz izolować równoległy wątek.', correct: true },
              { id: 'b', label: 'Gdy potrzebujesz edytować README.' },
              { id: 'c', label: 'Gdy masz tylko jeden prosty fix.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Worktree Split',
      content: <AgenticCodingMiniGame gameId='app_workflows' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'app_workflows',
    emoji: '🧵',
    title: 'Codex App',
    description: 'Worktrees, automations i Git tools w aplikacji.',
    slideCount: SLIDES.app_workflows.length,
  },
] as const;
