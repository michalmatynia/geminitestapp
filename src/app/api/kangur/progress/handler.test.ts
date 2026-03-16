import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getKangurProgressRepositoryMock,
  getProgressMock,
  logKangurServerEventMock,
  logActivityMock,
  resolveKangurActorMock,
  saveProgressMock,
} = vi.hoisted(() => ({
  getKangurProgressRepositoryMock: vi.fn(),
  getProgressMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  logActivityMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  saveProgressMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurProgressRepository: getKangurProgressRepositoryMock,
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: (actor: { activeLearner?: unknown }) => actor.activeLearner,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

vi.mock('@/shared/utils/observability/activity-service', () => ({
  logActivity: logActivityMock,
}));

import { getKangurProgressHandler, patchKangurProgressHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-progress-1',
    traceId: 'trace-kangur-progress-1',
    correlationId: 'corr-kangur-progress-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createProgress = (
  overrides: Partial<ReturnType<typeof createDefaultKangurProgressState>> = {}
) => ({
  ...createDefaultKangurProgressState(),
  ...overrides,
});

const createPatchRequest = (
  body: string,
  extraHeaders?: Record<string, string>
): NextRequest =>
  new NextRequest('http://localhost/api/kangur/progress', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(extraHeaders ?? {}) },
    body,
  });

describe('kangur progress handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: getProgressMock,
      saveProgress: saveProgressMock,
    });
    getProgressMock.mockResolvedValue(createDefaultKangurProgressState());
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'ada@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
      },
      learners: [],
    });
  });

  it('loads authenticated learner progress by normalized session email', async () => {
    const progress = createProgress({
      totalXp: 180,
      gamesPlayed: 7,
      badges: ['first_game'],
    });
    getProgressMock
      .mockResolvedValueOnce(createDefaultKangurProgressState())
      .mockResolvedValueOnce(createDefaultKangurProgressState())
      .mockResolvedValueOnce(createDefaultKangurProgressState())
      .mockResolvedValueOnce(progress);

    const response = await getKangurProgressHandler(
      new NextRequest('http://localhost/api/kangur/progress'),
      createRequestContext()
    );

    expect(getProgressMock).toHaveBeenNthCalledWith(1, 'learner-1::maths');
    expect(getProgressMock).toHaveBeenNthCalledWith(2, 'ada@example.com::maths');
    expect(getProgressMock).toHaveBeenNthCalledWith(3, 'learner-1');
    expect(getProgressMock).toHaveBeenNthCalledWith(4, 'ada@example.com');
    expect(saveProgressMock).toHaveBeenCalledWith('learner-1::maths', progress);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(progress);
  });

  it('saves validated progress for the authenticated learner', async () => {
    const progress = createProgress({
      totalXp: 320,
      gamesPlayed: 11,
      perfectGames: 3,
      operationsPlayed: ['addition', 'multiplication'],
    });
    saveProgressMock.mockResolvedValue(progress);

    const response = await patchKangurProgressHandler(
      createPatchRequest(JSON.stringify(progress)),
      createRequestContext()
    );

    expect(saveProgressMock).toHaveBeenCalledWith('learner-1::maths', progress);
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.progress.update',
        statusCode: 200,
        context: expect.objectContaining({
          totalXp: 320,
          gamesPlayed: 11,
          subject: 'maths',
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(progress);
  });

  it('logs activity for lesson panel CTA progress updates', async () => {
    const progress = createProgress({
      totalXp: 42,
      gamesPlayed: 3,
    });
    saveProgressMock.mockResolvedValue(progress);
    logActivityMock.mockResolvedValue({
      id: 'activity-1',
      type: ActivityTypes.KANGUR.LESSON_PANEL_CTA,
      description: 'Lesson panel navigation CTA: lesson_panel_next',
      userId: 'parent-1',
      entityId: 'learner-1',
      entityType: 'kangur_learner',
      metadata: { source: 'lesson_panel_navigation', cta: 'lesson_panel_next' },
      createdAt: '2026-03-15T10:00:00.000Z',
      updatedAt: '2026-03-15T10:00:00.000Z',
    });
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'learner-1',
      actorType: 'learner',
      canManageLearners: false,
      role: 'user',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'ada@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
      },
      learners: [],
    });

    const response = await patchKangurProgressHandler(
      createPatchRequest(JSON.stringify(progress), {
        'x-kangur-progress-source': 'lesson_panel_navigation',
        'x-kangur-progress-cta': 'lesson_panel_next',
      }),
      createRequestContext()
    );

    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ActivityTypes.KANGUR.LESSON_PANEL_CTA,
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: expect.objectContaining({
          source: 'lesson_panel_navigation',
          cta: 'lesson_panel_next',
        }),
      })
    );
    expect(response.status).toBe(200);
  });

  it('logs opened task activity for learner progress updates', async () => {
    const previous = createProgress();
    getProgressMock.mockResolvedValueOnce(previous).mockResolvedValueOnce(previous);
    const progress = createProgress({
      openedTasks: [
        {
          kind: 'lesson',
          title: 'Powtórka zegara',
          href: '/kangur/lessons?focus=clock',
          openedAt: '2026-03-15T10:05:00.000Z',
        },
      ],
    });
    saveProgressMock.mockResolvedValue(progress);
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'learner-1',
      actorType: 'learner',
      canManageLearners: false,
      role: 'user',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'ada@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
      },
      learners: [],
    });

    const response = await patchKangurProgressHandler(
      createPatchRequest(JSON.stringify(progress)),
      createRequestContext()
    );

    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ActivityTypes.KANGUR.OPENED_TASK,
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: expect.objectContaining({
          kind: 'lesson',
          title: 'Powtórka zegara',
          href: '/kangur/lessons?focus=clock',
        }),
      })
    );
    expect(response.status).toBe(200);
  });

  it('logs lesson panel activity when session time advances', async () => {
    const previous = createProgress({
      lessonPanelProgress: {
        clock: {
          'section-1': {
            viewedCount: 1,
            totalCount: 5,
            lastViewedAt: '2026-03-15T10:00:00.000Z',
            panelTimes: {
              'panel-1': { seconds: 10 },
            },
            sessionId: 'session-1',
            sessionStartedAt: '2026-03-15T09:55:00.000Z',
            sessionUpdatedAt: '2026-03-15T10:00:00.000Z',
          },
        },
      },
    });
    getProgressMock.mockResolvedValueOnce(previous).mockResolvedValueOnce(previous);
    const progress = createProgress({
      lessonPanelProgress: {
        clock: {
          'section-1': {
            viewedCount: 1,
            totalCount: 5,
            lastViewedAt: '2026-03-15T10:06:00.000Z',
            panelTimes: {
              'panel-1': { seconds: 90 },
            },
            sessionId: 'session-1',
            sessionStartedAt: '2026-03-15T09:55:00.000Z',
            sessionUpdatedAt: '2026-03-15T10:06:00.000Z',
          },
        },
      },
    });
    saveProgressMock.mockResolvedValue(progress);
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'learner-1',
      actorType: 'learner',
      canManageLearners: false,
      role: 'user',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'ada@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
      },
      learners: [],
    });

    const response = await patchKangurProgressHandler(
      createPatchRequest(JSON.stringify(progress)),
      createRequestContext()
    );

    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: expect.objectContaining({
          lessonKey: 'clock',
          sectionId: 'section-1',
          totalSeconds: 90,
        }),
      })
    );
    expect(response.status).toBe(200);
  });

  it('skips activity log for parent progress updates', async () => {
    const progress = createProgress({ totalXp: 5 });
    saveProgressMock.mockResolvedValue(progress);

    await patchKangurProgressHandler(
      createPatchRequest(JSON.stringify(progress), {
        'x-kangur-progress-source': 'lesson_panel_navigation',
        'x-kangur-progress-cta': 'lesson_panel_next',
      }),
      createRequestContext()
    );

    expect(logActivityMock).not.toHaveBeenCalled();
  });

  it('rejects anonymous progress reads', async () => {
    resolveKangurActorMock.mockRejectedValue(new Error('Authentication required.'));

    await expect(
      getKangurProgressHandler(
        new NextRequest('http://localhost/api/kangur/progress'),
        createRequestContext()
      )
    ).rejects.toThrow('Authentication required.');
  });

  it('throws on invalid json payload', async () => {
    await expect(
      patchKangurProgressHandler(createPatchRequest('{invalid-json'), createRequestContext())
    ).rejects.toThrow('Invalid JSON payload.');
  });
});
