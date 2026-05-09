import { describe, it, expect } from 'vitest';
import {
  normalizeFolderPath,
  expandFolderPath,
  buildCaseResolverFolderRecordKey,
  parseCaseResolverFolderRecords,
  buildCaseResolverFolderRecords,
} from '../folder-records-service';

describe('FolderRecordsService', () => {
  it('should normalize folder paths correctly', () => {
    expect(normalizeFolderPath('  folder\\sub  ')).toBe('folder/sub');
    expect(normalizeFolderPath('folder/../sub')).toBe('sub');
  });

  it('should expand folder paths correctly', () => {
    expect(expandFolderPath('a/b/c')).toEqual(['a', 'a/b', 'a/b/c']);
  });

  it('should build correct folder record keys', () => {
    expect(buildCaseResolverFolderRecordKey('path', 'case1')).toBe('case1::path');
    expect(buildCaseResolverFolderRecordKey('path', null)).toBe('__none__::path');
  });

  it('should parse and build folder records', () => {
    const sourceRecords = [{ path: 'a/b', ownerCaseId: 'c1' }];
    const validCaseIds = new Set(['c1']);
    
    const parsed = parseCaseResolverFolderRecords(sourceRecords, validCaseIds);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].path).toBe('a/b');

    const built = buildCaseResolverFolderRecords({
      sourceRecords: parsed,
      files: [],
      assets: [],
      validCaseIds,
    });
    expect(built).toHaveLength(2); // 'a' and 'a/b'
  });
});
