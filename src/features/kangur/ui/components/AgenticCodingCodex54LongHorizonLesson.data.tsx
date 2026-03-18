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

const MilestoneBoardVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: tablica milestone (spec, build, verify).'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 150'
  >
    <style>{`
      .col {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .card {
        fill: #e0f2fe;
        stroke: #38bdf8;
        stroke-width: 1.5;
      }
    `}</style>
    <rect className='col' height='110' rx='12' width='96' x='20' y='20' />
    <rect className='col' height='110' rx='12' width='96' x='132' y='20' />
    <rect className='col' height='110' rx='12' width='96' x='244' y='20' />
    <text className='label' x='44' y='42'>Spec</text>
    <text className='label' x='152' y='42'>Build</text>
    <text className='label' x='262' y='42'>Verify</text>
    <rect className='card' height='20' rx='6' width='72' x='32' y='54' />
    <rect className='card' height='20' rx='6' width='72' x='144' y='54' />
    <rect className='card' height='20' rx='6' width='72' x='256' y='54' />
    <rect className='card' height='20' rx='6' width='72' x='144' y='82' />
  </svg>
);

const HorizonLoopVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: pętla plan -> execute -> verify -> report.'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 160'
  >
    <style>{`
      .node {
        fill: #e0f2fe;
        stroke: #7dd3fc;
        stroke-width: 2;
      }
      .label {
        font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .arrow {
        stroke: #38bdf8;
        stroke-width: 2;
        fill: none;
      }
    `}</style>
    <defs>
      <marker id='arrow-head' markerHeight='6' markerWidth='6' orient='auto' refX='5' refY='3'>
        <path d='M0,0 L6,3 L0,6 Z' fill='#38bdf8' />
      </marker>
    </defs>
    <circle className='node' cx='90' cy='45' r='22' />
    <circle className='node' cx='270' cy='45' r='22' />
    <circle className='node' cx='270' cy='115' r='22' />
    <circle className='node' cx='90' cy='115' r='22' />
    <text className='label' x='74' y='48'>Plan</text>
    <text className='label' x='252' y='48'>Execute</text>
    <text className='label' x='254' y='118'>Verify</text>
    <text className='label' x='70' y='118'>Report</text>
    <path className='arrow' d='M112 45 H248' markerEnd='url(#arrow-head)' />
    <path className='arrow' d='M270 68 V93' markerEnd='url(#arrow-head)' />
    <path className='arrow' d='M248 115 H112' markerEnd='url(#arrow-head)' />
    <path className='arrow' d='M90 92 V67' markerEnd='url(#arrow-head)' />
  </svg>
);

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
