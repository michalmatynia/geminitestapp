export * from '@/shared/contracts/image-studio';

import type {
  ImageStudioAutoScalerErrorCode as ImageStudioAutoScalerErrorCodeDto,
  ImageStudioAutoScalerModeDto,
  ImageStudioAutoScalerRequestDto,
  ImageStudioAutoScalerResponseDto,
} from '@/shared/contracts/image-studio';

export type ImageStudioAutoScalerMode = ImageStudioAutoScalerModeDto;
export type ImageStudioAutoScalerRequest = ImageStudioAutoScalerRequestDto;
export type ImageStudioAutoScalerErrorCode = ImageStudioAutoScalerErrorCodeDto;
export type ImageStudioAutoScalerResponse = ImageStudioAutoScalerResponseDto;
