export * from '@/shared/contracts/image-studio';

import type {
  ImageStudioCenterDetectionModeDto,
  ImageStudioCenterErrorCode as ImageStudioCenterErrorCodeDto,
  ImageStudioCenterLayoutConfigDto,
  ImageStudioCenterModeDto,
  ImageStudioCenterObjectBoundsDto,
  ImageStudioCenterRequestDto,
} from '@/shared/contracts/image-studio';

export type ImageStudioCenterMode = ImageStudioCenterModeDto;
export type ImageStudioCenterDetectionMode = ImageStudioCenterDetectionModeDto;
export type ImageStudioCenterLayoutConfig = ImageStudioCenterLayoutConfigDto;
export type ImageStudioCenterObjectBounds = ImageStudioCenterObjectBoundsDto;
export type ImageStudioCenterRequest = ImageStudioCenterRequestDto;
export type ImageStudioCenterErrorCode = ImageStudioCenterErrorCodeDto;
