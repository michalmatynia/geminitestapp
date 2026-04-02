'use client';

/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { vi } from 'vitest';

import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog-metadata';

const {
  useKangurSubjectFocusMock,
  useKangurAuthMock,
  useKangurRoutePageReadyMock,
  lessonCardPropsMock,
  lessonDocumentsHookCallsMock,
  lessonAssignmentsHookCallsMock,
  progressStateHookCallsMock,
  lessonCatalogHookCallsMock,
  lessonSectionsHookCallsMock,
  lessonTemplatesHookCallsMock,
  lessonsWordmarkPropsMock,
  useKangurDocsTooltipsMock,
  openLoginModalMock,
  localeState,
  focusTokenState,
  lessonSectionsRetainDataWhileLoadingState,
  lessonsRetainDataWhileLoadingState,
  routeTransitionStateState,
  routeNavigatorBackMock,
  topNavigationPropsMock,
  standardPageLayoutPropsMock,
  tutorSessionSyncPropsMock,
  lessonsState,
  lessonsLoadingState,
  lessonsPlaceholderDataState,
  emptyPageContentEntryMock,
  lessonSectionsState,
  lessonSectionsLoadingState,
  lessonSectionsPlaceholderDataState,
} = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurRoutePageReadyMock: vi.fn(),
  lessonCardPropsMock: vi.fn(),
  lessonDocumentsHookCallsMock: vi.fn(),
  lessonAssignmentsHookCallsMock: vi.fn(),
  progressStateHookCallsMock: vi.fn(),
  lessonCatalogHookCallsMock: vi.fn(),
  lessonSectionsHookCallsMock: vi.fn(),
  lessonTemplatesHookCallsMock: vi.fn(),
  lessonsWordmarkPropsMock: vi.fn(),
  useKangurDocsTooltipsMock: vi.fn((_surface?: string) => ({ enabled: false })),
  openLoginModalMock: vi.fn(),
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl',
  },
  focusTokenState: {
    value: null as string | null,
  },
  lessonSectionsRetainDataWhileLoadingState: {
    value: false,
  },
  lessonsRetainDataWhileLoadingState: {
    value: false,
  },
  routeTransitionStateState: {
    value: null as null | Record<string, unknown>,
  },
  routeNavigatorBackMock: vi.fn(),
  topNavigationPropsMock: vi.fn(),
  standardPageLayoutPropsMock: vi.fn(),
  tutorSessionSyncPropsMock: vi.fn(),
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  lessonsLoadingState: {
    value: false,
  },
  lessonsPlaceholderDataState: {
    value: false,
  },
  emptyPageContentEntryMock: {
    entry: null,
  },
  lessonSectionsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  lessonSectionsLoadingState: {
    value: false,
  },
  lessonSectionsPlaceholderDataState: {
    value: false,
  },
}));

export const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

export const lessonsTranslations = {
  'KangurLessonsPage.pageTitle': {
    de: 'Lektionen',
    en: 'Lessons',
    pl: 'Lekcje',
  },
  'KangurLessonsPage.loadingDescription': {
    de: 'Die Lektionen sind gleich bereit.',
    en: 'The lessons will be ready in a moment.',
    pl: 'Lekcje zaraz beda gotowe.',
  },
  'KangurLessonsPage.loadingLessonsStatus': {
    de: 'Lektionen werden geladen',
    en: 'Loading lessons',
    pl: 'Ładowanie lekcji',
  },
  'KangurLessonsPage.loadingLessonsDetails': {
    de: 'Die Lektionsbibliothek wird vorbereitet und an das gewahlte Thema angepasst.',
    en: 'Preparing the lesson library and matching it to the selected topic.',
    pl: 'Przygotowujemy bibliotekę lekcji i dopasowujemy ją do wybranego tematu.',
  },
  'KangurLessonsPage.loadingSectionsStatus': {
    de: 'Abschnitte werden geladen',
    en: 'Loading sections',
    pl: 'Ładowanie sekcji',
  },
  'KangurLessonsPage.loadingSectionsDetails': {
    de: 'Die Lektionsabschnitte werden geordnet, damit die Themenliste gleich angezeigt werden kann.',
    en: 'Organising lesson sections so the full topic list can appear next.',
    pl: 'Porządkujemy sekcje lekcji, aby zaraz pokazać pełną listę tematów.',
  },
  'KangurLessonsPage.introDescription': {
    de: 'Wahle eine Lektion und starte mit dem Lernen.',
    en: 'Choose a lesson and start learning.',
    pl: 'Wybierz lekcje i zacznij nauke.',
  },
  'KangurLessonsPage.emptyTitle': {
    de: 'Keine aktiven Lektionen',
    en: 'No active lessons',
    pl: 'Brak aktywnych lekcji',
  },
  'KangurLessonsWidgets.mastery.noSavedPractice': {
    de: 'Kein gespeichertes Training',
    en: 'No saved practice',
    pl: 'Brak zapisanego treningu',
  },
} as const;

export function createLessonsTranslationsMock(namespace?: string): (key: string) => string {
  return (key: string): string =>
    lessonsTranslations[`${namespace}.${key}` as keyof typeof lessonsTranslations]?.[
      localeState.value
    ] ?? key;
}

type LessonsCatalogMockOptions = {
  subject?: string;
  ageGroup?: string;
  componentIds?: string[];
  enabledOnly?: boolean;
};

type LessonsCatalogRecord = Array<Record<string, unknown>>[number];

const filterEnabledCatalogRecords = (
  records: LessonsCatalogRecord[],
  enabledOnly: boolean | undefined
): LessonsCatalogRecord[] =>
  enabledOnly ? records.filter((record) => record['enabled'] !== false) : records;

const filterSubjectCatalogRecords = (
  records: LessonsCatalogRecord[],
  subject: string | undefined
): LessonsCatalogRecord[] =>
  subject
    ? records.filter((record) => (record['subject'] ?? 'maths') === subject)
    : records;

const filterAgeGroupCatalogRecords = (
  records: LessonsCatalogRecord[],
  ageGroup: string | undefined
): LessonsCatalogRecord[] =>
  ageGroup
    ? records.filter((record) => (record['ageGroup'] ?? DEFAULT_KANGUR_AGE_GROUP) === ageGroup)
    : records;

const filterComponentCatalogRecords = (
  records: LessonsCatalogRecord[],
  componentIds: string[] | undefined
): LessonsCatalogRecord[] =>
  componentIds && componentIds.length > 0
    ? records.filter((record) => componentIds.includes(String(record['componentId'] ?? '')))
    : records;

const resolveFilteredCatalogRecords = (
  records: LessonsCatalogRecord[],
  options: LessonsCatalogMockOptions
): LessonsCatalogRecord[] =>
  filterComponentCatalogRecords(
    filterAgeGroupCatalogRecords(
      filterSubjectCatalogRecords(
        filterEnabledCatalogRecords(records, options.enabledOnly),
        options.subject
      ),
      options.ageGroup
    ),
    options.componentIds
  );

const resolveLessonsCatalogMockData = (options: LessonsCatalogMockOptions): {
  lessons: LessonsCatalogRecord[];
  sections: LessonsCatalogRecord[];
} => ({
  lessons: resolveFilteredCatalogRecords(lessonsState.value, options),
  sections: resolveFilteredCatalogRecords(lessonSectionsState.value, options),
});

const resolveLessonsLoadingMeta = (): {
  hasRetainedData: boolean;
  isLoading: boolean;
  isPlaceholderData: boolean;
} => ({
  hasRetainedData: lessonsLoadingState.value && lessonsRetainDataWhileLoadingState.value,
  isLoading: lessonsLoadingState.value,
  isPlaceholderData: lessonsPlaceholderDataState.value,
});

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations: createLessonsTranslationsMock,
}));

vi.mock('@/features/kangur/config/routing', () => ({
  appendKangurUrlParams: (href: string) => href,
  getKangurHomeHref: () => '/kangur',
  getKangurInternalQueryParamName: () => 'focus',
  getKangurPageHref: () => '/kangur/lessons',
  readKangurUrlParam: () => focusTokenState.value,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  useKangurDocsTooltips: (surface?: string) => useKangurDocsTooltipsMock(surface),
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurActiveLessonHeader', () => ({
  KangurActiveLessonHeader: () => <div data-testid='mock-active-lesson-header' />,
}));

vi.mock('@/features/kangur/ui/components/lesson-library/KangurResolvedLessonLibraryCard', () => ({
  KangurResolvedLessonLibraryCard: ({
    lesson,
    onSelect,
  }: {
    lesson: { id: string; title: string };
    onSelect?: () => void;
  }) => {
    lessonCardPropsMock(lesson);
    return (
      <button data-testid={`lesson-card-${lesson.id}`} onClick={onSelect} type='button'>
        {lesson.title}
      </button>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/lesson-library/KangurResolvedLessonGroupAccordion', () => ({
  KangurResolvedLessonGroupAccordion: ({
    label,
    isExpanded,
    onToggle,
    children,
  }: {
    label: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className='w-full'>
      <button type='button' aria-expanded={isExpanded} onClick={onToggle}>
        {label}
      </button>
      {isExpanded ? (
        <div role='region'>
          <div className='w-full items-center'>{children}</div>
        </div>
      ) : null}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: () => <div data-testid='mock-lesson-document-renderer' />,
}));

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurLessonNavigationWidget', () => ({
  KangurLessonNavigationWidget: () => <div data-testid='mock-lesson-navigation' />,
}));

vi.mock('@/features/kangur/ui/components/wordmarks/LazyKangurLessonsWordmark', () => ({
  LazyKangurLessonsWordmark: (props: unknown) => {
    lessonsWordmarkPropsMock(props);
    return <div data-testid='mock-lessons-wordmark' />;
  },
}));

vi.mock('@/features/kangur/ui/components/lesson-library/KangurResolvedPageIntroCard', () => ({
  KangurResolvedPageIntroCard: ({
    title,
    description,
    onBack,
    visualTitle,
    children,
  }: {
    title: string;
    description?: string;
    onBack?: () => void;
    visualTitle?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid='mock-lessons-intro'>
      <span>{title}</span>
      {description ? <span>{description}</span> : null}
      {onBack ? (
        <button aria-label='mock-lessons-back' onClick={onBack} type='button'>
          Back
        </button>
      ) : null}
      {visualTitle}
      {children}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({
    children,
    docsRootId,
    docsTooltipsEnabled,
    navigation,
  }: {
    children: React.ReactNode;
    docsRootId?: string;
    docsTooltipsEnabled?: boolean;
    navigation?: React.ReactNode;
  }) => {
    standardPageLayoutPropsMock({
      docsRootId,
      docsTooltipsEnabled,
    });
    return (
      <div data-testid='mock-lessons-layout'>
        {navigation}
        {children}
      </div>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController', () => ({
  KangurTopNavigationController: ({ navigation }: { navigation: unknown }) => {
    topNavigationPropsMock(navigation);
    return <div data-testid='mock-top-nav' />;
  },
}));

vi.mock('@/features/kangur/ui/pages/lessons/LazyActiveLessonView', () => ({
  LazyActiveLessonView: ({ snapshot }: { snapshot?: { activeLessonId?: string } }) => {
    lessonDocumentsHookCallsMock({
      enabled: Boolean(snapshot?.activeLessonId),
      lessonId: snapshot?.activeLessonId ?? null,
    });
    return (
      <div data-testid='mock-active-lesson-view'>
        {snapshot?.activeLessonId ?? 'active-lesson'}
      </div>
    );
  },
  prefetchActiveLessonView: () => {
    // Mock prefetch function
  },
}));

vi.mock('@/features/kangur/ui/pages/lessons/LazyLessonsDeferredEnhancements', () => ({
  LazyLessonsDeferredEnhancements: ({
    learnerId,
    onDocsTooltipsResolved,
    sessionContext,
  }: {
    learnerId: string | null;
    onDocsTooltipsResolved: (enabled: boolean) => void;
    sessionContext?: Record<string, unknown> | null;
  }) => {
    const { enabled } = useKangurDocsTooltipsMock('lessons');

    React.useEffect(() => {
      onDocsTooltipsResolved(enabled);
    }, [enabled, onDocsTooltipsResolved]);

    tutorSessionSyncPropsMock({
      learnerId,
      sessionContext,
    });

    return null;
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: (props: unknown) => {
    tutorSessionSyncPropsMock(props);
    return null;
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => useKangurAuthMock() as unknown,
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: '',
    setGuestPlayerName: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonNavigationContext', () => ({
  KangurLessonNavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: openLoginModalMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionState: () => routeTransitionStateState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock() as unknown,
}));

vi.mock('@/features/kangur/lessons/lesson-ui-registry', () => ({
  FOCUS_TO_COMPONENT: {},
  LESSON_COMPONENTS: {
    adding: () => <div data-testid='mock-lesson-component-adding' />,
    english_basics: () => <div data-testid='mock-lesson-component-english' />,
  },
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  KangurButton: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  KangurGlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurInfoCard: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  KangurStatusChip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurSummaryPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_LESSON_PANEL_GAP_CLASSNAME: 'gap',
  KANGUR_PANEL_GAP_CLASSNAME: 'gap',
  KANGUR_STEP_PILL_CLASSNAME: 'step-pill',
  KANGUR_SEGMENTED_CONTROL_CLASSNAME: 'segmented',
  KANGUR_STACK_SPACED_CLASSNAME: 'stack',
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX: 72,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME: '--kangur-top-bar-height',
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLearnerActivity', () => ({
  useKangurLearnerActivityPing: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: (options?: unknown) => {
    lessonAssignmentsHookCallsMock(options ?? {});
    return { assignments: [] };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: LessonsCatalogMockOptions = {}) => {
    lessonCatalogHookCallsMock(options);
    const lessons = resolveFilteredCatalogRecords(lessonsState.value, options);
    const { hasRetainedData, isLoading, isPlaceholderData } = resolveLessonsLoadingMeta();

    return {
      data: isLoading && !hasRetainedData ? undefined : lessons,
      isFetching: isLoading,
      isLoading: isLoading && !hasRetainedData,
      isPending: isLoading && !hasRetainedData,
      isPlaceholderData,
      isRefetching: hasRetainedData,
      refetch: vi.fn(),
    };
  },
  useKangurLessonDocument: (
    lessonId: string | null,
    options?: { enabled?: boolean }
  ) => {
    lessonDocumentsHookCallsMock({ lessonId, ...(options ?? {}) });
    return {
      data: {},
    };
  },
  useKangurLessonDocuments: () => ({
    data: {},
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonSections', () => ({
  useKangurLessonSections: (options: LessonsCatalogMockOptions = {}) => {
    lessonSectionsHookCallsMock(options);
    const { sections } = resolveLessonsCatalogMockData(options);
    const hasRetainedData = lessonSectionsRetainDataWhileLoadingState.value;
    const isLoading = lessonSectionsLoadingState.value;
    const isPlaceholderData = lessonSectionsPlaceholderDataState.value;

    return {
      data: isLoading && !hasRetainedData ? undefined : sections,
      isFetching: isLoading,
      isLoading: isLoading && !hasRetainedData,
      isPending: isLoading && !hasRetainedData,
      isPlaceholderData,
      isRefetching: hasRetainedData,
      refetch: vi.fn(),
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplates: (options?: { enabled?: boolean }) => {
    lessonTemplatesHookCallsMock(options ?? {});
    return { data: [] };
  },
  useKangurLessonTemplate: () => ({
    data: null,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isRefetching: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: (options?: unknown) => {
    progressStateHookCallsMock(options ?? {});
    return {
      lessonMastery: {},
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => emptyPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({ back: routeNavigatorBackMock }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: (input: unknown) => useKangurRoutePageReadyMock(input) as unknown,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

vi.mock('@/features/kangur/ui/motion/page-transition', () => ({
  createKangurPageTransitionMotionProps: () => ({}),
}));

const lessonsFixture = [
  {
    id: 'lesson-maths',
    componentId: 'adding',
    subject: 'maths',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    enabled: true,
    sortOrder: 1,
    title: 'Dodawanie',
    description: '',
    emoji: '➕',
    color: 'indigo',
    activeBg: 'bg-indigo-50',
    contentMode: 'component',
  },
  {
    id: 'lesson-english',
    componentId: 'english_basics',
    subject: 'english',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    enabled: true,
    sortOrder: 2,
    title: 'English Basics',
    description: '',
    emoji: '📘',
    color: 'sky',
    activeBg: 'bg-sky-50',
    contentMode: 'component',
  },
];

export const setupLessonsPageTest = async () => {
  vi.useFakeTimers();
  localeState.value = 'pl';
  focusTokenState.value = null;
  if (!window.requestIdleCallback) {
    Object.defineProperty(window, 'requestIdleCallback', {
      value: (callback: IdleRequestCallback, options?: IdleRequestOptions) =>
        window.setTimeout(
          () =>
            callback({
              didTimeout: true,
              timeRemaining: () => 0,
            }),
          options?.timeout ?? 0
        ),
      writable: true,
    });
  }
  if (!window.cancelIdleCallback) {
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: (handle: number) => window.clearTimeout(handle),
      writable: true,
    });
  }
  vi.spyOn(window, 'requestIdleCallback').mockImplementation((callback, options) =>
    window.setTimeout(
      () =>
        callback({
          didTimeout: true,
          timeRemaining: () => 0,
        }),
      options?.timeout ?? 0
    )
  );
  vi.spyOn(window, 'cancelIdleCallback').mockImplementation((handle) => {
    window.clearTimeout(handle);
  });
  lessonsState.value = lessonsFixture;
  lessonsLoadingState.value = false;
  lessonsPlaceholderDataState.value = false;
  lessonsRetainDataWhileLoadingState.value = false;
  lessonSectionsState.value = [];
  lessonSectionsLoadingState.value = false;
  lessonSectionsPlaceholderDataState.value = false;
  lessonSectionsRetainDataWhileLoadingState.value = false;
  routeTransitionStateState.value = null;
  useKangurSubjectFocusMock.mockReturnValue({
    subject: 'english',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  });
  useKangurAuthMock.mockReturnValue({
    user: {
      actorType: 'learner',
      activeLearner: { id: 'learner-1' },
      canManageLearners: false,
    },
    logout: vi.fn(),
    canAccessParentAssignments: false,
  });
  lessonCardPropsMock.mockClear();
  lessonsWordmarkPropsMock.mockClear();
  openLoginModalMock.mockClear();
  routeNavigatorBackMock.mockClear();
  topNavigationPropsMock.mockClear();
  standardPageLayoutPropsMock.mockClear();
  tutorSessionSyncPropsMock.mockClear();
  useKangurDocsTooltipsMock.mockClear();
  useKangurRoutePageReadyMock.mockClear();
  lessonDocumentsHookCallsMock.mockClear();
  lessonAssignmentsHookCallsMock.mockClear();
  progressStateHookCallsMock.mockClear();
  lessonCatalogHookCallsMock.mockClear();
  lessonSectionsHookCallsMock.mockClear();
  lessonTemplatesHookCallsMock.mockClear();

  const { default: Lessons } = await import('@/features/kangur/ui/pages/Lessons');
  return Lessons;
};

export {
  DEFAULT_KANGUR_AGE_GROUP,
  emptyPageContentEntryMock,
  focusTokenState,
  lessonAssignmentsHookCallsMock,
  lessonCatalogHookCallsMock,
  lessonCardPropsMock,
  lessonDocumentsHookCallsMock,
  progressStateHookCallsMock,
  lessonSectionsHookCallsMock,
  lessonSectionsLoadingState,
  lessonSectionsPlaceholderDataState,
  lessonSectionsRetainDataWhileLoadingState,
  lessonSectionsState,
  lessonTemplatesHookCallsMock,
  localeState,
  lessonsLoadingState,
  lessonsPlaceholderDataState,
  lessonsRetainDataWhileLoadingState,
  lessonsState,
  lessonsWordmarkPropsMock,
  openLoginModalMock,
  routeNavigatorBackMock,
  routeTransitionStateState,
  standardPageLayoutPropsMock,
  topNavigationPropsMock,
  tutorSessionSyncPropsMock,
  useKangurAuthMock,
  useKangurDocsTooltipsMock,
  useKangurRoutePageReadyMock,
  useKangurSubjectFocusMock,
};
