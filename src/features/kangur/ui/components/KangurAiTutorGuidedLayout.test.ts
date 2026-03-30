import {
  GUIDED_CALLOUT_HEIGHT,
  getAvatarRectFromPoint,
  getFloatingTutorArrowCorridorRect,
  getFloatingTutorArrowheadGeometry,
  getGuidedCalloutClusterLayout,
  getGuidedCalloutLayout,
} from './KangurAiTutorGuidedLayout';
import { AVATAR_SIZE, GUIDED_AVATAR_SURFACE_GAP } from './ai-tutor-widget/KangurAiTutorWidget.shared';

const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapLeft = Math.max(left.left, right.left);
  const overlapTop = Math.max(left.top, right.top);
  const overlapRight = Math.min(left.right, right.right);
  const overlapBottom = Math.min(left.bottom, right.bottom);
  const overlapWidth = Math.max(0, overlapRight - overlapLeft);
  const overlapHeight = Math.max(0, overlapBottom - overlapTop);
  return overlapWidth * overlapHeight;
};

const getRectSeparationDistance = (left: DOMRect, right: DOMRect): number => {
  const horizontalGap = Math.max(0, left.left - right.right, right.left - left.right);
  const verticalGap = Math.max(0, left.top - right.bottom, right.top - left.bottom);
  return Math.hypot(horizontalGap, verticalGap);
};

const getRectFromCalloutLayout = (
  layout: ReturnType<typeof getGuidedCalloutLayout>
): DOMRect =>
  new DOMRect(
    Number(layout.style.left ?? 0),
    Number(layout.style.top ?? 0),
    Number(layout.style.width ?? 0),
    GUIDED_CALLOUT_HEIGHT
  );

describe('KangurAiTutorGuidedLayout', () => {
  it('keeps the guided selection callout out of the arrow corridor for a diagonal highlight', () => {
    const viewport = { width: 1280, height: 720 };
    const avatarPoint = { x: 300, y: 200 };
    const focusRect = new DOMRect(480, 320, 140, 26);
    const arrowhead = getFloatingTutorArrowheadGeometry({
      avatarPoint,
      focusRect,
    });

    expect(arrowhead).not.toBeNull();

    const avatarRect = getAvatarRectFromPoint(avatarPoint);
    const arrowCorridorRect = getFloatingTutorArrowCorridorRect({
      avatarPoint,
      arrowhead,
    });

    expect(arrowCorridorRect).not.toBeNull();
    const verifiedArrowCorridorRect = arrowCorridorRect as DOMRect;

    const layoutWithoutArrowCorridor = getGuidedCalloutLayout(focusRect, viewport, [avatarRect]);
    const layoutWithArrowCorridor = getGuidedCalloutLayout(focusRect, viewport, [
      avatarRect,
      verifiedArrowCorridorRect,
    ]);

    expect(layoutWithoutArrowCorridor.placement).toBe('top');
    expect(layoutWithArrowCorridor.placement).toBe('bottom');
    expect(
      getRectOverlapArea(
        getRectFromCalloutLayout(layoutWithoutArrowCorridor),
        verifiedArrowCorridorRect
      )
    ).toBeGreaterThan(0);
    expect(
      getRectOverlapArea(
        getRectFromCalloutLayout(layoutWithArrowCorridor),
        verifiedArrowCorridorRect
      )
    ).toBe(0);
  });

  it('biases the guided callout toward the avatar when multiple non-overlapping placements fit', () => {
    const viewport = { width: 1280, height: 720 };
    const focusRect = new DOMRect(540, 280, 140, 26);
    const avatarRect = new DOMRect(628, 212, 56, 56);
    const layoutWithoutAnchorBias = getGuidedCalloutLayout(focusRect, viewport, [avatarRect]);
    const layoutWithAnchorBias = getGuidedCalloutLayout(
      focusRect,
      viewport,
      [avatarRect],
      { anchorRect: avatarRect }
    );

    expect(layoutWithoutAnchorBias.placement).toBe('bottom');
    expect(layoutWithAnchorBias.placement).toBe('right');
    expect(
      getRectSeparationDistance(getRectFromCalloutLayout(layoutWithAnchorBias), avatarRect)
    ).toBeLessThan(
      getRectSeparationDistance(getRectFromCalloutLayout(layoutWithoutAnchorBias), avatarRect)
    );
    expect(getRectOverlapArea(getRectFromCalloutLayout(layoutWithAnchorBias), focusRect)).toBe(0);
  });

  it('keeps the guided avatar next to the callout without intersecting it', () => {
    const viewport = { width: 1280, height: 720 };
    const focusRect = new DOMRect(480, 320, 140, 26);
    const cluster = getGuidedCalloutClusterLayout(focusRect, viewport);

    expect(getRectOverlapArea(cluster.calloutRect, cluster.avatarRect)).toBe(0);

    if (cluster.avatarPlacement === 'left') {
      expect(cluster.calloutRect.left - cluster.avatarRect.right).toBe(GUIDED_AVATAR_SURFACE_GAP);
    } else if (cluster.avatarPlacement === 'right') {
      expect(cluster.avatarRect.left - cluster.calloutRect.right).toBe(
        GUIDED_AVATAR_SURFACE_GAP
      );
    } else if (cluster.avatarPlacement === 'top') {
      expect(cluster.calloutRect.top - cluster.avatarRect.bottom).toBe(GUIDED_AVATAR_SURFACE_GAP);
    } else {
      expect(cluster.avatarRect.top - cluster.calloutRect.bottom).toBe(
        GUIDED_AVATAR_SURFACE_GAP
      );
    }

    expect(cluster.avatarRect.width).toBe(AVATAR_SIZE);
    expect(cluster.avatarRect.height).toBe(AVATAR_SIZE);
    expect(getRectOverlapArea(cluster.calloutRect, focusRect)).toBe(0);
  });
});
