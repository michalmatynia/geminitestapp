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
import AgenticDiagramFillGame from '@/features/kangur/ui/components/AgenticDiagramFillGame';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'config-layers';

const CONFIG_LAYERS = [
  { title: 'User config', description: '`~/.codex/config.toml` dla ustawien osobistych.' },
  { title: 'Project config', description: '`.codex/config.toml` dla projektu.' },
] as const;

const CONFIG_LAYER_NOTES = [
  'Projektowe warstwy wczytuja sie tylko, gdy repo jest zaufane.',
  'Dzieki temu mozesz miec inne ustawienia dla kazdego projektu.',
] as const;

const TRUST_RULES = [
  '`projects.<path>.trust_level` oznacza repo jako trusted/untrusted.',
  'Untrusted pomija projektowe warstwy `.codex/` i dziala bezpieczniej.',
] as const;

const PROFILE_KEYS = [
  { title: 'profile', description: 'Domyslny profil startowy (jak `--profile`).' },
  {
    title: 'profiles.<name>.*',
    description: 'Profilowe nadpisania dowolnych kluczy config.',
  },
] as const;

const PROFILE_NOTES = [
  'Profile pozwalaja szybko przelaczac tryb pracy (np. safe vs fast).',
  'W profilu mozesz ustawic m.in. `web_search`, approvals i sandbox.',
] as const;

const CONFIG_EXAMPLE = `# ~/.codex/config.toml
profile = "work"

[profiles.work]
web_search = "cached"
approval_policy = "on-request"
sandbox_mode = "workspace-write"`;

const ConfigLayersVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: warstwy konfiguracji (user, project).'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 140'
  >
    <style>{`
      .layer {
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
    <rect className='layer' height='32' rx='10' width='220' x='70' y='22' />
    <rect className='layer' height='32' rx='10' width='220' x='70' y='74' />
    <text className='label' x='108' y='43'>User config</text>
    <text className='label' x='98' y='95'>Project config</text>
    <path className='arrow' d='M180 54 V74' />
  </svg>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  'config-layers': [
    {
      title: 'Warstwy konfiguracji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Codex laduje konfiguracje z poziomu user i projektu. Warstwy projektu
            dzialaja tylko dla zaufanych repo.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='User config jest bazą, project config działa tylko w trusted repo.'
            maxWidthClassName='max-w-full'
          >
            <ConfigLayersVisual />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {CONFIG_LAYERS.map((item) => (
              <KangurLessonInset key={item.title} accent='slate'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-slate-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {CONFIG_LAYER_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Zaufanie repo i worktree',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Trust level decyduje, czy Codex wczyta projektowe warstwy config.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {TRUST_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Profile jako presety',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Profile pozwalaja trzymac rozne konfiguracje w jednym miejscu.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {PROFILE_KEYS.map((item) => (
              <KangurLessonInset key={item.title} accent='slate'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-slate-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {PROFILE_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przyklad configu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Traktuj profile jako bezpieczne presety. Nastepnie odpaliaj Codex z
            docelowym profilem.
          </KangurLessonLead>
          <AgenticLessonCodeBlock accent='slate' title='config.toml' code={CONFIG_EXAMPLE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy wczytywane są projektowe warstwy config?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='slate'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy repo jest oznaczone jako trusted.', correct: true },
              { id: 'b', label: 'Zawsze, niezależnie od zaufania.' },
              { id: 'c', label: 'Tylko w trybie read-only.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Config Stack',
      content: <AgenticCodingMiniGame gameId='config_layers' />,
      panelClassName: 'w-full',
    },
    {
      title: 'Mini game: Layer Sketch',
      content: <AgenticDiagramFillGame gameId='config_layers_box' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'config-layers',
    emoji: '⚙️',
    title: 'Config Layers',
    description: 'Warstwy konfiguracji i profile pracy.',
    slideCount: SLIDES['config-layers'].length,
  },
] as const;
