import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProducerMapping } from '@/shared/contracts/integrations/producers';

import {
  parseMarketplaceProducerMappingsQuery,
  requireProducerMappingCreateFields,
  saveProducerMapping,
  type ProducerMappingSaveRepository,
} from './handler.helpers';

describe('marketplace producer mappings helpers', () => {
  let repo: ProducerMappingSaveRepository;

  beforeEach(() => {
    repo = {
      getByInternalProducer: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    };
  });

  it('parses list queries and enforces connectionId', () => {
    expect(
      parseMarketplaceProducerMappingsQuery({
        connectionId: 'conn-1',
      })
    ).toEqual({
      connectionId: 'conn-1',
    });
    expect(() => parseMarketplaceProducerMappingsQuery({ connectionId: '' })).toThrow(
      'Invalid marketplace producer mappings query.'
    );
  });

  it('requires all create fields before saving', () => {
    expect(
      requireProducerMappingCreateFields({
        connectionId: 'conn-1',
        externalProducerId: 'external-1',
        internalProducerId: 'internal-1',
      })
    ).toEqual({
      connectionId: 'conn-1',
      externalProducerId: 'external-1',
      internalProducerId: 'internal-1',
    });
    expect(() =>
      requireProducerMappingCreateFields({
        connectionId: 'conn-1',
        externalProducerId: '',
        internalProducerId: 'internal-1',
      })
    ).toThrow('connectionId, externalProducerId, and internalProducerId are required');
  });

  it('updates existing mappings and creates missing ones', async () => {
    vi.mocked(repo.getByInternalProducer).mockResolvedValueOnce({
      id: 'mapping-1',
    } as ProducerMapping);
    vi.mocked(repo.update).mockResolvedValueOnce({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalProducerId: 'external-2',
      internalProducerId: 'internal-1',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });

    await expect(
      saveProducerMapping(repo, {
        connectionId: 'conn-1',
        externalProducerId: 'external-2',
        internalProducerId: 'internal-1',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: {
        id: 'mapping-1',
      },
    });

    vi.mocked(repo.getByInternalProducer).mockResolvedValueOnce(null);
    vi.mocked(repo.create).mockResolvedValueOnce({
      id: 'mapping-2',
      connectionId: 'conn-1',
      externalProducerId: 'external-3',
      internalProducerId: 'internal-2',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });

    await expect(
      saveProducerMapping(repo, {
        connectionId: 'conn-1',
        externalProducerId: 'external-3',
        internalProducerId: 'internal-2',
      })
    ).resolves.toMatchObject({
      status: 201,
      body: {
        id: 'mapping-2',
      },
    });
  });
});
