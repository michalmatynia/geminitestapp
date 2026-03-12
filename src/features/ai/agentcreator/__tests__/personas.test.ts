import { describe, expect, it } from 'vitest';

import {
  diffRemovedAgentPersonaAvatarFileIds,
  normalizeAgentPersonas,
} from '../utils/personas';

describe('normalizeAgentPersonas', () => {
  it('rejects unsupported capability model snapshot fields', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-1',
          name: 'Legacy Persona',
          settings: {
            executorModel: 'gpt-4o',
          },
        },
      ])
    ).toThrowError(/includes unsupported keys: executorModel/i);
  });

  it('rejects unsupported top-level persona model snapshot fields', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-top-level',
          name: 'Legacy Top Level Persona',
          modelId: 'gpt-4.1',
        },
      ])
    ).toThrowError(/includes unsupported keys: modelId/i);
  });

  it('rejects unsupported persona model snapshot settings', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-2',
          name: 'Legacy Persona Settings',
          settings: {
            modelId: 'gpt-4.1',
            temperature: 0.2,
            maxTokens: 1200,
          },
        },
      ])
    ).toThrowError(/includes unsupported keys: modelId, temperature, maxTokens/i);
  });

  it('rejects invalid non-array persona payloads', () => {
    expect(() => normalizeAgentPersonas({})).toThrowError(/invalid agent personas payload/i);
  });

  it('rejects unsupported agent persona settings keys', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-unsupported-settings',
          name: 'Unsupported Settings Persona',
          settings: {
            unknownField: 'value',
          },
        },
      ])
    ).toThrowError(/invalid agent persona settings payload/i);
  });

  it('keeps canonical persona settings fields only', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-3',
        name: 'Canonical Persona',
        settings: {
          customInstructions: 'Stay concise',
        },
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({
      customInstructions: 'Stay concise',
      memory: {
        enabled: true,
        includeChatHistory: true,
        useMoodSignals: true,
        defaultSearchLimit: 20,
      },
    });
  });

  it('fills missing memory settings from defaults when the stored payload is partial', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-memory-partial',
        name: 'Partial Memory Persona',
        settings: {
          memory: {
            enabled: false,
          },
        },
      },
    ]);

    expect(normalized[0]?.settings).toEqual({
      memory: {
        enabled: false,
        includeChatHistory: true,
        useMoodSignals: true,
        defaultSearchLimit: 20,
      },
    });
  });

  it('injects a neutral mood and preserves persona visuals', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-visuals',
        name: 'Visual Persona',
        role: 'Tutor',
        instructions: 'Stay warm and short.',
        defaultMoodId: 'encouraging',
        moods: [
          {
            id: 'encouraging',
            label: 'Cheer On',
            svgContent: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" /></svg>',
          },
        ],
      },
    ]);

    expect(normalized[0]?.role).toBe('Tutor');
    expect(normalized[0]?.instructions).toBe('Stay warm and short.');
    expect(normalized[0]?.defaultMoodId).toBe('neutral');
    expect(normalized[0]?.moods.map((mood) => mood.id)).toEqual(['neutral', 'encouraging']);
    expect(normalized[0]?.moods[1]?.label).toBe('Cheer On');
  });

  it('preserves uploaded avatar fields for mood-based personas', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-file-avatar',
        name: 'File Avatar Persona',
        moods: [
          {
            id: 'neutral',
            label: 'Neutral',
            svgContent: '',
            avatarImageUrl: '/uploads/agentcreator/personas/file-avatar.png',
            avatarImageFileId: 'file-avatar-1',
          },
        ],
      },
    ]);

    expect(normalized[0]?.moods[0]).toMatchObject({
      id: 'neutral',
      avatarImageUrl: '/uploads/agentcreator/personas/file-avatar.png',
      avatarImageFileId: 'file-avatar-1',
    });
  });

  it('preserves embedded avatar thumbnail data stored in the persona mood', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-embedded-avatar',
        name: 'Embedded Avatar Persona',
        moods: [
          {
            id: 'neutral',
            label: 'Neutral',
            svgContent: '',
            avatarImageUrl: '/uploads/agentcreator/personas/file-avatar.png',
            avatarThumbnailRef: 'thumb-neutral-1',
            avatarThumbnailDataUrl: 'data:image/webp;base64,embedded-thumb',
            avatarThumbnailMimeType: 'image/webp',
            avatarThumbnailBytes: 2048,
            avatarThumbnailWidth: 96,
            avatarThumbnailHeight: 96,
            useEmbeddedThumbnail: true,
          },
        ],
      },
    ]);

    expect(normalized[0]?.moods[0]).toMatchObject({
      id: 'neutral',
      avatarImageUrl: '/uploads/agentcreator/personas/file-avatar.png',
      avatarThumbnailRef: 'thumb-neutral-1',
      avatarThumbnailDataUrl: 'data:image/webp;base64,embedded-thumb',
      avatarThumbnailMimeType: 'image/webp',
      avatarThumbnailBytes: 2048,
      avatarThumbnailWidth: 96,
      avatarThumbnailHeight: 96,
      useEmbeddedThumbnail: true,
    });
  });

  it('rejects duplicate persona mood ids', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-duplicate-mood',
          name: 'Duplicate Mood Persona',
          moods: [
            { id: 'neutral', label: 'Neutral', svgContent: '' },
            { id: 'neutral', label: 'Duplicate Neutral', svgContent: '' },
          ],
        },
      ])
    ).toThrowError(/duplicate agent persona mood id "neutral"/i);
  });

  it('finds avatar files removed between persona revisions', () => {
    expect(
      diffRemovedAgentPersonaAvatarFileIds(
        {
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '',
              avatarImageFileId: 'file-1',
            },
            {
              id: 'happy',
              label: 'Happy',
              svgContent: '',
              avatarImageFileId: 'file-2',
            },
          ],
        },
        {
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '',
              avatarImageFileId: 'file-1',
            },
          ],
        }
      )
    ).toEqual(['file-2']);
  });
});
