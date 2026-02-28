import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  getMongoConnectionUrl,
  getMongoDatabaseName,
  assertValidBackupName,
} from '@/shared/lib/db/utils/mongo';

// Mock server-only to prevent errors
vi.mock('server-only', () => ({}));

describe('mongo utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getMongoConnectionUrl', () => {
    it('should return MONGODB_URI when set', () => {
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
      expect(getMongoConnectionUrl()).toBe('mongodb://localhost:27017/test');
    });

    it('should throw error when MONGODB_URI is missing', () => {
      delete process.env['MONGODB_URI'];
      expect(() => getMongoConnectionUrl()).toThrow('MONGODB_URI is not set');
    });
  });

  describe('getMongoDatabaseName', () => {
    it('should return MONGODB_DB when set', () => {
      process.env['MONGODB_DB'] = 'testdb';
      expect(getMongoDatabaseName()).toBe('testdb');
    });

    it('should throw error when MONGODB_DB is missing', () => {
      delete process.env['MONGODB_DB'];
      expect(() => getMongoDatabaseName()).toThrow('MONGODB_DB is not set');
    });
  });

  describe('assertValidBackupName', () => {
    it('should pass for valid backup name', () => {
      expect(() => assertValidBackupName('backup.archive')).not.toThrow();
    });

    it('should throw for invalid extension', () => {
      expect(() => assertValidBackupName('backup.txt')).toThrow('Invalid backup file type');
    });

    it('should throw for name with directory traversal', () => {
      expect(() => assertValidBackupName('../backup.archive')).toThrow('Invalid backup name');
    });
  });
});
