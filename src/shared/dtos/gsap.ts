// GSAP Animation DTOs
export interface AnimationDto {
  id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  duration: number;
  easing: string;
  targets: string[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AnimationTimelineDto {
  id: string;
  name: string;
  animations: AnimationDto[];
  totalDuration: number;
  repeat: number;
  yoyo: boolean;
  createdAt: string;
  updatedAt: string;
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
