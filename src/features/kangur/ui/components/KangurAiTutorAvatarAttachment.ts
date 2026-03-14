import {
  ATTACHED_AVATAR_EDGE_INSET,
  ATTACHED_AVATAR_OVERLAP,
  AVATAR_SIZE,
  GUIDED_AVATAR_SURFACE_GAP,
  type TutorHorizontalSide,
  type TutorMotionPosition,
} from './KangurAiTutorWidget.shared';

export type TutorAvatarAttachmentPlacement = TutorHorizontalSide | 'top' | 'bottom';

type SurfaceGeometry = {
  height?: number;
  left: number;
  top: number;
  width: number;
};

const createRect = (left: number, top: number, width: number, height: number): DOMRect => {
  if (typeof DOMRect === 'function') {
    return new DOMRect(left, top, width, height);
  }

  return {
    x: left,
    y: top,
    width,
    height,
    top,
    right: left + width,
    bottom: top + height,
    left,
    toJSON: () => ({
      x: left,
      y: top,
      width,
      height,
      top,
      right: left + width,
      bottom: top + height,
      left,
    }),
  } as DOMRect;
};

export const getAttachedAvatarRectForSurface = (input: {
  placement: TutorAvatarAttachmentPlacement;
  surface: SurfaceGeometry;
}): DOMRect => {
  const { placement, surface } = input;

  switch (placement) {
    case 'left':
      return createRect(
        surface.left - ATTACHED_AVATAR_OVERLAP,
        surface.top + ATTACHED_AVATAR_EDGE_INSET,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'right':
      return createRect(
        surface.left + surface.width - AVATAR_SIZE + ATTACHED_AVATAR_OVERLAP,
        surface.top + ATTACHED_AVATAR_EDGE_INSET,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'top':
      return createRect(
        surface.left + ATTACHED_AVATAR_EDGE_INSET,
        surface.top - ATTACHED_AVATAR_OVERLAP,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'bottom':
      return createRect(
        surface.left + ATTACHED_AVATAR_EDGE_INSET,
        surface.top + (surface.height ?? 0) - AVATAR_SIZE + ATTACHED_AVATAR_OVERLAP,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
  }
};

export const getGuidedAvatarRectForSurface = (input: {
  placement: TutorAvatarAttachmentPlacement;
  surface: SurfaceGeometry;
}): DOMRect => {
  const { placement, surface } = input;

  switch (placement) {
    case 'left':
      return createRect(
        surface.left - GUIDED_AVATAR_SURFACE_GAP - AVATAR_SIZE,
        surface.top + ATTACHED_AVATAR_EDGE_INSET,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'right':
      return createRect(
        surface.left + surface.width + GUIDED_AVATAR_SURFACE_GAP,
        surface.top + ATTACHED_AVATAR_EDGE_INSET,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'top':
      return createRect(
        surface.left + ATTACHED_AVATAR_EDGE_INSET,
        surface.top - GUIDED_AVATAR_SURFACE_GAP - AVATAR_SIZE,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'bottom':
      return createRect(
        surface.left + ATTACHED_AVATAR_EDGE_INSET,
        surface.top + (surface.height ?? 0) + GUIDED_AVATAR_SURFACE_GAP,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
  }
};

export const getAttachedAvatarStyleForSurface = (input: {
  placement: TutorAvatarAttachmentPlacement;
  surface: SurfaceGeometry;
}): TutorMotionPosition => {
  const rect = getAttachedAvatarRectForSurface(input);

  return {
    left: rect.left,
    top: rect.top,
  };
};

export const getGuidedAvatarStyleForSurface = (input: {
  placement: TutorAvatarAttachmentPlacement;
  surface: SurfaceGeometry;
}): TutorMotionPosition => {
  const rect = getGuidedAvatarRectForSurface(input);

  return {
    left: rect.left,
    top: rect.top,
  };
};

export const getGuidedAvatarAttachmentPlacement = (
  calloutPlacement: 'top' | 'bottom' | 'left' | 'right'
): TutorAvatarAttachmentPlacement => {
  switch (calloutPlacement) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
};
