import type { RunsTotalResponseDto } from '@/shared/contracts/image-studio/image-studio/base';

export type InlinePreviewSourceViewModel = {
  src: string | null;
  sourceType: string;
  rawSource: string;
  resolvedSource: string;
};

export type LinkedGeneratedRunRecord = {
  id: string;
  createdAt: string;
  outputs: Array<{
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  }>;
};

export type LinkedGeneratedRunsResponse = Partial<RunsTotalResponseDto<LinkedGeneratedRunRecord>>;

export type LinkedGeneratedVariantViewModel = {
  key: string;
  runId: string;
  runCreatedAt: string;
  outputIndex: number;
  outputCount: number;
  imageSrc: string;
  output: {
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  };
};

export type LinkedMaskSlotViewModel = {
  slotId: string;
  name: string;
  variant: string;
  inverted: boolean;
  relationType: string;
  generationMode: string;
  imageSrc: string | null;
  imageFileId: string | null;
  filepath: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  updatedAt: string | Date | null;
};

export type CompositeTabImageViewModel = {
  key: string;
  source: 'source' | 'input';
  name: string;
  sourceType: string;
  slotId: string | null;
  order: number | null;
  imageSrc: string | null;
  imageFileId: string | null;
  filepath: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  updatedAt: string | Date | null;
};

export type EnvironmentReferenceDraftViewModel = {
  imageFileId: string | null;
  imageUrl: string;
  filename: string;
  mimetype: string;
  size: number | null;
  width: number | null;
  height: number | null;
  updatedAt: string | Date | null;
};
