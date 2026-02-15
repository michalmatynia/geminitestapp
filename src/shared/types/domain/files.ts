import { Entity } from '../core/base-types';

import type { 
  FileDto, 
  ImageFileDto, 
  UploadFileDto, 
  UpdateFileDto 
} from '../dtos';

export type { 
  FileDto, 
  ImageFileDto, 
  UploadFileDto, 
  UpdateFileDto 
};

export type ImageFileRecord = Entity & {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  tags: string[];
  name?: string | null;
  categoryId?: string | null;
  isPublic?: boolean;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ImageFileSelection = Pick<ImageFileRecord, 'id' | 'filepath'>;