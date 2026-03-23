import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  getKangurHomeHref,
  getKangurInternalQueryParamName,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurLessonSections } from '@/features/kangur/ui/hooks/useKangurLessonSections';
import { useKangurLessonDocuments, useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import type {
  KangurLesson,
  KangurLessonComponentId,
} from '@/features/kangur/shared/contracts/kangur';
import { LESSON_COMPONENTS } from '@/features/kangur/lessons/lesson-ui-registry';
import { resolveFocusedLessonScope } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import {
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurLessonTemplates } from '@/features/kangur/ui/hooks/useKangurLessonTemplates';
import {
  ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES,
} from './Lessons.constants';
import {
  getLessonAssignmentTimestamp,
  LESSON_ASSIGNMENT_PRIORITY_ORDER,
  resolveFocusedLessonId,
} from './Lessons.utils';

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
  const { data: lessonTemplates = [] } = useKangurLessonTemplates();
  const lessonTemplateMap = useMemo(
    () => new Map(lessonTemplates.map((t) => [t.componentId, t])),
    [lessonTemplates],
  );

  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);
  const [isActiveLessonComponentReady, setIsActiveLessonComponentReady] = useState(false);
  const progress = useKangurProgressState();
  
  const activeLessonNavigationRef = useRef<HTMLDivElement | null>(null);
  const activeLessonHeaderRef = useRef<HTMLDivElement | null>(null);
  const activeLessonContentRef = useRef<HTMLDivElement | null>(null);
  const activeLessonScrollRef = useRef<HTMLDivElement | null>(null);

  const { assignments } = useKangurAssignments({
    enabled: isDeferredContentReady && canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frameId = window.requestAnimationFrame(() => setIsDeferredContentReady(true));
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const lessonsQuery = useKangurLessons({
    subject,
    ageGroup,
    enabledOnly: true,
    enabled: isDeferredContentReady,
  });
  const lessonSectionsQuery = useKangurLessonSections({
    subject,
    ageGroup,
    enabledOnly: true,
    enabled: isDeferredContentReady,
  });
  const lessonDocumentsQuery = useKangurLessonDocuments({ enabled: isDeferredContentReady });
  const isLessonsCatalogLoading =
    isDeferredContentReady &&
    Boolean(
      lessonsQuery.isPending ||
        lessonsQuery.isLoading ||
        (lessonsQuery.isFetching && typeof lessonsQuery.data === 'undefined')
    );
  const isLessonSectionsLoading =
    isDeferredContentReady &&
    Boolean(
      lessonSectionsQuery.isPending ||
        lessonSectionsQuery.isLoading ||
        (lessonSectionsQuery.isFetching && typeof lessonSectionsQuery.data === 'undefined')
    );
  const shouldShowLessonsCatalogSkeleton = !isDeferredContentReady || isLessonsCatalogLoading || isLessonSectionsLoading;
  
  const lessons = useMemo(
    (): KangurLesson[] =>
      isDeferredContentReady
        ? (lessonsQuery.data ?? []).filter(
            (lesson) => lesson.subject === subject && lesson.ageGroup === ageGroup
          )
        : [],
    [ageGroup, isDeferredContentReady, lessonsQuery.data, subject]
  );
  const lessonSections = useMemo(
    () => (isDeferredContentReady ? lessonSectionsQuery.data ?? [] : []),
    [isDeferredContentReady, lessonSectionsQuery.data]
  );
  const lessonDocuments = useMemo(
    () => (isDeferredContentReady ? lessonDocumentsQuery.data ?? {} : {}),
    [isDeferredContentReady, lessonDocumentsQuery.data]
  );

  const lessonAssignmentsByComponent = useMemo(() => {
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
  }, [assignments]);

  const completedLessonAssignmentsByComponent = useMemo(() => {
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
  }, [assignments]);

  const orderedLessons = useMemo(() => {
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

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isSecretLessonActive, setIsSecretLessonActive] = useState(false);
  const clearFocusedLessonParam = useCallback((): void => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    const focusParamName = getKangurInternalQueryParamName('focus', basePath);
    if (!currentUrl.searchParams.has(focusParamName)) return;
    currentUrl.searchParams.delete(focusParamName);
    window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [basePath]);
  const handleSelectLesson = useCallback(
    (lessonId: string | null, options?: { secret?: boolean }): void => {
      if (lessonId === null) {
        setIsSecretLessonActive(false);
        setIsActiveLessonComponentReady(false);
        clearFocusedLessonParam();
      }
      setIsSecretLessonActive(Boolean(options?.secret));
      setActiveLessonId(lessonId);
    },
    [clearFocusedLessonParam]
  );

  useEffect((): void => {
    if (!activeLessonId) return;
    if (!lessons.some((lesson) => lesson.id === activeLessonId)) {
      setIsSecretLessonActive(false);
      setActiveLessonId(null);
    }
  }, [activeLessonId, lessons]);

  useEffect((): void => {
    if (activeLessonId || typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    const focusToken = readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)?.trim().toLowerCase();
    if (!focusToken) return;
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
    setActiveLessonId(focusedLessonId);
    currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));
    window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [
    activeLessonId,
    ageGroup,
    basePath,
    lessons,
    lessonTemplateMap,
    setAgeGroup,
    setSubject,
    subject,
  ]);

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] : null;
  const ActiveLessonComponent = activeLesson ? LESSON_COMPONENTS[activeLesson.componentId] : null;
  const activeLessonDocument = activeLesson ? (lessonDocuments[activeLesson.id] ?? null) : null;
  const hasActiveLessonDocContent = hasKangurLessonDocumentContent(activeLessonDocument);
  
  const isActiveLessonSurfaceReady =
    !activeLesson ||
    isSecretLessonActive ||
    (activeLesson.contentMode === 'document' && hasActiveLessonDocContent) ||
    (activeLesson.contentMode === 'document' && !hasActiveLessonDocContent) ||
    !ActiveLessonComponent ||
    isActiveLessonComponentReady;
  const isLocaleSwitchTransition =
    routeTransitionState?.activeTransitionKind === 'locale-switch';
  const shouldHoldLessonsLibraryTransition =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'lessons-library';

  const expectsFocusedLesson =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'lessons-focus';
  const isLessonsShellReady = expectsFocusedLesson
    ? Boolean(activeLesson) && isActiveLessonSurfaceReady
    : isActiveLessonSurfaceReady;
  const isLessonsCatalogTransitionReady =
    !expectsFocusedLesson &&
    activeLesson === null &&
    !isSecretLessonActive &&
    (!shouldHoldLessonsLibraryTransition || !shouldShowLessonsCatalogSkeleton);

  const isLessonsPageReady =
    isLocaleSwitchTransition
      ? isLessonsShellReady
      : shouldHoldLessonsLibraryTransition
        ? isLessonsCatalogTransitionReady && isLessonsShellReady
        : (isDeferredContentReady || isLessonsCatalogTransitionReady) && isLessonsShellReady;

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
    orderedLessons,
    isLessonsCatalogLoading,
    isLessonSectionsLoading,
    shouldShowLessonsCatalogSkeleton,
    lessonDocuments,
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
