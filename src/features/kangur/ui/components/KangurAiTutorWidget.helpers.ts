import type { KangurTutorAnchorRegistration } from '@/features/kangur/ui/context/kangur-tutor-types';
import { buildKangurRecommendationHref } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import type {
  KangurAiTutorFollowUpAction,
  KangurAiTutorWebsiteHelpTarget,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';

import type { GuidedTutorSectionKind, GuidedTutorTarget, TutorSurface } from './KangurAiTutorWidget.types';

const SELECTION_PROTECTED_ZONE_PADDING_X = 36;
const SELECTION_PROTECTED_ZONE_PADDING_Y = 20;

export const normalizeTutorSelectionText = (
  value: string | null | undefined
): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
};

export const areTutorSelectionTextsEquivalent = (
  left: string | null | undefined,
  right: string | null | undefined
): boolean => {
  const normalizedLeft = normalizeTutorSelectionText(left);
  const normalizedRight = normalizeTutorSelectionText(right);

  if (!normalizedLeft || !normalizedRight) {
    return normalizedLeft === normalizedRight;
  }

  return normalizedLeft === normalizedRight;
};

export const getAssistantMessageFeedbackKey = (
  sessionKey: string | null,
  index: number,
  message: { content: string }
): string => `${sessionKey ?? 'session'}:${index}:${message.content.trim()}`;

export const toFollowUpHref = (
  basePath: string,
  action: KangurAiTutorFollowUpAction
): string =>
  buildKangurRecommendationHref(basePath, {
    label: action.label,
    page: action.page,
    query: action.query,
  });

export const toWebsiteHelpTargetHref = (
  basePath: string,
  target: KangurAiTutorWebsiteHelpTarget
): string => {
  const normalizedBasePath = basePath.endsWith('/') && basePath !== '/' ? basePath.slice(0, -1) : basePath;
  const rawRoute = typeof target.route === 'string' ? target.route.trim() : '';
  const normalizedRoute = rawRoute && rawRoute !== '/'
    ? rawRoute.startsWith(normalizedBasePath)
      ? rawRoute
      : `${normalizedBasePath}${rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`}`
    : normalizedBasePath;
  const hash = typeof target.anchorId === 'string' && target.anchorId.trim()
    ? `#${target.anchorId.trim()}`
    : '';

  return `${normalizedRoute}${hash}`;
};

export const isAuthGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'auth' }> => value?.mode === 'auth';

export const isSelectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'selection' }> => value?.mode === 'selection';

export const isSectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'section' }> => value?.mode === 'section';

export const isSectionExplainableTutorAnchor = (
  anchor: KangurTutorAnchorRegistration
): anchor is KangurTutorAnchorRegistration & {
  kind: GuidedTutorSectionKind;
  surface: TutorSurface;
} => anchor.surface !== 'auth';

const createRect = (left: number, top: number, width: number, height: number): DOMRect => {
  if (typeof DOMRect === 'function') {
    return new DOMRect(left, top, width, height);
  }

  return {
    x: left,
    y: top,
    width,
    height,
    left,
    top,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({
      x: left,
      y: top,
      width,
      height,
      left,
      top,
      right: left + width,
      bottom: top + height,
    }),
  } as DOMRect;
};

export const getPageRect = (rect: DOMRect | null | undefined): DOMRect | null => {
  if (!rect) {
    return null;
  }

  return createRect(rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height);
};

export const cloneRect = (rect: DOMRect | null | undefined): DOMRect | null => {
  if (!rect) {
    return null;
  }

  if (typeof DOMRect === 'function') {
    return new DOMRect(rect.x, rect.y, rect.width, rect.height);
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    toJSON: () => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    }),
  } as DOMRect;
};

export const getBoundingRectFromRects = (
  rects: Array<DOMRect | null | undefined>
): DOMRect | null => {
  const validRects = rects.filter((rect): rect is DOMRect => Boolean(rect));

  if (validRects.length === 0) {
    return null;
  }

  const left = Math.min(...validRects.map((rect) => rect.left));
  const top = Math.min(...validRects.map((rect) => rect.top));
  const right = Math.max(...validRects.map((rect) => rect.right));
  const bottom = Math.max(...validRects.map((rect) => rect.bottom));

  return createRect(left, top, right - left, bottom - top);
};

export const getViewportRectFromPageRect = (rect: DOMRect | null | undefined): DOMRect | null => {
  if (!rect) {
    return null;
  }

  return createRect(rect.left - window.scrollX, rect.top - window.scrollY, rect.width, rect.height);
};

export const getExpandedRect = (
  rect: DOMRect | null | undefined,
  paddingX: number,
  paddingY: number
): DOMRect | null => {
  if (!rect) {
    return null;
  }

  return createRect(
    rect.left - paddingX,
    rect.top - paddingY,
    rect.width + paddingX * 2,
    rect.height + paddingY * 2
  );
};

const getRectArea = (rect: DOMRect): number => Math.max(0, rect.width) * Math.max(0, rect.height);

const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapWidth = Math.max(
    0,
    Math.min(left.right, right.right) - Math.max(left.left, right.left)
  );
  const overlapHeight = Math.max(
    0,
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top)
  );

  return overlapWidth * overlapHeight;
};

const isPointWithinRect = (
  point: { x: number; y: number },
  rect: Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'>
): boolean =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

export const selectBestSelectionAnchor = (input: {
  anchors: KangurTutorAnchorRegistration[];
  selectionRect: DOMRect;
  sessionContentId: string | null | undefined;
  sessionSurface: TutorSurface | null | undefined;
}): KangurTutorAnchorRegistration | null => {
  if (!input.sessionSurface) {
    return null;
  }

  const selectionArea = Math.max(getRectArea(input.selectionRect), 1);
  const selectionCenter = {
    x: input.selectionRect.left + input.selectionRect.width / 2,
    y: input.selectionRect.top + input.selectionRect.height / 2,
  };

  const candidates = input.anchors
    .filter((anchor) => anchor.surface === input.sessionSurface)
    .map((anchor) => {
      const rect = anchor.getRect();
      if (!rect) {
        return null;
      }

      const overlapArea = getRectOverlapArea(rect, input.selectionRect);
      const containsSelectionCenter = isPointWithinRect(selectionCenter, rect);
      if (overlapArea <= 0 && !containsSelectionCenter) {
        return null;
      }

      return {
        anchor,
        area: Math.max(getRectArea(rect), 1),
        containsSelectionCenter,
        contentMatch:
          Boolean(input.sessionContentId) &&
          (anchor.metadata?.contentId ?? null) === input.sessionContentId,
        overlapArea,
        overlapRatio: overlapArea / selectionArea,
      };
    })
    .filter(
      (
        candidate
      ): candidate is {
        anchor: KangurTutorAnchorRegistration;
        area: number;
        containsSelectionCenter: boolean;
        contentMatch: boolean;
        overlapArea: number;
        overlapRatio: number;
      } => candidate !== null
    )
    .sort((leftCandidate, rightCandidate) => {
      if (leftCandidate.contentMatch !== rightCandidate.contentMatch) {
        return Number(rightCandidate.contentMatch) - Number(leftCandidate.contentMatch);
      }

      if (leftCandidate.containsSelectionCenter !== rightCandidate.containsSelectionCenter) {
        return Number(rightCandidate.containsSelectionCenter) - Number(leftCandidate.containsSelectionCenter);
      }

      if (leftCandidate.overlapRatio !== rightCandidate.overlapRatio) {
        return rightCandidate.overlapRatio - leftCandidate.overlapRatio;
      }

      if (leftCandidate.overlapArea !== rightCandidate.overlapArea) {
        return rightCandidate.overlapArea - leftCandidate.overlapArea;
      }

      if (leftCandidate.area !== rightCandidate.area) {
        return leftCandidate.area - rightCandidate.area;
      }

      return rightCandidate.anchor.priority - leftCandidate.anchor.priority;
    });

  return candidates[0]?.anchor ?? null;
};

export const getSelectionProtectedRect = (
  selectionRect: DOMRect | null | undefined,
  selectionContainerRect: DOMRect | null | undefined
): DOMRect | null => {
  if (selectionContainerRect) {
    return selectionContainerRect;
  }

  return getExpandedRect(
    selectionRect,
    SELECTION_PROTECTED_ZONE_PADDING_X,
    SELECTION_PROTECTED_ZONE_PADDING_Y
  );
};
