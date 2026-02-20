import type { 
  ImageFileRecordDto as ImageFileRecord,
  ImageFileCreateInputDto as ImageFileCreateInput,
  ImageFileListFiltersDto as ImageFileListFilters
} from '@/shared/contracts/files';

export type { ImageFileRecord, ImageFileCreateInput, ImageFileListFilters };

export type ImageFileRepository = {
  create(data: ImageFileCreateInput): Promise<ImageFileRecord>;
  getById(id: string): Promise<ImageFileRecord | null>;
  list(filters?: ImageFileListFilters): Promise<ImageFileRecord[]>;
  delete(id: string): Promise<void>;
  update(id: string, data: Partial<ImageFileCreateInput>): Promise<ImageFileRecord>;
};
