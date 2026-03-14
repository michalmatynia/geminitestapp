import { useState } from 'react';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import AddingSynthesisGame from '@/features/kangur/ui/components/AddingSynthesisGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  AddingAbacusAnimation,
  AddingAssociativeAnimation,
  AddingColumnAnimation,
  AddingCommutativeAnimation,
  AddingCountOnAnimation,
  AddingCrossTenSvgAnimation,
  AddingMakeTenPairsAnimation,
  AddingDoublesAnimation,
  AddingNumberLineAnimation,
  AddingSvgAnimation,
  AddingTenFrameAnimation,
  AddingTensOnesAnimation,
  AddingTwoDigitAnimation,
  AddingZeroAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
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
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'synthesis' | 'game';

export const SLIDES: Record<Exclude<SectionId, 'game' | 'synthesis'>, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Co to znaczy dodawac?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dodawanie to łączenie dwóch grup razem, zeby policzyc, ile ich jest łacznie.
          </KangurLessonLead>
          <div className='flex items-center gap-4'>
            <KangurDisplayEmoji size='md'>🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              +
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              =
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎🍎🍎</KangurDisplayEmoji>
          </div>
          <KangurEquationDisplay accent='amber' size='sm'>
            2 + 3 = 5
          </KangurEquationDisplay>
          <KangurLessonCallout accent='slate' className='max-w-md text-center'>
            <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-3'>
              <div className='rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-amber-700'>
                  Czesc
                </p>
                <p className='text-2xl font-bold text-amber-700'>2</p>
              </div>
              <span className='text-xl font-bold text-slate-400'>+</span>
              <div className='rounded-xl border border-sky-200/60 bg-sky-50/80 px-3 py-2'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-sky-700'>
                  Czesc
                </p>
                <p className='text-2xl font-bold text-sky-700'>3</p>
              </div>
            </div>
            <div className='mt-3 flex items-center justify-center gap-2'>
              <span className='text-xl font-bold text-slate-400'>=</span>
              <div className='rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-2'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-emerald-700'>
                  Calosc
                </p>
                <p className='text-2xl font-bold text-emerald-700'>5</p>
              </div>
            </div>
            <KangurLessonCaption className='mt-2'>
              Czesc + czesc daje calosc.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='grid w-full max-w-md grid-cols-1 gap-3 min-[360px]:grid-cols-3'>
            <div className='rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-center text-xs font-semibold text-amber-700'>
              <div className='text-xl'>🍎🍎</div>
              <p className='mt-1'>Start</p>
            </div>
            <div className='rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600'>
              <div className='text-xl'>➕</div>
              <p className='mt-1'>Polacz</p>
            </div>
            <div className='rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-center text-xs font-semibold text-emerald-700'>
              <div className='text-xl'>🍎🍎🍎🍎🍎</div>
              <p className='mt-1'>Wynik</p>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dodawanie jednocyfrowe',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Mozesz liczyc na palcach lub w myslach. Zacznij od wiekszej liczby!
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-center'>
            <KangurEquationDisplay accent='amber' data-testid='adding-lesson-single-digit-equation'>
              4 + 3 = ?
            </KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='amber' size='sm'>
                  1
                </KangurIconBadge>
                <span>
                  Startuj od wiekszej liczby: <b>4</b>
                </span>
              </div>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='amber' size='sm'>
                  2
                </KangurIconBadge>
                <span>
                  Dolicz trzy kroki w gore: 5, 6, <b>7</b>
                </span>
              </div>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='amber' size='sm'>
                  3
                </KangurIconBadge>
                <span>
                  Ostatnia liczba to wynik: <b>7</b> ✓
                </span>
              </div>
            </div>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700'>
              <span>Schodki</span>
              <span className='text-rose-400'>•</span>
              <span>liczenie w górę</span>
            </div>
            <div className='mt-2'>
              <AddingCountOnAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Startuj od 4 i zrób trzy kroki: 5, 6, 7.
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex flex-wrap items-center justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='amber'>Start od wiekszej</KangurLessonChip>
            <KangurLessonChip accent='sky'>Liczenie w gore</KangurLessonChip>
            <KangurLessonChip accent='emerald'>Szybki wynik</KangurLessonChip>
          </div>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KangurIconBadge key={n} accent='indigo' size='sm'>
                {n}
              </KangurIconBadge>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dodawanie w ruchu (SVG)',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Animacja pokazuje, jak dwie grupy przesuwają się i łączą w jedną sumę.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' className='max-w-md text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingSvgAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              2 + 3 = 5
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              Kropki łączą się w jedną grupę i tworzą sumę.
            </KangurLessonCaption>
            <div className='mt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold'>
              <div className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-amber-400' />
                <span>Grupa A</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-sky-400' />
                <span>Grupa B</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-emerald-400' />
                <span>Suma</span>
              </div>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  przekroczenie: [
    {
      title: 'Dodawanie z przekroczeniem 10',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Gdy suma przekracza 10, mozesz uzupełnic do 10 i dodac reszte.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingCrossTenSvgAnimation />
            </div>
            <KangurEquationDisplay accent='sky'>7 + 5 = ?</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              7 + <b>3</b> = 10, zostaje jeszcze <b>2</b>, więc 10 + 2 = <b>12</b> ✓
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='grid w-full gap-3 sm:grid-cols-2'>
            <KangurLessonCallout accent='sky' className='text-left text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-sky-700'>
                Krok 1
              </p>
              <p className='mt-1'>
                Uzupelnij do 10: <b>7 + 3 = 10</b>
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-left text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                Krok 2
              </p>
              <p className='mt-1'>
                Dodaj reszte: <b>+2</b>
              </p>
            </KangurLessonCallout>
          </div>
          <div className='w-full max-w-md rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-left text-sm'>
            <p className='text-xs font-semibold uppercase tracking-wide text-sky-700'>
              Cel: 10
            </p>
            <div className='mt-2 h-3 w-full overflow-hidden rounded-full border border-sky-200 bg-white/80'>
              <div className='flex h-full'>
                <div className='bg-amber-400' style={{ width: '70%' }} />
                <div className='bg-sky-400' style={{ width: '30%' }} />
              </div>
            </div>
            <div className='mt-2 flex items-center justify-between text-xs font-semibold text-slate-600'>
              <span>7</span>
              <span>+3</span>
              <span>=10</span>
            </div>
            <div className='mt-2 flex items-center gap-2'>
              <div className='rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                Zostaje +2
              </div>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Skoki na osi liczbowej',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Skocz do 10, a potem dodaj resztę.</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingNumberLineAnimation />
            </div>
            <KangurEquationDisplay accent='sky'>8 + 5 = 13</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              8 + <b>2</b> = 10, zostaje <b>3</b>, więc 10 + 3 = <b>13</b>.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='flex flex-wrap items-center justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='sky'>Start 8</KangurLessonChip>
            <span className='text-slate-400'>→</span>
            <KangurLessonChip accent='amber'>+2</KangurLessonChip>
            <KangurLessonChip accent='emerald'>10</KangurLessonChip>
            <span className='text-slate-400'>→</span>
            <KangurLessonChip accent='amber'>+3</KangurLessonChip>
            <KangurLessonChip accent='emerald'>13</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ramka dziesiątki',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wypełnij brakujące pola do 10, a resztę dodaj obok.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingTenFrameAnimation />
            </div>
            <KangurEquationDisplay accent='sky'>7 + 5 = 12</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              Najpierw <b>+3</b> do 10, potem jeszcze <b>+2</b>.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='w-full max-w-md rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-left text-sm'>
            <p className='text-xs font-semibold uppercase tracking-wide text-sky-700'>Mini plan</p>
            <div className='mt-2 space-y-1'>
              <p>• Uzupełnij ramkę do 10</p>
              <p>• Dodaj resztę obok</p>
              <p>• Połącz obie części w wynik</p>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: 'Dodawanie dwucyfrowe',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dodawaj osobno dziesiatki i jednosci!
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='emerald'>24 + 13 = ?</KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className='rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                  Dziesiatki
                </p>
                <p className='mt-1 font-semibold'>20 + 10 = 30</p>
              </div>
              <div className='rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                  Jednosci
                </p>
                <p className='mt-1 font-semibold'>4 + 3 = 7</p>
              </div>
            </div>
            <KangurEquationDisplay accent='emerald' className='mt-2' size='md'>
              30 + 7 = 37 ✓
            </KangurEquationDisplay>
          </KangurLessonCallout>
          <KangurLessonInset accent='emerald' className='max-w-md text-left' padding='sm'>
            <div className='grid gap-2 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                  Schemat
                </span>
                <span className='text-xs text-emerald-600'>dziesiatki + jednosci</span>
              </div>
              <div className='flex items-center justify-between rounded-md bg-emerald-50/60 px-2 py-1'>
                <span>20 + 10</span>
                <span className='font-semibold'>30</span>
              </div>
              <div className='flex items-center justify-between rounded-md bg-emerald-50/60 px-2 py-1'>
                <span>4 + 3</span>
                <span className='font-semibold'>7</span>
              </div>
              <div className='flex items-center justify-between border-t border-emerald-200/70 pt-2 font-semibold text-emerald-700'>
                <span>30 + 7</span>
                <span>37</span>
              </div>
            </div>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dodawanie dwucyfrowe w ruchu',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Najpierw zsumuj dziesiatki, potem jednosci. Animacja pokazuje, jak grupy
            łączą się w wynik.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingTwoDigitAnimation />
            </div>
            <KangurEquationDisplay accent='emerald' className='mt-2' size='sm'>
              24 + 13 = 37
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              Dziesiatki: 20 + 10, jednosci: 4 + 3.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Bloki dziesiątek i jedności',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Kolorowe bloki pokazują, że dziesiatki i jednosci łączą się osobno.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingTensOnesAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              24 + 13 = 37
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              Najpierw 20 + 10, potem 4 + 3. Suma składa się z obu części.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='flex flex-wrap items-center justify-center gap-3 text-xs font-semibold'>
            <div className='flex items-center gap-2'>
              <span className='h-2.5 w-2.5 rounded-sm bg-emerald-400' />
              <span>Dziesiatki</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='h-2.5 w-2.5 rounded-sm bg-sky-400' />
              <span>Jednosci</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='h-2.5 w-2.5 rounded-sm bg-amber-400' />
              <span>Suma</span>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kolumny dziesiatek i jednosci',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Uloz liczby w kolumnach: dziesiatki pod dziesiatkami, jednosci pod
            jednosciami. Potem dodaj osobno.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingColumnAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              Najpierw dziesiatki, potem jednosci. Wynik sklada sie z obu kolumn.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='slate' className='max-w-md text-left' padding='sm'>
            <div className='grid gap-2 text-sm'>
              <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-semibold'>
                <span>Dziesiatki</span>
                <span className='text-slate-400'>+</span>
                <span>Jednosci</span>
              </div>
              <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md bg-slate-50 px-2 py-1'>
                <span>20 + 10</span>
                <span className='text-slate-400'>→</span>
                <span>30</span>
              </div>
              <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md bg-slate-50 px-2 py-1'>
                <span>4 + 3</span>
                <span className='text-slate-400'>→</span>
                <span>7</span>
              </div>
              <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-slate-200 pt-2 font-semibold'>
                <span>30 + 7</span>
                <span className='text-slate-400'>=</span>
                <span>37</span>
              </div>
            </div>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Liczydlo',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Liczydlo pomaga przesuwac koraliki: osobno dziesiatki i jednosci, a potem
            odczytac sume.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingAbacusAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              Koraliki przesuwaja sie do wspolnej sumy.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='flex flex-wrap items-center justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='amber'>Dziesiatki</KangurLessonChip>
            <KangurLessonChip accent='sky'>Jednosci</KangurLessonChip>
            <KangurLessonChip accent='emerald'>Suma</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  zapamietaj: [
    {
      title: 'Zapamiętaj!',
      content: (
        <KangurLessonStack>
          <div className='flex flex-wrap justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='amber'>Kolejnosc: 3 + 5 = 5 + 3</KangurLessonChip>
            <KangurLessonChip accent='sky'>Dodawanie 0: 7 + 0 = 7</KangurLessonChip>
            <KangurLessonChip accent='emerald'>Startuj od wiekszej liczby</KangurLessonChip>
            <KangurLessonChip accent='slate'>Grupuj do 10</KangurLessonChip>
          </div>
          <div className='grid w-full gap-3 sm:grid-cols-2'>
            <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                Pary do 10
              </p>
              <p className='mt-1'>Szukaj par: <b>6 + 4 = 10</b></p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                Podwojenia
              </p>
              <p className='mt-1'>Podwojenia daja szybki wynik: <b>5 + 5 = 10</b></p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                Grupowanie
              </p>
              <p className='mt-1'>
                (2 + 3) + 4 = 2 + (3 + 4)
              </p>
            </KangurLessonCallout>
          </div>
          <div className='w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-left text-sm'>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Sciezka</p>
            <div className='mt-2 space-y-2 border-l-2 border-slate-200 pl-3'>
              <div>
                <p className='font-semibold text-slate-700'>Znajdz pary do 10</p>
                <p className='text-xs text-slate-500'>6 + 4, 7 + 3, 8 + 2</p>
              </div>
              <div>
                <p className='font-semibold text-slate-700'>Uzyj podwojen</p>
                <p className='text-xs text-slate-500'>5 + 5, 6 + 6</p>
              </div>
              <div>
                <p className='font-semibold text-slate-700'>Grupuj liczby</p>
                <p className='text-xs text-slate-500'>Najpierw latwiejsza suma</p>
              </div>
            </div>
          </div>
          <div className='flex w-full flex-col gap-3'>
            <KangurLessonInset accent='rose' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700'>
                <KangurIconBadge accent='rose' size='sm'>
                  ↔
                </KangurIconBadge>
                <span>Zamiana skladnikow</span>
              </div>
              <div className='mt-2'>
                <AddingCommutativeAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                Zamień kolejność, a wynik zostaje taki sam.
              </KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='teal' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700'>
                <span>Nawiasy</span>
                <span className='text-teal-400'>•</span>
                <span>grupowanie</span>
              </div>
              <div className='mt-2'>
                <AddingAssociativeAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                Grupuj liczby tak, by łatwiej je zsumować.
              </KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='sky' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700'>
                <span>Zero</span>
                <span className='text-sky-400'>=</span>
                <span>bez zmian</span>
              </div>
              <div className='mt-2'>
                <AddingZeroAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>Dodanie 0 nie zmienia wyniku.</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='amber' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700'>
                <KangurIconBadge accent='amber' size='sm'>
                  10
                </KangurIconBadge>
                <span>Dopełnij do 10</span>
              </div>
              <div className='mt-2'>
                <AddingMakeTenPairsAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>Szukaj par, które razem dają 10.</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='emerald' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                <span>Podwojenia</span>
              </div>
              <div className='mt-2'>
                <AddingDoublesAnimation />
              </div>
              <KangurEquationDisplay accent='emerald' className='mt-2' size='sm'>
                5 + 5 = 10
              </KangurEquationDisplay>
              <KangurLessonCaption className='mt-1'>
                Powtórz tę samą liczbę, a wynik jest szybki.
              </KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'podstawy',
    emoji: '➕',
    title: 'Podstawy dodawania',
    description: 'Co to dodawanie? Jednocyfrowe + animacja',
  },
  {
    id: 'przekroczenie',
    emoji: '🔟',
    title: 'Dodawanie przez 10',
    description: 'Uzupełnianie do dziesięci',
  },
  {
    id: 'dwucyfrowe',
    emoji: '💡',
    title: 'Dodawanie dwucyfrowe',
    description: 'Dziesiatki i jednosci osobno',
  },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamiętaj!', description: 'Zasady dodawania' },
  {
    id: 'synthesis',
    emoji: '🎼',
    title: 'Synteza dodawania',
    description: 'Rytmiczne tory odpowiedzi i szybkie sumy',
    isGame: true,
  },
  {
    id: 'game',
    emoji: '⚽',
    title: 'Gra z piłkami',
    description: 'Cwicz dodawanie przesuwajac piłki',
    isGame: true,
  },
];

export default function AddingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  if (activeSection === 'synthesis') {
    return (
      <LessonActivityStage
        accent='amber'
        headerTestId='adding-lesson-synthesis-header'
        icon='🎼'
        maxWidthClassName='max-w-[1120px]'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellClassName='!p-4 sm:!p-6 lg:!p-8'
        shellTestId='adding-lesson-synthesis-shell'
        title='Synteza dodawania'
      >
        <AddingSynthesisGame onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        accent='amber'
        headerTestId='adding-lesson-game-header'
        icon='🎮'
        maxWidthClassName='max-w-sm'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='adding-lesson-game-shell'
        title='Gra z piłkami!'
      >
        <AddingBallGame finishLabel='Wróć do tematów' onFinish={() => setActiveSection(null)} />
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
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='kangur-gradient-accent-amber'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➕'
      lessonTitle='Dodawanie'
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-orange-200'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as keyof typeof SLIDES],
          }
      )}
      onSelect={(id) => {
        if (id !== 'synthesis' && id !== 'game') {
          markSectionOpened(id as keyof typeof SLIDES);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
