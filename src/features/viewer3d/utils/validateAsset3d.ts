/**
 * 3D Asset Validation Module
 * 
 * Provides validation utilities for 3D model files (GLB and GLTF formats).
 * Handles:
 * - File format validation (GLB, GLTF)
 * - File size constraints (max 100MB)
 * - GLTF external resource detection (prevents loading external dependencies)
 * - Error logging and user feedback
 */

import type { Supported3DExtension } from '@/shared/contracts/viewer3d';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

/**
 * Supported 3D file formats with their MIME types and descriptions
 * - GLB: Binary format, more efficient for distribution
 * - GLTF: JSON-based format, human-readable but larger
 */
export const SUPPORTED_3D_FORMATS = {
  '.glb': { mimetype: 'model/gltf-binary', description: 'GL Transmission Format Binary' },
  '.gltf': { mimetype: 'model/gltf+json', description: 'GL Transmission Format' },
} as const;

export type { Supported3DExtension };

/** Maximum allowed file size for 3D assets: 100MB */
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Detects if a GLTF file references external resources (buffers or images)
 * External resources are not allowed for security and performance reasons
 * 
 * @param file - The GLTF file to check
 * @returns true if external resources are found, false otherwise
 */
const hasExternalGltfResources = async (file: File): Promise<boolean> => {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as {
      buffers?: Array<{ uri?: string }>;
      images?: Array<{ uri?: string }>;
    };
    const buffers = data.buffers ?? [];
    const images = data.images ?? [];
    const uris = [
      ...buffers
        .map((item: { uri?: string }) => item.uri)
        .filter((uri: string | undefined): uri is string => Boolean(uri)),
      ...images
        .map((item: { uri?: string }) => item.uri)
        .filter((uri: string | undefined): uri is string => Boolean(uri)),
    ];
    return uris.some((uri: string) => !uri.startsWith('data:'));
  } catch (error) {
    logClientError(error);
    return false;
  }
};

/**
 * Synchronous validation of 3D file format and size
 * Performs quick checks without reading file contents
 * 
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validate3DFile(file: File): { valid: boolean; error?: string } {
  // Check file size constraint
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size: 100MB' };
  }

  // Validate file extension against supported formats
  const ext = `.${  file.name.toLowerCase().split('.').pop()}`;
  if (!Object.keys(SUPPORTED_3D_FORMATS).includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format. Supported: ${Object.keys(SUPPORTED_3D_FORMATS).join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Asynchronous validation including file content inspection
 * For GLTF files, checks for external resource references
 * 
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export async function validate3DFileAsync(file: File): Promise<{ valid: boolean; error?: string }> {
  // First pass: quick format and size validation
  const baseValidation = validate3DFile(file);
  if (!baseValidation.valid) return baseValidation;

  // Second pass: GLTF-specific validation for external resources
  const ext = `.${  file.name.toLowerCase().split('.').pop()}`;
  if (ext === '.gltf') {
    const hasExternal = await hasExternalGltfResources(file);
    if (hasExternal) {
      return {
        valid: false,
        error:
          'This .gltf references external textures/buffers. Upload a .glb or a .gltf with embedded (data:) resources.',
      };
    }
  }

  return baseValidation;
}

export function isValid3DAsset(file: File): boolean {
  const ext = `.${  file.name.toLowerCase().split('.').pop()}`;
  const allowedExtensions = Object.keys(SUPPORTED_3D_FORMATS);
  const allowedMimetypes = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'];

  return allowedExtensions.includes(ext) || allowedMimetypes.includes(file.type);
}
