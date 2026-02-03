import { NamedDto } from '../types/base';

// GSAP Animation DTOs
export interface AnimationDto extends NamedDto {
  config: Record<string, unknown>;
  duration: number;
  easing: string;
  targets: string[];
  properties: Record<string, unknown>;
}

export interface AnimationTimelineDto extends NamedDto {
  animations: AnimationDto[];
  totalDuration: number;
  repeat: number;
  yoyo: boolean;
}

export interface CreateAnimationDto {
  name: string;
  description?: string;
  config: Record<string, unknown>;
  duration: number;
  easing?: string;
  targets: string[];
  properties: Record<string, unknown>;
}

export interface UpdateAnimationDto {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  duration?: number;
  easing?: string;
  targets?: string[];
  properties?: Record<string, unknown>;
}
