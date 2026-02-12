import crypto from 'crypto';

import { NextRequest } from 'next/server';

import { badRequestError } from '@/shared/errors/app-error';

type FileValidationResult = {
  isValid: boolean;
  errors: string[];
  sanitizedName?: string;
  fileHash?: string;
};

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
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.ps1'
  ];

  private static readonly IMAGE_MIME_TYPES: string[] = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'
  ];

  private static readonly DEFAULT_CONFIG: UploadConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: this.IMAGE_MIME_TYPES,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxFiles: 5,
    requireImageDimensions: true,
    maxWidth: 4000,
    maxHeight: 4000
  };

  static async validateFile(
    file: File,
    config: Partial<UploadConfig> = {}
  ): Promise<FileValidationResult> {
    const cfg = { ...this.DEFAULT_CONFIG, ...config };
    const errors: string[] = [];

    // Check file size
    if (file.size > cfg.maxFileSize) {
      errors.push(`File size exceeds ${cfg.maxFileSize / (1024 * 1024)}MB limit`);
    }

    // Check MIME type
    if (!cfg.allowedMimeTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.name).toLowerCase();
    if (!cfg.allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} not allowed`);
    }

    // Check for dangerous extensions
    if (this.DANGEROUS_EXTENSIONS.includes(extension)) {
      errors.push('Potentially dangerous file type detected');
    }

    // Validate file name
    const sanitizedName = this.sanitizeFileName(file.name);
    if (!sanitizedName) {
      errors.push('Invalid file name');
    }

    // Check file content (magic bytes)
    const buffer = await file.arrayBuffer();
    const isValidImage = this.validateImageMagicBytes(new Uint8Array(buffer), file.type);
    if (!isValidImage) {
      errors.push('File content does not match declared type');
    }

    // Generate file hash for deduplication
    const fileHash = await this.generateFileHash(buffer);

    // Check image dimensions if required
    if (cfg.requireImageDimensions && this.IMAGE_MIME_TYPES.includes(file.type)) {
      try {
        const dimensions = this.getImageDimensions(buffer);
        if (cfg.maxWidth && dimensions.width > cfg.maxWidth) {
          errors.push(`Image width ${dimensions.width}px exceeds ${cfg.maxWidth}px limit`);
        }
        if (cfg.maxHeight && dimensions.height > cfg.maxHeight) {
          errors.push(`Image height ${dimensions.height}px exceeds ${cfg.maxHeight}px limit`);
        }
      } catch {
        errors.push('Unable to read image dimensions');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName,
      fileHash
    };
  }

  static async validateMultipleFiles(
    files: File[],
    config: Partial<UploadConfig> = {}
  ): Promise<{
    isValid: boolean;
    results: Array<FileValidationResult & { fileName: string }>;
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
        ...(await this.validateFile(file, config))
      }))
    );

    // Check for duplicate files
    const hashes = results.map((r: FileValidationResult) => r.fileHash).filter(Boolean);
    const duplicates = hashes.filter((hash: string | undefined, index: number) => hashes.indexOf(hash) !== index);
    if (duplicates.length > 0) {
      globalErrors.push('Duplicate files detected');
    }

    return {
      isValid: globalErrors.length === 0 && results.every((r: FileValidationResult) => r.isValid),
      results,
      globalErrors
    };
  }

  private static getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }

  private static sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    let sanitized = fileName.replace(/[/\\:*?"<>|]/g, '');
    
    // Remove null bytes and control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = this.getFileExtension(sanitized);
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = nameWithoutExt.substring(0, 255 - ext.length) + ext;
    }
    
    // Ensure it's not empty or just dots
    if (!sanitized || /^\.+$/.test(sanitized)) {
      return '';
    }
    
    return sanitized;
  }

  private static validateImageMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
    const signatures: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
      'image/svg+xml': [[0x3C, 0x3F, 0x78, 0x6D, 0x6C], [0x3C, 0x73, 0x76, 0x67]]
    };

    const sigs = signatures[mimeType];
    if (!sigs) return false;

    return sigs.some((sig: number[]) => 
      sig.every((byte: number, index: number) => bytes[index] === byte)
    );
  }

  private static async generateFileHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }

  private static getImageDimensions(buffer: ArrayBuffer): { width: number; height: number } {
    // This is a simplified implementation
    // In production, you'd use a proper image library like sharp
    const bytes = new Uint8Array(buffer);
    
    // PNG dimensions
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      if (bytes.length < 24) throw badRequestError('Invalid PNG buffer');
      const width = (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!;
      const height = (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!;
      return { width, height };
    }
    
    // JPEG dimensions (simplified)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      // This would require more complex parsing in production
      return { width: 1920, height: 1080 }; // Placeholder
    }
    
    throw badRequestError('Unsupported image format for dimension reading');
  }
}

// Middleware for secure file upload
export async function withSecureFileUpload(
  req: NextRequest,
  config?: Partial<UploadConfig>
): Promise<{
  isValid: boolean;
  files?: File[];
  errors: string[];
  sanitizedFiles?: Array<{ file: File; sanitizedName: string; hash: string }>;
}> {
  try {
    const formData = await req.formData();
    const files: File[] = [];
    
    // Extract files from form data
    for (const [_key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return { isValid: false, errors: ['No files provided'] };
    }

    const validation = await SecureFileUpload.validateMultipleFiles(files, config);
    
    if (!validation.isValid) {
      const allErrors = [
        ...validation.globalErrors,
        ...validation.results.flatMap((r: FileValidationResult) => r.errors)
      ];
      return { isValid: false, errors: allErrors };
    }

    const sanitizedFiles = validation.results.map((result: FileValidationResult, index: number) => ({
      file: files[index]!,
      sanitizedName: result.sanitizedName!,
      hash: result.fileHash!
    }));

    return {
      isValid: true,
      files,
      errors: [],
      sanitizedFiles
    };

  } catch {
    return {
      isValid: false,
      errors: ['Failed to process file upload']
    };
  }
}