import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
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
import { useId } from 'react';

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
  { title: 'profile', description: 'Domyślny profil startowy (jak `--profile`).' },
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

export const ConfigLayersVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-config-layers-${baseId}-clip`;
  const panelGradientId = `agentic-config-layers-${baseId}-panel`;
  const frameGradientId = `agentic-config-layers-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: warstwy konfiguracji (user, project).'
      className='h-auto w-full'
      data-testid='agentic-config-layers-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='130' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='342'
          y1='16'
          y2='138'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='52%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#f1f5f9' />
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
          <stop offset='50%' stopColor='rgba(96,165,250,0.8)' />
          <stop offset='100%' stopColor='rgba(148,163,184,0.82)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-config-layers-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='130'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(148,163,184,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='88' cy='34' rx='76' ry='18' fill='rgba(148,163,184,0.14)' />
        <ellipse cx='280' cy='40' rx='68' ry='18' fill='rgba(96,165,250,0.12)' />
        <ellipse cx='182' cy='126' rx='96' ry='22' fill='rgba(148,163,184,0.1)' />

        <rect
          x='70'
          y='26'
          width='220'
          height='36'
          rx='14'
          fill='rgba(255,255,255,0.9)'
          stroke='#cbd5e1'
          strokeWidth='2'
        />
        <rect
          x='70'
          y='82'
          width='220'
          height='36'
          rx='14'
          fill='rgba(239,246,255,0.92)'
          stroke='#93c5fd'
          strokeWidth='2'
        />
        <rect x='86' y='38' width='44' height='8' rx='4' fill='rgba(148,163,184,0.18)' />
        <rect x='86' y='94' width='52' height='8' rx='4' fill='rgba(96,165,250,0.18)' />
        <circle cx='266' cy='44' r='7' fill='rgba(148,163,184,0.18)' />
        <circle cx='266' cy='100' r='7' fill='rgba(96,165,250,0.18)' />
        <line x1='180' y1='62' x2='180' y2='82' stroke='#94a3b8' strokeWidth='3' strokeLinecap='round' />
        <polygon points='180,82 174,72 186,72' fill='#94a3b8' />

        <text x='108' y='48' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>
          User config
        </text>
        <text x='98' y='104' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>
          Project config
        </text>
      </g>

      <rect
        x='18'
        y='18'
        width='324'
        height='114'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-config-layers-frame'
      />
    </svg>
  );
};

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
            supportingContent={
              <div className='space-y-4'>
                <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
                  {CONFIG_LAYERS.map((item) => (
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
                <ul className='space-y-2 text-sm text-slate-950'>
                  {CONFIG_LAYER_NOTES.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            }
          >
            <ConfigLayersVisual />
          </KangurLessonVisual>
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
            Profile pozwalają trzymać różne konfiguracje w jednym miejscu.
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
      title: 'Przykład configu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Traktuj profile jako bezpieczne presety. Następnie odpalaj Codex z
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
