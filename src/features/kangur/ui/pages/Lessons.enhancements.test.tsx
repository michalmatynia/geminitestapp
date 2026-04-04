/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  lessonsLoadingState,
  lessonSectionsLoadingState,
  localeState,
  routeTransitionStateState,
  setupLessonsPageTest,
  standardPageLayoutPropsMock,
  tutorSessionSyncPropsMock,
  useKangurDocsTooltipsMock,
  lessonsWordmarkPropsMock,
} from './Lessons.test-support';

describe('Lessons page deferred enhancements', () => {
  let Lessons: typeof import('@/features/kangur/ui/pages/Lessons').default;

  beforeEach(async () => {
    Lessons = await setupLessonsPageTest();
  });

  afterEach(() => {
    act(() => {
      cleanup();
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the translated page title in the tutor session context when no lesson is active', () => {
    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionContext: expect.objectContaining({
          contentId: 'lesson:list',
          title: 'Lekcje',
        }),
      })
    );
  });

  it('defers tutor session sync until after the first deferred render turn', () => {
    render(<Lessons />);

    expect(tutorSessionSyncPropsMock).not.toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionContext: expect.objectContaining({
          contentId: 'lesson:list',
          title: 'Lekcje',
        }),
      })
    );
  });

  it('defers docs tooltip mounting until after the first deferred render turn', () => {
    render(<Lessons />);

    expect(useKangurDocsTooltipsMock).not.toHaveBeenCalled();
    expect(standardPageLayoutPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        docsRootId: undefined,
        docsTooltipsEnabled: false,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurDocsTooltipsMock).toHaveBeenCalledWith('lessons');
    expect(standardPageLayoutPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        docsRootId: 'kangur-lessons-page',
        docsTooltipsEnabled: false,
      })
    );
  });

  it('keeps deferred lessons enhancements off the library route until the transition is idle', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
    };

    const view = render(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).not.toHaveBeenCalled();
    expect(useKangurDocsTooltipsMock).not.toHaveBeenCalled();

    routeTransitionStateState.value = {
      transitionPhase: 'idle',
    };

    view.rerender(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionContext: expect.objectContaining({
          contentId: 'lesson:list',
        }),
      })
    );
    expect(useKangurDocsTooltipsMock).toHaveBeenCalledWith('lessons');
  });

  it('keeps deferred lessons enhancements off until the lessons library shell has finished loading', () => {
    lessonsLoadingState.value = true;
    lessonSectionsLoadingState.value = true;

    const view = render(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).not.toHaveBeenCalled();
    expect(useKangurDocsTooltipsMock).not.toHaveBeenCalled();

    lessonsLoadingState.value = false;
    lessonSectionsLoadingState.value = false;

    view.rerender(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionContext: expect.objectContaining({
          contentId: 'lesson:list',
        }),
      })
    );
    expect(useKangurDocsTooltipsMock).toHaveBeenCalledWith('lessons');
  });

  it('renders the lessons wordmark immediately with the localized label', () => {
    render(<Lessons />);

    expect(lessonsWordmarkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Lekcje',
        locale: 'pl',
      })
    );
  });

  it('passes the localized German lessons label into the lessons wordmark', () => {
    localeState.value = 'de';

    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(lessonsWordmarkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Lektionen',
        locale: 'de',
      })
    );
  });
});
