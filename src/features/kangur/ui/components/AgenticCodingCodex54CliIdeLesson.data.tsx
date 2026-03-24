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
import {
  AgenticCliQueueTipAnimation,
  AgenticCodexCliCommandMapAnimation,
  AgenticCliIdeFlowAnimation,
  AgenticDocsStackAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'cli_ide';

const IDE_BENEFITS = [
  'Kontekst z otwartych plików = krótsze prompty.',
  'Używaj @file, aby wskazać konkretne źródło.',
  'Preview zmian bez wychodzenia z edytora.',
] as const;

const CLI_SHORTCUTS = [
  'Wpisz `@`, aby uruchomić fuzzy file search; Tab lub Enter wstawia ścieżkę.',
  'Enter podczas pracy injektuje instrukcję, a Tab kolejkuje follow-up.',
  'Prefix `!` uruchamia lokalną komendę; output respektuje approvals i sandbox.',
  'Dwukrotne `Esc` edytuje poprzednią wiadomość; kolejne `Esc` cofają w historii, Enter = fork.',
  '`codex --cd <path>` ustawia katalog roboczy bez `cd`.',
  '`--add-dir` dodaje dodatkowe writable roots.',
] as const;

const SLASH_COMMANDS = [
  { command: '/plan', description: 'Plan przed kodowaniem.' },
  { command: '/review', description: 'Review working tree po zmianach.' },
  { command: '/diff', description: 'Pokazuje git diff (także untracked).' },
  { command: '/status', description: 'Stan sesji, model, approvals, kontekst.' },
  { command: '/permissions', description: 'Przełącz tryb uprawnień i sandbox.' },
  { command: '/model', description: 'Zmień model i reasoning effort.' },
  { command: '/fast', description: 'Przełącz GPT‑5.4 Fast mode.' },
  { command: '/mcp', description: 'Lista narzędzi MCP w sesji.' },
] as const;

const CLI_FLOW_EXAMPLE = `# One-session flow
codex --cd apps/web --add-dir ./shared
/plan
/review
!npm run test:smoke`;

const QUEUE_TIPS = [
  'Tab kolejkuje następną wiadomość, gdy task trwa.',
  'Enter wstrzykuje instrukcję do bieżącej tury.',
  'Dopisuj tylko jeden konkretny krok, aby nie rozmywać scope.',
  'Gdy temat się zmienia, użyj /fork zamiast doklejania.',
] as const;

const QUEUE_EXAMPLE = `# W trakcie działania taska:
"Po tej iteracji zaktualizuj README i uruchom testy."`;

const IDE_TO_CLI_FLOW = [
  { title: 'IDE', description: 'Wybierz plik, zaznacz fragment i dodaj brief.' },
  { title: 'CLI', description: 'Uruchom plan, review i testy w jednym flow.' },
  { title: 'Review', description: 'Sprawdź diff i w razie potrzeby dopisz deltę.' },
] as const;

const CLI_FLOW_CARD = `Flow card
IDE: open src/app/editor.tsx and select the sidebar section
CLI: /plan → /review → !npm run test:smoke
Done when: diff reviewed + tests pass`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  cli_ide: [
    {
      title: 'IDE extension = kontekst bez tarcia',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            W IDE Codex widzi otwarte pliki i selekcje. Dzięki temu prompty są krótsze,
            a odpowiedzi bardziej precyzyjne.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Otwarty plik to gotowy kontekst.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <ul className='space-y-2 text-sm text-sky-950'>
                {IDE_BENEFITS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <AgenticDocsStackAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'CLI shortcuts, które oszczędzają czas',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            CLI ma kilka skrótów, które dramatycznie przyspieszają iteracje.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {CLI_SHORTCUTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mapa komend CLI',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Trzy ruchy wystarczą, żeby wejść w plan, zrobić review i uruchomić test.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='CLI = plan, review, execute w jednej ścieżce.'
            maxWidthClassName='max-w-full'
          >
            <AgenticCodexCliCommandMapAnimation />
          </KangurLessonVisual>
          <AgenticLessonCodeBlock
            accent='sky'
            title='Przykładowy flow'
            code={CLI_FLOW_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Flow IDE → CLI',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najszybszy sposób pracy: zacznij od kontekstu w IDE, a wykonanie i proof
            domknij w CLI.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='IDE daje kontekst, CLI domyka wykonanie.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
                {IDE_TO_CLI_FLOW.map((item) => (
                  <div
                    key={item.title}
                    className='rounded-2xl border border-sky-200/70 bg-white/75 px-3 py-2 text-left shadow-sm'
                  >
                    <div className='text-xs font-semibold uppercase tracking-[0.2em] text-sky-500'>
                      {item.title}
                    </div>
                    <KangurLessonCaption className='mt-2 text-sky-950'>
                      {item.description}
                    </KangurLessonCaption>
                  </div>
                ))}
              </div>
            }
          >
            <AgenticCliIdeFlowAnimation />
          </KangurLessonVisual>
          <AgenticLessonCodeBlock
            accent='sky'
            title='Flow card'
            code={CLI_FLOW_CARD}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kolejkowanie instrukcji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy task trwa, możesz dopisać kolejne kroki bez przerywania pracy agenta.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Wysyłaj kolejne instrukcje w trakcie pracy.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <ul className='space-y-2 text-sm text-sky-950'>
                {QUEUE_TIPS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <AgenticCliQueueTipAnimation />
          </KangurLessonVisual>
          <AgenticLessonCodeBlock
            accent='sky'
            title='Przykład wiadomości'
            code={QUEUE_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Slash commands na co dzień',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kilka komend daje natychmiastowy dostęp do planu, diffu i review.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {SLASH_COMMANDS.map((item) => (
              <KangurLessonInset key={item.command} accent='sky'>
                <KangurLessonChip accent='sky'>{item.command}</KangurLessonChip>
                <KangurLessonCaption className='mt-3 text-sky-950'>
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
            Co daje `/review` w Codex CLI?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='sky'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Szybki review working tree.', correct: true },
              { id: 'b', label: 'Zmianę modelu na deep.' },
              { id: 'c', label: 'Włączenie web search.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: IDE → CLI Flow',
      content: <AgenticCodingMiniGame gameId='cli_ide' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'cli_ide',
    emoji: '⌨️',
    title: 'CLI & IDE',
    description: 'Skróty, komendy i praktyczne workflow.',
    slideCount: SLIDES.cli_ide.length,
  },
] as const;
