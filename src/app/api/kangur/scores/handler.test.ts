import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { authMock, getKangurScoreRepositoryMock, listScoresMock, createScoreMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    getKangurScoreRepositoryMock: vi.fn(),
    listScoresMock: vi.fn(),
    createScoreMock: vi.fn(),
  })
);

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurScoreRepository: getKangurScoreRepositoryMock,
}));

import { getKangurScoresHandler, postKangurScoresHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-1',
    traceId: 'trace-kangur-1',
    correlationId: 'corr-kangur-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createScoreRow = () => ({
  id: 'score-1',
  player_name: 'Ada',
  score: 9,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 9,
  time_taken: 33,
  created_date: '2026-03-05T10:00:00.000Z',
  created_by: 'teacher@example.com',
});

const createPostRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/scores', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('kangur scores handler', () => {
  beforeEach(() => {
    authMock.mockReset();
    getKangurScoreRepositoryMock.mockReset();
    listScoresMock.mockReset();
    createScoreMock.mockReset();

    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: listScoresMock,
      createScore: createScoreMock,
    });
  });

  it('lists scores with normalized query params', async () => {
    const row = createScoreRow();
    listScoresMock.mockResolvedValue([row]);

    const response = await getKangurScoresHandler(
      new NextRequest(
        'http://localhost/api/kangur/scores?sort=-score&limit=25&player_name=Ada&operation=addition&created_by=teacher%40example.com'
      ),
      createRequestContext()
    );

    expect(listScoresMock).toHaveBeenCalledWith({
      sort: '-score',
      limit: 25,
      filters: {
        player_name: 'Ada',
        operation: 'addition',
        created_by: 'teacher@example.com',
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([row]);
  });

  it('falls back to canonical sort when query sort field is unsupported', async () => {
    listScoresMock.mockResolvedValue([]);

    await getKangurScoresHandler(
      new NextRequest('http://localhost/api/kangur/scores?sort=-unsupported&limit=10'),
      createRequestContext()
    );

    expect(listScoresMock).toHaveBeenCalledWith({
      sort: '-created_date',
      limit: 10,
      filters: {
        player_name: undefined,
        operation: undefined,
        created_by: undefined,
      },
    });
  });

  it('creates score and stamps created_by from session email', async () => {
    const created = createScoreRow();
    authMock.mockResolvedValue({ user: { email: 'teacher@example.com' } });
    createScoreMock.mockResolvedValue(created);

    const response = await postKangurScoresHandler(
      createPostRequest(
        JSON.stringify({
          player_name: 'Ada',
          score: 9,
          operation: 'addition',
          total_questions: 10,
          correct_answers: 9,
          time_taken: 33,
        })
      ),
      createRequestContext()
    );

    expect(createScoreMock).toHaveBeenCalledWith({
      player_name: 'Ada',
      score: 9,
      operation: 'addition',
      total_questions: 10,
      correct_answers: 9,
      time_taken: 33,
      created_by: 'teacher@example.com',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(created);
  });

  it('throws on invalid JSON payload', async () => {
    await expect(
      postKangurScoresHandler(createPostRequest('{invalid-json'), createRequestContext())
    ).rejects.toThrow('Invalid JSON payload.');
  });

  it('throws when payload is empty', async () => {
    await expect(
      postKangurScoresHandler(
        new NextRequest('http://localhost/api/kangur/scores', { method: 'POST' }),
        createRequestContext()
      )
    ).rejects.toThrow('Kangur score payload is required.');
  });
});
