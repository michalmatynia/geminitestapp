import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  getKangurLessonGameSectionRepositoryMock,
  listSectionsMock,
  replaceSectionsForGameMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurLessonGameSectionRepositoryMock: vi.fn(),
  listSectionsMock: vi.fn(),
  replaceSectionsForGameMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-lesson-game-section-repository', () => ({
  getKangurLessonGameSectionRepository: getKangurLessonGameSectionRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

import {
  clearKangurLessonGameSectionsCache,
  getKangurLessonGameSectionsHandler,
  postKangurLessonGameSectionsHandler,
} from './handler';

const createRequestContext = (query?: Record<string, unknown>, body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-lesson-game-sections-1',
    traceId: 'trace-kangur-lesson-game-sections-1',
    correlationId: 'corr-kangur-lesson-game-sections-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
    body,
  }) as ApiHandlerContext;

const createClockSection = (
  overrides: Partial<KangurLessonGameSection> = {}
): KangurLessonGameSection => ({
  id: 'clock_saved_section',
  lessonComponentId: 'clock',
  gameId: 'clock_training',
  instanceId: 'clock_training:instance:clock-minutes',
  title: 'Saved clock deck',
  description: 'Saved section from the lesson hub.',
  emoji: '🧩',
  sortOrder: 1,
  enabled: true,
  settings: {
    clock: {
      clockSection: 'minutes',
      initialMode: 'challenge',
      showHourHand: false,
      showMinuteHand: true,
      showModeSwitch: true,
      showTaskTitle: true,
      showTimeDisplay: false,
    },
  },
  ...overrides,
});

describe('kangur lesson game sections handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurLessonGameSectionsCache();
    getKangurLessonGameSectionRepositoryMock.mockResolvedValue({
      listSections: listSectionsMock,
      replaceSectionsForGame: replaceSectionsForGameMock,
    });
    resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('reuses cached game sections across repeated list requests', async () => {
    listSectionsMock.mockResolvedValue([createClockSection()]);

    const first = await getKangurLessonGameSectionsHandler(
      new NextRequest(
        'http://localhost/api/kangur/lesson-game-sections?gameId=clock_training&enabledOnly=true'
      ),
      createRequestContext({
        enabledOnly: true,
        gameId: 'clock_training',
      })
    );
    const second = await getKangurLessonGameSectionsHandler(
      new NextRequest(
        'http://localhost/api/kangur/lesson-game-sections?gameId=clock_training&enabledOnly=true'
      ),
      createRequestContext({
        enabledOnly: true,
        gameId: 'clock_training',
      })
    );

    expect(listSectionsMock).toHaveBeenCalledTimes(1);
    await expect(first.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_saved_section',
        instanceId: 'clock_training:instance:clock-minutes',
      }),
    ]);
    await expect(second.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_saved_section',
        instanceId: 'clock_training:instance:clock-minutes',
      }),
    ]);
  });

  it('passes enabled and lesson filters through to the repository', async () => {
    listSectionsMock.mockResolvedValue([
      createClockSection({
        id: 'clock_saved_calendar_section',
        lessonComponentId: 'calendar',
      }),
    ]);

    const response = await getKangurLessonGameSectionsHandler(
      new NextRequest(
        'http://localhost/api/kangur/lesson-game-sections?gameId=clock_training&lessonComponentId=calendar&enabledOnly=true'
      ),
      createRequestContext({
        enabledOnly: true,
        gameId: 'clock_training',
        lessonComponentId: 'calendar',
      })
    );

    expect(listSectionsMock).toHaveBeenCalledWith({
      enabledOnly: true,
      gameId: 'clock_training',
      lessonComponentId: 'calendar',
    });
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_saved_calendar_section',
        instanceId: 'clock_training:instance:clock-minutes',
        lessonComponentId: 'calendar',
      }),
    ]);
  });

  it('invalidates cached game sections after a replace', async () => {
    const cachedSection = createClockSection();
    const replacedSection = createClockSection({
      id: 'clock_saved_section_updated',
      lessonComponentId: 'calendar',
      title: 'Updated clock deck',
    });

    listSectionsMock
      .mockResolvedValueOnce([cachedSection])
      .mockResolvedValueOnce([replacedSection]);
    replaceSectionsForGameMock.mockResolvedValue([replacedSection]);

    await getKangurLessonGameSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-game-sections?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );

    await postKangurLessonGameSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-game-sections', {
        method: 'POST',
      }),
      createRequestContext(undefined, {
        gameId: 'clock_training',
        sections: [replacedSection],
      })
    );

    const refreshed = await getKangurLessonGameSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-game-sections?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );

    expect(replaceSectionsForGameMock).toHaveBeenCalledWith('clock_training', [
      expect.objectContaining({
        id: 'clock_saved_section_updated',
        instanceId: 'clock_training:instance:clock-minutes',
      }),
    ]);
    expect(listSectionsMock).toHaveBeenCalledTimes(2);
    await expect(refreshed.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_saved_section_updated',
        instanceId: 'clock_training:instance:clock-minutes',
        lessonComponentId: 'calendar',
      }),
    ]);
  });

  it('rejects writes for non-admin actors', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({ role: 'user' });

    await expect(
      postKangurLessonGameSectionsHandler(
        new NextRequest('http://localhost/api/kangur/lesson-game-sections', {
          method: 'POST',
        }),
        createRequestContext(undefined, {
          gameId: 'clock_training',
          sections: [createClockSection()],
        })
      )
    ).rejects.toMatchObject({
      httpStatus: 403,
    });

    expect(replaceSectionsForGameMock).not.toHaveBeenCalled();
  });
});
