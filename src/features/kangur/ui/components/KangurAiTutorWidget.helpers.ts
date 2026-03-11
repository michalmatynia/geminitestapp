import type { KangurTutorAnchorRegistration } from '@/features/kangur/ui/context/kangur-tutor-types';
import { buildKangurRecommendationHref } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import type {
  KangurAiTutorFollowUpAction,
  KangurAiTutorWebsiteHelpTarget,
} from '@/shared/contracts/kangur-ai-tutor';

import type { GuidedTutorSectionKind, GuidedTutorTarget, TutorSurface } from './KangurAiTutorWidget.types';

const SELECTION_PROTECTED_ZONE_PADDING_X = 36;
const SELECTION_PROTECTED_ZONE_PADDING_Y = 20;

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
