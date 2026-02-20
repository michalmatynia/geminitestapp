import type { ImageStudioCenterObjectBounds } from '@/features/ai/image-studio/contracts/center';

type BoundsEdges = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type BoundsDelta = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  max: number;
};

const toEdges = (bounds: ImageStudioCenterObjectBounds): BoundsEdges => ({
  left: bounds.left,
  top: bounds.top,
  right: bounds.left + bounds.width - 1,
  bottom: bounds.top + bounds.height - 1,
});

export const computeBoundsIntersectionArea = (
  first: ImageStudioCenterObjectBounds,
  second: ImageStudioCenterObjectBounds
): number => {
  const firstEdges = toEdges(first);
  const secondEdges = toEdges(second);
  const left = Math.max(firstEdges.left, secondEdges.left);
  const top = Math.max(firstEdges.top, secondEdges.top);
  const right = Math.min(firstEdges.right, secondEdges.right);
  const bottom = Math.min(firstEdges.bottom, secondEdges.bottom);
  if (right < left || bottom < top) return 0;
  return Math.max(0, right - left + 1) * Math.max(0, bottom - top + 1);
};

export const computeBoundsUnionArea = (
  first: ImageStudioCenterObjectBounds,
  second: ImageStudioCenterObjectBounds
): number => {
  const firstArea = Math.max(1, first.width * first.height);
  const secondArea = Math.max(1, second.width * second.height);
  const intersection = computeBoundsIntersectionArea(first, second);
  return Math.max(1, firstArea + secondArea - intersection);
};

export const computeBoundsIou = (
  first: ImageStudioCenterObjectBounds,
  second: ImageStudioCenterObjectBounds
): number => {
  const intersection = computeBoundsIntersectionArea(first, second);
  const union = computeBoundsUnionArea(first, second);
  return Number((intersection / union).toFixed(6));
};

export const computeBoundsDelta = (
  actual: ImageStudioCenterObjectBounds,
  expected: ImageStudioCenterObjectBounds
): BoundsDelta => {
  const actualEdges = toEdges(actual);
  const expectedEdges = toEdges(expected);
  const left = Math.abs(actualEdges.left - expectedEdges.left);
  const top = Math.abs(actualEdges.top - expectedEdges.top);
  const right = Math.abs(actualEdges.right - expectedEdges.right);
  const bottom = Math.abs(actualEdges.bottom - expectedEdges.bottom);
  const width = Math.abs(actual.width - expected.width);
  const height = Math.abs(actual.height - expected.height);
  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    max: Math.max(left, top, right, bottom, width, height),
  };
};

export const averageMetric = (values: number[]): number => {
  if (values.length <= 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(6));
};

export const minMetric = (values: number[]): number => {
  if (values.length <= 0) return 0;
  return Number(Math.min(...values).toFixed(6));
};
