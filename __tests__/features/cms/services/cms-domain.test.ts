import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  const mock = {
    ...actual,
    randomUUID: vi.fn(() => 'mock-domain-uuid'),
  };
  return {
    ...mock,
    default: mock,
  };
});

import {
  resolveCmsDomainByHost,
  resolveCmsDomainScopeById,
  createCmsDomain,
  deleteCmsDomain,
  setCmsDomainAlias,
  ensureDomainSlug,
  setDomainDefaultSlug,
} from '@/features/cms/services/cms-domain';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/features/cms/services/cms-domain-settings', () => ({
  getCmsDomainSettings: vi.fn().mockResolvedValue({ zoningEnabled: true }),
}));

describe('CMS Domain Service', () => {
  const mockCollection = {
    findOne: vi.fn(),
    insertOne: vi.fn(),
    find: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    updateMany: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);
    process.env['MONGODB_URI'] = 'mongodb://localhost';
  });

  describe('resolveCmsDomainByHost', () => {
    it('creates a new domain if it doesn\'t exist', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'mock-domain-uuid' });

      const domain = await resolveCmsDomainByHost('test.com');

      expect(domain.domain).toBe('test.com');
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it('returns existing domain if found', async () => {
      const now = new Date();
      const existing = { id: 'd1', domain: 'existing.com', aliasOf: null, createdAt: now, updatedAt: now };
      mockCollection.findOne.mockResolvedValue(existing);

      const domain = await resolveCmsDomainByHost('existing.com');

      expect(domain.id).toBe('d1');
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('resolves alias to canonical domain', async () => {
      const now = new Date();
      const alias = { id: 'd2', domain: 'alias.com', aliasOf: 'd1', createdAt: now, updatedAt: now };
      const canonical = { id: 'd1', domain: 'canonical.com', aliasOf: null, createdAt: now, updatedAt: now };
      
      mockCollection.findOne
        .mockResolvedValueOnce(alias) // Initial find by host
        .mockResolvedValueOnce(alias) // Inside resolveCmsDomainScopeById (getDomainRecordById)
        .mockResolvedValueOnce(canonical); // Next iteration of while loop

      const domain = await resolveCmsDomainByHost('alias.com');

      expect(domain.id).toBe('d1');
      expect(domain.domain).toBe('canonical.com');
    });
  });

  describe('resolveCmsDomainScopeById', () => {
    it('handles circular aliases gracefully', async () => {
      const now = new Date();
      const d1 = { id: 'd1', domain: 'd1.com', aliasOf: 'd2', createdAt: now, updatedAt: now };
      const d2 = { id: 'd2', domain: 'd2.com', aliasOf: 'd1', createdAt: now, updatedAt: now };

      mockCollection.findOne
        .mockResolvedValueOnce(d1)
        .mockResolvedValueOnce(d2);

      const domain = await resolveCmsDomainScopeById('d1');
      expect(domain?.id).toBe('d2'); // Stops when it sees d1 again
    });
  });

  describe('Management', () => {
    it('should create a new domain', async () => {
      const now = new Date();
      mockCollection.findOne.mockResolvedValueOnce(null);
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'mock-domain-uuid' });
      // We also need findOne to return the newly created domain for the final response mapping
      mockCollection.findOne.mockResolvedValue({
        id: 'mock-domain-uuid',
        domain: 'new-domain.com',
        createdAt: now,
        updatedAt: now
      });

      const result = await createCmsDomain('new-domain.com');
      expect(result.domain).toBe('new-domain.com');
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it('should delete a domain and its links', async () => {
      await deleteCmsDomain('d1');
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ id: 'd1' });
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({ domainId: 'd1' });
      expect(mockCollection.updateMany).toHaveBeenCalledWith(
        { aliasOf: 'd1' },
        expect.any(Object)
      );
    });

    it('should set domain alias', async () => {
      const now = new Date();
      const d2 = { id: 'd2', domain: 'd2.com', aliasOf: null, createdAt: now, updatedAt: now };
      const d1 = { id: 'd1', domain: 'd1.com', aliasOf: null, createdAt: now, updatedAt: now };
      
      mockCollection.findOne
        .mockResolvedValueOnce(d2) // getDomainRecordById("d2")
        .mockResolvedValueOnce(d1); // resolveCmsDomainScopeById("d1") -> getDomainRecordById("d1")
      
      await setCmsDomainAlias('d2', 'd1');
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: 'd2' },
        expect.objectContaining({
          $set: expect.objectContaining({ aliasOf: 'd1' }),
        })
      );
    });
  });

  describe('Slug Linking', () => {
    it('should ensure domain slug', async () => {
      await ensureDomainSlug('d1', 's1');
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { domainId: 'd1', slugId: 's1' },
        expect.any(Object),
        { upsert: true }
      );
    });

    it('should set domain default slug', async () => {
      await setDomainDefaultSlug('d1', 's1');
      expect(mockCollection.updateMany).toHaveBeenCalledWith(
        { domainId: 'd1' },
        expect.objectContaining({ $set: expect.objectContaining({ isDefault: false }) })
      );
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { domainId: 'd1', slugId: 's1' },
        expect.objectContaining({ $set: expect.objectContaining({ isDefault: true }) }),
        { upsert: true }
      );
    });
  });
});
