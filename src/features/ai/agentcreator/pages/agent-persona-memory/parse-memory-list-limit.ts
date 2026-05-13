export function parseMemoryListLimitInput(raw: string): number {
  const trimmed = raw.trim();
  const source = trimmed.length === 0 ? '20' : trimmed;
  const parsed = Number.parseInt(source, 10);
  const normalized = Number.isNaN(parsed) ? 20 : parsed;
  return Math.min(100, Math.max(1, normalized));
}
