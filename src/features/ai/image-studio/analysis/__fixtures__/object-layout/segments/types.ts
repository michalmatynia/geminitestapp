import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterObjectBounds,
} from '@/features/ai/image-studio/contracts/center';

export type ObjectLayoutFixtureVariant =
  | 'auto'
  | 'alpha'
  | 'white_include_shadow'
  | 'white_exclude_shadow';

type DetectionUsed = Exclude<ImageStudioCenterDetectionMode, 'auto'>;

export type ObjectLayoutFixtureExpectation = {
  bounds: ImageStudioCenterObjectBounds;
  minIou: number;
  maxEdgeDeltaPx: number;
  minConfidence: number;
  detectionUsed?: DetectionUsed;
};

export type ObjectLayoutGoldenFixture = {
  id: string;
  title: string;
  category: 'clean' | 'challenging';
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  groundTruthBounds: ImageStudioCenterObjectBounds;
  expectations: Partial<Record<ObjectLayoutFixtureVariant, ObjectLayoutFixtureExpectation>>;
};
