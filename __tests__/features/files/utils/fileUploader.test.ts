import path from 'path';

import { describe, it, expect, vi } from 'vitest';

import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';

// Mock server-only
vi.mock('server-only', () => ({}));

describe('fileUploader utils', () => {
  describe('getDiskPathFromPublicPath', () => {
    it('should return the correct absolute path on disk', () => {
      const publicPath = '/uploads/test.jpg';
      const expected = path.join(process.cwd(), 'public', 'uploads', 'test.jpg');
      expect(getDiskPathFromPublicPath(publicPath)).toBe(expected);
    });

    it('should handle public paths without leading slash', () => {
      const publicPath = 'uploads/test.jpg';
      const expected = path.join(process.cwd(), 'public', 'uploads', 'test.jpg');
      expect(getDiskPathFromPublicPath(publicPath)).toBe(expected);
    });
  });
});
