import type {
  AnimationPresetDto,
  AnimationTriggerDto,
  AnimationEasingDto,
  GsapAnimationConfigDto,
} from '../../contracts/gsap';

export type {
  AnimationPresetDto as GsapAnimationTypeDto,
  AnimationTriggerDto as GsapAnimationTriggerDto,
  AnimationEasingDto as GsapAnimationEaseDto,
  GsapAnimationConfigDto,
};

export type GsapAnimationType = AnimationPresetDto;

export type GsapAnimationTrigger = AnimationTriggerDto;

export type GsapAnimationEase = AnimationEasingDto;

export type GsapAnimationConfig = GsapAnimationConfigDto;
