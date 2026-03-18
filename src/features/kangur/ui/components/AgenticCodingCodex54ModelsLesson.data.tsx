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
  AgenticModelSelectorAnimation,
  AgenticRoutingDialAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'models';

const MODEL_FACTORS = [
  { title: 'Speed', description: 'Szybkie iteracje, krótkie zadania, mały scope.' },
  { title: 'Cost', description: 'Im większy reasoning, tym wyższy koszt i czas.' },
  { title: 'Depth', description: 'Złożone decyzje, trudne edge-case, architektura.' },
] as const;

const REASONING_LEVELS = [
  { title: 'Low', description: 'Proste poprawki, quick fixes, drobne PR-y.' },
  { title: 'Medium', description: 'Większość zadań produktowych i refactorów.' },
  { title: 'High', description: 'Złożone debugowanie i nowe architektury.' },
  { title: 'XHigh', description: 'Najtrudniejsze, ryzykowne lub długie zadania.' },
] as const;

const REASONING_TRIGGERS = [
  'Spec jest niepełny lub pojawiają się sprzeczne wymagania.',
  'Zadanie dotyka krytycznych ścieżek lub danych.',
  'Koszt regresji jest wysoki albo brak testów.',
] as const;

const ROUTING_RULES = [
  'Zacznij od medium i zwiększ reasoning, gdy pojawia się niepewność.',
  'Dla Q&A i szybkich zmian wybierz szybszy model.',
  'Dla refactorów lub migracji ustaw wyższy reasoning.',
  'Gdy koszt jest problemem, rozbij zadanie na mniejsze iteracje.',
] as const;

const REASONING_BEST_PRACTICES = [
  'Unikaj promptów typu "think step by step" - modele reasoning robią to same.',
  'Stosuj wyraźne sekcje i delimitery (np. markdown, XML) dla lepszej czytelności.',
] as const;

const ROUTING_PLAYBOOK = [
  'Quick fix: fast model + low reasoning.',
  'Product work: balanced model + medium reasoning.',
  'System refactor: balanced/deep + high reasoning.',
  'Architecture: deep model + xhigh reasoning.',
] as const;

const MODEL_DECISION_TEMPLATE = `task: "Refactor caching layer"
model_tier: balanced
reasoning: medium
escalate_when:
  - unknowns remain after 2 iterations
  - architecture decision needed
cost_guard: split into 2 smaller tasks if needed`;

const ROUTING_PLAYBOOK_TEMPLATE = `routing:
  quick_fix:
    model: fast
    reasoning: low
  product_work:
    model: balanced
    reasoning: medium
  refactor:
    model: balanced
    reasoning: high
  architecture:
    model: deep
    reasoning: xhigh`;

const ROUTING_CARD_EXAMPLE = `Routing card
Task: uporządkowanie retry logic w webhookach
Model: balanced
Reasoning: high
Budget: 2 iteracje, max 90 min
Done when: testy + krótki plan rollout`;

const ModelDecisionMatrixVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: matryca wyboru modelu (speed vs depth).'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 160'
  >
    <style>{`
      .axis {
        stroke: #cbd5f5;
        stroke-width: 2;
      }
      .cell {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 1.5;
      }
      .label {
        font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .muted {
        font: 600 8px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #64748b;
      }
    `}</style>
    <line className='axis' x1='60' x2='300' y1='80' y2='80' />
    <line className='axis' x1='180' x2='180' y1='30' y2='130' />
    <rect className='cell' height='44' rx='10' width='110' x='70' y='34' />
    <rect className='cell' height='44' rx='10' width='110' x='190' y='34' />
    <rect className='cell' height='44' rx='10' width='110' x='70' y='82' />
    <rect className='cell' height='44' rx='10' width='110' x='190' y='82' />
    <text className='label' x='84' y='58'>Bugfix</text>
    <text className='muted' x='84' y='70'>Fast + Low</text>
    <text className='label' x='204' y='58'>Refactor</text>
    <text className='muted' x='204' y='70'>Balanced</text>
    <text className='label' x='84' y='106'>Investigation</text>
    <text className='muted' x='84' y='118'>Medium/High</text>
    <text className='label' x='204' y='106'>Architecture</text>
    <text className='muted' x='204' y='118'>High/XHigh</text>
    <text className='muted' x='62' y='24'>Speed</text>
    <text className='muted' x='268' y='24'>Depth</text>
  </svg>
);

const ReasoningRampVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: ramping reasoning od low do xhigh.'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 140'
  >
    <style>{`
      .bar {
        fill: #ccfbf1;
        stroke: #5eead4;
        stroke-width: 2;
      }
      .bar-2 { fill: #99f6e4; }
      .bar-3 { fill: #5eead4; }
      .bar-4 { fill: #2dd4bf; }
      .label {
        font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .axis {
        stroke: #94a3b8;
        stroke-width: 2;
      }
      .muted {
        font: 600 8px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #64748b;
      }
    `}</style>
    <line className='axis' x1='50' x2='300' y1='112' y2='112' />
    <rect className='bar' height='28' rx='8' width='48' x='70' y='84' />
    <rect className='bar bar-2' height='44' rx='8' width='48' x='130' y='68' />
    <rect className='bar bar-3' height='60' rx='8' width='48' x='190' y='52' />
    <rect className='bar bar-4' height='76' rx='8' width='48' x='250' y='36' />
    <text className='label' x='78' y='124'>Low</text>
    <text className='label' x='128' y='124'>Medium</text>
    <text className='label' x='196' y='124'>High</text>
    <text className='label' x='248' y='124'>XHigh</text>
    <text className='muted' x='50' y='24'>Cost / Time</text>
  </svg>
);

const LessonCodeBlock = ({
  title,
  code,
}: {
  title?: string;
  code: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='teal'
    className='border-teal-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
  </KangurLessonInset>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  models: [
    {
      title: 'Dobór modelu to trade-off',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Nie ma jednego idealnego modelu. Dobierasz go do szybkości, kosztu i głębi
            rozumowania potrzebnej w zadaniu.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Szybkość i reasoning zawsze są w napięciu.'
            maxWidthClassName='max-w-full'
          >
            <AgenticModelSelectorAnimation />
          </KangurLessonVisual>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-3`}>
            {MODEL_FACTORS.map((item) => (
              <KangurLessonInset key={item.title} accent='teal'>
                <p className='text-sm font-semibold text-teal-950'>{item.title}</p>
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
      title: 'Poziomy reasoning',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Reasoning levels to prosta dźwignia jakości. Używaj ich świadomie.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {REASONING_LEVELS.map((item) => (
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
      title: 'Reasoning ramp',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Podnoś reasoning tylko wtedy, gdy rośnie ryzyko lub niepewność.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Wyższy reasoning = więcej czasu i kosztu, ale też więcej kontroli.'
            maxWidthClassName='max-w-full'
          >
            <ReasoningRampVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {REASONING_TRIGGERS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Matryca decyzji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Prosta matryca pozwala dopasować model do typu zadania bez zgadywania.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Speed vs Depth mapuje się na typ pracy.'
            maxWidthClassName='max-w-full'
          >
            <ModelDecisionMatrixVisual />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Routing heuristics',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kilka szybkich reguł pozwala dobrać model bez zgadywania.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {ROUTING_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Routing playbook',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Spisz playbook decyzji, żeby zespół wybierał modele spójnie i bez dyskusji
            o każdym zadaniu.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Speed i depth to najczęstsza dźwignia routingowa.'
            maxWidthClassName='max-w-full'
          >
            <AgenticRoutingDialAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {ROUTING_PLAYBOOK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <LessonCodeBlock title='Routing playbook' code={ROUTING_PLAYBOOK_TEMPLATE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Szablon wyboru modelu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zapisz decyzję o modelu w jednym miejscu - to przyspiesza współpracę.
          </KangurLessonLead>
          <LessonCodeBlock title='Model decision template' code={MODEL_DECISION_TEMPLATE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Routing card',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Routing card trzyma decyzję o modelu i reasoning w jednym miejscu.
          </KangurLessonLead>
          <LessonCodeBlock title='Routing card' code={ROUTING_CARD_EXAMPLE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Reasoning best practices',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Modele reasoning najlepiej reagują na krótkie, jasno podzielone prompty.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {REASONING_BEST_PRACTICES.map((item) => (
                <li key={item}>{item}</li>
              ))}
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
            Kiedy zwiększasz reasoning?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='teal'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy zadanie jest niejasne lub ryzykowne.', correct: true },
              { id: 'b', label: 'Gdy chcesz najniższy koszt.' },
              { id: 'c', label: 'Zawsze zostajesz przy low.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'models',
    emoji: '🧠',
    title: 'Models & Reasoning',
    description: 'Trade-off między szybkością, kosztem i głębią.',
    slideCount: SLIDES.models.length,
  },
] as const;
