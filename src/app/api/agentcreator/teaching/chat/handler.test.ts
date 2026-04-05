import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  buildPromptMock,
  runTeachingChatMock,
  mergeBundlesMock,
  resolveRefsMock,
  parseJsonBodyMock,
} = vi.hoisted(() => ({
  buildPromptMock: vi.fn(),
  runTeachingChatMock: vi.fn(),
  mergeBundlesMock: vi.fn(),
  resolveRefsMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
}));

vi.mock('@/features/ai/agentcreator/teaching/context-registry/system-prompt', () => ({
  buildAgentTeachingContextRegistrySystemPrompt: buildPromptMock,
}));

vi.mock('@/features/ai/agentcreator/teaching/server/chat', () => ({
  runTeachingChat: runTeachingChatMock,
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context-shared', () => ({
  mergeContextRegistryResolutionBundles: mergeBundlesMock,
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: resolveRefsMock,
  },
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

import { POST_handler } from './handler';

describe('agentcreator teaching chat handler module', () => {
  const requestContext = {
    requestId: 'request-agentcreator-teaching-chat-1',
    traceId: 'trace-agentcreator-teaching-chat-1',
    correlationId: 'corr-agentcreator-teaching-chat-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  } as ApiHandlerContext;

  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        agentId: 'agent-1',
        messages: [{ role: 'user', content: 'What is this collection about?' }],
        contextRegistry: {
          refs: [{ id: 'node-1', kind: 'static_node' }],
          resolved: {
            refs: [{ id: 'cached-1', kind: 'static_node' }],
            nodes: [{ id: 'cached-1' }],
            documents: [],
            truncated: false,
            engineVersion: 'cached-engine',
          },
        },
      },
    });
    resolveRefsMock.mockResolvedValue({
      refs: [{ id: 'node-1', kind: 'static_node' }],
      nodes: [{ id: 'node-1' }],
      documents: [],
      truncated: false,
      engineVersion: 'resolved-engine',
    });
    mergeBundlesMock.mockReturnValue({
      refs: [
        { id: 'node-1', kind: 'static_node' },
        { id: 'cached-1', kind: 'static_node' },
      ],
      nodes: [{ id: 'node-1' }, { id: 'cached-1' }],
      documents: [],
      truncated: false,
      engineVersion: 'merged-engine',
    });
    buildPromptMock.mockReturnValue('System prompt with registry context');
    runTeachingChatMock.mockResolvedValue({
      message: 'This collection explains the product catalog.',
      sources: [],
    });
  });

  it('returns the parse-json response when request validation fails', async () => {
    const parseErrorResponse = new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
    parseJsonBodyMock.mockResolvedValue({
      ok: false,
      response: parseErrorResponse,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/agentcreator/teaching/chat', {
        method: 'POST',
      }),
      requestContext
    );

    expect(response).toBe(parseErrorResponse);
    expect(resolveRefsMock).not.toHaveBeenCalled();
    expect(runTeachingChatMock).not.toHaveBeenCalled();
  });

  it('resolves context refs, builds the system prompt, and runs the teaching chat', async () => {
    const request = new NextRequest('http://localhost/api/agentcreator/teaching/chat', {
      method: 'POST',
    });

    const response = await POST_handler(request, requestContext);

    expect(parseJsonBodyMock).toHaveBeenCalledTimes(1);
    expect(resolveRefsMock).toHaveBeenCalledWith({
      refs: [{ id: 'node-1', kind: 'static_node' }],
      maxNodes: 24,
      depth: 1,
    });
    expect(mergeBundlesMock).toHaveBeenCalledWith(
      {
        refs: [{ id: 'node-1', kind: 'static_node' }],
        nodes: [{ id: 'node-1' }],
        documents: [],
        truncated: false,
        engineVersion: 'resolved-engine',
      },
      {
        refs: [{ id: 'cached-1', kind: 'static_node' }],
        nodes: [{ id: 'cached-1' }],
        documents: [],
        truncated: false,
        engineVersion: 'cached-engine',
      }
    );
    expect(buildPromptMock).toHaveBeenCalledWith({
      refs: [
        { id: 'node-1', kind: 'static_node' },
        { id: 'cached-1', kind: 'static_node' },
      ],
      nodes: [{ id: 'node-1' }, { id: 'cached-1' }],
      documents: [],
      truncated: false,
      engineVersion: 'merged-engine',
    });
    expect(runTeachingChatMock).toHaveBeenCalledWith({
      agentId: 'agent-1',
      messages: [{ role: 'user', content: 'What is this collection about?' }],
      additionalSystemPrompt: 'System prompt with registry context',
    });
    await expect(response.json()).resolves.toEqual({
      message: 'This collection explains the product catalog.',
      sources: [],
    });
  });

  it('skips registry resolution when no refs are provided', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        agentId: 'agent-2',
        messages: [{ role: 'user', content: 'Summarize the docs.' }],
        contextRegistry: {
          refs: [],
          resolved: null,
        },
      },
    });
    mergeBundlesMock.mockReturnValue(null);
    buildPromptMock.mockReturnValue('');

    const response = await POST_handler(
      new NextRequest('http://localhost/api/agentcreator/teaching/chat', {
        method: 'POST',
      }),
      requestContext
    );

    expect(resolveRefsMock).not.toHaveBeenCalled();
    expect(mergeBundlesMock).toHaveBeenCalledWith(null, null);
    expect(buildPromptMock).toHaveBeenCalledWith(null);
    expect(runTeachingChatMock).toHaveBeenCalledWith({
      agentId: 'agent-2',
      messages: [{ role: 'user', content: 'Summarize the docs.' }],
      additionalSystemPrompt: '',
    });
    await expect(response.json()).resolves.toEqual({
      message: 'This collection explains the product catalog.',
      sources: [],
    });
  });
});
