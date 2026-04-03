/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY } from './KangurAiTutorWidget.shared';

const { withKangurClientErrorSyncMock } = vi.hoisted(() => ({
  withKangurClientErrorSyncMock: vi.fn((_: unknown, callback: () => unknown, options?: { fallback?: (() => unknown) | unknown }) => {
    try {
      return callback();
    } catch {
      if (typeof options?.fallback === 'function') {
        return options.fallback();
      }

      return options?.fallback ?? null;
    }
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientErrorSync: withKangurClientErrorSyncMock,
}));

let storageModule: typeof import('./KangurAiTutorWidget.storage');

describe('KangurAiTutorWidget storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    window.sessionStorage.clear();
    storageModule = await import('./KangurAiTutorWidget.storage');
  });

  it('persists and loads the drawing draft snapshot', () => {
    storageModule.persistTutorDrawingDraftSnapshot('draft-snapshot-1');

    expect(storageModule.loadPersistedTutorDrawingDraftSnapshot()).toBe('draft-snapshot-1');
    expect(
      JSON.parse(window.sessionStorage.getItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY) ?? '{}')
    ).toEqual(
      expect.objectContaining({
        drawingDraftSnapshot: 'draft-snapshot-1',
      })
    );
  });

  it('clears the stored drawing draft without removing the persisted tutor session key', () => {
    storageModule.persistTutorSessionKey('session-1');
    storageModule.persistTutorDrawingDraftSnapshot('draft-snapshot-1');

    storageModule.clearPersistedTutorDrawingDraftSnapshot();

    expect(storageModule.loadPersistedTutorDrawingDraftSnapshot()).toBeNull();
    expect(storageModule.loadPersistedTutorSessionKey()).toBe('session-1');
    expect(
      JSON.parse(window.sessionStorage.getItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY) ?? '{}')
    ).toEqual(
      expect.objectContaining({
        lastSessionKey: 'session-1',
      })
    );
  });

  it('removes the widget storage entry when the drawing draft was the last persisted field', () => {
    storageModule.persistTutorDrawingDraftSnapshot('draft-snapshot-1');

    storageModule.clearPersistedTutorDrawingDraftSnapshot();

    expect(window.sessionStorage.getItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY)).toBeNull();
  });

  it('hydrates the widget state drawing draft from persisted storage', async () => {
    storageModule.persistTutorDrawingDraftSnapshot('draft-snapshot-1');
    const stateModule = await import('./KangurAiTutorWidget.state');

    const { result } = renderHook(() => stateModule.useKangurAiTutorWidgetState());

    expect(result.current.drawingDraftSnapshot).toBe('draft-snapshot-1');
  });

  it('loads a persisted pending follow-up only when the stored record matches the public shape', () => {
    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify({
        pendingFollowUp: {
          version: 1,
          href: '/lesson?tab=practice',
          pathname: '/lesson',
          search: '?tab=practice',
          actionId: 'review-answer',
          actionLabel: 'Review answer',
          actionReason: 'The learner asked for a recap.',
          actionPage: 'lesson',
          messageIndex: 2,
          hasQuery: true,
          sourceSurface: 'lesson_page',
          sourceContentId: 'content-1',
          sourceTitle: 'Clock lesson',
          sourcePathname: '/lesson',
          sourceSearch: '?tab=practice',
          createdAt: '2026-04-03T18:00:00.000Z',
        },
      })
    );

    expect(storageModule.loadPersistedPendingTutorFollowUp()).toEqual({
      version: 1,
      href: '/lesson?tab=practice',
      pathname: '/lesson',
      search: '?tab=practice',
      actionId: 'review-answer',
      actionLabel: 'Review answer',
      actionReason: 'The learner asked for a recap.',
      actionPage: 'lesson',
      messageIndex: 2,
      hasQuery: true,
      sourceSurface: 'lesson_page',
      sourceContentId: 'content-1',
      sourceTitle: 'Clock lesson',
      sourcePathname: '/lesson',
      sourceSearch: '?tab=practice',
      createdAt: '2026-04-03T18:00:00.000Z',
    });

    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify({
        pendingFollowUp: {
          version: 1,
          href: '/lesson?tab=practice',
          pathname: '/lesson',
          search: '?tab=practice',
          actionId: 'review-answer',
          actionLabel: 'Review answer',
          actionReason: 'The learner asked for a recap.',
          actionPage: 'lesson',
          messageIndex: 2,
          hasQuery: true,
          sourceSurface: 42,
          sourceContentId: 'content-1',
          sourceTitle: 'Clock lesson',
          sourcePathname: '/lesson',
          sourceSearch: '?tab=practice',
          createdAt: '2026-04-03T18:00:00.000Z',
        },
      })
    );

    expect(storageModule.loadPersistedPendingTutorFollowUp()).toBeNull();
  });

  it('loads a persisted panel position only for supported mode and snap values', () => {
    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify({
        panelPosition: {
          version: 1,
          left: 120,
          top: 260,
          mode: 'manual',
          snap: 'bottom-right',
          updatedAt: '2026-04-03T18:10:00.000Z',
        },
      })
    );

    expect(storageModule.loadPersistedTutorPanelPosition()).toEqual({
      version: 1,
      left: 120,
      top: 260,
      mode: 'manual',
      snap: 'bottom-right',
      updatedAt: '2026-04-03T18:10:00.000Z',
    });

    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify({
        panelPosition: {
          version: 1,
          left: 120,
          top: 260,
          mode: 'floating',
          snap: 'bottom-right',
          updatedAt: '2026-04-03T18:10:00.000Z',
        },
      })
    );

    expect(storageModule.loadPersistedTutorPanelPosition()).toBeNull();
  });
});
