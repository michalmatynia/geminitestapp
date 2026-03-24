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
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import { useId } from 'react';

type SectionId = 'models' | 'reasoning_router_game';

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

const REASONING_EFFORT_GUIDE = [
  'Dostępne poziomy effort są zależne od modelu (np. none/minimal/low/medium/high/xhigh).',
  'Niższy effort = mniejsza latencja i mniej tokenów.',
  'Wyższy effort = pełniejsze rozumowanie kosztem czasu i ceny.',
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

const REASONING_ROUTER_STEPS = [
  'Kliknij zadanie, aby je zaznaczyć.',
  'Przypisz poziom reasoning, który pasuje do ryzyka.',
  'Sprawdź, czy routing jest spójny.',
] as const;

export const ModelDecisionMatrixVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-model-decision-matrix-${baseId}-clip`;
  const panelGradientId = `agentic-model-decision-matrix-${baseId}-panel`;
  const frameGradientId = `agentic-model-decision-matrix-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: matryca wyboru modelu (speed vs depth).'
      className='h-auto w-full'
      data-testid='agentic-model-decision-matrix-animation'
      role='img'
      viewBox='0 0 360 180'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='160' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='18'
          x2='342'
          y1='14'
          y2='168'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f0fdfa' />
          <stop offset='50%' stopColor='#ecfeff' />
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
          <stop offset='0%' stopColor='rgba(20,184,166,0.8)' />
          <stop offset='52%' stopColor='rgba(45,212,191,0.82)' />
          <stop offset='100%' stopColor='rgba(96,165,250,0.8)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-model-decision-matrix-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='160'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(45,212,191,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='86' cy='34' rx='74' ry='20' fill='rgba(45,212,191,0.14)' />
        <ellipse cx='286' cy='40' rx='68' ry='18' fill='rgba(96,165,250,0.12)' />
        <ellipse cx='184' cy='146' rx='96' ry='24' fill='rgba(45,212,191,0.12)' />

        <line x1='62' y1='92' x2='304' y2='92' stroke='#99f6e4' strokeWidth='3' strokeLinecap='round' />
        <polygon points='304,92 294,86 294,98' fill='#14b8a6' />
        <line x1='182' y1='138' x2='182' y2='32' stroke='#99f6e4' strokeWidth='3' strokeLinecap='round' />
        <polygon points='182,32 176,42 188,42' fill='#14b8a6' />

        <rect x='70' y='40' width='108' height='46' rx='14' fill='rgba(255,255,255,0.88)' stroke='#99f6e4' strokeWidth='2' />
        <rect x='186' y='40' width='108' height='46' rx='14' fill='rgba(255,255,255,0.88)' stroke='#5eead4' strokeWidth='2' />
        <rect x='70' y='96' width='108' height='46' rx='14' fill='rgba(255,255,255,0.88)' stroke='#2dd4bf' strokeWidth='2' />
        <rect x='186' y='96' width='108' height='46' rx='14' fill='rgba(240,253,250,0.94)' stroke='#14b8a6' strokeWidth='2' />

        <rect x='84' y='50' width='42' height='8' rx='4' fill='rgba(45,212,191,0.18)' />
        <rect x='200' y='50' width='48' height='8' rx='4' fill='rgba(20,184,166,0.18)' />
        <rect x='84' y='106' width='58' height='8' rx='4' fill='rgba(45,212,191,0.18)' />
        <rect x='200' y='106' width='60' height='8' rx='4' fill='rgba(20,184,166,0.2)' />

        <text x='84' y='68' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Bugfix</text>
        <text x='84' y='79' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>Fast + Low</text>
        <text x='200' y='68' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Refactor</text>
        <text x='200' y='79' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>Balanced</text>
        <text x='84' y='124' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Investigation</text>
        <text x='84' y='135' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>Medium/High</text>
        <text x='200' y='124' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Architecture</text>
        <text x='200' y='135' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>High/XHigh</text>
        <text x='64' y='30' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f766e'>Speed</text>
        <text x='270' y='30' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f766e'>Depth</text>
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
        data-testid='agentic-model-decision-matrix-frame'
      />
    </svg>
  );
};

export const ReasoningRampVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-reasoning-ramp-${baseId}-clip`;
  const panelGradientId = `agentic-reasoning-ramp-${baseId}-panel`;
  const frameGradientId = `agentic-reasoning-ramp-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: ramping reasoning od low do xhigh.'
      className='h-auto w-full'
      data-testid='agentic-reasoning-ramp-animation'
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
          <stop offset='0%' stopColor='#f0fdfa' />
          <stop offset='58%' stopColor='#ecfeff' />
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
          <stop offset='0%' stopColor='rgba(94,234,212,0.82)' />
          <stop offset='52%' stopColor='rgba(45,212,191,0.82)' />
          <stop offset='100%' stopColor='rgba(13,148,136,0.82)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-reasoning-ramp-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='130'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(45,212,191,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='82' cy='30' rx='76' ry='18' fill='rgba(94,234,212,0.16)' />
        <ellipse cx='286' cy='36' rx='64' ry='18' fill='rgba(45,212,191,0.14)' />
        <ellipse cx='232' cy='126' rx='92' ry='20' fill='rgba(13,148,136,0.12)' />

        <line x1='48' y1='112' x2='312' y2='112' stroke='#94a3b8' strokeWidth='2.5' strokeLinecap='round' />
        <path d='M58 112 Q 146 88 202 70 T 288 40' fill='none' stroke='rgba(45,212,191,0.36)' strokeWidth='3' strokeLinecap='round' />

        <rect x='70' y='84' width='48' height='28' rx='10' fill='rgba(204,251,241,0.92)' stroke='#5eead4' strokeWidth='2' />
        <rect x='130' y='68' width='48' height='44' rx='10' fill='rgba(153,246,228,0.94)' stroke='#2dd4bf' strokeWidth='2' />
        <rect x='190' y='52' width='48' height='60' rx='10' fill='rgba(94,234,212,0.96)' stroke='#14b8a6' strokeWidth='2' />
        <rect x='250' y='36' width='48' height='76' rx='10' fill='rgba(45,212,191,0.98)' stroke='#0d9488' strokeWidth='2' />

        <rect x='78' y='92' width='16' height='6' rx='3' fill='rgba(15,118,110,0.18)' />
        <rect x='138' y='76' width='16' height='6' rx='3' fill='rgba(15,118,110,0.18)' />
        <rect x='198' y='60' width='16' height='6' rx='3' fill='rgba(15,118,110,0.2)' />
        <rect x='258' y='44' width='16' height='6' rx='3' fill='rgba(15,118,110,0.22)' />

        <text x='78' y='126' fontSize='9' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Low</text>
        <text x='128' y='126' fontSize='9' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Medium</text>
        <text x='196' y='126' fontSize='9' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>High</text>
        <text x='248' y='126' fontSize='9' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>XHigh</text>
        <text x='50' y='26' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f766e'>Cost / Time</text>
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
        data-testid='agentic-reasoning-ramp-frame'
      />
    </svg>
  );
};

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
            supportingContent={
              <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-3`}>
                {MODEL_FACTORS.map((item) => (
                  <div
                    key={item.title}
                    className='rounded-2xl border border-teal-200/70 bg-white/75 px-3 py-2 text-left shadow-sm'
                  >
                    <p className='text-sm font-semibold text-teal-950'>{item.title}</p>
                    <KangurLessonCaption className='mt-2 text-teal-950'>
                      {item.description}
                    </KangurLessonCaption>
                  </div>
                ))}
              </div>
            }
          >
            <AgenticModelSelectorAnimation />
          </KangurLessonVisual>
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
      title: 'Reasoning effort w praktyce',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Effort jest zależny od modelu - traktuj go jak regulator jakości i kosztu.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {REASONING_EFFORT_GUIDE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
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
            supportingContent={
              <ul className='space-y-2 text-sm text-teal-950'>
                {REASONING_TRIGGERS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <ReasoningRampVisual />
          </KangurLessonVisual>
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
            supportingContent={
              <ul className='space-y-2 text-sm text-teal-950'>
                {ROUTING_PLAYBOOK.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <AgenticRoutingDialAnimation />
          </KangurLessonVisual>
          <AgenticLessonCodeBlock
            accent='teal'
            title='Routing playbook'
            code={ROUTING_PLAYBOOK_TEMPLATE}
          />
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
          <AgenticLessonCodeBlock
            accent='teal'
            title='Model decision template'
            code={MODEL_DECISION_TEMPLATE}
          />
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
          <AgenticLessonCodeBlock
            accent='teal'
            title='Routing card'
            code={ROUTING_CARD_EXAMPLE}
          />
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
    {
      title: 'Mini game: Model Routing',
      content: <AgenticCodingMiniGame gameId='models' />,
      panelClassName: 'w-full',
    },
  ],
  reasoning_router_game: [
    {
      title: 'Reasoning Router Game',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Przypisz poziomy reasoning do zadań o różnym ryzyku i złożoności.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {REASONING_ROUTER_STEPS.map((item) => (
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
    id: 'models',
    emoji: '🧠',
    title: 'Models & Reasoning',
    description: 'Trade-off między szybkością, kosztem i głębią.',
    slideCount: SLIDES.models.length,
  },
  {
    id: 'reasoning_router_game',
    emoji: '🎛️',
    title: 'Reasoning Router',
    description: 'Dobierz poziom reasoning do konkretnego zadania.',
    isGame: true,
  },
] as const;
