const HTTP_METHOD_SEGMENTS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const normalizeSourceSegments = (source: string | undefined): string[] =>
  (source?.trim() ?? '').split('.').filter(Boolean);

const stripTrailingMethodSegment = (segments: string[]): string[] => {
  const maybeMethod = segments[segments.length - 1];
  return maybeMethod && HTTP_METHOD_SEGMENTS.has(maybeMethod) ? segments.slice(0, -1) : segments;
};

export const resolveServiceFromSource = (
  source: string | undefined,
  fallbackService: string
): string => {
  const baseSegments = stripTrailingMethodSegment(normalizeSourceSegments(source));
  const first = baseSegments[0];
  const second = baseSegments[1];
  if (first && second) return `${first}.${second}`;
  if (first) return first;
  return fallbackService;
};
