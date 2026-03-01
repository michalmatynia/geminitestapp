import { describe, it, expect } from 'vitest';

import { validate3DFile, isValid3DAsset } from '@/features/viewer3d/utils/validateAsset3d';

describe('validateAsset3d', () => {
  describe('validate3DFile', () => {
    it('should return valid for supported extensions', () => {
      const glbFile = new File([''], 'test.glb', { type: 'model/gltf-binary' });
      const gltfFile = new File([''], 'test.gltf', { type: 'model/gltf+json' });

      expect(validate3DFile(glbFile)).toEqual({ valid: true });
      expect(validate3DFile(gltfFile)).toEqual({ valid: true });
    });

    it('should return invalid for unsupported extensions', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

      expect(validate3DFile(txtFile).valid).toBe(false);
      expect(validate3DFile(txtFile).error).toContain('Unsupported format');

      expect(validate3DFile(jpgFile).valid).toBe(false);
      expect(validate3DFile(jpgFile).error).toContain('Unsupported format');
    });

    it('should return invalid if file size exceeds 100MB', () => {
      const largeFile = {
        name: 'large.glb',
        size: 101 * 1024 * 1024,
        type: 'model/gltf-binary',
      } as File;

      expect(validate3DFile(largeFile)).toEqual({
        valid: false,
        error: 'File too large. Maximum size: 100MB',
      });
    });

    it('should handle case-insensitive extensions', () => {
      const capsFile = new File([''], 'TEST.GLB', { type: 'model/gltf-binary' });
      expect(validate3DFile(capsFile)).toEqual({ valid: true });
    });
  });

  describe('isValid3DAsset', () => {
    it('should return true for supported extensions', () => {
      const glbFile = new File([''], 'test.glb');
      const gltfFile = new File([''], 'test.gltf');

      expect(isValid3DAsset(glbFile)).toBe(true);
      expect(isValid3DAsset(gltfFile)).toBe(true);
    });

    it('should return true for supported mime types', () => {
      const file = new File([''], 'unknown', { type: 'model/gltf-binary' });
      expect(isValid3DAsset(file)).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      expect(isValid3DAsset(file)).toBe(false);
    });
  });
});
