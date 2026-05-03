import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAgentLongTermMemoryDelegateMock, findManyMock } = vi.hoisted(() => ({
  getAgentLongTermMemoryDelegateMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/store-delegates', () => ({
  getAgentLongTermMemoryDelegate: getAgentLongTermMemoryDelegateMock,
}));

import { getHandler } from './handler';

describe('chatbot memory handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAgentLongTermMemoryDelegateMock.mockReturnValue({
      findMany: findManyMock,
    });
    findManyMock.mockResolvedValue([
      {
        id: 'memory-1',
        sessionId: 'session-1',
        key: 'summary',
        value: 'Stored memory',
      },
    ]);
  });

  it('loads memory items using the shared memory query DTO', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/chatbot/memory'),
      {
        query: {
          memoryKey: 'summary',
          tag: 'important',
          q: 'deploy',
          limit: '25',
        },
      } as Parameters<typeof getHandler>[1]
    );

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        memoryKey: 'summary',
        tags: { has: 'important' },
        OR: [
          { content: { contains: 'deploy', mode: 'insensitive' } },
          { summary: { contains: 'deploy', mode: 'insensitive' } },
          { tags: { has: 'deploy' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    });
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: 'memory-1',
          sessionId: 'session-1',
          key: 'summary',
          value: 'Stored memory',
        },
      ],
    });
  });
});
