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
import { useKangurLessonDocuments, useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import type {
  KangurLesson,
  KangurLessonComponentId,
} from '@/features/kangur/shared/contracts/kangur';
import { LESSON_COMPONENTS } from '@/features/kangur/lessons/lesson-ui-registry';
import { resolveFocusedLessonSubject } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import {
  ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES,
  LESSONS_ROUTE_ACKNOWLEDGE_MS,
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

  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);
  const [isActiveLessonComponentReady, setIsActiveLessonComponentReady] = useState(false);
  const progress = useKangurProgressState();
  
  const activeLessonNavigationRef = useRef<HTMLDivElement | null>(null);
  const activeLessonHeaderRef = useRef<HTMLDivElement | null>(null);
  const activeLessonContentRef = useRef<HTMLDivElement | null>(null);

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
  const lessonDocumentsQuery = useKangurLessonDocuments({ enabled: isDeferredContentReady });
  
  const lessons = useMemo(
    (): KangurLesson[] =>
      isDeferredContentReady
        ? (lessonsQuery.data ?? []).filter(
            (lesson) => lesson.subject === subject && lesson.ageGroup === ageGroup
          )
        : [],
    [ageGroup, isDeferredContentReady, lessonsQuery.data, subject]
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
  const handleSelectLesson = useCallback((lessonId: string | null): void => {
    setIsSecretLessonActive(false);
    setActiveLessonId(lessonId);
  }, []);

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
    const focusSubject = resolveFocusedLessonSubject(focusToken);
    if (focusSubject && focusSubject !== subject) {
      setSubject(focusSubject);
      return;
    }
    if (lessons.length === 0) return;
    const focusedLessonId = resolveFocusedLessonId(focusToken, lessons);
    if (!focusedLessonId) return;
    setActiveLessonId(focusedLessonId);
    currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));
    window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [activeLessonId, basePath, lessons, setSubject, subject]);

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

  const expectsFocusedLesson =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'lessons-focus';
  
  const isLessonsPageReady =
    isDeferredContentReady &&
    (expectsFocusedLesson ? Boolean(activeLesson) && isActiveLessonSurfaceReady : isActiveLessonSurfaceReady);

  useKangurRoutePageReady({
    pageKey: 'Lessons',
    ready: isLessonsPageReady,
  });

  const handleGoBack = (): void => {
    routeNavigator.back({
      acknowledgeMs: LESSONS_ROUTE_ACKNOWLEDGE_MS,
      fallbackHref: getKangurHomeHref(basePath),
      fallbackPageKey: 'Game',
      sourceId: 'lessons:list-back',
    });
  };

  useLayoutEffect(() => {
    if (!activeLesson) return;
    let frameId: number | null = null;
    let remainingFrames = ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES;
    const resolveTopOffset = (): number => {
      const styles = window.getComputedStyle(document.documentElement);
      let topBarHeight = Number.parseFloat(styles.getPropertyValue('--kangur-top-bar-height')) || 0;
      if (!topBarHeight) {
        const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
        if (topBar instanceof HTMLElement) topBarHeight = topBar.getBoundingClientRect().height;
      }
      return topBarHeight;
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
  }, [activeLesson?.id]);

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
    orderedLessons,
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
    isSecretLessonActive,
    setIsSecretLessonActive,
  };
}
