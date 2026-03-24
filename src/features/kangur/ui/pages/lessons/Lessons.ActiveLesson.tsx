import { motion } from 'framer-motion';
import { ChevronsLeft } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';
import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNavigationIconButton } from '@/features/kangur/ui/components/KangurLessonNavigationIconButton';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { KangurLessonPrintProvider } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import {
  KangurGlassPanel,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { LESSON_COMPONENTS } from '@/features/kangur/lessons/lesson-ui-registry';
import { useLessons } from './LessonsContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  LESSON_NAV_ANCHOR_ID,
  LESSONS_ACTIVE_LAYOUT_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
  LESSONS_ACTIVE_STACK_GAP_CLASSNAME,
} from './Lessons.constants';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';

type ActiveLessonRenderSnapshot = {
  activeLesson: NonNullable<ReturnType<typeof useLessons>['activeLesson']>;
  activeLessonId: string;
  lessonDocuments: ReturnType<typeof useLessons>['lessonDocuments'];
  lessonAssignmentsByComponent: ReturnType<typeof useLessons>['lessonAssignmentsByComponent'];
  completedLessonAssignmentsByComponent: ReturnType<
    typeof useLessons
  >['completedLessonAssignmentsByComponent'];
  orderedLessons: ReturnType<typeof useLessons>['orderedLessons'];
  isSecretLessonActive: ReturnType<typeof useLessons>['isSecretLessonActive'];
  progress: ReturnType<typeof useLessons>['progress'];
  isActiveLessonDocumentLoading: ReturnType<typeof useLessons>['isActiveLessonDocumentLoading'];
};

const STUDIQ_PRINT_BRAND_LABEL = 'StudiQ';

export function ActiveLessonView({
  snapshot,
}: {
  snapshot?: ActiveLessonRenderSnapshot;
}) {
  const locale = useLocale();
  const translations = useTranslations('KangurLessonsPage');
  const lessons = useLessons();
  const {
    handleSelectLesson,
    setIsActiveLessonComponentReady,
    activeLessonHeaderRef,
    activeLessonNavigationRef,
    activeLessonContentRef,
  } = lessons;
  const activeLesson = snapshot?.activeLesson ?? lessons.activeLesson;
  const lessonDocuments = snapshot?.lessonDocuments ?? lessons.lessonDocuments;
  const lessonAssignmentsByComponent =
    snapshot?.lessonAssignmentsByComponent ?? lessons.lessonAssignmentsByComponent;
  const completedLessonAssignmentsByComponent =
    snapshot?.completedLessonAssignmentsByComponent ??
    lessons.completedLessonAssignmentsByComponent;
  const isActiveLessonDocumentLoading =
    snapshot?.isActiveLessonDocumentLoading ?? lessons.isActiveLessonDocumentLoading;
  const orderedLessons = snapshot?.orderedLessons ?? lessons.orderedLessons;
  const isSecretLessonActive =
    snapshot?.isSecretLessonActive ?? lessons.isSecretLessonActive;
  const progress = snapshot?.progress ?? lessons.progress;

  const { entry: activeLessonHeaderContent } = useKangurPageContentEntry('lessons-active-header');
  const { entry: activeLessonAssignmentContent } = useKangurPageContentEntry('lessons-active-assignment');
  const { entry: activeLessonDocumentContent } = useKangurPageContentEntry('lessons-active-document');
  const { entry: activeLessonNavigationContent } = useKangurPageContentEntry('lessons-active-navigation');
  const { entry: activeLessonEmptyDocumentContent } = useKangurPageContentEntry('lessons-active-empty-document');
  const { entry: activeLessonSecretPanelContent } = useKangurPageContentEntry('lessons-active-secret-panel');

  const isMobile = useKangurMobileBreakpoint();
  const backToLessonsLabel = translations('mobileControls.backToLessons');

  const secretHostLesson = orderedLessons.at(-1) ?? null;
  const masteryByComponent = progress?.lessonMastery ?? {};
  const isSecretLessonUnlocked =
    orderedLessons.length > 0 &&
    orderedLessons.every((lesson) => (masteryByComponent[lesson.componentId]?.completions ?? 0) > 0);
  const isSecretLessonHostActive = isSecretLessonActive && Boolean(activeLesson?.id === secretHostLesson?.id);
  const handleOpenSecretLesson = () => {
    if (!secretHostLesson) return;
    handleSelectLesson(secretHostLesson.id, { secret: true });
  };
  const secretHostLabel = secretHostLesson?.title ?? 'Ostatnia lekcja';

  const emptyDocumentTitle = activeLessonEmptyDocumentContent?.title?.trim() || activeLesson?.title || '';
  const emptyDocumentDescription =
    activeLessonEmptyDocumentContent?.summary?.trim() ||
    'Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.';
  const activeLessonDocument = activeLesson ? lessonDocuments[activeLesson.id] ?? null : null;
  const hasActiveLessonDocContent = hasKangurLessonDocumentContent(activeLessonDocument);
  const activeLessonAssignment = activeLesson
    ? (lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null)
    : null;
  const completedActiveLessonAssignment =
    activeLesson && !activeLessonAssignment
      ? (completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null)
      : null;
  const printableLessonTitle = activeLesson
    ? getLocalizedKangurLessonTitle(activeLesson.componentId, locale, activeLesson.title)
    : '';
  const activeLessonAssignmentRef = useRef<HTMLDivElement | null>(null);

  useKangurTutorAnchor({
    id: 'kangur-lesson-header',
    kind: 'lesson_header',
    ref: activeLessonHeaderRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson) && !isMobile,
    priority: 120,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLessonHeaderContent?.title ?? activeLesson?.title ?? null,
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? null,
    },
  });

  useKangurTutorAnchor({
    id: 'kangur-lesson-assignment',
    kind: 'assignment',
    ref: activeLessonAssignmentRef,
    surface: 'lesson',
    enabled:
      Boolean(activeLesson) &&
      !isMobile &&
      Boolean(activeLessonAssignment ?? completedActiveLessonAssignment),
    priority: 160,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLessonAssignmentContent?.title ?? activeLesson?.title ?? null,
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? null,
    },
  });

  useKangurTutorAnchor({
    id: LESSON_NAV_ANCHOR_ID,
    kind: 'navigation',
    ref: activeLessonNavigationRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson),
    priority: 80,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLessonNavigationContent?.title ?? activeLesson?.title ?? null,
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? null,
    },
  });

  useKangurTutorAnchor({
    id: 'kangur-lesson-document',
    kind: 'document',
    ref: activeLessonContentRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson?.contentMode === 'document' && hasActiveLessonDocContent),
    priority: 140,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLessonDocumentContent?.title ?? activeLesson?.title ?? null,
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? null,
    },
  });

  useKangurTutorAnchor({
    id: 'kangur-lesson-empty-document',
    kind: 'empty_state',
    ref: activeLessonContentRef,
    surface: 'lesson',
    enabled: Boolean(
      activeLesson?.contentMode === 'document' &&
        !hasActiveLessonDocContent &&
        !isActiveLessonDocumentLoading
    ),
    priority: 140,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLessonEmptyDocumentContent?.title ?? activeLesson?.title ?? null,
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? null,
    },
  });

  const handleReturnToLessonList = useCallback((): void => {
    handleSelectLesson(null);
  }, [handleSelectLesson]);

  const handleLessonBackAction = useCallback((): void => {
    const container = activeLessonContentRef.current;
    if (!container) {
      handleReturnToLessonList();
      return;
    }
    const backButton = container.querySelector('[data-kangur-lesson-back="true"]');
    if (backButton instanceof HTMLButtonElement) {
      try {
        backButton.click();
        return;
      } catch {
        handleReturnToLessonList();
        return;
      }
    }
    handleReturnToLessonList();
  }, [activeLessonContentRef, handleReturnToLessonList]);
  const handlePrintPanel = useCallback((targetPanelId?: string): void => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      typeof window.print !== 'function'
    ) {
      return;
    }

    const originalDocumentTitle = document.title;
    const printRoot = activeLessonContentRef.current;
    const targetablePanels = printRoot
      ? Array.from(
          printRoot.querySelectorAll<HTMLElement>('[data-kangur-print-panel-id]')
        )
      : [];
    const matchedTargetPanel = targetPanelId
      ? targetablePanels.find((panel) => panel.dataset['kangurPrintPanelId'] === targetPanelId) ??
        null
      : null;
    const matchedTargetPanelTitle =
      matchedTargetPanel?.dataset['kangurPrintPanelTitle']?.trim() || '';
    const printContentTitle =
      printableLessonTitle.trim() && matchedTargetPanelTitle
        ? `${printableLessonTitle.trim()} - ${matchedTargetPanelTitle}`
        : printableLessonTitle.trim() || matchedTargetPanelTitle || originalDocumentTitle;
    const printDocumentTitle = printContentTitle.startsWith(`${STUDIQ_PRINT_BRAND_LABEL} -`)
      ? printContentTitle
      : `${STUDIQ_PRINT_BRAND_LABEL} - ${printContentTitle}`;

    if (printDocumentTitle) {
      document.title = printDocumentTitle;
    }

    document.body.classList.add('kangur-print-mode');
    if (printRoot && matchedTargetPanel) {
      printRoot.dataset['kangurPrintTargeted'] = 'true';
      matchedTargetPanel.dataset['kangurPrintTargetPanel'] = 'true';
      targetablePanels.forEach((panel) => {
        const shouldKeepVisible =
          panel === matchedTargetPanel ||
          panel.contains(matchedTargetPanel) ||
          matchedTargetPanel.contains(panel);
        panel.dataset['kangurPrintPanelSelected'] = shouldKeepVisible ? 'true' : 'false';
      });
    }
    let isCleanedUp = false;
    let focusCleanupTimer: number | null = null;

    const handleWindowFocus = (): void => {
      if (focusCleanupTimer !== null) {
        window.clearTimeout(focusCleanupTimer);
      }
      focusCleanupTimer = window.setTimeout(() => {
        cleanup();
      }, 0);
    };

    const cleanup = (): void => {
      if (isCleanedUp) {
        return;
      }
      isCleanedUp = true;
      document.body.classList.remove('kangur-print-mode');
      document.title = originalDocumentTitle;
      if (printRoot) {
        delete printRoot.dataset['kangurPrintTargeted'];
      }
      if (matchedTargetPanel) {
        delete matchedTargetPanel.dataset['kangurPrintTargetPanel'];
      }
      targetablePanels.forEach((panel) => {
        delete panel.dataset['kangurPrintPanelSelected'];
      });
      window.removeEventListener('afterprint', cleanup);
      window.removeEventListener('focus', handleWindowFocus);
      if (focusCleanupTimer !== null) {
        window.clearTimeout(focusCleanupTimer);
        focusCleanupTimer = null;
      }
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.addEventListener('focus', handleWindowFocus, { once: true });

    try {
      window.print();
    } catch {
      cleanup();
    }
  }, [activeLessonContentRef, printableLessonTitle]);

  if (!activeLesson) {
    return null;
  }

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const prev = activeIdx > 0 ? orderedLessons[activeIdx - 1] : null;
  const next =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1 ? orderedLessons[activeIdx + 1] : null;

  const ActiveLessonComponent = LESSON_COMPONENTS[activeLesson.componentId];
  const localizedLessonTitle = getLocalizedKangurLessonTitle(
    activeLesson.componentId,
    locale,
    activeLesson.title
  );
  const localizedLessonDescription = getLocalizedKangurLessonDescription(
    activeLesson.componentId,
    locale,
    activeLesson.description
  );
  const isPrintAvailable =
    isSecretLessonHostActive ||
    (activeLesson.contentMode === 'document'
      ? hasActiveLessonDocContent
      : Boolean(ActiveLessonComponent));

  const headerSection = !isMobile ? (
    <div
      ref={activeLessonHeaderRef}
      id='kangur-lesson-header'
      data-kangur-print-exclude='true'
      className={LESSONS_ACTIVE_SECTION_CLASSNAME}
    >
      <KangurActiveLessonHeader
        lesson={activeLesson}
        lessonDocument={activeLessonDocument}
        lessonContentRef={activeLessonContentRef}
        activeLessonAssignment={activeLessonAssignment}
        completedActiveLessonAssignment={completedActiveLessonAssignment}
        assignmentRef={activeLessonAssignmentRef}
        onBack={handleReturnToLessonList}
        titleOverride={activeLessonHeaderContent?.title ?? 'Aktywna lekcja'}
        headerTestId='active-lesson-header'
        headerActionsTestId='active-lesson-header-icon-actions'
        iconTestId={`active-lesson-icon-${activeLesson.id}`}
        priorityChipTestId='active-lesson-parent-priority-chip'
        completedChipTestId='active-lesson-parent-completed-chip'
        descriptionOverride={activeLessonHeaderContent?.summary ?? undefined}
        assignmentSectionTitle={activeLessonAssignmentContent?.title ?? undefined}
        assignmentSectionSummary={activeLessonAssignmentContent?.summary ?? undefined}
      />
    </div>
  ) : null;

  const navigationSection = (
    <div
      ref={activeLessonNavigationRef}
      id={LESSON_NAV_ANCHOR_ID}
      data-kangur-print-exclude='true'
      className={LESSONS_ACTIVE_SECTION_CLASSNAME}
    >
      <KangurLessonNavigationWidget
        nextLesson={next}
        onSelectLesson={handleSelectLesson}
        prevLesson={prev}
      />
    </div>
  );

  const lessonContentSection = (
    <div
      ref={activeLessonContentRef}
      data-kangur-print-root='true'
      data-testid='kangur-lesson-print-root'
      className={`flex w-full min-w-0 flex-col items-center ${LESSONS_ACTIVE_STACK_GAP_CLASSNAME}`}
    >
      <div
        className='kangur-print-only w-full min-w-0 max-w-5xl border-b border-slate-200 pb-4 text-center'
        data-kangur-print-masthead='true'
        data-testid='kangur-lesson-print-heading'
      >
        <div
          className='mb-4 flex items-center justify-center'
          aria-label={STUDIQ_PRINT_BRAND_LABEL}
          data-kangur-print-brand='true'
          data-testid='kangur-lesson-print-brand'
        >
          <span
            className='inline-flex items-center justify-center'
            data-kangur-print-brand-logo='true'
            data-testid='kangur-lesson-print-brand-logo'
          >
            <KangurHomeLogo
              className='h-[30px] sm:h-[30px]'
              idPrefix='kangur-lesson-print-logo'
            />
          </span>
        </div>
        <div className='text-sm font-semibold uppercase tracking-[0.16em] text-slate-500'>
          {translations('pageTitle')}
        </div>
        <h1 className='mt-2 text-3xl font-black text-slate-900'>{localizedLessonTitle}</h1>
        {localizedLessonDescription ? (
          <p className='mx-auto mt-2 max-w-3xl text-sm text-slate-600'>
            {localizedLessonDescription}
          </p>
        ) : null}
      </div>
      {isSecretLessonHostActive ? (
        <KangurGlassPanel
          className='flex w-full max-w-3xl flex-col items-center text-center'
          data-testid='lessons-secret-panel'
          padding='xl'
          surface='solid'
        >
          <KangurStatusChip accent='amber' data-testid='lessons-secret-pill-chip' size='sm'>
            Sekret odblokowany
          </KangurStatusChip>
          <div
            className='mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500'
            data-testid='lessons-secret-host-label'
          >
            {secretHostLabel}
          </div>
          <h2 className='mt-2 text-2xl font-black text-slate-800'>
            {activeLessonSecretPanelContent?.title ?? 'Ukryty finisz'}
          </h2>
          <p className='text-sm text-slate-600'>
            {activeLessonSecretPanelContent?.summary ?? 'Sekretne zakończenie!'}
          </p>
        </KangurGlassPanel>
      ) : activeLesson.contentMode === 'document' && hasActiveLessonDocContent ? (
        <div className='w-full min-w-0 max-w-5xl space-y-4'>
          <KangurSummaryPanel
            accent='sky'
            data-kangur-print-exclude='true'
            data-testid='lessons-document-summary'
            description={activeLessonDocumentContent?.summary ?? 'Czytaj dokument.'}
            label='Lesson document'
            labelAccent='sky'
            title={activeLessonDocumentContent?.title ?? 'Materiał lekcji'}
            tone='accent'
          />
          <KangurLessonDocumentRenderer document={activeLessonDocument!} />
        </div>
      ) : activeLesson.contentMode === 'document' && isActiveLessonDocumentLoading ? (
        <div className='w-full min-w-0 max-w-5xl space-y-4'>
          <KangurSummaryPanel
            accent='sky'
            align='center'
            data-kangur-print-exclude='true'
            data-testid='lessons-loading-document-summary'
            description='Ładujemy treść lekcji i przygotowujemy materiał.'
            label='Lesson document'
            labelAccent='sky'
            title='Ładowanie materiału'
            tone='accent'
          />
        </div>
      ) : activeLesson.contentMode === 'document' && !hasActiveLessonDocContent ? (
        <div className='w-full min-w-0 max-w-5xl space-y-4'>
          <KangurSummaryPanel
            accent='amber'
            align='center'
            data-kangur-print-exclude='true'
            data-testid='lessons-empty-document-summary'
            description={emptyDocumentDescription}
            label='Lesson document'
            labelAccent='amber'
            title={emptyDocumentTitle}
            tone='accent'
          />
        </div>
      ) : ActiveLessonComponent ? (
        <ActiveLessonComponent onReady={() => setIsActiveLessonComponentReady(true)} />
      ) : null}
    </div>
  );

  const topControlsSection = isMobile ? (
    <div
      data-testid='kangur-lesson-top-controls'
      data-kangur-print-exclude='true'
      className='flex w-full min-w-0 gap-2'
    >
      <KangurLessonNavigationIconButton
        className='shrink-0'
        data-testid='kangur-lesson-back-to-lessons'
        onClick={handleLessonBackAction}
        aria-label={backToLessonsLabel}
        icon={ChevronsLeft}
        title={backToLessonsLabel}
      />
    </div>
  ) : null;

  return (
    <motion.div
      key={activeLesson.id}
      data-testid='lessons-active-transition'
      initial={{ opacity: 0.92, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0.98, y: -4 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={LESSONS_ACTIVE_LAYOUT_CLASSNAME}
    >
      <KangurLessonNavigationProvider
        onBack={handleReturnToLessonList}
        secretLessonPill={{ isUnlocked: isSecretLessonUnlocked, onOpen: handleOpenSecretLesson }}
      >
        <KangurLessonPrintProvider
          onPrintPanel={isPrintAvailable ? handlePrintPanel : undefined}
        >
          <>
            {topControlsSection}
            {headerSection}
            {navigationSection}
            {lessonContentSection}
          </>
        </KangurLessonPrintProvider>
      </KangurLessonNavigationProvider>
    </motion.div>
  );
}
