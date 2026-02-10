import type { Asset3DRecord } from '@/features/viewer3d/types';
import type { ImageFileRecord } from '@/shared/types/domain/files';

export type ImageStudioSlotRecord = {
  id: string;
  projectId: string;
  name: string | null;
  folderPath: string | null;
  position?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  asset3dId?: string | null;
  screenshotFileId?: string | null;
  metadata?: Record<string, unknown> | null;
  imageFile?: ImageFileRecord | null;
  screenshotFile?: ImageFileRecord | null;
  asset3d?: Asset3DRecord | null;
};

export type StudioProjectsResponse = { projects: string[] };
export type StudioSlotsResponse = { slots: ImageStudioSlotRecord[] };
