// Files DTOs
export interface FileDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  createdAt: string;
  updatedAt: string;
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
