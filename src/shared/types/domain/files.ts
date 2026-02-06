import { Entity } from '../base-types';

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
};

export type ImageFileSelection = Pick<ImageFileRecord, 'id' | 'filepath'>;