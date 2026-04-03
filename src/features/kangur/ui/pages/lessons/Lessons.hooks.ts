'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  getKangurHomeHref,
  getKangurInternalQueryParamName,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurLessonSections } from '@/features/kangur/ui/hooks/useKangurLessonSections';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import {
  resolveFocusedLessonId,
  resolveFocusedLessonScope,
} from '@/features/kangur/lessons/lesson-focus-utils';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonDocumentStore,
} from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
} from '@/features/kangur/ui/design/tokens';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import {
  ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES,
} from './Lessons.constants';
import {
  getLessonAssignmentTimestamp,
  LESSON_ASSIGNMENT_PRIORITY_ORDER,
} from './Lessons.utils';

const EMPTY_LESSON_ASSIGNMENTS_BY_COMPONENT = new Map<
  KangurLessonComponentId,
  KangurAssignmentSnapshot
>();
const EMPTY_LESSON_TEMPLATE_MAP = new Map<
  KangurLessonComponentId,
  import('@/shared/contracts/kangur-lesson-templates').KangurLessonTemplate
>();
const EMPTY_LESSON_DOCUMENTS = {} as KangurLessonDocumentStore;

export function useLessonsLogic() {
  const routeNavigator = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user } = auth;
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const isMobile = useKangurMobileBreakpoint();
  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);
  const [requestedLessonComponentIds, setRequestedLessonComponentIds] = useState<
    KangurLessonComponentId[]
  >([]);
  const [pendingLessonComponentIdBatches, setPendingLessonComponentIdBatches] = useState<
    KangurLessonComponentId[][]
  >([]);
  const [activeLessonComponentIdBatch, setActiveLessonComponentIdBatch] = useState<
    KangurLessonComponentId[] | null
  >(null);
  const [loadedLessonsByComponent, setLoadedLessonsByComponent] = useState<
    Map<KangurLessonComponentId, KangurLesson>
  >(new Map());
  const [shouldLoadCompleteLessonsCatalog, setShouldLoadCompleteLessonsCatalog] = useState(
    process.env.NODE_ENV === 'test'
  );
  const [isActiveLessonComponentReady, setIsActiveLessonComponentReady] = useState(
    process.env.NODE_ENV === 'test'
  );
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isSecretLessonActive, setIsSecretLessonActive] = useState(false);
  const [focusToken, setFocusToken] = useState<string | null>(null);
  const [isAssignmentsReady, setIsAssignmentsReady] = useState(
    process.env.NODE_ENV === 'test'
  );
  const lessonTemplateMap = EMPTY_LESSON_TEMPLATE_MAP;
  const shouldLoadLessonCatalogDetails =
    shouldLoadCompleteLessonsCatalog || requestedLessonComponentIds.length > 0;
  const shouldLoadLessonRuntimeMetadata =
    shouldLoadLessonCatalogDetails || activeLessonId !== null;
  const progress = useKangurProgressState({
    enabled: shouldLoadLessonRuntimeMetadata,
  });
  
  const activeLessonNavigationRef = useRef<HTMLDivElement | null>(null);
  const activeLessonHeaderRef = useRef<HTMLDivElement | null>(null);
  const activeLessonContentRef = useRef<HTMLDivElement | null>(null);
  const activeLessonScrollRef = useRef<HTMLDivElement | null>(null);

  const { assignments } = useKangurAssignments({
    enabled: isAssignmentsReady && canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsDeferredContentReady(true);
      return;
    }

    let timeoutId: number | null = null;
    const frameId =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(() => {
            setIsDeferredContentReady(true);
          })
        : window.setTimeout(() => {
            timeoutId = null;
            setIsDeferredContentReady(true);
          }, 0);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        return;
      }

      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId);
      } else {
        window.clearTimeout(frameId);
      }
    };
  }, []);

  useEffect((): void => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const nextFocusToken =
      readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)?.trim().toLowerCase() ?? null;
    setFocusToken(nextFocusToken && nextFocusToken.length > 0 ? nextFocusToken : null);
  }, [basePath]);

  useEffect((): (() => void) | void => {
    if (
      !isDeferredContentReady ||
      !canAccessParentAssignments ||
      !shouldLoadLessonRuntimeMetadata
    ) {
      setIsAssignmentsReady(false);
      return;
    }

    let timeoutId: number | null = null;
    const frameId =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(() => {
            setIsAssignmentsReady(true);
          })
        : window.setTimeout(() => {
            timeoutId = null;
            setIsAssignmentsReady(true);
          }, 0);

    return () => {
      setIsAssignmentsReady(false);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        return;
      }

      if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId);
      } else {
        window.clearTimeout(frameId);
      }
    };
  }, [canAccessParentAssignments, isDeferredContentReady, shouldLoadLessonRuntimeMetadata]);

  const lessonSectionsQuery = useKangurLessonSections({
    subject,
    ageGroup,
    enabledOnly: true,
  });
  const requestedLessonsCatalogComponentIds =
    shouldLoadCompleteLessonsCatalog || requestedLessonComponentIds.length === 0
      ? undefined
      : requestedLessonComponentIds;
  const completeLessonsQuery = useKangurLessons({
    subject,
    ageGroup,
    enabledOnly: true,
    enabled: shouldLoadCompleteLessonsCatalog,
  });
  const incrementalLessonsQuery = useKangurLessons({
    subject,
    ageGroup,
    componentIds: activeLessonComponentIdBatch ?? undefined,
    enabledOnly: true,
    enabled: !shouldLoadCompleteLessonsCatalog && activeLessonComponentIdBatch !== null,
  });
  const isLessonSectionsPlaceholderData = lessonSectionsQuery.isPlaceholderData === true;
  const isLessonSectionsDataMissing = typeof lessonSectionsQuery.data === 'undefined';
  const isCompleteLessonsCatalogDataMissing = typeof completeLessonsQuery.data === 'undefined';
  const isLessonSectionsLoading =
    Boolean(
      (lessonSectionsQuery.isPending ||
        lessonSectionsQuery.isLoading ||
        lessonSectionsQuery.isFetching ||
        lessonSectionsQuery.isRefetching) &&
        isLessonSectionsDataMissing
    );
  const hasPendingIncrementalLessonLoads =
    activeLessonComponentIdBatch !== null || pendingLessonComponentIdBatches.length > 0;
  const isLessonsCatalogLoading =
    shouldLoadCompleteLessonsCatalog
      ? Boolean(
          (completeLessonsQuery.isPending ||
            completeLessonsQuery.isLoading ||
            completeLessonsQuery.isFetching ||
            completeLessonsQuery.isRefetching) &&
            isCompleteLessonsCatalogDataMissing
        )
      : hasPendingIncrementalLessonLoads;
  const shouldShowLessonsCatalogSkeleton =
    isLessonSectionsPlaceholderData || isLessonSectionsLoading;
  const lessonSections = useMemo(
    () => lessonSectionsQuery.data ?? [],
    [lessonSectionsQuery.data]
  );
  const incrementalLessons = useMemo((): KangurLesson[] => {
    const next = new Map(loadedLessonsByComponent);
    (incrementalLessonsQuery.data ?? []).forEach((lesson) => {
      next.set(lesson.componentId, lesson);
    });
    return [...next.values()];
  }, [incrementalLessonsQuery.data, loadedLessonsByComponent]);
  const shouldExposeStandaloneLessons =
    !isLessonSectionsDataMissing && lessonSections.length === 0;
  const shouldExposeLessonCatalogDetails =
    shouldLoadLessonCatalogDetails ||
    activeLessonId !== null ||
    shouldExposeStandaloneLessons;
  const lessons = useMemo(
    (): KangurLesson[] =>
      shouldExposeLessonCatalogDetails
        ? shouldLoadCompleteLessonsCatalog
          ? completeLessonsQuery.data ?? []
          : incrementalLessons
        : [],
    [
      completeLessonsQuery.data,
      incrementalLessons,
      shouldExposeLessonCatalogDetails,
      shouldLoadCompleteLessonsCatalog,
    ]
  );

  useEffect((): void => {
    if (shouldLoadCompleteLessonsCatalog) {
      if (activeLessonComponentIdBatch !== null) {
        setActiveLessonComponentIdBatch(null);
      }
      if (pendingLessonComponentIdBatches.length > 0) {
        setPendingLessonComponentIdBatches([]);
      }
      return;
    }

    if (activeLessonComponentIdBatch !== null || pendingLessonComponentIdBatches.length === 0) {
      return;
    }

    setActiveLessonComponentIdBatch(pendingLessonComponentIdBatches[0] ?? null);
    setPendingLessonComponentIdBatches((current) => current.slice(1));
  }, [
    activeLessonComponentIdBatch,
    pendingLessonComponentIdBatches,
    shouldLoadCompleteLessonsCatalog,
  ]);

  useEffect((): void => {
    if (activeLessonComponentIdBatch === null) {
      return;
    }

    if (
      incrementalLessonsQuery.isPending ||
      incrementalLessonsQuery.isLoading ||
      incrementalLessonsQuery.isFetching ||
      incrementalLessonsQuery.isRefetching ||
      typeof incrementalLessonsQuery.data === 'undefined'
    ) {
      return;
    }

    setLoadedLessonsByComponent((current) => {
      const next = new Map(current);
      incrementalLessonsQuery.data.forEach((lesson) => {
        next.set(lesson.componentId, lesson);
      });
      return next;
    });
    setActiveLessonComponentIdBatch(null);
  }, [
    activeLessonComponentIdBatch,
    incrementalLessonsQuery.data,
    incrementalLessonsQuery.isFetching,
    incrementalLessonsQuery.isLoading,
    incrementalLessonsQuery.isPending,
    incrementalLessonsQuery.isRefetching,
  ]);

  const ensureLessonsCatalogLoaded = useCallback(
    (componentIds?: readonly KangurLessonComponentId[] | null): void => {
      if (!componentIds || componentIds.length === 0) {
        setActiveLessonComponentIdBatch(null);
        setPendingLessonComponentIdBatches([]);
        setShouldLoadCompleteLessonsCatalog(true);
        return;
      }

      const existingComponentIds = new Set<KangurLessonComponentId>([
        ...requestedLessonComponentIds,
        ...loadedLessonsByComponent.keys(),
        ...(activeLessonComponentIdBatch ?? []),
        ...pendingLessonComponentIdBatches.flat(),
      ]);
      const missingComponentIds = componentIds.filter(
        (componentId) => !existingComponentIds.has(componentId)
      );

      if (missingComponentIds.length === 0) {
        return;
      }

      setRequestedLessonComponentIds((current) => {
        const next = new Set(current);
        missingComponentIds.forEach((componentId) => {
          next.add(componentId);
        });
        return [...next];
      });

      setPendingLessonComponentIdBatches((current) => [...current, [...missingComponentIds]]);
    },
    [
      activeLessonComponentIdBatch,
      loadedLessonsByComponent,
      pendingLessonComponentIdBatches,
      requestedLessonComponentIds,
    ]
  );

  useEffect((): void => {
    setRequestedLessonComponentIds([]);
    setPendingLessonComponentIdBatches([]);
    setActiveLessonComponentIdBatch(null);
    setLoadedLessonsByComponent(new Map());
    setShouldLoadCompleteLessonsCatalog(false);
  }, [ageGroup, subject]);

  useEffect((): void => {
    if (!focusToken) {
      return;
    }

    const focusScope = resolveFocusedLessonScope(focusToken, lessonTemplateMap);
    if (!focusScope) {
      setShouldLoadCompleteLessonsCatalog(true);
      return;
    }

    if (focusScope.ageGroup && focusScope.ageGroup !== ageGroup) {
      return;
    }

    if (focusScope.subject !== subject) {
      return;
    }

    ensureLessonsCatalogLoaded([focusScope.componentId]);
  }, [ageGroup, ensureLessonsCatalogLoaded, focusToken, lessonTemplateMap, subject]);
  const lessonAssignmentsByComponent = useMemo(() => {
    if (!isAssignmentsReady || assignments.length === 0 || lessons.length === 0) {
      return EMPTY_LESSON_ASSIGNMENTS_BY_COMPONENT;
    }

    const nextMap = new Map<KangurLessonComponentId, (typeof assignments)[number]>();
    assignments
      .filter((assignment) => !assignment.archived)
      .filter((assignment) => assignment.progress.status !== 'completed')
      .filter(
        (assignment): assignment is (typeof assignments)[number] & { target: { type: 'lesson' } } =>
          assignment.target.type === 'lesson'
      )
      .forEach((assignment) => {
        const componentId = assignment.target.lessonComponentId;
        const existing = nextMap.get(componentId);
        if (!existing || LESSON_ASSIGNMENT_PRIORITY_ORDER[assignment.priority] < LESSON_ASSIGNMENT_PRIORITY_ORDER[existing.priority]) {
          nextMap.set(componentId, assignment);
        }
      });
    return nextMap;
  }, [assignments, isAssignmentsReady, lessons.length]);

  const completedLessonAssignmentsByComponent = useMemo(() => {
    if (!isAssignmentsReady || assignments.length === 0 || lessons.length === 0) {
      return EMPTY_LESSON_ASSIGNMENTS_BY_COMPONENT;
    }

    const nextMap = new Map<KangurLessonComponentId, (typeof assignments)[number]>();
    assignments
      .filter((assignment) => !assignment.archived)
      .filter((assignment) => assignment.progress.status === 'completed')
      .filter(
        (assignment): assignment is (typeof assignments)[number] & { target: { type: 'lesson' } } =>
          assignment.target.type === 'lesson'
      )
      .forEach((assignment) => {
        const componentId = assignment.target.lessonComponentId;
        const existing = nextMap.get(componentId);
        if (!existing) {
          nextMap.set(componentId, assignment);
          return;
        }
        const assignmentTimestamp = getLessonAssignmentTimestamp(assignment.progress.completedAt, assignment.updatedAt);
        const existingTimestamp = getLessonAssignmentTimestamp(existing.progress.completedAt, existing.updatedAt);
        if (assignmentTimestamp > existingTimestamp) {
          nextMap.set(componentId, assignment);
        }
      });
    return nextMap;
  }, [assignments, isAssignmentsReady, lessons.length]);

  const orderedLessons = useMemo(() => {
    if (lessons.length <= 1 || lessonAssignmentsByComponent.size === 0) {
      return lessons;
    }

    return [...lessons].sort((left, right) => {
      const leftAssignment = lessonAssignmentsByComponent.get(left.componentId);
      const rightAssignment = lessonAssignmentsByComponent.get(right.componentId);
      if (leftAssignment && !rightAssignment) return -1;
      if (!leftAssignment && rightAssignment) return 1;
      if (leftAssignment && rightAssignment) {
        const priorityDelta = LESSON_ASSIGNMENT_PRIORITY_ORDER[leftAssignment.priority] - LESSON_ASSIGNMENT_PRIORITY_ORDER[rightAssignment.priority];
        if (priorityDelta !== 0) return priorityDelta;
      }
      return left.sortOrder - right.sortOrder;
    });
  }, [lessonAssignmentsByComponent, lessons]);

  const clearFocusedLessonParam = useCallback((): void => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    const focusParamName = getKangurInternalQueryParamName('focus', basePath);
    if (!currentUrl.searchParams.has(focusParamName)) return;
    currentUrl.searchParams.delete(focusParamName);
    setFocusToken(null);
    window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [basePath]);
  const handleSelectLesson = useCallback(
    (lessonId: string | null, options?: { secret?: boolean }): void => {
      if (lessonId !== activeLessonId) {
        setIsActiveLessonComponentReady(false);
      }
      if (lessonId === null) {
        clearFocusedLessonParam();
      }
      setIsSecretLessonActive(Boolean(lessonId && options?.secret));
      setActiveLessonId(lessonId);
    },
    [activeLessonId, clearFocusedLessonParam]
  );

  useEffect((): void => {
    if (!activeLessonId) return;
    if (!lessons.some((lesson) => lesson.id === activeLessonId)) {
      setIsSecretLessonActive(false);
      setIsActiveLessonComponentReady(false);
      setActiveLessonId(null);
    }
  }, [activeLessonId, lessons]);

  useEffect((): void => {
    if (activeLessonId || typeof window === 'undefined') return;
    if (!focusToken) return;
    const currentUrl = new URL(window.location.href);
    const focusScope = resolveFocusedLessonScope(focusToken, lessonTemplateMap);
    if (focusScope?.ageGroup && focusScope.ageGroup !== ageGroup) {
      setAgeGroup(focusScope.ageGroup);
      return;
    }
    if (focusScope?.subject && focusScope.subject !== subject) {
      setSubject(focusScope.subject);
      return;
    }
    if (lessons.length === 0) return;
    const focusedLessonId = resolveFocusedLessonId(focusToken, lessons);
    if (!focusedLessonId) return;
    setIsActiveLessonComponentReady(false);
    setActiveLessonId(focusedLessonId);
    setFocusToken(null);
    currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));
    window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [
    activeLessonId,
    ageGroup,
    basePath,
    focusToken,
    lessons,
    lessonTemplateMap,
    setAgeGroup,
    setIsActiveLessonComponentReady,
    setSubject,
    subject,
  ]);

  const activeIdx =
    activeLessonId === null
      ? -1
      : orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] : null;
  const isCompleteLessonsCatalogLoaded =
    shouldExposeLessonCatalogDetails &&
    requestedLessonsCatalogComponentIds === undefined &&
    lessons.length > 0;
  const lessonDocuments = EMPTY_LESSON_DOCUMENTS;
  const isActiveLessonSurfaceReady =
    !activeLesson ||
    isSecretLessonActive ||
    isActiveLessonComponentReady;
  const isLocaleSwitchTransition =
    routeTransitionState?.activeTransitionKind === 'locale-switch';
  const expectsFocusedLesson =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'lessons-focus';
  const isLessonsShellReady = expectsFocusedLesson
    ? Boolean(activeLesson) && isActiveLessonSurfaceReady
    : isActiveLessonSurfaceReady;
  const isLessonsLibraryRouteReady =
    !expectsFocusedLesson &&
    activeLesson === null &&
    !isSecretLessonActive &&
    isLessonsShellReady;

  const isLessonsPageReady =
    isLocaleSwitchTransition
      ? isLessonsShellReady
      : expectsFocusedLesson
        ? isLessonsShellReady
        : isLessonsLibraryRouteReady;

  useKangurRoutePageReady({
    pageKey: 'Lessons',
    ready: isLessonsPageReady,
  });

  const handleGoBack = (): void => {
    routeNavigator.back({
      fallbackHref: getKangurHomeHref(basePath),
      fallbackPageKey: 'Game',
      sourceId: 'lessons:list-back',
    });
  };

  useLayoutEffect(() => {
    if (!activeLesson) return;
    if (isMobile) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    let frameId: number | null = null;
    let remainingFrames = ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES;
    const resolveTopOffset = (): number => {
      const styles = window.getComputedStyle(document.documentElement);
      let topBarHeight = Number.parseFloat(styles.getPropertyValue(KANGUR_TOP_BAR_HEIGHT_VAR_NAME));
      if (!topBarHeight) {
        const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
        if (topBar instanceof HTMLElement) topBarHeight = topBar.getBoundingClientRect().height;
      }
      return topBarHeight || KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX;
    };
    const scrollToTarget = (): boolean => {
      const target = activeLessonNavigationRef.current ?? activeLessonHeaderRef.current;
      if (!target) return false;
      const delta = target.getBoundingClientRect().top - resolveTopOffset();
      const nextTop = Math.max(0, window.scrollY + delta);
      window.scrollTo({ top: nextTop, left: 0, behavior: 'auto' });
      return Math.abs(delta) <= 8;
    };
    const scrollLoop = (): void => {
      if (scrollToTarget() || (remainingFrames -= 1) <= 0) { frameId = null; return; }
      frameId = window.requestAnimationFrame(scrollLoop);
    };
    if (!scrollToTarget()) frameId = window.requestAnimationFrame(scrollLoop);
    return () => { if (frameId !== null) window.cancelAnimationFrame(frameId); };
  }, [activeLesson?.id, isMobile]);

  return {
    auth,
    basePath,
    guestPlayerName,
    setGuestPlayerName,
    subject,
    setSubject,
    ageGroup,
    setAgeGroup,
    lessons,
    lessonSections,
      lessonTemplateMap,
      orderedLessons,
      isCompleteLessonsCatalogLoaded,
      lessonDocuments,
      isLessonsCatalogLoading,
      ensureLessonsCatalogLoaded,
      isLessonSectionsLoading,
      shouldShowLessonsCatalogSkeleton,
    activeLesson,
    activeLessonId,
    handleSelectLesson,
    isDeferredContentReady,
    isLessonsPageReady,
    handleGoBack,
    progress,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    isActiveLessonComponentReady,
    setIsActiveLessonComponentReady,
    activeLessonNavigationRef,
    activeLessonHeaderRef,
    activeLessonContentRef,
    activeLessonScrollRef,
    isSecretLessonActive,
    setIsSecretLessonActive,
  };
}
