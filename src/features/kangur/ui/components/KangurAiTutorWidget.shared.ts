import type { KangurTutorAnchorKind } from '@/features/kangur/ui/context/kangur-tutor-types';
import type {
  KangurAiTutorFollowUpAction,
  KangurAiTutorMotionPresetKind,
  KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';

export const EDGE_GAP = 16;
export const AVATAR_SIZE = 56;
export const CTA_WIDTH = 124;
export const CTA_HEIGHT = 40;
export const DESKTOP_BUBBLE_WIDTH = 384;
export const MOBILE_BUBBLE_WIDTH = 320;
export const ATTACHED_AVATAR_EDGE_INSET = 18;
export const ATTACHED_AVATAR_OVERLAP = 12;
export const ATTACHED_AVATAR_POINTER_EDGE_INSET = 6;
export const ATTACHED_AVATAR_POINTER_PADDING = 12;
export const PROTECTED_CONTENT_GAP = 20;
export const BUBBLE_MIN_HEIGHT = 280;
export const BUBBLE_MAX_HEIGHT = 460;
export const KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY = 'kangur-ai-tutor-widget-v1';
export const KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY = 'kangur-ai-tutor-guest-intro-v1';
export const KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY = 'kangur-ai-tutor-home-onboarding-v1';

export type TutorMotionPosition = {
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
};

export type TutorAvatarAttachmentSide = 'left' | 'right';
export type TutorPointerSide = TutorAvatarAttachmentSide;
export type TutorBubblePlacementStrategy =
  | 'dock'
  | 'right'
  | 'left'
  | 'above'
  | 'below'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

export type ActiveTutorFocus = {
  rect: DOMRect | null;
  kind: KangurTutorAnchorKind | 'selection' | null;
  id: string | null;
  label: string | null;
  assignmentId: string | null;
};

export type TutorQuickAction = {
  id: string;
  label: string;
  prompt: string;
  promptMode: KangurAiTutorPromptMode;
  interactionIntent?: 'hint' | 'explain' | 'review' | 'next_step';
};

export type TutorMotionProfile = {
  kind: KangurAiTutorMotionPresetKind;
  sheetBreakpoint: number;
  avatarTransition: {
    type: 'spring';
    stiffness: number;
    damping: number;
  };
  guidedAvatarTransition: {
    type: 'tween';
    duration: number;
    ease: [number, number, number, number];
  };
  bubbleTransition: {
    type: 'spring';
    stiffness: number;
    damping: number;
  };
  hoverScale: number;
  tapScale: number;
  motionCompletedDelayMs: number;
  desktopBubbleWidth: number;
  mobileBubbleWidth: number;
};

export type TutorMoodAvatarProps = {
  svgContent?: string | null;
  avatarImageUrl?: string | null;
  label: string;
  className?: string;
  imgClassName?: string;
  svgClassName?: string;
  fallbackIconClassName?: string;
  'data-testid'?: string;
};

export type TutorRecommendation = {
  prompt: string;
  promptMode: KangurAiTutorPromptMode;
  buttonLabel: string;
  promptLabel: string;
  interactionIntent: TutorQuickAction['interactionIntent'];
  href?: string;
  followUpAction?: KangurAiTutorFollowUpAction | null;
};
