import {
  getAttachedAvatarRectForSurface,
  getGuidedAvatarRectForSurface,
  getGuidedAvatarAttachmentPlacement,
} from './KangurAiTutorAvatarAttachment';
import {
  ATTACHED_AVATAR_EDGE_INSET,
  ATTACHED_AVATAR_OVERLAP,
  AVATAR_SIZE,
  GUIDED_AVATAR_SURFACE_GAP,
} from './KangurAiTutorWidget.shared';

describe('KangurAiTutorAvatarAttachment', () => {
  it('keeps the docked avatar overlap and inset for every attachment side', () => {
    const surface = { left: 240, top: 180, width: 260, height: 132 };

    const leftRect = getAttachedAvatarRectForSurface({ placement: 'left', surface });
    const rightRect = getAttachedAvatarRectForSurface({ placement: 'right', surface });
    const topRect = getAttachedAvatarRectForSurface({ placement: 'top', surface });
    const bottomRect = getAttachedAvatarRectForSurface({ placement: 'bottom', surface });

    expect(leftRect.left).toBe(surface.left - ATTACHED_AVATAR_OVERLAP);
    expect(leftRect.top).toBe(surface.top + ATTACHED_AVATAR_EDGE_INSET);

    expect(rightRect.left).toBe(
      surface.left + surface.width - AVATAR_SIZE + ATTACHED_AVATAR_OVERLAP
    );
    expect(rightRect.top).toBe(surface.top + ATTACHED_AVATAR_EDGE_INSET);

    expect(topRect.left).toBe(surface.left + ATTACHED_AVATAR_EDGE_INSET);
    expect(topRect.top).toBe(surface.top - ATTACHED_AVATAR_OVERLAP);

    expect(bottomRect.left).toBe(surface.left + ATTACHED_AVATAR_EDGE_INSET);
    expect(bottomRect.top).toBe(
      surface.top + surface.height - AVATAR_SIZE + ATTACHED_AVATAR_OVERLAP
    );
  });

  it('attaches the guided avatar on the side of the modal closest to the highlighted target', () => {
    expect(getGuidedAvatarAttachmentPlacement('top')).toBe('bottom');
    expect(getGuidedAvatarAttachmentPlacement('bottom')).toBe('top');
    expect(getGuidedAvatarAttachmentPlacement('left')).toBe('right');
    expect(getGuidedAvatarAttachmentPlacement('right')).toBe('left');
  });

  it('keeps the guided avatar adjacent to the modal without overlapping it', () => {
    const surface = { left: 240, top: 180, width: 260, height: 132 };

    const leftRect = getGuidedAvatarRectForSurface({ placement: 'left', surface });
    const rightRect = getGuidedAvatarRectForSurface({ placement: 'right', surface });
    const topRect = getGuidedAvatarRectForSurface({ placement: 'top', surface });
    const bottomRect = getGuidedAvatarRectForSurface({ placement: 'bottom', surface });

    expect(leftRect.left + AVATAR_SIZE).toBe(surface.left - GUIDED_AVATAR_SURFACE_GAP);
    expect(leftRect.top).toBe(surface.top + ATTACHED_AVATAR_EDGE_INSET);

    expect(rightRect.left).toBe(surface.left + surface.width + GUIDED_AVATAR_SURFACE_GAP);
    expect(rightRect.top).toBe(surface.top + ATTACHED_AVATAR_EDGE_INSET);

    expect(topRect.left).toBe(surface.left + ATTACHED_AVATAR_EDGE_INSET);
    expect(topRect.top + AVATAR_SIZE).toBe(surface.top - GUIDED_AVATAR_SURFACE_GAP);

    expect(bottomRect.left).toBe(surface.left + ATTACHED_AVATAR_EDGE_INSET);
    expect(bottomRect.top).toBe(surface.top + surface.height + GUIDED_AVATAR_SURFACE_GAP);
  });
});
