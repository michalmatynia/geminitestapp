import { DtoBase } from '../types/base';

// Files DTOs
export interface FileDto extends DtoBase {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface ImageFileDto extends FileDto {
  width: number;
  height: number;
  alt?: string;
  thumbnailUrl?: string;
}

export interface UploadFileDto {
  file: File;
  alt?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFileDto {
  filename?: string;
  alt?: string;
  metadata?: Record<string, unknown>;
}

export interface FileUploadResponseDto {
  id: string;
  url: string;
  filename: string;
  size: number;
}
