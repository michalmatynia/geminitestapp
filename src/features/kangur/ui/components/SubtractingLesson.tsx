'use client';

import { useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import SubtractingGardenGame from '@/features/kangur/ui/components/SubtractingGardenGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonInset,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'game';

function SubtractingSvgAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja odejmowania: 5 kropki minus 2 kropki daje 3 kropki.'
      className='h-auto w-full'
      role='img'
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
    </svg>
  );
}

function SubtractingNumberLineAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja na osi liczbowej: 13 minus 5 jako skoki do 10 i dalej.'
      className='h-auto w-full'
      role='img'
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
    </svg>
  );
}

function SubtractingTenFrameAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja ramki dziesiątki: odejmowanie 13 minus 5.'
      className='h-auto w-full'
      role='img'
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
    </svg>
  );
}

function SubtractingDifferenceBarAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja różnicy: 12 minus 7 zostawia 5.'
      className='h-auto w-full'
      role='img'
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
      <text className='diff-label' x='300' y='118'>różnica 5</text>
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
    </svg>
  );
}

function SubtractingAbacusAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja liczydła: odejmowanie dziesiątek i jedności osobno.'
      className='h-auto w-full'
      role='img'
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
      <text fill='#475569' fontSize='12' fontWeight='600' x='70' y='44'>Dziesiątki</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='250' y='44'>Jedności</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='56'>Start</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='96'>Odejmij</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='136'>Wynik</text>

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
    </svg>
  );
}

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Co to znaczy odejmować?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Odejmowanie to zabieranie części z grupy. Pytamy: ile zostało?
          </KangurLessonLead>
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
      title: 'Odejmowanie jednocyfrowe',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Cofaj się na osi liczbowej lub licz, ile brakuje do wyniku.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay
              accent='rose'
              data-testid='subtracting-lesson-single-digit-equation'
            >
              9 − 4 = ?
            </KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='rose' size='sm'>
                  1
                </KangurIconBadge>
                <span>
                  Startuj od <b>9</b>
                </span>
              </div>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='rose' size='sm'>
                  2
                </KangurIconBadge>
                <span>
                  Cofnij się o 4 kroki: 8, 7, 6, <b>5</b>
                </span>
              </div>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='rose' size='sm'>
                  3
                </KangurIconBadge>
                <span>
                  Ostatnia liczba to wynik: <b>5</b> ✓
                </span>
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
      title: 'Odejmowanie w ruchu (SVG)',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Animacja pokazuje, jak zabieramy część kropek i zostaje wynik.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='max-w-md text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingSvgAnimation />
            </div>
            <KangurEquationDisplay accent='rose' className='mt-2' size='sm'>
              5 − 2 = 3
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              Dwie kropki „odchodzą”, zostają trzy.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  przekroczenie: [
    {
      title: 'Odejmowanie z przekroczeniem 10',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Rozdziel odjemnik na dwie części: najpierw zejdź do 10, potem odejmij resztę.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay accent='rose'>13 − 5 = ?</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              13 − <b>3</b> = 10, 10 − <b>2</b> = <b>8</b> ✓
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-3'>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                Krok 1
              </p>
              <p className='mt-1'>Rozloz 5 na <b>3 + 2</b></p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                Krok 2
              </p>
              <p className='mt-1'>
                Odejmij 3: <b>13 − 3 = 10</b>
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                Krok 3
              </p>
              <p className='mt-1'>
                Odejmij 2: <b>10 − 2 = 8</b>
              </p>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Skoki wstecz na osi liczbowej',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Najpierw do 10, potem dalej wstecz.</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingNumberLineAnimation />
            </div>
            <KangurEquationDisplay accent='rose'>13 − 5 = 8</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              13 − <b>3</b> = 10, potem 10 − <b>2</b> = <b>8</b>.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ramka dziesiątki',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Zabierz najpierw nadwyżkę ponad 10, potem resztę z ramki.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingTenFrameAnimation />
            </div>
            <KangurEquationDisplay accent='rose'>13 − 5 = 8</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              Najpierw zdejmij <b>3</b>, potem jeszcze <b>2</b>.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: 'Odejmowanie dwucyfrowe',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Odejmuj osobno dziesiątki i jedności!
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='amber'>47 − 23 = ?</KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className='flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                  Dziesiątki
                </span>
                <span className='font-semibold'>40 − 20 = 20</span>
              </div>
              <div className='flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                  Jedności
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
      title: 'Liczydło',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Liczydło pokazuje odejmowanie dziesiątek i jedności osobno.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingAbacusAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              Odejmij koraliki, a potem odczytaj wynik.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  zapamietaj: [
    {
      title: 'Zasady odejmowania',
      content: (
        <KangurLessonStack>
          <div className='flex flex-wrap justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='rose'>Kolejność ma znaczenie: 7 − 3 ≠ 3 − 7</KangurLessonChip>
            <KangurLessonChip accent='sky'>Odejmowanie 0: 8 − 0 = 8</KangurLessonChip>
            <KangurLessonChip accent='emerald'>Sprawdź dodawaniem: 5 + 3 = 8</KangurLessonChip>
            <KangurLessonChip accent='amber'>Rozbij na kroki: 13 − 5 = 10 − 2</KangurLessonChip>
          </div>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-2'>
            <KangurLessonCallout accent='rose' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-rose-700'>
                Cofaj się krokami
              </p>
              <p className='mt-1'>
                Startuj od większej liczby: <b>9 − 4</b>
              </p>
              <p className='mt-2'>
                9 {'->'} 8 {'->'} 7 {'->'} 6 {'->'} <b>5</b>
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                Sprawdzaj dodawaniem
              </p>
              <p className='mt-1'>
                Jeśli wynik + odjemnik daje odjemna, to dobrze.
              </p>
              <p className='mt-2'>
                <b>5 + 3 = 8</b>
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                Kolejność ma znaczenie
              </p>
              <p className='mt-1'>
                <b>7 − 3</b> to nie to samo co <b>3 − 7</b>.
              </p>
            </KangurLessonCallout>
          </div>
          <div className='grid w-full items-center kangur-panel-gap lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'>
            <KangurLessonInset accent='rose' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700'>
                <KangurIconBadge accent='rose' size='sm'>
                  &lt;-
                </KangurIconBadge>
                <span>Odejmowanie w ruchu</span>
              </div>
              <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
                Zabierasz część i patrzysz, ile zostało.
              </p>
              <div className='mt-2'>
                <SubtractingSvgAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                Dwie kropki "odchodzą", zostają trzy.
              </KangurLessonCaption>
            </KangurLessonInset>
            <div className='w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-left text-sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Ścieżka</p>
              <div className='mt-2 space-y-2 border-l-2 border-slate-200 pl-3'>
                <div>
                  <p className='font-semibold text-slate-700'>Rozbij odjemnik</p>
                  <p className='text-xs text-slate-500'>5 = 3 + 2</p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>Zejdź do 10</p>
                  <p className='text-xs text-slate-500'>13 − 3 = 10</p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>Odejmij resztę</p>
                  <p className='text-xs text-slate-500'>10 − 2 = 8</p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>Sprawdź dodawaniem</p>
                  <p className='text-xs text-slate-500'>8 + 5 = 13</p>
                </div>
              </div>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Skoki wstecz',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='sky' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700'>
              <KangurIconBadge accent='sky' size='sm'>
                &lt;-
              </KangurIconBadge>
              <span>Skoki na osi</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              Cofaj się w dwóch krokach: do 10, potem dalej.
            </p>
            <div className='mt-2'>
              <SubtractingNumberLineAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>13 − 5 = 8.</KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ramka dziesiątki',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='amber' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700'>
              <KangurIconBadge accent='amber' size='sm'>
                10
              </KangurIconBadge>
              <span>Ramka dziesiątki</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              Najpierw zdejmij nadwyżkę, potem resztę z ramki.
            </p>
            <div className='mt-2'>
              <SubtractingTenFrameAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>13 − 5 = 8.</KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Sprawdź wynik dodawaniem',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='emerald' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              <KangurIconBadge accent='emerald' size='sm'>
                OK
              </KangurIconBadge>
              <span>Sprawdzanie</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              Dodaj odjemnik do wyniku i zobacz, czy wracasz do odjemnej.
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
              Jeśli dodawanie zgadza się, odejmowanie jest poprawne.
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Różnica liczb',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700'>
              <KangurIconBadge accent='teal' size='sm'>
                =
              </KangurIconBadge>
              <span>Różnica</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              Porównaj dwie liczby i zobacz, ile brakuje do większej.
            </p>
            <div className='mt-2'>
              <SubtractingDifferenceBarAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              12 - 7 = 5
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              Różnica to "brakująca" część.
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'podstawy',
    emoji: '➖',
    title: 'Podstawy odejmowania',
    description: 'Co to odejmowanie? Jednocyfrowe',
  },
  {
    id: 'przekroczenie',
    emoji: '🔟',
    title: 'Odejmowanie przez 10',
    description: 'Rozkład przez dziesięć',
  },
  {
    id: 'dwucyfrowe',
    emoji: '💡',
    title: 'Odejmowanie dwucyfrowe',
    description: 'Dziesiątki i jedności osobno',
  },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamiętaj!', description: 'Zasady odejmowania' },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Gra z odejmowaniem',
    description: 'Przeciągaj i zabieraj obiekty',
    isGame: true,
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = Object.fromEntries(
  HUB_SECTIONS.map((section) => [section.id, section.title])
);

export default function SubtractingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'subtracting',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        accent='rose'
        headerTestId='subtracting-lesson-game-header'
        icon='🎮'
        maxWidthClassName='max-w-none'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='subtracting-lesson-game-shell'
        title='Gra z odejmowaniem!'
      >
        <SubtractingGardenGame
          finishLabelVariant='topics'
          onFinish={() => setActiveSection(null)}
        />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-red-400'
        dotDoneClass='bg-red-200'
        gradientClass='kangur-gradient-accent-rose'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➖'
      lessonTitle='Odejmowanie'
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-red-200'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as keyof typeof SLIDES],
          }
      )}
      onSelect={(id) => {
        if (id !== 'game') {
          markSectionOpened(id as keyof typeof SLIDES);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
