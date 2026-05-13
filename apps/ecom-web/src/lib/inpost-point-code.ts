const INPOST_POINT_CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,39}$/;

export function normalizeInpostPointCode(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  if (!INPOST_POINT_CODE_RE.test(normalized)) return null;
  return normalized;
}
