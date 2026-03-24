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
import { AgenticMilestoneTimelineAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import { useId } from 'react';

type SectionId = 'long_horizon';

const CHECKPOINTS = [
  'Spec i scope zatwierdzone przed startem.',
  'Milestone z mierzalnym rezultatem co 1-2 dni.',
  'Każdy milestone kończy się dowodem (testy lub demo).',
  'Ryzyka i decyzje zapisane na bieżąco.',
] as const;

const DRIFT_CONTROLS = [
  { title: 'Plan sync', description: 'Krótki update po każdym dużym kroku.' },
  { title: 'Scope guard', description: 'Każdy nowy pomysł musi mieć uzasadnienie.' },
  { title: 'Proof gate', description: 'Bez testów lub logów nie ma akceptacji.' },
  { title: 'Rollback', description: 'Plan cofnięcia przy ryzyku regresji.' },
] as const;

const CADENCE_RULES = [
  'Każdy checkpoint kończy się krótkim raportem.',
  'Blokery i ryzyka zapisuj od razu.',
  'Zamykaj etap dopiero po dowodzie.',
] as const;

const MILESTONE_TEMPLATE = `Milestone: Payments refactor
Goal: Replace legacy retry flow
Proof: jest tests + integration logs
Risks: double-charge edge cases
Next: Ship to staging, monitor errors`;

const CHECKPOINT_UPDATE_TEMPLATE = `Checkpoint update
Milestone: API parity (2/4)
Status: 80% complete
Evidence: testy integracyjne + demo na staging
Risks: brak danych prod do pełnej walidacji
Next: migracja feature flag + rollout plan`;

export const MilestoneBoardVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-milestone-board-${baseId}-clip`;
  const panelGradientId = `agentic-milestone-board-${baseId}-panel`;
  const frameGradientId = `agentic-milestone-board-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: tablica milestone (spec, build, verify).'
      className='h-auto w-full'
      data-testid='agentic-milestone-board-animation'
      role='img'
      viewBox='0 0 360 170'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='150' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='342'
          y1='16'
          y2='158'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f0f9ff' />
          <stop offset='52%' stopColor='#e0f2fe' />
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
          <stop offset='0%' stopColor='rgba(56,189,248,0.82)' />
          <stop offset='50%' stopColor='rgba(125,211,252,0.82)' />
          <stop offset='100%' stopColor='rgba(59,130,246,0.8)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-milestone-board-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='150'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(56,189,248,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='82' cy='30' rx='72' ry='18' fill='rgba(125,211,252,0.16)' />
        <ellipse cx='282' cy='34' rx='70' ry='18' fill='rgba(59,130,246,0.12)' />
        <ellipse cx='204' cy='146' rx='102' ry='24' fill='rgba(56,189,248,0.1)' />

        {[
          ['Spec', 20],
          ['Build', 132],
          ['Verify', 244],
        ].map(([label, x]) => (
          <g key={label}>
            <rect
              x={Number(x)}
              y='24'
              width='96'
              height='116'
              rx='16'
              fill='rgba(255,255,255,0.86)'
              stroke='#cbd5e1'
              strokeWidth='2'
            />
            <rect x={Number(x) + 14} y='36' width='28' height='8' rx='4' fill='rgba(56,189,248,0.18)' />
            <text x={Number(x) + 24} y='50' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>
              {label}
            </text>
          </g>
        ))}
        {[
          [32, 58],
          [144, 58],
          [256, 58],
          [144, 86],
        ].map(([x, y], index) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width='72' height='20' rx='8' fill='rgba(224,242,254,0.96)' stroke='#38bdf8' strokeWidth='1.5' />
            <rect x={x + 10} y={y + 6} width={index === 1 ? 32 : 24} height='6' rx='3' fill='rgba(56,189,248,0.18)' />
          </g>
        ))}
      </g>

      <rect
        x='18'
        y='18'
        width='324'
        height='134'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-milestone-board-frame'
      />
    </svg>
  );
};

export const HorizonLoopVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-horizon-loop-${baseId}-clip`;
  const panelGradientId = `agentic-horizon-loop-${baseId}-panel`;
  const frameGradientId = `agentic-horizon-loop-${baseId}-frame`;
  const markerId = `agentic-horizon-loop-${baseId}-arrow-head`;

  return (
    <svg
      aria-label='Diagram: pętla plan -> execute -> verify -> report.'
      className='h-auto w-full'
      data-testid='agentic-horizon-loop-animation'
      role='img'
      viewBox='0 0 360 180'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='160' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='342'
          y1='16'
          y2='168'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f0f9ff' />
          <stop offset='52%' stopColor='#e0f2fe' />
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
          <stop offset='0%' stopColor='rgba(56,189,248,0.82)' />
          <stop offset='50%' stopColor='rgba(14,165,233,0.82)' />
          <stop offset='100%' stopColor='rgba(59,130,246,0.8)' />
        </linearGradient>
        <marker id={markerId} markerHeight='6' markerWidth='6' orient='auto' refX='5' refY='3'>
          <path d='M0,0 L6,3 L0,6 Z' fill='#38bdf8' />
        </marker>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-horizon-loop-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='160'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(56,189,248,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='82' cy='30' rx='72' ry='18' fill='rgba(125,211,252,0.16)' />
        <ellipse cx='286' cy='38' rx='72' ry='18' fill='rgba(56,189,248,0.12)' />
        <ellipse cx='222' cy='150' rx='102' ry='22' fill='rgba(59,130,246,0.1)' />

        <path d='M112 54 H248' stroke='#38bdf8' strokeWidth='2.5' fill='none' markerEnd={`url(#${markerId})`} />
        <path d='M270 76 V103' stroke='#38bdf8' strokeWidth='2.5' fill='none' markerEnd={`url(#${markerId})`} />
        <path d='M248 125 H112' stroke='#38bdf8' strokeWidth='2.5' fill='none' markerEnd={`url(#${markerId})`} />
        <path d='M90 104 V77' stroke='#38bdf8' strokeWidth='2.5' fill='none' markerEnd={`url(#${markerId})`} />

        {[
          ['Plan', 90, 54],
          ['Execute', 270, 54],
          ['Verify', 270, 125],
          ['Report', 90, 125],
        ].map(([label, cx, cy]) => (
          <g key={label}>
            <circle cx={cx} cy={cy} r='24' fill='rgba(224,242,254,0.96)' stroke='#7dd3fc' strokeWidth='2' />
            <circle cx={cx} cy={cy} r='14' fill='rgba(255,255,255,0.52)' />
            <text x={Number(cx) - (label === 'Execute' ? 18 : label === 'Report' ? 17 : 13)} y={Number(cy) + 3} fontSize='9' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>
              {label}
            </text>
          </g>
        ))}
      </g>

      <rect
        x='18'
        y='18'
        width='324'
        height='144'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-horizon-loop-frame'
      />
    </svg>
  );
};

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  long_horizon: [
    {
      title: 'Long-horizon = checkpoints',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Długie zadania potrzebują checkpointów, inaczej agent traci kierunek i
            trudno ocenić postęp.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Milestones utrzymują tempo i kontrolę jakości.'
            maxWidthClassName='max-w-full'
          >
            <AgenticMilestoneTimelineAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {CHECKPOINTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Spec i milestones',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Spec opisuje cel, milestone opisuje dowód. Dzięki temu łatwo kontrolować
            jakość i koszt.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {DRIFT_CONTROLS.map((item) => (
              <KangurLessonInset key={item.title} accent='sky'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-sky-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-sky-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Milestone board',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Widoczny board z checkpointami ułatwia kontrolę kosztu i jakości.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Spec → Build → Verify w rytmie milestone.'
            maxWidthClassName='max-w-full'
          >
            <MilestoneBoardVisual />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Cadence loop',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Długi projekt trzyma tempo, gdy powtarzasz cykl plan → execute → verify → report.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Każda pętla kończy się raportem i decyzją o następnym kroku.'
            maxWidthClassName='max-w-full'
          >
            <HorizonLoopVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {CADENCE_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Szablon milestone',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeden krótki format wystarczy, aby kontrolować drift w długich zadaniach.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='sky'
            title='Milestone template'
            code={MILESTONE_TEMPLATE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Checkpoint update',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Krótki update po każdym milestone skraca feedback loop i chroni przed dryfem.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='sky'
            title='Milestone update'
            code={CHECKPOINT_UPDATE_TEMPLATE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Drift control',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Drift pojawia się, gdy agent ma zbyt duży scope. Ogranicz go przez
            checkpointy i wymagaj proofu.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              <li>Resetuj scope, gdy pojawiają się nowe cele.</li>
              <li>Oddziel eksplorację od implementacji.</li>
              <li>Wymagaj dowodów przed kolejnym krokiem.</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Po co wprowadzasz milestone w długim zadaniu?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='sky'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Aby mieć dowód postępu i checkpoint jakości.', correct: true },
              { id: 'b', label: 'Aby wydłużyć task i dodać więcej pracy.' },
              { id: 'c', label: 'Aby uniknąć testów.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Milestone Flow',
      content: <AgenticCodingMiniGame gameId='long_horizon' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'long_horizon',
    emoji: '🛰️',
    title: 'Long-Horizon',
    description: 'Spec, milestones i kontrola dryfu.',
    slideCount: SLIDES.long_horizon.length,
  },
] as const;
