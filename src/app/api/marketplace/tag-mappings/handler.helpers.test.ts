import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TagMapping } from '@/shared/contracts/integrations/listings';

import {
  parseMarketplaceTagMappingsQuery,
  requireTagMappingCreateFields,
  saveTagMapping,
  type TagMappingSaveRepository,
} from './handler.helpers';

describe('marketplace tag mappings helpers', () => {
  let repo: TagMappingSaveRepository;

  beforeEach(() => {
    repo = {
      getByInternalTag: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    };
  });

  it('parses list queries and enforces connectionId', () => {
    expect(
      parseMarketplaceTagMappingsQuery({
        connectionId: 'conn-1',
      })
    ).toEqual({
      connectionId: 'conn-1',
    });
    expect(() => parseMarketplaceTagMappingsQuery({ connectionId: '' })).toThrow(
      'Invalid marketplace tag mappings query.'
    );
  });

  it('requires all create fields before saving', () => {
    expect(
      requireTagMappingCreateFields({
        connectionId: 'conn-1',
        externalTagId: 'external-1',
        internalTagId: 'internal-1',
      })
    ).toEqual({
      connectionId: 'conn-1',
      externalTagId: 'external-1',
      internalTagId: 'internal-1',
    });
    expect(() =>
      requireTagMappingCreateFields({
        connectionId: 'conn-1',
        externalTagId: '',
        internalTagId: 'internal-1',
      })
    ).toThrow('connectionId, externalTagId, and internalTagId are required');
  });

  it('updates existing mappings and creates missing ones', async () => {
    vi.mocked(repo.getByInternalTag).mockResolvedValueOnce({
      id: 'mapping-1',
    } as TagMapping);
    vi.mocked(repo.update).mockResolvedValueOnce({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalTagId: 'external-2',
      internalTagId: 'internal-1',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });

    await expect(
      saveTagMapping(repo, {
        connectionId: 'conn-1',
        externalTagId: 'external-2',
        internalTagId: 'internal-1',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: {
        id: 'mapping-1',
      },
    });

    vi.mocked(repo.getByInternalTag).mockResolvedValueOnce(null);
    vi.mocked(repo.create).mockResolvedValueOnce({
      id: 'mapping-2',
      connectionId: 'conn-1',
      externalTagId: 'external-3',
      internalTagId: 'internal-2',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });

    await expect(
      saveTagMapping(repo, {
        connectionId: 'conn-1',
        externalTagId: 'external-3',
        internalTagId: 'internal-2',
      })
    ).resolves.toMatchObject({
      status: 201,
      body: {
        id: 'mapping-2',
      },
    });
  });
});
