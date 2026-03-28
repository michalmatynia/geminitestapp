'use client';

import React, { useId, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonInset,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_START_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate } from './lesson-copy';
import {
  resolveSubtractingLessonContent,
  SUBTRACTING_LESSON_COMPONENT_CONTENT,
} from './subtracting-lesson-content';
import type { KangurSubtractingLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'game';
type SubtractingSlideSectionId = Exclude<SectionId, 'game'>;

const SUBTRACTING_GARDEN_INSTANCE_ID = getKangurBuiltInGameInstanceId('subtracting_garden');
const SUBTRACTING_LESSON_COPY_PL = SUBTRACTING_LESSON_COMPONENT_CONTENT;

type SubtractingLessonCopy = KangurSubtractingLessonTemplateContent;

const translateSubtractingLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

type SubtractingAnimationSurfaceProps = {
  ariaLabel: string;
  children: React.ReactNode;
  surfaceHeight: number;
  surfaceWidth: number;
  testIdPrefix: string;
  viewBox: string;
};

function SubtractingAnimationSurface({
  ariaLabel,
  children,
  surfaceHeight,
  surfaceWidth,
  testIdPrefix,
  viewBox,
}: SubtractingAnimationSurfaceProps): React.JSX.Element {
  const baseId = useId().replace(/:/g, '');
  const clipId = `${testIdPrefix}-${baseId}-clip`;
  const panelGradientId = `${testIdPrefix}-${baseId}-panel`;
  const frameGradientId = `${testIdPrefix}-${baseId}-frame-gradient`;
  const atmosphereId = `${testIdPrefix}-${baseId}-atmosphere-oval`;

  return (
    <svg
      aria-label={ariaLabel}
      className='h-auto w-full'
      data-testid={`${testIdPrefix}-animation`}
      role='img'
      viewBox={viewBox}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='8' y='8' width={surfaceWidth} height={surfaceHeight} rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2={surfaceWidth}
          y1='12'
          y2={surfaceHeight}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='55%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#ecfeff' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='16'
          x2={surfaceWidth}
          y1='16'
          y2='16'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(245,158,11,0.8)' />
          <stop offset='50%' stopColor='rgba(96,165,250,0.82)' />
          <stop offset='100%' stopColor='rgba(52,211,153,0.84)' />
        </linearGradient>
        {renderSoftAtmosphereGradients(atmosphereId, [
          { key: 'left', cx: 86, cy: 34, rx: 76, ry: 20, color: '#f59e0b', opacity: 0.05, glowBias: '40%' },
          {
            key: 'bottom',
            cx: Math.max(surfaceWidth - 92, 120),
            cy: Math.max(surfaceHeight - 16, 52),
            rx: 102,
            ry: 32,
            color: '#60a5fa',
            opacity: 0.05,
            glowBias: '60%',
          },
          {
            key: 'top',
            cx: Math.max(surfaceWidth - 104, 116),
            cy: 28,
            rx: 66,
            ry: 18,
            color: '#34d399',
            opacity: 0.04,
            glowBias: '38%',
          },
        ])}
      </defs>
      <g clipPath={`url(#${clipId})`} data-testid={`${testIdPrefix}-atmosphere`}>
        <rect
          x='8'
          y='8'
          width={surfaceWidth}
          height={surfaceHeight}
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(148,163,184,0.16)'
          strokeWidth='2'
        />
        {renderSoftAtmosphereOvals(atmosphereId, [
          { key: 'left', cx: 86, cy: 34, rx: 76, ry: 20, color: '#f59e0b', opacity: 0.05, glowBias: '40%' },
          {
            key: 'bottom',
            cx: Math.max(surfaceWidth - 92, 120),
            cy: Math.max(surfaceHeight - 16, 52),
            rx: 102,
            ry: 32,
            color: '#60a5fa',
            opacity: 0.05,
            glowBias: '60%',
          },
          {
            key: 'top',
            cx: Math.max(surfaceWidth - 104, 116),
            cy: 28,
            rx: 66,
            ry: 18,
            color: '#34d399',
            opacity: 0.04,
            glowBias: '38%',
          },
        ])}
        {children}
      </g>
      <rect
        x='16'
        y='16'
        width={surfaceWidth - 16}
        height={surfaceHeight - 16}
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.75'
        data-testid={`${testIdPrefix}-frame`}
      />
    </svg>
  );
}

export function SubtractingSvgAnimation({ ariaLabel }: { ariaLabel: string }): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={104}
      surfaceWidth={404}
      testIdPrefix='subtracting-basics-motion'
      viewBox='0 0 420 120'
    >
      <style>{`
        .dot-a { fill: #f59e0b; }
        .dot-b { fill: #60a5fa; }
        .dot-rest { fill: #34d399; }
        .group-a, .group-b, .rest-group {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-b { animation: moveOut 6s ease-in-out infinite; }
        .rest-group { animation: restReveal 6s ease-in-out infinite; }
        @keyframes moveOut {
          0%, 25% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(120px); opacity: 1; }
          65% { transform: translateX(150px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes restReveal {
          0%, 45% { opacity: 0; transform: scale(0.9); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-b, .rest-group { animation: none; }
        }
      `}</style>
      <rect
        fill='none'
        height='46'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='150'
        x='250'
        y='37'
      />
      <g className='group-a'>
        {[0, 1, 2, 3, 4].map((index) => (
          <circle key={`base-${index}`} className='dot-a' cx={50 + index * 22} cy='60' r='9' />
        ))}
      </g>
      <g className='group-b'>
        {[0, 1].map((index) => (
          <circle key={`sub-${index}`} className='dot-b' cx={96 + index * 22} cy='60' r='9' />
        ))}
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='5'>
        <line x1='165' x2='190' y1='60' y2='60' />
        <line x1='210' x2='240' y1='52' y2='52' />
        <line x1='210' x2='240' y1='68' y2='68' />
      </g>
      <g className='rest-group'>
        {[0, 1, 2].map((index) => (
          <circle key={`rest-${index}`} className='dot-rest' cx={270 + index * 22} cy='60' r='9' />
        ))}
      </g>
    </SubtractingAnimationSurface>
  );
}

export function SubtractingNumberLineAnimation({ ariaLabel }: { ariaLabel: string }): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={104}
      surfaceWidth={404}
      testIdPrefix='subtracting-number-line'
      viewBox='0 0 420 120'
    >
      <style>{`
        .line-base { stroke: #cbd5f5; }
        .tick { stroke: #94a3b8; }
        .jump-one { stroke: #60a5fa; }
        .jump-two { stroke: #34d399; }
        .marker {
          fill: #f59e0b;
          animation: markerMoveBack 7s ease-in-out infinite;
        }
        .label-ten { animation: tenPulse 7s ease-in-out infinite; }
        @keyframes markerMoveBack {
          0%, 20% { transform: translateX(0); }
          45% { transform: translateX(-120px); }
          65% { transform: translateX(-200px); }
          100% { transform: translateX(0); }
        }
        @keyframes tenPulse {
          0%, 35% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marker, .label-ten { animation: none; }
        }
      `}</style>
      <line className='line-base' strokeWidth='6' x1='40' x2='380' y1='70' y2='70' />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <line
          key={`tick-${index}`}
          className='tick'
          strokeWidth='3'
          x1={60 + index * 40}
          x2={60 + index * 40}
          y1='62'
          y2='78'
        />
      ))}
      <text fill='#475569' fontSize='12' x='52' y='95'>
        8
      </text>
      <text className='label-ten' fill='#0f172a' fontSize='12' fontWeight='600' x='132' y='95'>
        10
      </text>
      <text fill='#475569' fontSize='12' x='212' y='95'>
        12
      </text>
      <text fill='#475569' fontSize='12' x='292' y='95'>
        14
      </text>
      <text fill='#0f172a' fontSize='12' fontWeight='600' x='252' y='50'>
        13
      </text>
      <path className='jump-one' d='M260 60 Q200 20 140 60' fill='none' strokeWidth='4' />
      <path className='jump-two' d='M140 60 Q110 20 80 60' fill='none' strokeWidth='4' />
      <circle className='marker' cx='260' cy='70' r='8' />
    </SubtractingAnimationSurface>
  );
}

export function SubtractingTenFrameAnimation({ ariaLabel }: { ariaLabel: string }): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={124}
      surfaceWidth={404}
      testIdPrefix='subtracting-ten-frame'
      viewBox='0 0 420 140'
    >
      <style>{`
        .frame { stroke: #e2e8f0; }
        .cell { fill: #f1f5f9; }
        .base { fill: #f59e0b; }
        .extra { fill: #60a5fa; }
        .remove { fill: #f87171; animation: removeDots 7s ease-in-out infinite; }
        .remain { fill: #34d399; animation: remainDots 7s ease-in-out infinite; }
        .base-group, .extra-group { animation: baseFade 7s ease-in-out infinite; }
        @keyframes removeDots {
          0%, 25% { opacity: 1; transform: translateX(0); }
          50% { opacity: 1; transform: translateX(20px); }
          65%, 100% { opacity: 0; transform: translateX(40px); }
        }
        @keyframes remainDots {
          0%, 50% { opacity: 0; transform: scale(0.95); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes baseFade {
          0%, 50% { opacity: 1; }
          65%, 100% { opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          .remove, .remain, .base-group, .extra-group { animation: none; }
        }
      `}</style>
      <rect className='frame' fill='none' height='80' rx='14' strokeWidth='2' width='220' x='30' y='30' />
      {[0, 1].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <rect
            key={`cell-${row}-${col}`}
            className='cell'
            height='24'
            width='24'
            x={50 + col * 38}
            y={45 + row * 34}
          />
        ))
      )}
      <g className='base-group'>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
          <circle
            key={`base-dot-${index}`}
            className='base'
            cx={62 + (index % 5) * 38}
            cy={57 + Math.floor(index / 5) * 34}
            r='10'
          />
        ))}
      </g>
      <g className='extra-group'>
        {[0, 1, 2].map((index) => (
          <circle
            key={`extra-dot-${index}`}
            className='extra'
            cx={310 + index * 32}
            cy='70'
            r='10'
          />
        ))}
      </g>
      <g>
        {[8, 9].map((index) => (
          <circle
            key={`remove-base-${index}`}
            className='remove'
            cx={62 + (index % 5) * 38}
            cy={57 + Math.floor(index / 5) * 34}
            r='10'
          />
        ))}
        {[0, 1, 2].map((index) => (
          <circle
            key={`remove-extra-${index}`}
            className='remove'
            cx={310 + index * 32}
            cy='70'
            r='10'
          />
        ))}
      </g>
      <g>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <circle
            key={`remain-dot-${index}`}
            className='remain'
            cx={62 + (index % 5) * 38}
            cy={57 + Math.floor(index / 5) * 34}
            r='10'
          />
        ))}
      </g>
      <text fill='#475569' fontSize='12' x='290' y='40'>
        −5
      </text>
      <line stroke='#94a3b8' strokeWidth='3' x1='265' x2='295' y1='70' y2='70' />
    </SubtractingAnimationSurface>
  );
}

export function SubtractingDifferenceBarAnimation({
  ariaLabel,
  differenceLabel,
}: {
  ariaLabel: string;
  differenceLabel: string;
}): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={124}
      surfaceWidth={404}
      testIdPrefix='subtracting-difference-bar'
      viewBox='0 0 420 140'
    >
      <style>{`
        .unit-top { fill: #f59e0b; }
        .unit-bottom { fill: #60a5fa; }
        .unit-diff {
          fill: #34d399;
          transform-box: fill-box;
          transform-origin: left center;
          animation: diffReveal 6s ease-in-out infinite;
        }
        .label { fill: #475569; font-size: 12px; font-weight: 600; }
        .diff-label { fill: #0f172a; font-size: 12px; font-weight: 700; }
        @keyframes diffReveal {
          0%, 35% { opacity: 0; transform: scaleX(0.6); }
          55%, 100% { opacity: 1; transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .unit-diff { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <text className='label' x='18' y='48'>12</text>
      <text className='label' x='18' y='92'>7</text>
      <text className='diff-label' x='300' y='118'>{differenceLabel}</text>
      <g>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => (
          <rect
            key={`top-${index}`}
            className='unit-top'
            height='18'
            rx='4'
            width='22'
            x={40 + index * 28}
            y='36'
          />
        ))}
      </g>
      <g>
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <rect
            key={`bottom-${index}`}
            className='unit-bottom'
            height='18'
            rx='4'
            width='22'
            x={40 + index * 28}
            y='80'
          />
        ))}
      </g>
      <g>
        {[7, 8, 9, 10, 11].map((index) => (
          <rect
            key={`diff-${index}`}
            className='unit-diff'
            height='18'
            rx='4'
            width='22'
            x={40 + index * 28}
            y='36'
          />
        ))}
      </g>
    </SubtractingAnimationSurface>
  );
}

export function SubtractingAbacusAnimation({
  ariaLabel,
  tensLabel,
  onesLabel,
  startLabel,
  subtractLabel,
  resultLabel,
}: {
  ariaLabel: string;
  tensLabel: string;
  onesLabel: string;
  startLabel: string;
  subtractLabel: string;
  resultLabel: string;
}): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={174}
      surfaceWidth={424}
      testIdPrefix='subtracting-abacus'
      viewBox='0 0 440 190'
    >
      <style>{`
        .frame { stroke: #e2e8f0; }
        .rod { stroke: #cbd5f5; }
        .divider { stroke: #e2e8f0; }
        .bead-a { fill: #f59e0b; }
        .bead-b { fill: #60a5fa; }
        .bead-rest { fill: #34d399; }
        .row-sub, .row-rest {
          transform-box: fill-box;
          transform-origin: center;
        }
        .row-sub { animation: abacusSub 7s ease-in-out infinite; }
        .row-rest { animation: abacusRest 7s ease-in-out infinite; }
        @keyframes abacusSub {
          0%, 30% { opacity: 1; transform: translateX(0); }
          55% { opacity: 1; transform: translateX(80px); }
          70%, 100% { opacity: 0; transform: translateX(110px); }
        }
        @keyframes abacusRest {
          0%, 50% { opacity: 0; transform: scale(0.98); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .row-sub, .row-rest { animation: none; }
        }
      `}</style>
      <rect className='frame' fill='none' height='140' rx='18' strokeWidth='2' width='380' x='30' y='24' />
      {[0, 1, 2].map((row) => (
        <line
          key={`rod-${row}`}
          className='rod'
          strokeWidth='6'
          x1='60'
          x2='380'
          y1={60 + row * 40}
          y2={60 + row * 40}
        />
      ))}
      <line className='divider' strokeWidth='2' x1='220' x2='220' y1='36' y2='152' />
      <text fill='#475569' fontSize='12' fontWeight='600' x='70' y='44'>{tensLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='250' y='44'>{onesLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='56'>{startLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='96'>{subtractLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='136'>{resultLabel}</text>

      <g>
        {[0, 1, 2, 3].map((index) => (
          <circle
            key={`start-tens-${index}`}
            className='bead-a'
            cx={80 + index * 22}
            cy='60'
            r='9'
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <circle
            key={`start-ones-${index}`}
            className='bead-a'
            cx={250 + index * 18}
            cy='60'
            r='8'
          />
        ))}
      </g>

      <g className='row-sub'>
        {[0, 1].map((index) => (
          <circle
            key={`sub-tens-${index}`}
            className='bead-b'
            cx={80 + index * 22}
            cy='100'
            r='9'
          />
        ))}
        {[0, 1, 2].map((index) => (
          <circle
            key={`sub-ones-${index}`}
            className='bead-b'
            cx={250 + index * 18}
            cy='100'
            r='8'
          />
        ))}
      </g>

      <g className='row-rest'>
        {[0, 1].map((index) => (
          <circle
            key={`rest-tens-${index}`}
            className='bead-rest'
            cx={80 + index * 22}
            cy='140'
            r='9'
          />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle
            key={`rest-ones-${index}`}
            className='bead-rest'
            cx={250 + index * 18}
            cy='140'
            r='8'
          />
        ))}
      </g>
    </SubtractingAnimationSurface>
  );
}

const buildSubtractingLessonCopy = (
  translate: LessonTranslate
): SubtractingLessonCopy => ({
  kind: 'subtracting',
  lessonTitle: translateSubtractingLesson(
    translate,
    'lessonTitle',
    SUBTRACTING_LESSON_COPY_PL.lessonTitle
  ),
  sections: {
    podstawy: {
      title: translateSubtractingLesson(
        translate,
        'sections.basics.title',
        SUBTRACTING_LESSON_COPY_PL.sections.podstawy.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.basics.description',
        SUBTRACTING_LESSON_COPY_PL.sections.podstawy.description
      ),
    },
    przekroczenie: {
      title: translateSubtractingLesson(
        translate,
        'sections.crossTen.title',
        SUBTRACTING_LESSON_COPY_PL.sections.przekroczenie.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.crossTen.description',
        SUBTRACTING_LESSON_COPY_PL.sections.przekroczenie.description
      ),
    },
    dwucyfrowe: {
      title: translateSubtractingLesson(
        translate,
        'sections.doubleDigit.title',
        SUBTRACTING_LESSON_COPY_PL.sections.dwucyfrowe.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.doubleDigit.description',
        SUBTRACTING_LESSON_COPY_PL.sections.dwucyfrowe.description
      ),
    },
    zapamietaj: {
      title: translateSubtractingLesson(
        translate,
        'sections.remember.title',
        SUBTRACTING_LESSON_COPY_PL.sections.zapamietaj.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.remember.description',
        SUBTRACTING_LESSON_COPY_PL.sections.zapamietaj.description
      ),
    },
    game: {
      title: translateSubtractingLesson(
        translate,
        'sections.game.title',
        SUBTRACTING_LESSON_COPY_PL.sections.game.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.game.description',
        SUBTRACTING_LESSON_COPY_PL.sections.game.description
      ),
    },
  },
  animations: {
    subtractingSvg: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.subtractingSvg.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.subtractingSvg.ariaLabel
      ),
    },
    numberLine: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.numberLine.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.numberLine.ariaLabel
      ),
    },
    tenFrame: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.tenFrame.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.tenFrame.ariaLabel
      ),
    },
    differenceBar: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.differenceBar.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.differenceBar.ariaLabel
      ),
      differenceLabel: translateSubtractingLesson(
        translate,
        'animations.differenceBar.differenceLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.differenceBar.differenceLabel
      ),
    },
    abacus: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.ariaLabel
      ),
      tensLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.tensLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.tensLabel
      ),
      onesLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.onesLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.onesLabel
      ),
      startLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.startLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.startLabel
      ),
      subtractLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.subtractLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.subtractLabel
      ),
      resultLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.resultLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.resultLabel
      ),
    },
  },
  slides: {
    basics: {
      meaning: {
        title: translateSubtractingLesson(
          translate,
          'slides.basics.meaning.title',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.meaning.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.basics.meaning.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.meaning.lead
        ),
      },
      singleDigit: {
        title: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.title',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.lead
        ),
        step1: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.step1',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.step1
        ),
        step2: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.step2',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.step2
        ),
        step3: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.step3',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.step3
        ),
      },
      motion: {
        title: translateSubtractingLesson(
          translate,
          'slides.basics.motion.title',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.motion.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.basics.motion.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.motion.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.basics.motion.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.motion.caption
        ),
      },
    },
    crossTen: {
      overTen: {
        title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.caption
        ),
        step1Title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step1Title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step1Title
        ),
        step1Text: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step1Text',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step1Text
        ),
        step2Title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step2Title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step2Title
        ),
        step2Text: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step2Text',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step2Text
        ),
        step3Title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step3Title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step3Title
        ),
        step3Text: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step3Text',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step3Text
        ),
      },
      numberLine: {
        title: translateSubtractingLesson(
          translate,
          'slides.crossTen.numberLine.title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.numberLine.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.crossTen.numberLine.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.numberLine.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.crossTen.numberLine.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.numberLine.caption
        ),
      },
      tenFrame: {
        title: translateSubtractingLesson(
          translate,
          'slides.crossTen.tenFrame.title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.tenFrame.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.crossTen.tenFrame.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.tenFrame.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.crossTen.tenFrame.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.tenFrame.caption
        ),
      },
    },
    doubleDigit: {
      intro: {
        title: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.title',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.lead
        ),
        tensLabel: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.tensLabel',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.tensLabel
        ),
        onesLabel: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.onesLabel',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.onesLabel
        ),
      },
      abacus: {
        title: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.abacus.title',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.abacus.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.abacus.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.abacus.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.abacus.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.abacus.caption
        ),
      },
    },
    remember: {
      rules: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.title
        ),
        orderChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.orderChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.orderChip
        ),
        zeroChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.zeroChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.zeroChip
        ),
        checkChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkChip
        ),
        breakChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.breakChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.breakChip
        ),
        stepBackTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.stepBackTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.stepBackTitle
        ),
        stepBackLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.stepBackLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.stepBackLead
        ),
        stepBackPath: translateSubtractingLesson(
          translate,
          'slides.remember.rules.stepBackPath',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.stepBackPath
        ),
        checkTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkTitle
        ),
        checkLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkLead
        ),
        checkEquation: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkEquation',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkEquation
        ),
        orderTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.orderTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.orderTitle
        ),
        orderLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.orderLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.orderLead
        ),
        motionTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.motionTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.motionTitle
        ),
        motionLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.motionLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.motionLead
        ),
        motionCaption: translateSubtractingLesson(
          translate,
          'slides.remember.rules.motionCaption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.motionCaption
        ),
        pathTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathTitle
        ),
        pathStep1Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep1Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep1Title
        ),
        pathStep1Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep1Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep1Text
        ),
        pathStep2Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep2Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep2Title
        ),
        pathStep2Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep2Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep2Text
        ),
        pathStep3Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep3Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep3Title
        ),
        pathStep3Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep3Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep3Text
        ),
        pathStep4Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep4Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep4Title
        ),
        pathStep4Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep4Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep4Text
        ),
      },
      backJumps: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.caption
        ),
      },
      tenFrame: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.caption
        ),
      },
      checkAddition: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.caption
        ),
      },
      difference: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.difference.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.difference.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.difference.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.difference.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.caption
        ),
      },
    },
  },
  game: {
    stageTitle: translateSubtractingLesson(
      translate,
      'game.stageTitle',
      SUBTRACTING_LESSON_COPY_PL.game.stageTitle
    ),
  },
});

const buildSubtractingLessonSlides = (
  copy: SubtractingLessonCopy
): Record<SubtractingSlideSectionId, LessonSlide[]> => ({
  podstawy: [
    {
      title: copy.slides.basics.meaning.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.basics.meaning.lead}</KangurLessonLead>
          <div className='flex items-center kangur-panel-gap'>
            <KangurDisplayEmoji size='md'>🍎🍎🍎🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              −
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              =
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎</KangurDisplayEmoji>
          </div>
          <KangurEquationDisplay accent='rose' size='sm'>
            5 − 2 = 3
          </KangurEquationDisplay>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.basics.singleDigit.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.basics.singleDigit.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay
              accent='rose'
              data-testid='subtracting-lesson-single-digit-equation'
            >
              9 − 4 = ?
            </KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  1
                </KangurIconBadge>
                <span>{copy.slides.basics.singleDigit.step1}</span>
              </div>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  2
                </KangurIconBadge>
                <span>{copy.slides.basics.singleDigit.step2}</span>
              </div>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  3
                </KangurIconBadge>
                <span>{copy.slides.basics.singleDigit.step3}</span>
              </div>
            </div>
          </KangurLessonCallout>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KangurIconBadge key={n} accent='rose' size='sm'>
                {n}
              </KangurIconBadge>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.basics.motion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.basics.motion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='max-w-md text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingSvgAnimation ariaLabel={copy.animations.subtractingSvg.ariaLabel} />
            </div>
            <KangurEquationDisplay accent='rose' className='mt-2' size='sm'>
              5 − 2 = 3
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.basics.motion.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  przekroczenie: [
    {
      title: copy.slides.crossTen.overTen.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.crossTen.overTen.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay accent='rose'>13 − 5 = ?</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.crossTen.overTen.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-3'>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.crossTen.overTen.step1Title}
              </p>
              <p className='mt-1'>{copy.slides.crossTen.overTen.step1Text}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.crossTen.overTen.step2Title}
              </p>
              <p className='mt-1'>{copy.slides.crossTen.overTen.step2Text}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.crossTen.overTen.step3Title}
              </p>
              <p className='mt-1'>{copy.slides.crossTen.overTen.step3Text}</p>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.crossTen.numberLine.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.crossTen.numberLine.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingNumberLineAnimation ariaLabel={copy.animations.numberLine.ariaLabel} />
            </div>
            <KangurEquationDisplay accent='rose'>13 − 5 = 8</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.crossTen.numberLine.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.crossTen.tenFrame.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.crossTen.tenFrame.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingTenFrameAnimation ariaLabel={copy.animations.tenFrame.ariaLabel} />
            </div>
            <KangurEquationDisplay accent='rose'>13 − 5 = 8</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.crossTen.tenFrame.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: copy.slides.doubleDigit.intro.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.doubleDigit.intro.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='amber'>47 − 23 = ?</KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className='flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                  {copy.slides.doubleDigit.intro.tensLabel}
                </span>
                <span className='font-semibold'>40 − 20 = 20</span>
              </div>
              <div className='flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                  {copy.slides.doubleDigit.intro.onesLabel}
                </span>
                <span className='font-semibold'>7 − 3 = 4</span>
              </div>
            </div>
            <KangurEquationDisplay accent='amber' className='mt-2' size='md'>
              20 + 4 = 24 ✓
            </KangurEquationDisplay>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.doubleDigit.abacus.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.doubleDigit.abacus.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingAbacusAnimation
                ariaLabel={copy.animations.abacus.ariaLabel}
                tensLabel={copy.animations.abacus.tensLabel}
                onesLabel={copy.animations.abacus.onesLabel}
                startLabel={copy.animations.abacus.startLabel}
                subtractLabel={copy.animations.abacus.subtractLabel}
                resultLabel={copy.animations.abacus.resultLabel}
              />
            </div>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.doubleDigit.abacus.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  zapamietaj: [
    {
      title: copy.slides.remember.rules.title,
      content: (
        <KangurLessonStack>
          <div className='flex flex-wrap justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='rose'>{copy.slides.remember.rules.orderChip}</KangurLessonChip>
            <KangurLessonChip accent='sky'>{copy.slides.remember.rules.zeroChip}</KangurLessonChip>
            <KangurLessonChip accent='emerald'>{copy.slides.remember.rules.checkChip}</KangurLessonChip>
            <KangurLessonChip accent='amber'>{copy.slides.remember.rules.breakChip}</KangurLessonChip>
          </div>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-2'>
            <KangurLessonCallout accent='rose' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-rose-700'>
                {copy.slides.remember.rules.stepBackTitle}
              </p>
              <p className='mt-1'>{copy.slides.remember.rules.stepBackLead}</p>
              <p className='mt-2'>{copy.slides.remember.rules.stepBackPath}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                {copy.slides.remember.rules.checkTitle}
              </p>
              <p className='mt-1'>{copy.slides.remember.rules.checkLead}</p>
              <p className='mt-2'>
                <b>{copy.slides.remember.rules.checkEquation}</b>
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.remember.rules.orderTitle}
              </p>
              <p className='mt-1'>{copy.slides.remember.rules.orderLead}</p>
            </KangurLessonCallout>
          </div>
          <div className='grid w-full items-center kangur-panel-gap lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'>
            <KangurLessonInset accent='rose' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700'>
                <KangurIconBadge accent='rose' size='sm'>
                  &lt;-
                </KangurIconBadge>
                <span>{copy.slides.remember.rules.motionTitle}</span>
              </div>
              <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
                {copy.slides.remember.rules.motionLead}
              </p>
              <div className='mt-2'>
                <SubtractingSvgAnimation ariaLabel={copy.animations.subtractingSvg.ariaLabel} />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.remember.rules.motionCaption}
              </KangurLessonCaption>
            </KangurLessonInset>
            <div className='w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-left text-sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                {copy.slides.remember.rules.pathTitle}
              </p>
              <div className='mt-2 space-y-2 border-l-2 border-slate-200 pl-3'>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep1Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep1Text}
                  </p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep2Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep2Text}
                  </p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep3Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep3Text}
                  </p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep4Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep4Text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.backJumps.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='sky' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700'>
              <KangurIconBadge accent='sky' size='sm'>
                &lt;-
              </KangurIconBadge>
              <span>{copy.slides.remember.backJumps.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.backJumps.lead}
            </p>
            <div className='mt-2'>
              <SubtractingNumberLineAnimation ariaLabel={copy.animations.numberLine.ariaLabel} />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.remember.backJumps.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.tenFrame.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='amber' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700'>
              <KangurIconBadge accent='amber' size='sm'>
                10
              </KangurIconBadge>
              <span>{copy.slides.remember.tenFrame.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.tenFrame.lead}
            </p>
            <div className='mt-2'>
              <SubtractingTenFrameAnimation ariaLabel={copy.animations.tenFrame.ariaLabel} />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.remember.tenFrame.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.checkAddition.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='emerald' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              <KangurIconBadge accent='emerald' size='sm'>
                OK
              </KangurIconBadge>
              <span>{copy.slides.remember.checkAddition.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.checkAddition.lead}
            </p>
            <div className='mt-3 grid gap-2'>
              <KangurEquationDisplay accent='emerald' size='sm'>
                8 − 5 = 3
              </KangurEquationDisplay>
              <KangurEquationDisplay accent='emerald' size='sm'>
                3 + 5 = 8
              </KangurEquationDisplay>
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.remember.checkAddition.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.difference.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700'>
              <KangurIconBadge accent='teal' size='sm'>
                =
              </KangurIconBadge>
              <span>{copy.slides.remember.difference.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.difference.lead}
            </p>
            <div className='mt-2'>
              <SubtractingDifferenceBarAnimation
                ariaLabel={copy.animations.differenceBar.ariaLabel}
                differenceLabel={copy.animations.differenceBar.differenceLabel}
              />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              12 - 7 = 5
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.remember.difference.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildSubtractingLessonSections = (copy: SubtractingLessonCopy) => [
  {
    id: 'podstawy',
    emoji: '➖',
    title: copy.sections.podstawy.title,
    description: copy.sections.podstawy.description,
  },
  {
    id: 'przekroczenie',
    emoji: '🔟',
    title: copy.sections.przekroczenie.title,
    description: copy.sections.przekroczenie.description,
  },
  {
    id: 'dwucyfrowe',
    emoji: '💡',
    title: copy.sections.dwucyfrowe.title,
    description: copy.sections.dwucyfrowe.description,
  },
  {
    id: 'zapamietaj',
    emoji: '🧠',
    title: copy.sections.zapamietaj.title,
    description: copy.sections.zapamietaj.description,
  },
  {
    id: 'game',
    emoji: '🎮',
    title: copy.sections.game.title,
    description: copy.sections.game.description,
    isGame: true,
  },
];

export const SLIDES = buildSubtractingLessonSlides(SUBTRACTING_LESSON_COPY_PL);
export const HUB_SECTIONS = buildSubtractingLessonSections(SUBTRACTING_LESSON_COPY_PL);

export default function SubtractingLesson({ lessonTemplate }: LessonProps): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.subtracting');
  const runtimeTemplate = useOptionalKangurLessonTemplate('subtracting');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const copy = useMemo(
    () => resolveSubtractingLessonContent(resolvedTemplate) ?? buildSubtractingLessonCopy(translations),
    [resolvedTemplate, translations],
  );
  const localizedSlides = useMemo(() => buildSubtractingLessonSlides(copy), [copy]);
  const localizedSections = useMemo(() => buildSubtractingLessonSections(copy), [copy]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='subtracting'
      lessonEmoji='➖'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-red-200'
      dotActiveClass='bg-red-400'
      dotDoneClass='bg-red-200'
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'rose',
            icon: '🎮',
            maxWidthClassName: 'max-w-none',
            headerTestId: 'subtracting-lesson-game-header',
            shellTestId: 'subtracting-lesson-game-shell',
            title: copy.game.stageTitle,
          },
          launchableInstance: {
            gameId: 'subtracting_garden',
            instanceId: SUBTRACTING_GARDEN_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
