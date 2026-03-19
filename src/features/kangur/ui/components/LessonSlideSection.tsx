'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEventHandler } from 'react';

import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import {
  useKangurLessonBackAction,
  useKangurLessonSecretPill,
  useKangurRegisterLessonSubsectionNavigation,
  useKangurSyncLessonSubsectionSummary,
  type KangurLessonSubsectionSummary,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurLessonPanelCtaSync } from '@/features/kangur/ui/hooks/useKangurLessonPanelCtaSync';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { KANGUR_PANEL_GAP_CLASSNAME, KANGUR_STEP_PILL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { cn } from '@/features/kangur/shared/utils';

export type LessonSlide = {
  title: string;
  content: React.JSX.Element;
  panelClassName?: string;
  containerClassName?: string;
};

type LessonSlideSectionProps = {
  slides: LessonSlide[];
  sectionHeader?: KangurLessonSubsectionSummary | null;
  onBack?: () => void;
  onComplete?: () => void;
  onProgressChange?: (viewedCount: number, totalCount: number) => void;
  onPanelTimeUpdate?: (panelIndex: number, panelTitle: string, seconds: number) => void;
  dotActiveClass: string;
  dotDoneClass: string;
  gradientClass: string;
};

export default function LessonSlideSection({
  slides,
  sectionHeader = null,
  onBack,
  onComplete,
  onProgressChange,
  onPanelTimeUpdate,
  dotActiveClass,
  dotDoneClass,
}: LessonSlideSectionProps): React.JSX.Element {
  const lessonChrome = useTranslations('KangurLessonChrome');
  const prefersReducedMotion = useReducedMotion();
  const slideMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const handleBack = useKangurLessonBackAction(onBack);
  const secretLessonPill = useKangurLessonSecretPill();
  const registerSubsectionNavigation = useKangurRegisterLessonSubsectionNavigation();
  useKangurSyncLessonSubsectionSummary(sectionHeader);
  const slideInstanceId = useId();
  const slideTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [slide, setSlide] = useState(0);
  const completionReportedRef = useRef(false);
  const panelTimeUpdateRef = useRef(onPanelTimeUpdate);
  const panelTimeFlushRef = useRef<(() => void) | null>(null);
  const slidesRef = useRef(slides);
  const panelTimingRef = useRef({
    activeIndex: 0,
    lastTick: null as number | null,
    panelTimes: new Map<number, number>(),
  });
  const totalSlides = slides.length;
  const isLast = slide === totalSlides - 1;
  const isFirst = slide === 0;
  const activeSlide = slides[slide];
  const slidePanelId = `lesson-slide-panel-${slideInstanceId}`;
  const slideTitleId = `lesson-slide-title-${slideInstanceId}`;
  const slideStatusId = `lesson-slide-status-${slideInstanceId}`;
  const slideKeyboardHintId = `lesson-slide-keyboard-${slideInstanceId}`;
  const shouldRenderNavigationPills = totalSlides > 1 || Boolean(secretLessonPill?.isUnlocked);
  const shouldRenderArrowNavigation = totalSlides > 1;
  const isMobile = useKangurMobileBreakpoint();
  const syncLessonPanelCta = useKangurLessonPanelCtaSync();
  const translateLessonChrome = (key: string, fallback: string): string => {
    const translated = lessonChrome(key);
    return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
  };
  const backToTopicsLabel = translateLessonChrome('backToTopics', 'Wróć do tematów');
  const panelsNavigationLabel = translateLessonChrome('panelsNavigation', 'Nawigacja paneli');
  const previousPanelLabel = translateLessonChrome('previousPanel', 'Poprzedni panel');
  const nextPanelLabel = translateLessonChrome('nextPanel', 'Następny panel');
  const getPanelLabel = (index: number): string => {
    try {
      const translated = lessonChrome('panelLabel', { index });
      return translated === 'panelLabel' || translated.endsWith('.panelLabel')
        ? `Panel ${index}`
        : translated;
    } catch {
      return `Panel ${index}`;
    }
  };
  const handlePanelNavigationCta = (ctaId: string, action: () => void): void => {
    panelTimeFlushRef.current?.();
    syncLessonPanelCta(ctaId);
    action();
  };
  const goPreviousSlide = (): void => {
    setSlide((currentSlide) => Math.max(0, currentSlide - 1));
  };
  const goNextSlide = (): void => {
    setSlide((currentSlide) => Math.min(totalSlides - 1, currentSlide + 1));
  };
  const handlePreviousSlideCta = (): void => {
    handlePanelNavigationCta('lesson_panel_prev', goPreviousSlide);
  };
  const handleNextSlideCta = (): void => {
    handlePanelNavigationCta('lesson_panel_next', goNextSlide);
  };
  const handleBackCta = (): void => {
    handlePanelNavigationCta('lesson_panel_back', handleBack);
  };
  const handleKeyDownCapture: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.metaKey || event.altKey || event.ctrlKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target) {
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'PageUp': {
        if (!isFirst) {
          event.preventDefault();
          goPreviousSlide();
        }
        break;
      }
      case 'ArrowRight':
      case 'PageDown': {
        if (!isLast) {
          event.preventDefault();
          goNextSlide();
        }
        break;
      }
      case 'Home': {
        if (!isFirst) {
          event.preventDefault();
          setSlide(0);
        }
        break;
      }
      case 'End': {
        if (!isLast) {
          event.preventDefault();
          setSlide(totalSlides - 1);
        }
        break;
      }
      default:
        break;
    }
  };

  if (!activeSlide) {
    return (
      <KangurEmptyState
        accent='slate'
        align='center'
        data-testid='lesson-slide-empty'
        description='Dodaj przynajmniej jeden slajd, aby uruchomić tę sekcję lekcji.'
        padding='lg'
        title='Brak slajdu.'
      />
    );
  }

  useEffect(() => {
    panelTimeUpdateRef.current = onPanelTimeUpdate;
  }, [onPanelTimeUpdate]);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    onProgressChange?.(slide + 1, slides.length);
  }, [onProgressChange, slide, slides.length]);

  useEffect(() => {
    if (!isLast || completionReportedRef.current) {
      return;
    }

    completionReportedRef.current = true;
    onComplete?.();
  }, [isLast, onComplete]);

  useEffect(() => {
    const unregister = registerSubsectionNavigation();
    return unregister;
  }, [registerSubsectionNavigation]);

  useEffect(() => {
    slideTitleRef.current?.focus({ preventScroll: true });
  }, [slide]);

  useEffect(() => {
    if (!panelTimeUpdateRef.current) {
      return;
    }

    const flushActivePanel = (now: number): void => {
      const state = panelTimingRef.current;
      if (state.lastTick === null) {
        return;
      }

      const delta = Math.max(0, now - state.lastTick);
      if (delta > 0) {
        const current = state.panelTimes.get(state.activeIndex) ?? 0;
        state.panelTimes.set(state.activeIndex, current + delta);
      }

      state.lastTick = now;
    };

    const commitPanelTime = (panelIndex: number): void => {
      const update = panelTimeUpdateRef.current;
      if (!update) {
        return;
      }

      const ms = panelTimingRef.current.panelTimes.get(panelIndex) ?? 0;
      const seconds = Math.round(ms / 1000);
      if (seconds <= 0) {
        return;
      }

        const panelTitle =
          slidesRef.current[panelIndex]?.title ??
          getPanelLabel(panelIndex + 1);
      update(panelIndex, panelTitle, seconds);
    };

    const flushCurrentPanelTime = (): void => {
      const state = panelTimingRef.current;
      if (state.lastTick === null) {
        return;
      }

      const now = Date.now();
      flushActivePanel(now);
      commitPanelTime(state.activeIndex);
    };

    const pauseTracking = (): void => {
      const state = panelTimingRef.current;
      if (state.lastTick === null) {
        return;
      }

      const now = Date.now();
      flushActivePanel(now);
      commitPanelTime(state.activeIndex);
      state.lastTick = null;
    };

    const resumeTracking = (): void => {
      const state = panelTimingRef.current;
      if (state.lastTick !== null) {
        return;
      }

      state.lastTick = Date.now();
    };

    const handleVisibilityChange = (): void => {
      const isVisible =
        typeof document === 'undefined' || document.visibilityState === 'visible';
      const isFocused = typeof document === 'undefined' || document.hasFocus();
      if (isVisible && isFocused) {
        resumeTracking();
      } else {
        pauseTracking();
      }
    };

    handleVisibilityChange();

    const handlePageHide = (): void => {
      pauseTracking();
    };

    panelTimeFlushRef.current = flushCurrentPanelTime;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      panelTimeFlushRef.current = null;
      pauseTracking();
    };
  }, []);

  useInterval(() => {
    panelTimeFlushRef.current?.();
  }, 15000);

  useEffect(() => {
    const update = panelTimeUpdateRef.current;
    if (!update) {
      return;
    }

    const state = panelTimingRef.current;
    if (state.activeIndex === slide) {
      return;
    }

    const now = Date.now();
    if (state.lastTick !== null) {
      const delta = Math.max(0, now - state.lastTick);
      if (delta > 0) {
        const current = state.panelTimes.get(state.activeIndex) ?? 0;
        state.panelTimes.set(state.activeIndex, current + delta);
      }
      state.lastTick = now;
      const ms = state.panelTimes.get(state.activeIndex) ?? 0;
      const seconds = Math.round(ms / 1000);
      if (seconds > 0) {
        const panelTitle =
          slidesRef.current[state.activeIndex]?.title ??
          getPanelLabel(state.activeIndex + 1);
        update(state.activeIndex, panelTitle, seconds);
      }
    }

    state.activeIndex = slide;
  }, [slide]);

  const isPrevDisabled = isFirst;
  const isNextDisabled = isLast;
  const renderBackButton = (className?: string): React.JSX.Element => (
    <KangurButton
      onClick={handleBackCta}
      size='sm'
      variant='surface'
      className={cn(
        'hidden w-full justify-center sm:inline-flex sm:w-auto sm:justify-start sm:justify-self-start',
        className
      )}
      data-kangur-lesson-back='true'
      data-kangur-lesson-back-label={backToTopicsLabel}
    >
      <ChevronLeft className='w-4 h-4' aria-hidden='true' />
      {backToTopicsLabel}
    </KangurButton>
  );
  const renderArrowNavigation = (className?: string): React.JSX.Element | null => {
    if (!shouldRenderArrowNavigation) {
      return null;
    }

    return (
      <div
        className={cn(
          'flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-self-center',
          className
        )}
        role='group'
        aria-label={panelsNavigationLabel}
      >
        <KangurButton
          onClick={handlePreviousSlideCta}
          disabled={isPrevDisabled}
          aria-label={previousPanelLabel}
          aria-keyshortcuts='ArrowLeft PageUp'
          aria-controls={slidePanelId}
          className='justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-20'
          data-testid='lesson-slide-prev-button'
          size='sm'
          type='button'
          title={previousPanelLabel}
          variant='surface'
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>

        <KangurButton
          onClick={handleNextSlideCta}
          disabled={isNextDisabled}
          aria-label={nextPanelLabel}
          aria-keyshortcuts='ArrowRight PageDown'
          aria-controls={slidePanelId}
          className='justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-20'
          data-testid='lesson-slide-next-button'
          size='sm'
          type='button'
          title={nextPanelLabel}
          variant='surface'
        >
          <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex w-full max-w-md flex-col items-center',
        KANGUR_PANEL_GAP_CLASSNAME,
        activeSlide.containerClassName
      )}
      onKeyDownCapture={handleKeyDownCapture}
    >
      <div className='flex w-full flex-col kangur-panel-gap sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
        {renderBackButton()}

        {shouldRenderArrowNavigation ? renderArrowNavigation() : <div className='hidden sm:block' />}

        {shouldRenderNavigationPills ? (
          <nav
            className='flex w-full flex-wrap items-center justify-center gap-2'
            aria-label='Nawigacja slajdów'
            aria-describedby={slideKeyboardHintId}
          >
            {slides.map((slideItem, i) => (
              <button
                key={i}
                type='button'
                onClick={() =>
                  handlePanelNavigationCta(`lesson_panel_indicator_${i + 1}`, () => setSlide(i))
                }
                aria-label={`Przejdź do slajdu ${i + 1} z ${totalSlides}: ${slideItem.title}`}
                aria-current={i === slide ? 'step' : undefined}
                aria-controls={slidePanelId}
                aria-posinset={i + 1}
                aria-setsize={totalSlides}
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[14px] w-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                  i === slide
                    ? ['scale-[1.04]', dotActiveClass]
                    : i < slide
                      ? dotDoneClass
                      : 'kangur-step-pill-pending'
                )}
                data-testid={`lesson-slide-indicator-${i}`}
              />
            ))}
            {secretLessonPill?.isUnlocked ? (
              <button
                type='button'
                onClick={() =>
                  handlePanelNavigationCta('lesson_panel_secret', secretLessonPill.onOpen)
                }
                aria-label='Otwórz sekretny panel'
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[14px] min-w-[40px] cursor-pointer justify-center text-[10px] font-black shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white'
                )}
                style={{
                  background:
                    'linear-gradient(90deg, color-mix(in srgb, rgb(252 211 77) 78%, var(--kangur-soft-card-background)) 0%, color-mix(in srgb, rgb(253 224 71) 84%, var(--kangur-soft-card-background)) 50%, color-mix(in srgb, rgb(245 158 11) 82%, var(--kangur-soft-card-background)) 100%)',
                  color: 'color-mix(in srgb, rgb(120 53 15) 84%, var(--kangur-page-text))',
                  boxShadow: '0 4px 10px -6px rgba(217,119,6,0.4)',
                  borderColor: 'color-mix(in srgb, rgb(251 191 36) 72%, var(--kangur-soft-card-border))',
                }}
                data-testid='lesson-slide-secret-indicator'
                title='Sekretny panel'
              >
                <span aria-hidden='true'>★</span>
              </button>
            ) : null}
          </nav>
        ) : null}
      </div>
      <p id={slideKeyboardHintId} className='sr-only'>
        Użyj strzałek w lewo i prawo lub Page Up i Page Down, aby zmieniać slajdy.
      </p>

      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          {...slideMotionProps}
          className='w-full'
        >
          <KangurGlassPanel
            id={slidePanelId}
            role='region'
            aria-roledescription='slajd'
            aria-labelledby={slideTitleId}
            aria-describedby={slideStatusId}
            className={cn(
              'flex min-h-[260px] flex-col',
              KANGUR_PANEL_GAP_CLASSNAME,
              activeSlide.panelClassName
            )}
            data-testid='lesson-slide-shell'
            padding='xl'
            surface='solid'
          >
            <p
              id={slideStatusId}
              className='sr-only'
              role='status'
              aria-live='polite'
              aria-atomic='true'
            >
              Slajd {slide + 1} z {totalSlides}: {activeSlide.title}
            </p>
            <h2
              id={slideTitleId}
              ref={slideTitleRef}
              tabIndex={-1}
              className='text-xl font-extrabold [color:var(--kangur-page-text)]'
            >
              {activeSlide.title}
            </h2>
            <div className='flex-1'>{activeSlide.content}</div>
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>

      {isMobile && shouldRenderArrowNavigation ? (
        <div className='flex w-full flex-col items-center gap-2'>
          {renderArrowNavigation()}
        </div>
      ) : null}
    </div>
  );
}
