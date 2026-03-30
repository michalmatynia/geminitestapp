import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { AgenticDocsStackAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'tooling';

const TOOLING_MAP = [
  { title: 'Web search', description: 'Aktualne informacje z sieci + cytaty.' },
  { title: 'File search', description: 'Wyszukiwanie w plikach i vector store.' },
  { title: 'Computer use', description: 'Operacje na UI i aplikacjach krok po kroku.' },
  { title: 'Shell', description: 'Komendy w środowisku (sandbox + allowlista).' },
  { title: 'Tool search', description: 'Ładowanie odroczonych narzędzi w runtime.' },
  { title: 'MCP servers', description: 'Zewnętrzne narzędzia jako zaufane integracje.' },
] as const;

const WEB_SEARCH_RULES = [
  'Web search dostarcza świeże dane i zwraca odpowiedzi z cytatami źródeł.',
  'Domain filtering pozwala zawęzić wyniki do listy domen.',
  'Tryb live vs cache zależy od konfiguracji - włącz live tylko gdy potrzebujesz aktualnych danych.',
  'Deep research warto łączyć z background mode dla długich zadań.',
] as const;

const FILE_SEARCH_RULES = [
  'File search działa w Responses API i przeszukuje vector store.',
  'Obsługuje wyszukiwanie semantyczne i keyword.',
  'Możesz dołączyć wyniki wyszukiwania przez `include`.',
] as const;

const COMPUTER_SHELL_RULES = [
  'Computer use służy do pracy na UI, gdy potrzebujesz akcji w aplikacji.',
  'Shell w CLI/IDE uruchamia lokalne komendy; w API korzystasz z tool calls.',
  'Uruchamiaj komendy w sandboxie, z allowlistą/denylistą i logowaniem.',
] as const;

const TOOL_SEARCH_RULES = [
  'Tool search ładuje odroczone narzędzia tylko wtedy, gdy są potrzebne.',
  'Dodaj `tool_search` do `tools` i oznacz narzędzia `defer_loading: true`.',
  'Dostępność zależy od modelu i konfiguracji - sprawdź dokumentację.',
  'Ładowanie narzędzi na końcu kontekstu pomaga utrzymać cache.',
] as const;

const TOOL_SEARCH_EXAMPLE = `tools: [
  { type: "tool_search" },
  { type: "web_search", defer_loading: true },
  { type: "file_search", defer_loading: true }
]`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  tooling: [
    {
      title: 'Mapa narzędzi',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Narzędzia rozszerzają możliwości modelu: od web search po komendy shell.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Dobór narzędzia = krótsza pętla pracy.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
                {TOOLING_MAP.map((item) => (
                  <div
                    key={item.title}
                    className='rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-2 text-left shadow-sm'
                  >
                    <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                      {item.title}
                    </div>
                    <KangurLessonCaption className='mt-2 text-slate-950'>
                      {item.description}
                    </KangurLessonCaption>
                  </div>
                ))}
              </div>
            }
          >
            <AgenticDocsStackAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Web search w praktyce',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy potrzebujesz świeżych danych, web search jest najszybszą drogą do
            weryfikowalnej odpowiedzi.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {WEB_SEARCH_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'File search & retrieval',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            File search daje agentowi dostęp do wiedzy z Twoich plików i baz danych.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {FILE_SEARCH_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Computer use + Shell',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            UI i komendy wymagają ostrożności - to najmocniejsze narzędzia w arsenale.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {COMPUTER_SHELL_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Tool search (deferred tools)',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy masz dużo narzędzi, tool search ładuje tylko te potrzebne.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {TOOL_SEARCH_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='slate'
            title='Deferred tools'
            code={TOOL_SEARCH_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Które narzędzie służy do ładowania odroczonych tooli?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='slate'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'tool_search', correct: true },
              { id: 'b', label: 'web_search', correct: false },
              { id: 'c', label: 'file_search', correct: false },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Tooling Match',
      content: <AgenticCodingMiniGame gameId='tooling' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'tooling',
    emoji: '🛠️',
    title: 'Tooling & Search',
    description: 'Web search, file search i bezpieczne narzędzia.',
    slideCount: SLIDES.tooling.length,
  },
] as const;
