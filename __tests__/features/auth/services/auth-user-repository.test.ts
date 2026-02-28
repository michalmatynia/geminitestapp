import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  findAuthUserByEmail,
  findAuthUserById,
  normalizeAuthEmail,
} from '@/features/auth/services/auth-user-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('Auth User Repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://...';
  });

  describe('findAuthUserByEmail', () => {
    it('finds user via MongoDB', async () => {
      const mockUser = {
        _id: { toString: () => 'u1' },
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        image: null,
        emailVerified: null,
      };
      const mockCollection = {
        findOne: vi.fn().mockResolvedValue(mockUser),
      };
      const mockDb = {
        collection: vi.fn().mockReturnValue(mockCollection),
      };
      vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);

      const result = await findAuthUserByEmail('test@example.com');

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result?.id).toBe('u1');
      expect(result?.email).toBe('test@example.com');
    });

    it('returns null if user not found', async () => {
      const mockCollection = {
        findOne: vi.fn().mockResolvedValue(null),
      };
      const mockDb = {
        collection: vi.fn().mockReturnValue(mockCollection),
      };
      vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);

      const result = await findAuthUserByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findAuthUserById', () => {
    it('finds user via MongoDB', async () => {
      const mockUser = {
        _id: { toString: () => 'u1' },
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockCollection = {
        findOne: vi.fn().mockResolvedValue(mockUser),
      };
      const mockDb = {
        collection: vi.fn().mockReturnValue(mockCollection),
      };
      vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);

      // We need to mock ObjectId if the implementation imports it dynamically or uses a global
      // The implementation does: const { ObjectId } = await import("mongodb");
      // Since we are in node environment (vitest), actual mongodb import works.
      // But we need to ensure the ID passed is compatible or mocked.
      // Ideally we'd mock the dynamic import, but let's try with a valid mongo ID format string first,
      // or rely on the fact that findAuthUserById checks ObjectId.isValid.

      // Let's use a real-looking ObjectId string to pass validation
      const validId = '507f1f77bcf86cd799439011';

      const result = await findAuthUserById(validId);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      // check if findOne was called. We can't easily match the exact ObjectId instance in call arguments without more mocking,
      // but we can check it was called.
      expect(mockCollection.findOne).toHaveBeenCalled();
      expect(result?.id).toBe(validId);
    });

    it('returns null for invalid ObjectId', async () => {
      const result = await findAuthUserById('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('normalizeAuthEmail', () => {
    it('trims and lowercases email', () => {
      expect(normalizeAuthEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });
  });
});
