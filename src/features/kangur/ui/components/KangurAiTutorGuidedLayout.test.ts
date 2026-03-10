import {
  getAvatarRectFromPoint,
  getFloatingTutorArrowCorridorRect,
  getFloatingTutorArrowheadGeometry,
  getGuidedCalloutLayout,
} from './KangurAiTutorGuidedLayout';

const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapLeft = Math.max(left.left, right.left);
  const overlapTop = Math.max(left.top, right.top);
  const overlapRight = Math.min(left.right, right.right);
  const overlapBottom = Math.min(left.bottom, right.bottom);
  const overlapWidth = Math.max(0, overlapRight - overlapLeft);
  const overlapHeight = Math.max(0, overlapBottom - overlapTop);
  return overlapWidth * overlapHeight;
};

const getRectFromCalloutLayout = (
  layout: ReturnType<typeof getGuidedCalloutLayout>
): DOMRect =>
  new DOMRect(
    Number(layout.style.left ?? 0),
    Number(layout.style.top ?? 0),
    Number(layout.style.width ?? 0),
    132
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
});
