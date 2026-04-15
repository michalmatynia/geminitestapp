import { segmentizeJsLikeText, type Segment } from './scanner';

export function normalizeParamsObject(rawObjectText: string): string {
  const segments = segmentizeJsLikeText(rawObjectText);
  const normalized = segments.map((segment: Segment) => {
    if (segment.kind === 'code') {
      // Quote simple unquoted keys: { foo: 1 } -> { "foo": 1 }
      return segment.text.replace(/(^|[{\s,])([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
    }
    if (segment.kind === 'single_string') {
      const inner = segment.text.slice(1, -1);
      // Best-effort safety: only convert simple single-quoted strings.
      if (
        !inner ||
        inner.includes('\n') ||
        inner.includes('\r') ||
        inner.includes('\\') ||
        inner.includes('"')
      ) {
        return segment.text;
      }
      return `"${inner}"`;
    }
    return segment.text;
  });

  return normalized.join('');
}
