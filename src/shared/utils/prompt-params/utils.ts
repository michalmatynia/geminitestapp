import { type ParamLeaf } from '@/shared/contracts/prompt-engine';

import { isObjectRecord } from '../object-utils';

export function flattenParams(params: Record<string, unknown>): ParamLeaf[] {
  const result: ParamLeaf[] = [];

  const walk = (value: unknown, prefix: string): void => {
    if (isObjectRecord(value)) {
      Object.entries(value).forEach(([key, child]: [string, unknown]) => {
        const nextPath = prefix.length > 0 ? `${prefix}.${key}` : key;
        walk(child, nextPath);
      });
      return;
    }
    result.push({ path: prefix, value });
  };

  walk(params, '');
  return result;
}

export function setDeepValue(
  params: Record<string, unknown>,
  path: string,
  nextValue: unknown
): Record<string, unknown> {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return params;

  const root: Record<string, unknown> = { ...params };
  let cursor: Record<string, unknown> = root;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (key === undefined) continue;
    const current = cursor[key];
    const nextNode: Record<string, unknown> = isObjectRecord(current) ? { ...current } : {};
    cursor[key] = nextNode;
    cursor = nextNode;
  }

  const lastKey = parts[parts.length - 1];
  if (lastKey !== undefined) {
    cursor[lastKey] = nextValue;
  }
  return root;
}

export function getDeepValue(root: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cursor: unknown = root;
  for (let index = 0; index < parts.length; index += 1) {
    const key = parts[index];
    if (key === undefined || !isObjectRecord(cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

export function looksLikeConstraintHint(comment: string): boolean {
  const trimmed = comment.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes('===')) return false;
  if (trimmed.includes('|')) return true;
  if (/[0-9]/.test(trimmed) && (/[<>]=?/.test(trimmed) || /[–-]/.test(trimmed))) return true;
  return false;
}

export function normalizeEnumToken(raw: string): string | null {
  const match = /[A-Za-z0-9][A-Za-z0-9_-]*/.exec(raw.trim());
  return match?.[0] ?? null;
}

export function parseEnumOptionsFromHint(hint: string): string[] | null {
  if (!hint.includes('|')) return null;
  const options = hint
    .split('|')
    .map((segment: string) => normalizeEnumToken(segment))
    .filter((value: string | null): value is string => value !== null && value.length > 0);
  const unique = Array.from(new Set(options));
  return unique.length >= 2 ? unique : null;
}

export type NumericConstraint = { min?: number; max?: number };

export function parseNumericConstraintsFromHint(hint: string): NumericConstraint {
  const cleaned = hint.replaceAll('—', '–');
  const out: NumericConstraint = {};

  const range = /(-?\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(-?\d+(?:\.\d+)?)/.exec(cleaned);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (Number.isFinite(min)) out.min = min;
    if (Number.isFinite(max)) out.max = max;
  }

  const ge = />=\s*(-?\d+(?:\.\d+)?)/.exec(cleaned);
  if (ge) {
    const min = Number(ge[1]);
    if (Number.isFinite(min)) out.min = min;
  }

  const le = /<=\s*(-?\d+(?:\.\d+)?)/.exec(cleaned);
  if (le) {
    const max = Number(le[1]);
    if (Number.isFinite(max)) out.max = max;
  }

  return out;
}

export function decimalsOf(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value)) return 0;
  const asString = value.toString();
  const idx = asString.indexOf('.');
  return idx === -1 ? 0 : asString.length - idx - 1;
}

const inferSpanStep = (min: number, max: number): number => {
  const span = Math.abs(max - min);
  if (span <= 1) return 0.01;
  if (span <= 10) return 0.1;
  if (span <= 100) return 1;
  return 0.5;
};

export function inferNumberStep(
  value: number,
  constraint: NumericConstraint,
  integer: boolean
): number {
  if (integer) return 1;
  const decimals = Math.max(
    decimalsOf(value),
    decimalsOf(constraint.min),
    decimalsOf(constraint.max)
  );
  if (decimals >= 2) return 0.01;
  if (decimals === 1) return 0.1;
  if (constraint.min !== undefined && constraint.max !== undefined) {
    return inferSpanStep(constraint.min, constraint.max);
  }
  return 0.5;
}

export function isRgbArray(value: unknown): value is [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return false;
  return value.every((v: unknown) => typeof v === 'number' && Number.isFinite(v));
}

export function isTuple2NumberArray(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.every((v: unknown) => typeof v === 'number' && Number.isFinite(v));
}
