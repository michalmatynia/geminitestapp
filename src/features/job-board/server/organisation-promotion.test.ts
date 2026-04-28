import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMockCollection = (documents: Array<Record<string, unknown>>) => {
  const toArrayMock = vi.fn().mockResolvedValue(documents);
  return {
    find: vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockImplementation(() => ({
        toArray: toArrayMock,
      })),
    })),
  };
};

vi.mock('@/features/filemaker/server/filemaker-organizations-mongo', async () => {
  const actual = await vi.importActual<typeof import('@/features/filemaker/server/filemaker-organizations-mongo')>(
    '@/features/filemaker/server/filemaker-organizations-mongo'
  );
  return {
    ...actual,
    getFilemakerOrganizationsCollection: vi.fn(),
  };
});

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: vi.fn() },
}));

import { findFilemakerOrganisationMatch } from './organisation-promotion';
import { getFilemakerOrganizationsCollection } from '@/features/filemaker/server/filemaker-organizations-mongo';

const originalMongoUri = process.env['MONGODB_URI'];

describe('findFilemakerOrganisationMatch', () => {
  beforeEach(() => {
    process.env['MONGODB_URI'] = 'mongodb://test';
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('returns null when Mongo is unavailable', async () => {
    delete process.env['MONGODB_URI'];
    const result = await findFilemakerOrganisationMatch({ nip: '1234567890', name: 'Acme' });
    expect(result).toBeNull();
    expect(getFilemakerOrganizationsCollection).not.toHaveBeenCalled();
  });

  it('matches uniquely by normalized NIP', async () => {
    const collection = createMockCollection([
      { id: 'org-1', name: 'Acme S.A.', taxId: '1234567890' },
    ]);
    vi.mocked(getFilemakerOrganizationsCollection).mockResolvedValue(collection as never);

    const result = await findFilemakerOrganisationMatch({ nip: '123-456-7890', name: 'Acme' });

    expect(result).toEqual({
      organization: expect.objectContaining({
        id: 'org-1',
        name: 'Acme S.A.',
        taxId: '1234567890',
      }),
      confidence: 'nip',
    });
  });

  it('does not match on ambiguous NIP', async () => {
    const collection = createMockCollection([
      { id: 'org-1', name: 'Acme S.A.', taxId: '1234567890' },
      { id: 'org-2', name: 'Acme Inc.', taxId: '1234567890' },
    ]);
    vi.mocked(getFilemakerOrganizationsCollection).mockResolvedValue(collection as never);

    const result = await findFilemakerOrganisationMatch({
      nip: '12 34 56 78 90',
      name: 'Acme S.A.',
    });

    expect(result).toBeNull();
  });

  it('matches uniquely by exact normalized name when NIP is unavailable', async () => {
    const collection = createMockCollection([
      { id: 'org-1', name: 'Acme sp. z o.o.', taxId: '0000000000' },
      { id: 'org-2', name: 'Different sp. z o.o.', taxId: '1111111111' },
    ]);
    vi.mocked(getFilemakerOrganizationsCollection).mockResolvedValue(collection as never);

    const result = await findFilemakerOrganisationMatch({
      nip: null,
      name: 'Acme sp. z o.o.',
    });

    expect(result).toEqual({
      organization: expect.objectContaining({
        id: 'org-1',
        name: 'Acme sp. z o.o.',
      }),
      confidence: 'name',
    });
  });

  it('returns null when name match is ambiguous', async () => {
    const collection = createMockCollection([
      { id: 'org-1', name: 'Acme', taxId: '0000000000' },
      { id: 'org-2', name: 'Acme', taxId: '1111111111' },
      { id: 'org-3', name: 'Other', taxId: '2222222222' },
    ]);
    vi.mocked(getFilemakerOrganizationsCollection).mockResolvedValue(collection as never);

    const result = await findFilemakerOrganisationMatch({
      name: 'Acme',
    });

    expect(result).toBeNull();
  });

  it('skips short names and returns null', async () => {
    const collection = createMockCollection([
      { id: 'org-1', name: 'AB', taxId: '1111111111' },
    ]);
    vi.mocked(getFilemakerOrganizationsCollection).mockResolvedValue(collection as never);

    const result = await findFilemakerOrganisationMatch({
      name: 'AB',
    });

    expect(result).toBeNull();
  });
});
