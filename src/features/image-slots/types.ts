import type { ImageFileSelection } from '@/shared/types/domain/files';

export type ManagedImageSlot =
  | {
      type: 'file';
      data: File;
      previewUrl: string;
      slotId: string;
      originalIndex?: number | undefined;
    }
  | {
      type: 'existing';
      data: ImageFileSelection;
      previewUrl: string;
      slotId: string;
      originalIndex?: number | undefined;
    }
  | null;

