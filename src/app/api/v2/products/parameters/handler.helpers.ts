import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const TRUE_QUERY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_QUERY_VALUES = new Set(['0', 'false', 'no', 'off']);

export const normalizeFreshQueryValue = (value: unknown): unknown => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (TRUE_QUERY_VALUES.has(normalized)) return true;
  if (FALSE_QUERY_VALUES.has(normalized)) return false;
  return value;
};

export const resolveParametersQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

export const normalizeOptionLabels = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const labels: string[] = [];

  input.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;

    const normalized = entry.trim();
    if (!normalized) return;

    const lookupKey = normalized.toLowerCase();
    if (seen.has(lookupKey)) return;

    seen.add(lookupKey);
    labels.push(normalized);
  });

  return labels;
};
