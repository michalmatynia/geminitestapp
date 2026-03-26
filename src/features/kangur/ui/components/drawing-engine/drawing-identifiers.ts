'use client';

const normalizeKangurDrawingFileSegment = (segment: string): string =>
  segment
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const createKangurDrawingDraftStorageKey = (
  ...segments: Array<string | null | undefined>
): string | null => {
  const resolvedSegments = segments.filter(
    (segment): segment is string => typeof segment === 'string' && segment.length > 0
  );

  return resolvedSegments.length > 0 ? resolvedSegments.join(':') : null;
};

export const createKangurDrawingExportFilename = (
  ...segments: Array<string | null | undefined>
): string => {
  const resolvedSegments = segments
    .filter((segment): segment is string => typeof segment === 'string' && segment.length > 0)
    .map(normalizeKangurDrawingFileSegment)
    .filter((segment) => segment.length > 0);

  return `${resolvedSegments.length > 0 ? resolvedSegments.join('-') : 'drawing'}.png`;
};
