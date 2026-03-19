'use client';

import { useTranslations } from 'next-intl';

import { translateClockLesson } from './ClockLesson.i18n';

type ClockFrameProps = {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
};

const useClockAnimationAriaLabel = (key: string, fallback: string): string => {
  const translations = useTranslations('KangurStaticLessons.clock');
  return translateClockLesson(translations, `animations.${key}.ariaLabel`, fallback);
};

function ClockFrame({ ariaLabel, children, className = 'h-full w-full' }: ClockFrameProps): React.JSX.Element {
  return (
    <svg
      aria-label={ariaLabel}
      className={className}
      preserveAspectRatio='xMidYMid meet'
      role='img'
      viewBox='0 0 200 200'
    >
      <style>{`
        .clock-face { fill: #eef2ff; stroke: #6366f1; stroke-width: 4; }
        .tick { stroke: #4f46e5; stroke-width: 3; stroke-linecap: round; }
        .minor { stroke: #c7d2fe; stroke-width: 2; }
        .center { fill: #4f46e5; }
      `}</style>
      <circle className='clock-face' cx='100' cy='100' r='92' />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 100 + 72 * Math.cos(angle);
        const y1 = 100 + 72 * Math.sin(angle);
        const x2 = 100 + 86 * Math.cos(angle);
        const y2 = 100 + 86 * Math.sin(angle);
        return <line key={`tick-${i}`} className='tick' x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {Array.from({ length: 60 }, (_, i) => {
        if (i % 5 === 0) return null;
        const angle = (i * 6 - 90) * (Math.PI / 180);
        const x1 = 100 + 80 * Math.cos(angle);
        const y1 = 100 + 80 * Math.sin(angle);
        const x2 = 100 + 86 * Math.cos(angle);
        const y2 = 100 + 86 * Math.sin(angle);
        return <line key={`minor-${i}`} className='minor' x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {children}
      <circle className='center' cx='100' cy='100' r='5' />
    </svg>
  );
}

export function ClockHourHandSweepAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'hourHandSweep',
    'Animacja: krótka wskazówka przeskakuje co godzinę.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .hour-hand { stroke: #dc2626; stroke-width: 7; stroke-linecap: round; }
        .hour-sweep {
          transform-origin: 100px 100px;
          animation: hourSweep 7s ease-in-out infinite;
        }
        @keyframes hourSweep {
          0%, 10% { transform: rotate(0deg); }
          40% { transform: rotate(90deg); }
          70% { transform: rotate(180deg); }
          100% { transform: rotate(300deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hour-sweep { animation: none; transform: rotate(120deg); }
        }
      `}</style>
      <g className='hour-sweep'>
        <line className='hour-hand' x1='100' y1='100' x2='100' y2='58' />
      </g>
    </ClockFrame>
  );
}

export function ClockMinuteHandSweepAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'minuteHandSweep',
    'Animacja: długa wskazówka robi pełny obrót.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .minute-hand { stroke: #16a34a; stroke-width: 5; stroke-linecap: round; }
        .minute-sweep {
          transform-origin: 100px 100px;
          animation: minuteSweep 5s linear infinite;
        }
        @keyframes minuteSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .minute-sweep { animation: none; transform: rotate(180deg); }
        }
      `}</style>
      <g className='minute-sweep'>
        <line className='minute-hand' x1='100' y1='100' x2='100' y2='38' />
      </g>
    </ClockFrame>
  );
}

export function ClockFiveMinuteStepsAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'fiveMinuteSteps',
    'Animacja: skoki co 5 minut na tarczy zegara.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .step { fill: #34d399; opacity: 0.2; animation: stepPulse 5s ease-in-out infinite; }
        .s2 { animation-delay: 0.6s; }
        .s3 { animation-delay: 1.2s; }
        .s4 { animation-delay: 1.8s; }
        .label { font: 700 12px/1.1 system-ui, sans-serif; fill: #0f766e; }
        @keyframes stepPulse {
          0%, 20% { opacity: 0.2; transform: scale(0.9); }
          45%, 70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .step { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <circle className='step s1' cx='100' cy='34' r='8' />
      <circle className='step s2' cx='166' cy='100' r='8' />
      <circle className='step s3' cx='100' cy='166' r='8' />
      <circle className='step s4' cx='34' cy='100' r='8' />
      <text className='label' x='92' y='24'>:00</text>
      <text className='label' x='170' y='104'>:15</text>
      <text className='label' x='92' y='186'>:30</text>
      <text className='label' x='10' y='104'>:45</text>
    </ClockFrame>
  );
}

export function ClockCombinedHandsAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'combinedHands',
    'Animacja: dwie wskazówki pracują razem.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .hour-hand { stroke: #dc2626; stroke-width: 6; stroke-linecap: round; }
        .minute-hand { stroke: #4f46e5; stroke-width: 4; stroke-linecap: round; }
        .hour-move { transform-origin: 100px 100px; animation: hourMove 8s ease-in-out infinite; }
        .minute-move { transform-origin: 100px 100px; animation: minuteMove 4s linear infinite; }
        @keyframes hourMove {
          0% { transform: rotate(30deg); }
          50% { transform: rotate(120deg); }
          100% { transform: rotate(210deg); }
        }
        @keyframes minuteMove {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hour-move { animation: none; transform: rotate(90deg); }
          .minute-move { animation: none; transform: rotate(180deg); }
        }
      `}</style>
      <g className='hour-move'>
        <line className='hour-hand' x1='100' y1='100' x2='100' y2='60' />
      </g>
      <g className='minute-move'>
        <line className='minute-hand' x1='100' y1='100' x2='100' y2='34' />
      </g>
    </ClockFrame>
  );
}

export function ClockQuarterAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'quarter',
    'Animacja: kwadrans po i kwadrans do.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .minute-hand { stroke: #16a34a; stroke-width: 5; stroke-linecap: round; }
        .minute-a { transform-origin: 100px 100px; animation: quarterA 4.5s ease-in-out infinite; }
        .minute-b { transform-origin: 100px 100px; animation: quarterB 4.5s ease-in-out infinite; }
        .hour-hand { stroke: #1e1b4b; stroke-width: 6; stroke-linecap: round; }
        @keyframes quarterA {
          0%, 45% { opacity: 1; transform: rotate(90deg); }
          55%, 100% { opacity: 0; transform: rotate(90deg); }
        }
        @keyframes quarterB {
          0%, 45% { opacity: 0; transform: rotate(270deg); }
          55%, 100% { opacity: 1; transform: rotate(270deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .minute-a, .minute-b { animation: none; opacity: 1; }
        }
      `}</style>
      <line className='hour-hand' x1='100' y1='100' x2='130' y2='78' />
      <g className='minute-a'>
        <line className='minute-hand' x1='100' y1='100' x2='100' y2='34' />
      </g>
      <g className='minute-b'>
        <line className='minute-hand' x1='100' y1='100' x2='100' y2='34' />
      </g>
    </ClockFrame>
  );
}

export function ClockHalfPastAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'halfPast',
    'Animacja: pół godziny, minuta na 6.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .hour-hand { stroke: #dc2626; stroke-width: 6; stroke-linecap: round; }
        .minute-hand { stroke: #16a34a; stroke-width: 5; stroke-linecap: round; }
        .minute-move { transform-origin: 100px 100px; animation: halfMinute 5.5s ease-in-out infinite; }
        .hour-move { transform-origin: 100px 100px; animation: halfHour 5.5s ease-in-out infinite; }
        @keyframes halfMinute {
          0%, 25% { transform: rotate(0deg); }
          60%, 100% { transform: rotate(180deg); }
        }
        @keyframes halfHour {
          0%, 25% { transform: rotate(180deg); }
          60%, 100% { transform: rotate(195deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .minute-move { animation: none; transform: rotate(180deg); }
          .hour-move { animation: none; transform: rotate(195deg); }
        }
      `}</style>
      <g className='hour-move'>
        <line className='hour-hand' x1='100' y1='100' x2='100' y2='62' />
      </g>
      <g className='minute-move'>
        <line className='minute-hand' x1='100' y1='100' x2='100' y2='34' />
      </g>
    </ClockFrame>
  );
}

export function ClockMinuteByMinuteAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'minuteByMinute',
    'Animacja: minutowa wskazówka przesuwa się minuta po minucie.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .minute-hand { stroke: #16a34a; stroke-width: 4; stroke-linecap: round; }
        .minute-step {
          transform-origin: 100px 100px;
          animation: minuteTick 6s steps(60) infinite;
        }
        @keyframes minuteTick {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .minute-step { animation: none; transform: rotate(210deg); }
        }
      `}</style>
      <g className='minute-step'>
        <line className='minute-hand' x1='100' y1='100' x2='100' y2='34' />
      </g>
    </ClockFrame>
  );
}

export function ClockFullHourStepAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'fullHourStep',
    'Animacja: krótka wskazówka zatrzymuje się na pełnych godzinach.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .hour-hand { stroke: #dc2626; stroke-width: 7; stroke-linecap: round; }
        .minute-hand { stroke: #4f46e5; stroke-width: 4; stroke-linecap: round; }
        .hour-step {
          transform-origin: 100px 100px;
          animation: hourStep 8s ease-in-out infinite;
        }
        @keyframes hourStep {
          0%, 10% { transform: rotate(30deg); }
          18%, 28% { transform: rotate(90deg); }
          36%, 46% { transform: rotate(150deg); }
          54%, 64% { transform: rotate(210deg); }
          72%, 82% { transform: rotate(270deg); }
          90%, 96% { transform: rotate(330deg); }
          100% { transform: rotate(390deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hour-step { animation: none; transform: rotate(150deg); }
        }
      `}</style>
      <line className='minute-hand' x1='100' y1='100' x2='100' y2='34' />
      <g className='hour-step'>
        <line className='hour-hand' x1='100' y1='100' x2='100' y2='64' />
      </g>
    </ClockFrame>
  );
}

export function ClockSecondHandAnimation(): React.JSX.Element {
  const ariaLabel = useClockAnimationAriaLabel(
    'secondHand',
    'Animacja: wskazówka sekundowa obraca się szybko.'
  );

  return (
    <ClockFrame ariaLabel={ariaLabel}>
      <style>{`
        .second-hand { stroke: #ef4444; stroke-width: 2; stroke-linecap: round; }
        .second-sweep { transform-origin: 100px 100px; animation: secondSweep 1.8s linear infinite; }
        @keyframes secondSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .second-sweep { animation: none; transform: rotate(120deg); }
        }
      `}</style>
      <g className='second-sweep'>
        <line className='second-hand' x1='100' y1='100' x2='100' y2='28' />
      </g>
    </ClockFrame>
  );
}
