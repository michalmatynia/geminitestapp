import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  readStoredSettingValueMock,
  upsertStoredSettingValueMock,
  readAgentPersonaAvatarThumbnailByRefMock,
} = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
  readAgentPersonaAvatarThumbnailByRefMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
  upsertStoredSettingValue: upsertStoredSettingValueMock,
}));

vi.mock('@/features/ai/agentcreator/server/persona-avatar-thumbnails', () => ({
  readAgentPersonaAvatarThumbnailByRef: readAgentPersonaAvatarThumbnailByRefMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-agent-visuals-1',
    traceId: 'trace-agent-visuals-1',
    correlationId: 'corr-agent-visuals-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('agent persona visuals handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertStoredSettingValueMock.mockResolvedValue(true);
  });

  it('returns one persona with embedded thumbnail data resolved for Kangur', async () => {
    readStoredSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '<svg viewBox="0 0 100 100"></svg>',
              avatarImageUrl: '/uploads/personas/persona-1/neutral/avatar.png',
              avatarThumbnailRef: 'thumb-neutral-1',
              useEmbeddedThumbnail: true,
            },
            {
              id: 'thinking',
              label: 'Thinking',
              svgContent: '<svg viewBox="0 0 100 100"></svg>',
              avatarImageUrl: '/uploads/personas/persona-1/thinking/avatar.png',
            },
          ],
        },
      ]),
    );
    readAgentPersonaAvatarThumbnailByRefMock.mockResolvedValue({
      ref: 'thumb-neutral-1',
      personaId: 'persona-1',
      moodId: 'neutral',
      dataUrl: 'data:image/webp;base64,ZmFrZQ==',
      mimeType: 'image/webp',
      width: 96,
      height: 96,
      bytes: 2048,
      hash: 'hash-1',
      updatedAt: '2026-03-09T10:00:00.000Z',
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/agentcreator/personas/persona-1/visuals'),
      createRequestContext(),
      { personaId: 'persona-1' },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(readStoredSettingValueMock).toHaveBeenCalledWith(AGENT_PERSONA_SETTINGS_KEY);
    expect(readAgentPersonaAvatarThumbnailByRefMock).toHaveBeenCalledWith('thumb-neutral-1');
    expect(upsertStoredSettingValueMock).toHaveBeenCalledWith(
      AGENT_PERSONA_SETTINGS_KEY,
      expect.stringContaining('"avatarThumbnailDataUrl":"data:image/webp;base64,ZmFrZQ=="')
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'persona-1',
        name: 'Mila',
        moods: expect.arrayContaining([
          expect.objectContaining({
            id: 'neutral',
            avatarThumbnailRef: 'thumb-neutral-1',
            avatarThumbnailDataUrl: 'data:image/webp;base64,ZmFrZQ==',
            avatarThumbnailMimeType: 'image/webp',
            avatarThumbnailBytes: 2048,
            avatarThumbnailWidth: 96,
            avatarThumbnailHeight: 96,
            useEmbeddedThumbnail: true,
          }),
        ]),
      }),
    );
  });

  it('returns embedded thumbnail data already stored in the persona document', async () => {
    readStoredSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '',
              avatarImageUrl: '/uploads/personas/persona-1/neutral/avatar.png',
              avatarThumbnailDataUrl: 'data:image/webp;base64,inline-thumb',
              avatarThumbnailMimeType: 'image/webp',
              avatarThumbnailBytes: 1024,
              avatarThumbnailWidth: 96,
              avatarThumbnailHeight: 96,
              useEmbeddedThumbnail: true,
            },
          ],
        },
      ])
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/agentcreator/personas/persona-1/visuals'),
      createRequestContext(),
      { personaId: 'persona-1' }
    );

    expect(response.status).toBe(200);
    expect(readAgentPersonaAvatarThumbnailByRefMock).not.toHaveBeenCalled();
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'persona-1',
        moods: expect.arrayContaining([
          expect.objectContaining({
            id: 'neutral',
            avatarThumbnailDataUrl: 'data:image/webp;base64,inline-thumb',
            avatarThumbnailMimeType: 'image/webp',
            avatarThumbnailBytes: 1024,
            avatarThumbnailWidth: 96,
            avatarThumbnailHeight: 96,
            useEmbeddedThumbnail: true,
          }),
        ]),
      })
    );
  });

  it('does not resolve sidecar thumbnails when the embedded toggle is disabled', async () => {
    readStoredSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '<svg viewBox="0 0 100 100"></svg>',
              avatarImageUrl: '/uploads/personas/persona-1/neutral/avatar.png',
              avatarThumbnailRef: 'thumb-neutral-1',
              useEmbeddedThumbnail: false,
            },
          ],
        },
      ]),
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/agentcreator/personas/persona-1/visuals'),
      createRequestContext(),
      { personaId: 'persona-1' },
    );

    expect(response.status).toBe(200);
    expect(readAgentPersonaAvatarThumbnailByRefMock).not.toHaveBeenCalled();
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'persona-1',
        moods: expect.arrayContaining([
          expect.objectContaining({
            id: 'neutral',
            avatarThumbnailRef: 'thumb-neutral-1',
            avatarThumbnailDataUrl: null,
            useEmbeddedThumbnail: false,
          }),
        ]),
      }),
    );
  });

  it('throws when the requested persona does not exist', async () => {
    readStoredSettingValueMock.mockResolvedValue(JSON.stringify([]));

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/agentcreator/personas/missing/visuals'),
        createRequestContext(),
        { personaId: 'missing' },
      ),
    ).rejects.toThrow(/agent persona not found/i);
  });
});
