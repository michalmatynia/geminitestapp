import { NamedDto, CreateDto, UpdateDto } from '../types/base';

// GSAP Animation DTOs
export interface AnimationDto extends NamedDto {
  config: Record<string, unknown>;
  duration: number;
  easing: string;
  targets: string[];
  properties: Record<string, unknown>;
}

export type CreateAnimationDto = CreateDto<AnimationDto>;
export type UpdateAnimationDto = UpdateDto<AnimationDto>;

export interface AnimationTimelineDto extends NamedDto {
  animations: AnimationDto[];
  totalDuration: number;
  repeat: number;
  yoyo: boolean;
}

export type CreateAnimationTimelineDto = CreateDto<AnimationTimelineDto>;
export type UpdateAnimationTimelineDto = UpdateDto<AnimationTimelineDto>;
