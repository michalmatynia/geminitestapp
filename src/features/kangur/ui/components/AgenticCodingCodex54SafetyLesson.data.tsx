'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { AgenticApprovalGateAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import { useId } from 'react';

type SectionId = 'safety';

const SAFETY_PRINCIPLES = [
  'Sandbox najpierw, eskalacja dopiero gdy to konieczne.',
  'Każda eskalacja ma jasny powód i zakres.',
  'Minimalny dostęp + maksymalny ślad audytowy.',
] as const;

const ESCALATION_TRIGGERS = [
  'Potrzebujesz pobrać zależności lub uruchomić install.',
  'Testy lub build zapisują do katalogów poza workspace.',
  'Musisz odpalić narzędzia systemowe (np. Docker, GUI).',
  'Planowana operacja jest destrukcyjna lub trudna do cofnięcia.',
] as const;

const SAFETY_STACK = [
  'Sandbox ogranicza skutki uboczne (zapisy tylko w workspace).',
  'Approvals wymagają świadomej zgody na ryzykowne akcje.',
  'Summary + logi tworzą ślad audytowy po każdym tasku.',
] as const;

const RISK_SIGNALS = [
  'Wysoki wpływ + wysoka niepewność = potrzebna eskalacja.',
  'Każda eskalacja musi mieć opis zakresu i plan rollbacku.',
  'Ryzyko maleje, gdy masz testy lub twardy proof.',
] as const;

const SAFETY_AUDIT_LOG = `Decision log
- Action: run "npm run test:integration"
- Scope: workspace-write, no network
- Reason: weryfikacja refactoru przed merge
- Evidence: testy przeszły, log w załączniku`;

export const SafetyLayersVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-safety-layers-${baseId}-clip`;
  const panelGradientId = `agentic-safety-layers-${baseId}-panel`;
  const frameGradientId = `agentic-safety-layers-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: warstwy bezpieczeństwa (sandbox, approvals, audit).'
      className='h-auto w-full'
      data-testid='agentic-safety-layers-animation'
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
          <stop offset='55%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#f0fdf4' />
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
          <stop offset='50%' stopColor='rgba(56,189,248,0.82)' />
          <stop offset='100%' stopColor='rgba(34,197,94,0.82)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-safety-layers-atmosphere'>
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
        <ellipse cx='82' cy='36' rx='74' ry='18' fill='rgba(148,163,184,0.14)' />
        <ellipse cx='284' cy='36' rx='68' ry='18' fill='rgba(56,189,248,0.12)' />
        <ellipse cx='226' cy='126' rx='96' ry='22' fill='rgba(34,197,94,0.12)' />

        <path d='M44 76 C 44 44, 70 28, 92 28 C 114 28, 140 44, 140 76 C 140 100, 122 118, 92 126 C 62 118, 44 100, 44 76 Z' fill='rgba(15,23,42,0.04)' />
        <path d='M58 76 C 58 52, 76 40, 92 40 C 108 40, 126 52, 126 76 C 126 94, 114 106, 92 112 C 70 106, 58 94, 58 76 Z' fill='rgba(255,255,255,0.72)' stroke='#cbd5f5' strokeWidth='1.5' />
        <rect x='84' y='58' width='16' height='22' rx='6' fill='rgba(56,189,248,0.18)' />
        <circle cx='92' cy='90' r='8' fill='rgba(34,197,94,0.18)' />

        <rect x='146' y='28' width='160' height='28' rx='12' fill='rgba(255,255,255,0.88)' stroke='#94a3b8' strokeWidth='2' />
        <rect x='146' y='62' width='160' height='28' rx='12' fill='rgba(255,255,255,0.9)' stroke='#38bdf8' strokeWidth='2' />
        <rect x='146' y='96' width='160' height='28' rx='12' fill='rgba(255,255,255,0.92)' stroke='#22c55e' strokeWidth='2' />
        <rect x='160' y='38' width='36' height='7' rx='3.5' fill='rgba(148,163,184,0.18)' />
        <rect x='160' y='72' width='44' height='7' rx='3.5' fill='rgba(56,189,248,0.18)' />
        <rect x='160' y='106' width='48' height='7' rx='3.5' fill='rgba(34,197,94,0.18)' />

        <text x='160' y='46' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Sandbox</text>
        <text x='160' y='80' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Approvals</text>
        <text x='160' y='114' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Audit trail</text>
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
        data-testid='agentic-safety-layers-frame'
      />
    </svg>
  );
};

export const RiskMatrixVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-risk-matrix-${baseId}-clip`;
  const panelGradientId = `agentic-risk-matrix-${baseId}-panel`;
  const frameGradientId = `agentic-risk-matrix-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: mapa ryzyka (wpływ x prawdopodobieństwo).'
      className='h-auto w-full'
      data-testid='agentic-risk-matrix-animation'
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
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='54%' stopColor='#fffbeb' />
          <stop offset='100%' stopColor='#fef2f2' />
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
          <stop offset='50%' stopColor='rgba(245,158,11,0.82)' />
          <stop offset='100%' stopColor='rgba(239,68,68,0.82)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-risk-matrix-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='160'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(148,163,184,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='84' cy='34' rx='72' ry='18' fill='rgba(148,163,184,0.14)' />
        <ellipse cx='286' cy='40' rx='76' ry='20' fill='rgba(245,158,11,0.12)' />
        <ellipse cx='254' cy='144' rx='94' ry='22' fill='rgba(239,68,68,0.12)' />

        <line x1='72' y1='138' x2='72' y2='34' stroke='#cbd5f5' strokeWidth='2.5' strokeLinecap='round' />
        <polygon points='72,34 66,44 78,44' fill='#94a3b8' />
        <line x1='72' y1='138' x2='304' y2='138' stroke='#cbd5f5' strokeWidth='2.5' strokeLinecap='round' />
        <polygon points='304,138 294,132 294,144' fill='#94a3b8' />

        <rect x='92' y='42' width='92' height='44' rx='14' fill='rgba(255,255,255,0.9)' stroke='#e2e8f0' strokeWidth='2' />
        <rect x='192' y='42' width='92' height='44' rx='14' fill='rgba(255,248,235,0.94)' stroke='#fbbf24' strokeWidth='2' />
        <rect x='92' y='96' width='92' height='44' rx='14' fill='rgba(255,248,235,0.94)' stroke='#f59e0b' strokeWidth='2' />
        <rect x='192' y='96' width='92' height='44' rx='14' fill='rgba(254,242,242,0.96)' stroke='#ef4444' strokeWidth='2' />

        <text x='112' y='68' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Low</text>
        <text x='210' y='68' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Medium</text>
        <text x='106' y='122' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Medium</text>
        <text x='214' y='122' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>High</text>
        <text x='16' y='30' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>Likelihood</text>
        <text x='258' y='156' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>Impact</text>
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
        data-testid='agentic-risk-matrix-frame'
      />
    </svg>
  );
};

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  safety: [
    {
      title: 'Safety = gate, nie hamulec',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Bezpieczeństwo w agentic coding to kontrola ryzyka, nie blokada. Approval
            gate pozwala działać szybko, ale z pełną świadomością konsekwencji.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Gate otwiera się tylko wtedy, gdy rozumiesz koszt i ryzyko.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <ul className='space-y-2 text-sm text-slate-950'>
                {SAFETY_PRINCIPLES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <AgenticApprovalGateAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kiedy prosisz o eskalację',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Proś o wyższe uprawnienia tylko wtedy, gdy to konieczne i uzasadnione.
            To chroni repo i skraca review.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {ESCALATION_TRIGGERS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Safety stack',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Bezpieczne środowisko to trzy warstwy: sandbox, approvals i audyt.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Warstwy bezpieczeństwa działają razem.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <ul className='space-y-2 text-sm text-slate-950'>
                {SAFETY_STACK.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <SafetyLayersVisual />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mapa ryzyka',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Im wyższe ryzyko, tym bardziej potrzebujesz approvals i twardego proofu.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Wysoki wpływ + wysoka niepewność = eskalacja.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <ul className='space-y-2 text-sm text-slate-950'>
                {RISK_SIGNALS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <RiskMatrixVisual />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ślad audytu w praktyce',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Log decyzji skraca review i pozwala szybko wrócić do kontekstu.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='slate'
            title='Decision log'
            code={SAFETY_AUDIT_LOG}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy prosisz o eskalację uprawnień?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='slate'
            question='Wybierz właściwą sytuację.'
            choices={[
              { id: 'a', label: 'Gdy musisz zainstalować zależności.', correct: true },
              { id: 'b', label: 'Gdy edytujesz opis w README.' },
              { id: 'c', label: 'Zawsze na starcie zadania.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Safety Gate',
      content: <AgenticCodingMiniGame gameId='safety' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'safety',
    emoji: '🛡️',
    title: 'Config & Safety',
    description: 'Approval gate, eskalacje i minimalny dostęp.',
    slideCount: SLIDES.safety.length,
  },
] as const;
