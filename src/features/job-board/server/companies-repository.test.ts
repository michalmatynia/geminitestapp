import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: vi.fn() },
}));

import {
  findCompanyMatch,
  upsertCompany,
  upsertCompanyByMatch,
} from './companies-repository';

const originalMongoUri = process.env['MONGODB_URI'];

describe('companies-repository (in-memory)', () => {
  beforeEach(() => {
    delete process.env['MONGODB_URI'];
  });

  afterEach(() => {
    if (originalMongoUri !== undefined) {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('upserts a company and returns it with timestamps', async () => {
    const created = await upsertCompany({
      id: 'c1',
      name: 'Acme Sp. z o.o.',
      nip: '1234567890',
    });
    expect(created.id).toBe('c1');
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });

  it('finds company by NIP', async () => {
    await upsertCompany({ id: 'c2', name: 'Foo', nip: '9999999999' });
    const found = await findCompanyMatch({ nip: '9999999999' });
    expect(found?.id).toBe('c2');
  });

  it('finds company by domain (case-insensitive)', async () => {
    await upsertCompany({ id: 'c3', name: 'Bar', domain: 'bar.example.com' });
    const found = await findCompanyMatch({ domain: 'BAR.EXAMPLE.COM' });
    expect(found?.id).toBe('c3');
  });

  it('finds company by normalized name (whitespace + case)', async () => {
    await upsertCompany({ id: 'c4', name: 'Hello   World' });
    const found = await findCompanyMatch({ name: 'hello world' });
    expect(found?.id).toBe('c4');
  });

  it('upsertCompanyByMatch merges new fields onto existing record (NIP match)', async () => {
    const first = await upsertCompanyByMatch({
      id: 'ignored-1',
      name: 'Acme',
      nip: '1111111111',
      city: null,
    });
    const second = await upsertCompanyByMatch({
      id: 'ignored-2',
      name: 'Acme',
      nip: '1111111111',
      city: 'Warsaw',
      industry: 'Software',
    });
    expect(second.id).toBe(first.id);
    expect(second.city).toBe('Warsaw');
    expect(second.industry).toBe('Software');
    expect(second.nip).toBe('1111111111');
  });

  it('upsertCompanyByMatch creates new when no match found', async () => {
    const a = await upsertCompanyByMatch({ id: 'x', name: 'Alpha', nip: '1010101010' });
    const b = await upsertCompanyByMatch({ id: 'y', name: 'Beta', nip: '2020202020' });
    expect(a.id).not.toBe(b.id);
  });

  it('upsertCompanyByMatch does not overwrite existing fields with null', async () => {
    const first = await upsertCompanyByMatch({
      id: 'm1',
      name: 'Gamma',
      nip: '3030303030',
      city: 'Krakow',
    });
    const merged = await upsertCompanyByMatch({
      id: 'm2',
      name: 'Gamma',
      nip: '3030303030',
      city: null,
    });
    expect(merged.id).toBe(first.id);
    expect(merged.city).toBe('Krakow');
  });
});
