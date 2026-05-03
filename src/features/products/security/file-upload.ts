import crypto from 'crypto';

import { type NextRequest } from 'next/server';

import { badRequestError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { getImageDimensions } from './file-upload-image-dimensions';

const CONTROL_CHARACTERS_PATTERN = /\p{Cc}/gu;

type FileValidationResult = {
  isValid: boolean;
  errors: string[];
  sanitizedName?: string;
  fileHash?: string;
};

type FileValidationResultWithName = FileValidationResult & { fileName: string };

type SanitizedUploadFile = { file: File; sanitizedName: string; hash: string };

type UploadConfig = {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFiles: number;
  requireImageDimensions?: boolean;
  maxWidth?: number;
  maxHeight?: number;
};

export class SecureFileUpload {
  private static readonly DANGEROUS_EXTENSIONS: string[] = [
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.pif',
    '.scr',
    '.vbs',
    '.js',
    '.jar',
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.py',
    '.rb',
    '.pl',
    '.sh',
    '.ps1',
  ];

  private static readonly IMAGE_MIME_TYPES: string[] = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];

  private static readonly DEFAULT_CONFIG: UploadConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: this.IMAGE_MIME_TYPES,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxFiles: 5,
    requireImageDimensions: true,
    maxWidth: 4000,
    maxHeight: 4000,
  };

  static async validateFile(
    file: File,
    config: Partial<UploadConfig> = {}
  ): Promise<FileValidationResult> {
    const cfg = { ...this.DEFAULT_CONFIG, ...config };
    const extension = this.getFileExtension(file.name).toLowerCase();
    const sanitizedName = this.sanitizeFileName(file.name);
    const buffer = await file.arrayBuffer();
    const errors = [
      ...this.validateFileMetadata({ cfg, extension, file, sanitizedName }),
      ...this.validateFileContent(buffer, file.type),
      ...this.validateImageDimensions(buffer, file.type, cfg),
    ];
    const fileHash = await this.generateFileHash(buffer);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName,
      fileHash,
    };
  }

  static async validateMultipleFiles(
    files: File[],
    config: Partial<UploadConfig> = {}
  ): Promise<{
    isValid: boolean;
    results: FileValidationResultWithName[];
    globalErrors: string[];
  }> {
    const cfg = { ...this.DEFAULT_CONFIG, ...config };
    const globalErrors: string[] = [];

    // Check file count
    if (files.length > cfg.maxFiles) {
      globalErrors.push(`Too many files. Maximum ${cfg.maxFiles} allowed`);
    }

    // Check total size
    const totalSize = files.reduce((sum: number, file: File) => sum + file.size, 0);
    const maxTotalSize = cfg.maxFileSize * cfg.maxFiles;
    if (totalSize > maxTotalSize) {
      globalErrors.push(`Total file size exceeds ${maxTotalSize / (1024 * 1024)}MB limit`);
    }

    // Validate each file
    const results = await Promise.all(
      files.map(async (file: File) => ({
        fileName: file.name,
        ...(await this.validateFile(file, config)),
      }))
    );

    // Check for duplicate files
    const hashes = results
      .map((result) => result.fileHash)
      .filter((hash): hash is string => typeof hash === 'string' && hash.length > 0);
    const duplicates = hashes.filter(
      (hash: string, index: number) => hashes.indexOf(hash) !== index
    );
    if (duplicates.length > 0) {
      globalErrors.push('Duplicate files detected');
    }

    return {
      isValid: globalErrors.length === 0 && results.every((result) => result.isValid),
      results,
      globalErrors,
    };
  }

  private static validateFileMetadata({
    cfg,
    extension,
    file,
    sanitizedName,
  }: {
    cfg: UploadConfig;
    extension: string;
    file: File;
    sanitizedName: string;
  }): string[] {
    const errors: string[] = [];
    if (file.size > cfg.maxFileSize) {
      errors.push(`File size exceeds ${cfg.maxFileSize / (1024 * 1024)}MB limit`);
    }
    if (!cfg.allowedMimeTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }
    if (!cfg.allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} not allowed`);
    }
    if (this.DANGEROUS_EXTENSIONS.includes(extension)) {
      errors.push('Potentially dangerous file type detected');
    }
    if (sanitizedName.length === 0) {
      errors.push('Invalid file name');
    }
    return errors;
  }

  private static validateFileContent(buffer: ArrayBuffer, fileType: string): string[] {
    const isValidImage = this.validateImageMagicBytes(new Uint8Array(buffer), fileType);
    return isValidImage ? [] : ['File content does not match declared type'];
  }

  private static validateImageDimensions(
    buffer: ArrayBuffer,
    fileType: string,
    cfg: UploadConfig
  ): string[] {
    if (cfg.requireImageDimensions !== true || !this.IMAGE_MIME_TYPES.includes(fileType)) {
      return [];
    }
    try {
      return this.validateImageDimensionLimits(getImageDimensions(buffer), cfg);
    } catch (error) {
      logClientError(error);
      return ['Unable to read image dimensions'];
    }
  }

  private static validateImageDimensionLimits(
    dimensions: { width: number; height: number },
    cfg: UploadConfig
  ): string[] {
    const errors: string[] = [];
    if (typeof cfg.maxWidth === 'number' && dimensions.width > cfg.maxWidth) {
      errors.push(`Image width ${dimensions.width}px exceeds ${cfg.maxWidth}px limit`);
    }
    if (typeof cfg.maxHeight === 'number' && dimensions.height > cfg.maxHeight) {
      errors.push(`Image height ${dimensions.height}px exceeds ${cfg.maxHeight}px limit`);
    }
    return errors;
  }

  private static getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }

  private static sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    let sanitized = fileName.replace(/[/\\:*?"<>|]/g, '');

    // Remove null bytes and control characters
    sanitized = sanitized.replace(CONTROL_CHARACTERS_PATTERN, '');

    // Limit length
    if (sanitized.length > 255) {
      const ext = this.getFileExtension(sanitized);
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = nameWithoutExt.substring(0, 255 - ext.length) + ext;
    }

    // Ensure it's not empty or just dots
    if (sanitized.length === 0 || /^\.+$/.test(sanitized)) {
      return '';
    }

    return sanitized;
  }

  private static validateImageMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
    const signatures: Record<string, number[][]> = {
      'image/jpeg': [[0xff, 0xd8, 0xff]],
      'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
      'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      ],
      'image/webp': [
        [0x52, 0x49, 0x46, 0x46],
        [0x57, 0x45, 0x42, 0x50],
      ],
      'image/svg+xml': [
        [0x3c, 0x3f, 0x78, 0x6d, 0x6c],
        [0x3c, 0x73, 0x76, 0x67],
      ],
    };

    const sigs = signatures[mimeType];
    if (sigs === undefined) return false;

    return sigs.some((sig: number[]) =>
      sig.every((byte: number, index: number) => bytes[index] === byte)
    );
  }

  private static async generateFileHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }

}

const buildSanitizedFiles = (
  files: File[],
  results: FileValidationResultWithName[]
): SanitizedUploadFile[] =>
  results.map((result, index) => {
    const file = files[index];
    if (file === undefined || result.sanitizedName === undefined || result.fileHash === undefined) {
      throw badRequestError('Validated file metadata is incomplete');
    }
    return { file, sanitizedName: result.sanitizedName, hash: result.fileHash };
  });

const collectFilesFromFormData = (formData: FormData): File[] => {
  const files: File[] = [];
  const iterableFormData = formData as unknown as {
    forEach: (callback: (value: FormDataEntryValue) => void) => void;
  };
  iterableFormData.forEach((value) => {
    if (value instanceof File) files.push(value);
  });
  return files;
};

// Middleware for secure file upload
export async function withSecureFileUpload(
  req: NextRequest,
  config?: Partial<UploadConfig>
): Promise<{
  isValid: boolean;
  files?: File[];
  errors: string[];
  sanitizedFiles?: SanitizedUploadFile[];
}> {
  try {
    const formData = await req.formData();
    const files = collectFilesFromFormData(formData);

    if (files.length === 0) {
      return { isValid: false, errors: ['No files provided'] };
    }

    const validation = await SecureFileUpload.validateMultipleFiles(files, config);

    if (!validation.isValid) {
      const allErrors = [
        ...validation.globalErrors,
        ...validation.results.flatMap((r: FileValidationResult) => r.errors),
      ];
      return { isValid: false, errors: allErrors };
    }

    const sanitizedFiles = buildSanitizedFiles(files, validation.results);

    return {
      isValid: true,
      files,
      errors: [],
      sanitizedFiles,
    };
  } catch (error) {
    logClientError(error);
    return {
      isValid: false,
      errors: ['Failed to process file upload'],
    };
  }
}
