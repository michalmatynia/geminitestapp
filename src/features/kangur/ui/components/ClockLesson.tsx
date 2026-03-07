import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Lock } from 'lucide-react';

import ClockTrainingGame from './ClockTrainingGame';
import {
  addXp,
  buildLessonMasteryUpdate,
  XP_REWARDS,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { KANGUR_STEP_PILL_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurLessonBackAction } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurButton,
  KangurDivider,
  KangurFeatureHeader,
  KangurGlassPanel,
  KangurHeadline,
  KangurOptionCardButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

type AnalogClockProps = {
  hours: number;
  minutes: number;
  label?: string;
  highlightHour?: boolean;
  highlightMinute?: boolean;
  showHourHand?: boolean;
  showMinuteHand?: boolean;
};

type LessonSlide = {
  title: string;
  tts: string;
  content: React.JSX.Element;
};

type LessonSection = {
  id: 'hours' | 'minutes' | 'combined';
  title: string;
  subtitle: string;
  slides: LessonSlide[];
};

const LOCKED_SECTION_HINT = 'Najpierw ukończ poprzednią sekcję, aby odblokować ten etap.';

function AnalogClock({
  hours,
  minutes,
  label,
  highlightHour = false,
  highlightMinute = false,
  showHourHand = true,
  showMinuteHand = true,
}: AnalogClockProps): React.JSX.Element {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <div className='flex flex-col items-center gap-2'>
      <svg viewBox='0 0 200 200' width='180' height='180' className='drop-shadow-lg'>
        <circle cx='100' cy='100' r='95' fill='white' stroke='#6366f1' strokeWidth='4' />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 80 * Math.cos(angle);
          const y1 = 100 + 80 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke='#4f46e5'
              strokeWidth='3'
              strokeLinecap='round'
            />
          );
        })}
        {Array.from({ length: 60 }, (_, i) => {
          if (i % 5 === 0) return null;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const x1 = 100 + 85 * Math.cos(angle);
          const y1 = 100 + 85 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke='#a5b4fc' strokeWidth='1' />;
        })}
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 100 + 66 * Math.cos(angle);
          const y = 100 + 66 * Math.sin(angle);
          return (
            <text
              key={n}
              x={x}
              y={y}
              textAnchor='middle'
              dominantBaseline='central'
              fontSize='14'
              fontWeight='bold'
              fill='#3730a3'
            >
              {n}
            </text>
          );
        })}
        {showHourHand && (
          <line
            data-testid='clock-lesson-hour-hand'
            x1='100'
            y1='100'
            x2={100 + 48 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
            y2={100 + 48 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
            stroke={highlightHour ? '#dc2626' : '#1e1b4b'}
            strokeWidth={highlightHour ? 8 : 6}
            strokeLinecap='round'
          />
        )}
        {showMinuteHand && (
          <line
            data-testid='clock-lesson-minute-hand'
            x1='100'
            y1='100'
            x2={100 + 68 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
            y2={100 + 68 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
            stroke={highlightMinute ? '#16a34a' : '#4f46e5'}
            strokeWidth={highlightMinute ? 6 : 4}
            strokeLinecap='round'
          />
        )}
        <circle cx='100' cy='100' r='5' fill='#6366f1' />
      </svg>
      {label && <p className='text-center text-sm font-semibold text-slate-500'>{label}</p>}
    </div>
  );
}

export const LESSON_SECTIONS: LessonSection[] = [
  {
    id: 'hours',
    title: 'Sekcja 1: Godziny (krótka wskazówka)',
    subtitle: 'Uczymy się tylko krótkiej wskazówki i pełnych godzin (:00).',
    slides: [
      {
        title: 'Co pokazuje krótka wskazówka?',
        tts: 'Krótka wskazówka pokazuje godzinę. Na tej sekcji patrzymy tylko na nią.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <div className='flex gap-6 justify-center flex-wrap'>
              <AnalogClock
                hours={3}
                minutes={0}
                highlightHour
                showMinuteHand={false}
                label='Krótka wskazówka na 3'
              />
              <AnalogClock
                hours={8}
                minutes={0}
                highlightHour
                showMinuteHand={false}
                label='Krótka wskazówka na 8'
              />
            </div>
            <p className='max-w-xs leading-relaxed text-slate-600'>
              Patrzymy na <strong className='text-red-600'>krótką wskazówkę</strong>. Ona mówi nam,
              która jest godzina.
            </p>
          </div>
        ),
      },
      {
        title: 'Pełne godziny (:00)',
        tts: 'Gdy jest pełna godzina, odczytujemy tylko godzinę z krótkiej wskazówki.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <div className='flex gap-6 justify-center flex-wrap'>
              <AnalogClock
                hours={1}
                minutes={0}
                highlightHour
                showMinuteHand={false}
                label='1:00'
              />
              <AnalogClock
                hours={6}
                minutes={0}
                highlightHour
                showMinuteHand={false}
                label='6:00'
              />
              <AnalogClock
                hours={11}
                minutes={0}
                highlightHour
                showMinuteHand={false}
                label='11:00'
              />
            </div>
            <p className='max-w-xs leading-relaxed text-slate-600'>
              W tej sekcji trenujemy tylko odczyt godziny: 1, 6, 11.
            </p>
          </div>
        ),
      },
      {
        title: 'Szybki test godzin',
        tts: 'Spójrz na krótką wskazówkę i nazwij godzinę. Minuty pomijamy.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <AnalogClock
              hours={9}
              minutes={0}
              highlightHour
              showMinuteHand={false}
              label='Jaka to godzina?'
            />
            <KangurLessonCallout accent='rose' className='max-w-xs text-left'>
              <p className='font-semibold text-slate-700'>Krok:</p>
              <p className='mt-1 text-sm text-slate-600'>
                1. Znajdź krótką wskazówkę.
                <br />
                2. Odczytaj numer, na który pokazuje.
              </p>
              <p className='text-red-700 font-extrabold mt-2'>Wynik: 9:00</p>
            </KangurLessonCallout>
          </div>
        ),
      },
    ],
  },
  {
    id: 'minutes',
    title: 'Sekcja 2: Minuty (długa wskazówka)',
    subtitle: 'Uczymy się tylko długiej wskazówki i mapy minut.',
    slides: [
      {
        title: 'Co pokazuje długa wskazówka?',
        tts: 'Długa wskazówka pokazuje minuty. W tej sekcji skupiamy się tylko na minutach.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <AnalogClock
              hours={12}
              minutes={20}
              highlightMinute
              showHourHand={false}
              label='Długa wskazówka = minuty'
            />
            <p className='max-w-xs leading-relaxed text-slate-600'>
              <strong className='text-green-600'>Długa wskazówka</strong> chodzi po tarczy i mówi,
              ile minut minęło.
            </p>
          </div>
        ),
      },
      {
        title: 'Mapa minut co 5',
        tts: 'Każdy numer to kolejne pięć minut: 1 to 5, 2 to 10, 3 to 15 i tak dalej.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <div className='flex gap-6 justify-center flex-wrap'>
              <AnalogClock
                hours={12}
                minutes={15}
                highlightMinute
                showHourHand={false}
                label='3 = 15 min'
              />
              <AnalogClock
                hours={12}
                minutes={30}
                highlightMinute
                showHourHand={false}
                label='6 = 30 min'
              />
              <AnalogClock
                hours={12}
                minutes={45}
                highlightMinute
                showHourHand={false}
                label='9 = 45 min'
              />
            </div>
            <p className='max-w-xs leading-relaxed text-slate-600'>
              Zapamiętaj: każda kolejna liczba to +5 minut.
            </p>
          </div>
        ),
      },
      {
        title: 'Szybki test minut',
        tts: 'Patrz tylko na długą wskazówkę i nazwij minuty.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <AnalogClock
              hours={12}
              minutes={35}
              highlightMinute
              showHourHand={false}
              label='Jaka to liczba minut?'
            />
            <KangurLessonCallout accent='emerald' className='max-w-xs text-left'>
              <p className='font-semibold text-slate-700'>Krok:</p>
              <p className='mt-1 text-sm text-slate-600'>
                Długa wskazówka stoi przy 7.
                <br />7 × 5 = 35 minut.
              </p>
              <p className='text-green-700 font-extrabold mt-2'>Wynik: :35</p>
            </KangurLessonCallout>
          </div>
        ),
      },
    ],
  },
  {
    id: 'combined',
    title: 'Sekcja 3: Godziny i Minuty razem',
    subtitle: 'Łączymy obie wskazówki i odczytujemy pełny czas.',
    slides: [
      {
        title: 'Jak łączyć obie wskazówki?',
        tts: 'Najpierw czytamy godzinę z krótkiej wskazówki, potem minuty z długiej.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <AnalogClock hours={8} minutes={30} label='Przykład: 8:30' />
            <KangurLessonCallout accent='indigo' className='max-w-xs text-left space-y-2'>
              <p className='font-semibold text-slate-700'>Kroki:</p>
              <p className='text-sm text-slate-600'>1. Krótka wskazówka: godzina = 8</p>
              <p className='text-sm text-slate-600'>2. Długa wskazówka: minuty = 30</p>
              <p className='text-indigo-700 font-extrabold'>Wynik: 8:30</p>
            </KangurLessonCallout>
          </div>
        ),
      },
      {
        title: 'Kwadrans po i kwadrans do',
        tts: 'Długa wskazówka na 3 to kwadrans po, a na 9 to kwadrans do następnej godziny.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <div className='flex gap-6 justify-center flex-wrap'>
              <AnalogClock hours={5} minutes={15} label='5:15 - kwadrans po 5' />
              <AnalogClock hours={5} minutes={45} label='5:45 - kwadrans do 6' />
            </div>
            <p className='max-w-xs leading-relaxed text-slate-600'>
              Odczytujemy godzinę i minuty jednocześnie.
            </p>
          </div>
        ),
      },
      {
        title: 'Gotowy/a na ćwiczenie',
        tts: 'Teraz potrafisz czytać godziny i minuty razem. Przejdź do ćwiczenia.',
        content: (
          <div className='flex flex-col items-center gap-4 text-center'>
            <div className='text-7xl'>🏆</div>
            <p className='max-w-xs leading-relaxed text-slate-600'>
              Brawo! Umiesz:
              <br />
              🔴 czytać godziny,
              <br />
              🟢 czytać minuty,
              <br />✅ łączyć obie wskazówki w pełny czas.
            </p>
          </div>
        ),
      },
    ],
  },
];

export default function ClockLesson(): React.JSX.Element {
  const handleBack = useKangurLessonBackAction();
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [sectionSlides, setSectionSlides] = useState<number[]>(() => LESSON_SECTIONS.map(() => 0));
  const [completedSections, setCompletedSections] = useState<boolean[]>(() =>
    LESSON_SECTIONS.map(() => false)
  );
  const [unlockedSections, setUnlockedSections] = useState<boolean[]>(() =>
    LESSON_SECTIONS.map((_, index) => index === 0)
  );
  const [inTraining, setInTraining] = useState(false);

  const activeSection = openSection !== null ? LESSON_SECTIONS[openSection] : null;
  const activeSlideIndex = openSection !== null ? (sectionSlides[openSection] ?? 0) : 0;
  const activeSlide = activeSection?.slides[activeSlideIndex] ?? null;

  const isFinalSection = openSection !== null && openSection === LESSON_SECTIONS.length - 1;
  const isFinalSlide = activeSection ? activeSlideIndex === activeSection.slides.length - 1 : false;

  const setSectionSlideIndex = useCallback((sectionIndex: number, nextIndex: number) => {
    setSectionSlides((prev) => {
      const next = [...prev];
      const slides = LESSON_SECTIONS[sectionIndex]?.slides ?? [];
      const maxIndex = Math.max(0, slides.length - 1);
      const clampedIndex = Math.min(Math.max(nextIndex, 0), maxIndex);
      next[sectionIndex] = clampedIndex;
      return next;
    });
  }, []);

  const openSectionAt = useCallback(
    (sectionIndex: number) => {
      if (!unlockedSections[sectionIndex]) {
        return;
      }
      setOpenSection((current) => (current === sectionIndex ? null : sectionIndex));
    },
    [unlockedSections]
  );

  const unlockNextSection = useCallback((sectionIndex: number) => {
    const nextSection = sectionIndex + 1;
    setUnlockedSections((previous) => {
      if (nextSection >= previous.length || previous[nextSection]) {
        return previous;
      }
      const next = [...previous];
      next[nextSection] = true;
      return next;
    });
  }, []);

  const markSectionCompleted = useCallback(
    (sectionIndex: number) => {
      setCompletedSections((previous) => {
        if (previous[sectionIndex]) {
          return previous;
        }
        const next = [...previous];
        next[sectionIndex] = true;
        return next;
      });
      unlockNextSection(sectionIndex);
    },
    [unlockNextSection]
  );

  const getSectionStatus = useCallback(
    (sectionIndex: number, isOpen: boolean): { label: string; accent: KangurAccent } => {
      if (!unlockedSections[sectionIndex]) {
        return {
          label: 'Zablokowana',
          accent: 'slate',
        };
      }
      if (completedSections[sectionIndex]) {
        return {
          label: 'Ukończono',
          accent: 'emerald',
        };
      }
      if (isOpen) {
        return {
          label: 'W trakcie',
          accent: 'indigo',
        };
      }
      return {
        label: 'Do zrobienia',
        accent: 'slate',
      };
    },
    [completedSections, unlockedSections]
  );

  const handleStartTraining = useCallback(() => {
    const progress = loadProgress();
    addXp(XP_REWARDS.lesson_completed, {
      lessonsCompleted: progress.lessonsCompleted + 1,
      lessonMastery: buildLessonMasteryUpdate(progress, 'clock', 60),
    });
    setInTraining(true);
  }, []);

  const goNext = useCallback(() => {
    if (!activeSection || openSection === null) {
      return;
    }

    if (isFinalSection && isFinalSlide) {
      markSectionCompleted(openSection);
      handleStartTraining();
      return;
    }

    if (isFinalSlide) {
      markSectionCompleted(openSection);
      const nextSection = openSection + 1;
      setOpenSection(nextSection);
      setSectionSlideIndex(nextSection, 0);
      return;
    }

    setSectionSlideIndex(openSection, activeSlideIndex + 1);
  }, [
    activeSection,
    activeSlideIndex,
    handleStartTraining,
    isFinalSection,
    isFinalSlide,
    markSectionCompleted,
    openSection,
    setSectionSlideIndex,
  ]);

  const goPrev = useCallback(() => {
    if (!activeSection || openSection === null) {
      return;
    }

    if (activeSlideIndex > 0) {
      setSectionSlideIndex(openSection, activeSlideIndex - 1);
      return;
    }

    if (openSection > 0) {
      const previousSection = openSection - 1;
      const previousSectionLastSlide = (LESSON_SECTIONS[previousSection]?.slides.length ?? 1) - 1;
      openSectionAt(previousSection);
      setSectionSlideIndex(previousSection, previousSectionLastSlide);
      return;
    }

    handleBack();
  }, [
    activeSection,
    activeSlideIndex,
    handleBack,
    openSection,
    openSectionAt,
    setSectionSlideIndex,
  ]);

  if (inTraining) {
    return (
      <div className='flex flex-col items-center w-full max-w-lg gap-4'>
        <KangurButton
          onClick={() => setInTraining(false)}
          className='self-start'
          size='sm'
          type='button'
          variant='surface'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć do lekcji
        </KangurButton>
        <KangurGlassPanel
          className='flex w-full flex-col items-center gap-5'
          data-testid='clock-lesson-training-shell'
          padding='xl'
          surface='solid'
        >
          <KangurFeatureHeader
            accent='indigo'
            badgeSize='md'
            data-testid='clock-lesson-training-header'
            headingSize='sm'
            icon='🕐'
            title='Ćwiczenie z zegarem'
          />
          <ClockTrainingGame onFinish={handleBack} />
        </KangurGlassPanel>
      </div>
    );
  }

  if (!activeSection || !activeSlide) {
    return (
      <div className='flex flex-col items-center w-full max-w-lg gap-4'>
        <KangurButton
          onClick={handleBack}
          className='self-start'
          size='sm'
          type='button'
          variant='surface'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć do lekcji
        </KangurButton>
        <KangurLessonCallout
          data-testid='clock-lesson-collapsed-hint'
          accent='indigo'
          className='w-full border-dashed py-5 text-center text-sm font-semibold text-indigo-700'
        >
          Wszystkie sekcje są zwinięte. Kliknij nagłówek sekcji, aby kontynuować naukę.
        </KangurLessonCallout>

        {LESSON_SECTIONS.map((section, sectionIndex) => (
          <KangurGlassPanel
            key={section.id}
            className='flex w-full flex-col gap-3'
            data-testid={`clock-lesson-section-shell-${section.id}`}
            padding='lg'
            surface='solid'
          >
            {(() => {
              const status = getSectionStatus(sectionIndex, false);
              const isLocked = !unlockedSections[sectionIndex];
              return (
                <KangurOptionCardButton
                  accent='indigo'
                  data-testid={`clock-lesson-section-toggle-${section.id}`}
                  onClick={() => openSectionAt(sectionIndex)}
                  aria-expanded={false}
                  className={cn(
                    'flex items-center justify-between gap-4 rounded-[30px] px-5 py-4',
                    isLocked && 'bg-slate-100/85 text-slate-500 shadow-none hover:translate-y-0'
                  )}
                  emphasis='neutral'
                  disabled={isLocked}
                  type='button'
                >
                  <div>
                    <p className='text-xs font-bold uppercase tracking-wide text-indigo-400'>
                      Nauka Zegara
                    </p>
                    <KangurHeadline accent='indigo' as='h3' size='xs'>
                      {section.title}
                    </KangurHeadline>
                    <p className='mt-1 text-sm text-slate-500'>{section.subtitle}</p>
                    <KangurStatusChip
                      accent={status.accent}
                      data-testid={`clock-lesson-section-status-${section.id}`}
                      className='mt-1 uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {status.label}
                    </KangurStatusChip>
                    {isLocked && (
                      <p
                        data-testid={`clock-lesson-section-locked-hint-${section.id}`}
                        className='text-xs text-slate-500 mt-1'
                      >
                        {LOCKED_SECTION_HINT}
                      </p>
                    )}
                  </div>
                  {isLocked ? (
                    <Lock className='w-5 h-5 text-slate-500 flex-shrink-0' />
                  ) : (
                    <ChevronRight className='w-5 h-5 text-indigo-500 flex-shrink-0' />
                  )}
                </KangurOptionCardButton>
              );
            })()}
          </KangurGlassPanel>
        ))}
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center w-full max-w-lg gap-4'>
      <KangurButton
        onClick={handleBack}
        className='self-start'
        size='sm'
        type='button'
        variant='surface'
      >
        <ArrowLeft className='w-4 h-4' /> Wróć do lekcji
      </KangurButton>

      {LESSON_SECTIONS.map((section, sectionIndex) => {
        const isOpen = sectionIndex === openSection;
        const sectionSlideIndex = sectionSlides[sectionIndex] ?? 0;
        const sectionProgressText = `${sectionSlideIndex + 1}/${section.slides.length}`;
        const status = getSectionStatus(sectionIndex, isOpen);
        const isLocked = !unlockedSections[sectionIndex];

        return (
          <KangurGlassPanel
            key={section.id}
            className='flex w-full flex-col gap-3'
            data-testid={`clock-lesson-section-shell-${section.id}`}
            padding='lg'
            surface='solid'
          >
            <KangurOptionCardButton
              accent='indigo'
              data-testid={`clock-lesson-section-toggle-${section.id}`}
              onClick={() => openSectionAt(sectionIndex)}
              aria-expanded={isOpen}
              className={cn(
                'flex items-center justify-between gap-4 rounded-[30px] px-5 py-4',
                isLocked && 'bg-slate-100/85 text-slate-500 shadow-none hover:translate-y-0'
              )}
              emphasis={isOpen ? 'accent' : 'neutral'}
              disabled={isLocked}
              type='button'
            >
              <div>
                <p className='text-xs font-bold uppercase tracking-wide text-indigo-400'>
                  Nauka Zegara
                </p>
                <KangurHeadline accent='indigo' as='h3' size='xs'>
                  {section.title}
                </KangurHeadline>
                <p className='mt-1 text-sm text-slate-500'>{section.subtitle}</p>
                <KangurStatusChip
                  accent={status.accent}
                  data-testid={`clock-lesson-section-status-${section.id}`}
                  className='mt-1 uppercase tracking-[0.14em]'
                  size='sm'
                >
                  {status.label}
                </KangurStatusChip>
                {isLocked && (
                  <p
                    data-testid={`clock-lesson-section-locked-hint-${section.id}`}
                    className='text-xs text-slate-500 mt-1'
                  >
                    {LOCKED_SECTION_HINT}
                  </p>
                )}
                <p className='text-xs font-semibold text-indigo-500 mt-1'>
                  Postęp sekcji: {sectionProgressText}
                </p>
              </div>
              {isLocked ? (
                <Lock className='w-5 h-5 text-slate-500 flex-shrink-0' />
              ) : isOpen ? (
                <ChevronDown className='w-5 h-5 text-indigo-500 flex-shrink-0' />
              ) : (
                <ChevronRight className='w-5 h-5 text-indigo-500 flex-shrink-0' />
              )}
            </KangurOptionCardButton>

            {isOpen && (
              <div className='pt-2 flex flex-col gap-4'>
                <KangurDivider
                  accent='indigo'
                  className='w-full'
                  data-testid={`clock-lesson-section-divider-${section.id}`}
                  size='sm'
                />
                <div className='flex gap-2'>
                  {section.slides.map((_, slideIndex) => (
                    <button
                      key={`${section.id}-${slideIndex}`}
                      onClick={() => {
                        setSectionSlideIndex(sectionIndex, slideIndex);
                      }}
                      type='button'
                      aria-label={`Przejdz do slajdu ${slideIndex + 1} w sekcji ${section.title}`}
                      aria-current={slideIndex === sectionSlideIndex ? 'step' : undefined}
                      className={cn(
                        KANGUR_STEP_PILL_CLASSNAME,
                        'h-[14px] min-w-[14px]',
                        slideIndex === sectionSlideIndex
                          ? 'w-8 scale-[1.04] bg-indigo-500'
                          : slideIndex < sectionSlideIndex
                            ? 'w-6 bg-indigo-200'
                            : 'w-[14px] soft-cta opacity-80 hover:opacity-100'
                      )}
                      data-testid={`clock-lesson-section-slide-${section.id}-${slideIndex}`}
                    />
                  ))}
                </div>

                <div className='flex items-center justify-between gap-3'>
                  <KangurHeadline accent='slate' as='h4' size='xs'>
                    {activeSlide.title}
                  </KangurHeadline>
                </div>

                <AnimatePresence mode='wait'>
                  <motion.div
                    key={`${section.id}-${sectionSlideIndex}`}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className='w-full flex flex-col items-center'
                  >
                    {activeSlide.content}
                  </motion.div>
                </AnimatePresence>

                <div className='flex gap-3 w-full'>
                  <KangurButton onClick={goPrev} size='lg' type='button' variant='surface'>
                    <ArrowLeft className='w-4 h-4' />
                    {openSection === 0 && activeSlideIndex === 0 ? 'Wróć' : 'Wstecz'}
                  </KangurButton>

                  <KangurButton
                    onClick={goNext}
                    className='flex-1'
                    size='lg'
                    type='button'
                    variant='primary'
                  >
                    {isFinalSection && isFinalSlide ? (
                      'Ćwiczenie z zegarem 🕐'
                    ) : isFinalSlide ? (
                      'Następna sekcja'
                    ) : (
                      <>
                        <span>Dalej</span>
                        <ArrowRight className='w-4 h-4' />
                      </>
                    )}
                  </KangurButton>
                </div>
              </div>
            )}
          </KangurGlassPanel>
        );
      })}
    </div>
  );
}
