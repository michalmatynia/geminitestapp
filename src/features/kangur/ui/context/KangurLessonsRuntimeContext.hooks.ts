'use client';

import { useEffect, useState } from 'react';
import {
  getKangurInternalQueryParamName,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import {
  resolveFocusedLessonId,
  resolveFocusedLessonScope,
} from './KangurLessonsRuntimeContext.shared';
import type { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import type { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  type KangurFocusedLessonAction,
} from './KangurLessonsRuntimeContext.utils';

export const scheduleKangurAssignmentsReady = (
  onReady: () => void
): (() => void) => {
  if (
    typeof window.requestAnimationFrame === 'function' &&
    typeof window.cancelAnimationFrame === 'function'
  ) {
    const frameId = window.requestAnimationFrame(onReady);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }

  const timeoutId = window.setTimeout(onReady, 0);
  return () => {
    window.clearTimeout(timeoutId);
  };
};

export const useKangurAssignmentsReady = (canAccessParentAssignments: boolean): boolean => {
  const [isAssignmentsReady, setIsAssignmentsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsAssignmentsReady(canAccessParentAssignments);
      return;
    }

    if (!canAccessParentAssignments) {
      setIsAssignmentsReady(false);
      return;
    }

    const cancelScheduledReady = scheduleKangurAssignmentsReady(() => {
      setIsAssignmentsReady(true);
    });

    return () => {
      setIsAssignmentsReady(false);
      cancelScheduledReady();
    };
  }, [canAccessParentAssignments]);

  return isAssignmentsReady;
};

export const useKangurFocusToken = (basePath: string): string | null => {
  const [focusToken, setFocusToken] = useState<string | null>(null);

  useEffect((): void => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const nextFocusToken =
      readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)
        ?.trim()
        .toLowerCase() ?? null;
    setFocusToken(nextFocusToken && nextFocusToken.length > 0 ? nextFocusToken : null);
  }, [basePath]);

  return focusToken;
};

export const useKangurActiveLessonExistenceGuard = ({
  activeLessonId,
  lessons,
  setActiveLessonId,
}: {
  activeLessonId: string | null;
  lessons: KangurLesson[];
  setActiveLessonId: (lessonId: string | null) => void;
}): void => {
  useEffect((): void => {
    if (!activeLessonId) return;
    const exists = lessons.some((lesson) => lesson.id === activeLessonId);
    if (!exists) {
      setActiveLessonId(null);
    }
  }, [activeLessonId, lessons, setActiveLessonId]);
};

export const canResolveKangurFocusedLessonAction = ({
  activeLessonId,
  focusToken,
  lessons,
}: {
  activeLessonId: string | null;
  focusToken: string | null;
  lessons: KangurLesson[];
}): boolean =>
  !activeLessonId &&
  typeof window !== 'undefined' &&
  Boolean(focusToken) &&
  lessons.length > 0;

export const resolveKangurFocusedLessonScopeAction = ({
  ageGroup,
  focusScope,
  subject,
}: {
  ageGroup: KangurLessonAgeGroup;
  focusScope: ReturnType<typeof resolveFocusedLessonScope>;
  subject: KangurLessonSubject;
}): KangurFocusedLessonAction => {
  if (focusScope?.ageGroup && focusScope.ageGroup !== ageGroup) {
    return { kind: 'set-age-group', ageGroup: focusScope.ageGroup };
  }

  if (focusScope?.subject && focusScope.subject !== subject) {
    return { kind: 'set-subject', subject: focusScope.subject };
  }

  return { kind: 'none' };
};

export const resolveKangurFocusedLessonAction = ({
  activeLessonId,
  ageGroup,
  basePath,
  focusToken,
  lessonTemplateMap,
  lessons,
  subject,
}: {
  activeLessonId: string | null;
  ageGroup: ReturnType<typeof useKangurAgeGroupFocus>['ageGroup'];
  basePath: string;
  focusToken: string | null;
  lessonTemplateMap: Map<KangurLessonComponentId, KangurLessonTemplate>;
  lessons: KangurLesson[];
  subject: KangurLessonSubject;
}): KangurFocusedLessonAction => {
  if (!canResolveKangurFocusedLessonAction({ activeLessonId, focusToken, lessons })) {
    return { kind: 'none' };
  }

  const focusScope = resolveFocusedLessonScope(focusToken ?? '', lessonTemplateMap);
  const focusScopeAction = resolveKangurFocusedLessonScopeAction({
    ageGroup,
    focusScope,
    subject,
  });
  if (focusScopeAction.kind !== 'none') {
    return focusScopeAction;
  }

  const focusedLessonId = resolveFocusedLessonId(focusToken ?? '', lessons);
  if (!focusedLessonId) {
    return { kind: 'none' };
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));

  return {
    kind: 'activate-lesson',
    lessonId: focusedLessonId,
    nextHref: `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
  };
};

export const useKangurFocusedLessonSelection = ({
  activeLessonId,
  ageGroup,
  basePath,
  focusToken,
  lessonTemplateMap,
  lessons,
  setActiveLessonId,
  setAgeGroup,
  setSubject,
  subject,
}: {
  activeLessonId: string | null;
  ageGroup: ReturnType<typeof useKangurAgeGroupFocus>['ageGroup'];
  basePath: string;
  focusToken: string | null;
  lessonTemplateMap: Map<KangurLessonComponentId, KangurLessonTemplate>;
  lessons: KangurLesson[];
  setActiveLessonId: (lessonId: string | null) => void;
  setAgeGroup: ReturnType<typeof useKangurAgeGroupFocus>['setAgeGroup'];
  setSubject: ReturnType<typeof useKangurSubjectFocus>['setSubject'];
  subject: KangurLessonSubject;
}): void => {
  useEffect((): void => {
    const action = resolveKangurFocusedLessonAction({
      activeLessonId,
      ageGroup,
      basePath,
      focusToken,
      lessonTemplateMap,
      lessons,
      subject,
    });

    if (action.kind === 'set-age-group') {
      setAgeGroup(action.ageGroup);
      return;
    }

    if (action.kind === 'set-subject') {
      setSubject(action.subject);
      return;
    }

    if (action.kind === 'activate-lesson') {
      setActiveLessonId(action.lessonId);
      window.history.replaceState({}, '', action.nextHref);
    }
  }, [
    activeLessonId,
    ageGroup,
    basePath,
    focusToken,
    lessonTemplateMap,
    lessons,
    setActiveLessonId,
    setAgeGroup,
    setSubject,
    subject,
  ]);
};
