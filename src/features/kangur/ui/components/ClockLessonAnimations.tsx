'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { KANGUR_CLOCK_THEME_COLORS } from './clock-theme';
import { translateClockLesson } from './ClockLesson.i18n';

type ClockFrameProps = {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  testIdBase?: string;
};

const useClockAnimationAriaLabel = (key: string, fallback: string): string => {
  const translations = useTranslations('KangurStaticLessons.clock');
  return translateClockLesson(translations, `animations.${key}.ariaLabel`, fallback);
};

function ClockFrame({
  ariaLabel,
  children,
  className = 'h-full w-full',
  testIdBase,
}: ClockFrameProps): React.JSX.Element {
  const surfaceId = useId().replace(/:/g, '');
  const faceGradientId = `${surfaceId}-face`;
  const atmosphereId = `${surfaceId}-atmosphere`;

  return (
    <svg
      aria-label={ariaLabel}
      className={className}
      data-testid={testIdBase ? `${testIdBase}-animation` : undefined}
      preserveAspectRatio='xMidYMid meet'
      role='img'
      viewBox='0 0 200 200'
    >
      <style>{`
        .clock-face { stroke: ${KANGUR_CLOCK_THEME_COLORS.faceStroke}; stroke-width: 4; }
        .tick { stroke: ${KANGUR_CLOCK_THEME_COLORS.majorTick}; stroke-width: 3; stroke-linecap: round; }
        .minor { stroke: ${KANGUR_CLOCK_THEME_COLORS.minorTick}; stroke-width: 2; }
        .center { fill: ${KANGUR_CLOCK_THEME_COLORS.center}; }
        .frame { fill: none; stroke: ${KANGUR_CLOCK_THEME_COLORS.frame}; stroke-width: 2; }
      `}</style>
      <defs>
        <linearGradient id={faceGradientId} x1='20' x2='180' y1='16' y2='184' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor={KANGUR_CLOCK_THEME_COLORS.faceGradientStart} />
          <stop offset='55%' stopColor={KANGUR_CLOCK_THEME_COLORS.faceGradientMid} />
          <stop offset='100%' stopColor={KANGUR_CLOCK_THEME_COLORS.faceGradientEnd} />
        </linearGradient>
        <radialGradient id={atmosphereId} cx='50%' cy='42%' r='74%'>
          <stop offset='0%' stopColor={KANGUR_CLOCK_THEME_COLORS.atmosphereStart} />
          <stop offset='100%' stopColor={KANGUR_CLOCK_THEME_COLORS.atmosphereEnd} />
        </radialGradient>
      </defs>
      <ellipse
        cx='72'
        cy='42'
        data-testid={testIdBase ? `${testIdBase}-atmosphere` : undefined}
        fill={`url(#${atmosphereId})`}
        opacity='0.95'
        rx='68'
        ry='28'
      />
      <circle className='clock-face' cx='100' cy='100' fill={`url(#${faceGradientId})`} r='92' />
      <circle
        className='frame'
        cx='100'
        cy='100'
        data-testid={testIdBase ? `${testIdBase}-frame` : undefined}
        r='84'
      />
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-hour-hand-sweep'>
      <style>{`
        .hour-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightHourHand}; stroke-width: 7; stroke-linecap: round; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-minute-hand-sweep'>
      <style>{`
        .minute-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightMinuteHand}; stroke-width: 5; stroke-linecap: round; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-five-minute-steps'>
      <style>{`
        .step { fill: ${KANGUR_CLOCK_THEME_COLORS.stepFill}; opacity: 0.2; animation: stepPulse 5s ease-in-out infinite; }
        .s2 { animation-delay: 0.6s; }
        .s3 { animation-delay: 1.2s; }
        .s4 { animation-delay: 1.8s; }
        .label { font: 700 12px/1.1 system-ui, sans-serif; fill: ${KANGUR_CLOCK_THEME_COLORS.stepLabel}; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-combined-hands'>
      <style>{`
        .hour-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightHourHand}; stroke-width: 6; stroke-linecap: round; }
        .minute-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.lessonMinuteHand}; stroke-width: 4; stroke-linecap: round; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-quarter'>
      <style>{`
        .minute-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightMinuteHand}; stroke-width: 5; stroke-linecap: round; }
        .minute-a { transform-origin: 100px 100px; animation: quarterA 4.5s ease-in-out infinite; }
        .minute-b { transform-origin: 100px 100px; animation: quarterB 4.5s ease-in-out infinite; }
        .hour-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.lessonHourHand}; stroke-width: 6; stroke-linecap: round; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-half-past'>
      <style>{`
        .hour-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightHourHand}; stroke-width: 6; stroke-linecap: round; }
        .minute-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightMinuteHand}; stroke-width: 5; stroke-linecap: round; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-minute-by-minute'>
      <style>{`
        .minute-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightMinuteHand}; stroke-width: 4; stroke-linecap: round; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-full-hour-step'>
      <style>{`
        .hour-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.highlightHourHand}; stroke-width: 7; stroke-linecap: round; }
        .minute-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.lessonMinuteHand}; stroke-width: 4; stroke-linecap: round; }
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
    <ClockFrame ariaLabel={ariaLabel} testIdBase='clock-second-hand'>
      <style>{`
        .second-hand { stroke: ${KANGUR_CLOCK_THEME_COLORS.secondHand}; stroke-width: 2; stroke-linecap: round; }
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
