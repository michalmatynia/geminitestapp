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
  AgenticSurfacePickerAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticDiagramFillGame from '@/features/kangur/ui/components/AgenticDiagramFillGame';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'surfaces' | 'surface_match_game';

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

const SURFACE_DECISION_EXAMPLE = `Surface choice:
- Need open-file context? -> IDE Extension
- Need long-running or parallel? -> App / Cloud
- Need tight local loop? -> CLI
- Need custom tools? -> API harness`;

const SURFACE_MATCH_STEPS = [
  'Kliknij scenariusz, aby go zaznaczyć.',
  'Wybierz powierzchnię z największym kontekstem.',
  'Sprawdź wynik i popraw routing.',
] as const;

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
          <AgenticLessonCodeBlock
            accent='emerald'
            title='Surface decision'
            code={SURFACE_DECISION_EXAMPLE}
          />
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
    {
      title: 'Mini game: Surface Match',
      content: <AgenticCodingMiniGame gameId='surfaces' />,
      panelClassName: 'w-full',
    },
    {
      title: 'Mini game: Surface Arrow',
      content: <AgenticDiagramFillGame gameId='surfaces_flow_arrow' />,
      panelClassName: 'w-full',
    },
  ],
  surface_match_game: [
    {
      title: 'Surface Match Game',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dopasuj scenariusze do właściwej powierzchni pracy Codex.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-emerald-950'>
              {SURFACE_MATCH_STEPS.map((item) => (
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
    id: 'surfaces',
    emoji: '🧩',
    title: 'Surfaces',
    description: 'CLI, IDE, Cloud i API - wybierz najlepszą powierzchnię.',
    slideCount: SLIDES.surfaces.length,
  },
  {
    id: 'surface_match_game',
    emoji: '🧭',
    title: 'Surface Match',
    description: 'Dopasuj scenariusze do właściwej powierzchni pracy.',
    isGame: true,
  },
] as const;
