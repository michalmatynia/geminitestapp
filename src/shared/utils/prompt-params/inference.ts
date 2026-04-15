import { type ParamSpec, type ParamLeaf } from '@/shared/contracts/prompt-engine';

import { splitLineCodeAndLineComment } from './scanner';
import {
  flattenParams,
  looksLikeConstraintHint,
  parseNumericConstraintsFromHint,
  inferNumberStep,
  parseEnumOptionsFromHint,
  isRgbArray,
  isTuple2NumberArray,
} from './utils';

export function extractConstraintHintsByPath(rawObjectText: string): Record<string, string> {
  const stack: string[] = [];
  const commentsByPath: Record<string, string[]> = {};
  let lastKeyPath: string | null = null;

  const lines = rawObjectText.split(/\r?\n/);
  lines.forEach((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('//')) {
      const commentText = trimmed.slice(2).trim();
      if (!lastKeyPath) return;
      if (!looksLikeConstraintHint(commentText)) return;
      const list = (commentsByPath[lastKeyPath] ??= []);
      list.push(commentText);
      return;
    }

    const { code, comment } = splitLineCodeAndLineComment(line);
    const codeTrim = code.trim();
    if (!codeTrim) return;

    const closeCount = (codeTrim.match(/\}/g) ?? []).length;
    for (let i = 0; i < closeCount; i += 1) {
      if (stack.length > 0) stack.pop();
    }

    const keyMatch = /"([^"]+)"\s*:/.exec(codeTrim);
    if (!keyMatch) return;

    const key = keyMatch[1] ?? '';
    if (!key) return;

    const path = [...stack, key].join('.');
    lastKeyPath = path;

    const hint = (comment ?? '').trim();
    if (hint && looksLikeConstraintHint(hint)) {
      const list = (commentsByPath[path] ??= []);
      list.push(hint);
    }

    const afterColon = codeTrim.slice((keyMatch.index ?? 0) + keyMatch[0].length).trim();
    if (afterColon.startsWith('{')) {
      stack.push(key);
    }
  });

  const normalized: Record<string, string> = {};
  Object.entries(commentsByPath).forEach(([path, hints]: [string, string[]]) => {
    const merged = Array.from(new Set(hints.map((h: string) => h.trim()).filter(Boolean)));
    if (merged.length > 0) normalized[path] = merged.join(' / ');
  });
  return normalized;
}

export function inferParamSpecs(
  params: Record<string, unknown>,
  rawObjectText: string
): Record<string, ParamSpec> {
  const hints = extractConstraintHintsByPath(rawObjectText);
  const leaves = flattenParams(params).filter((leaf: ParamLeaf) => Boolean(leaf.path));
  const specs: Record<string, ParamSpec> = {};

  leaves.forEach((leaf: ParamLeaf) => {
    const path = leaf.path;
    const value = leaf.value;
    const hint = hints[path];

    const pathLower = path.toLowerCase();

    if (isRgbArray(value) && (pathLower.endsWith('rgb') || pathLower.endsWith('_rgb'))) {
      specs[path] = {
        path,
        kind: 'rgb',
        integer: true,
        min: 0,
        max: 255,
        step: 1,
        ...(hint ? { hint } : {}),
      };
      return;
    }

    if (
      isTuple2NumberArray(value) &&
      (pathLower.includes('size_px') || pathLower.endsWith('target_size_px'))
    ) {
      specs[path] = {
        path,
        kind: 'tuple2',
        integer: true,
        min: 1,
        step: 1,
        ...(hint ? { hint } : {}),
      };
      return;
    }

    if (typeof value === 'boolean') {
      specs[path] = { path, kind: 'boolean', ...(hint ? { hint } : {}) };
      return;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const constraint = hint ? parseNumericConstraintsFromHint(hint) : {};
      const integer =
        Number.isInteger(value) &&
        (pathLower.includes('_px') || hint?.toLowerCase().includes('px') || false);
      const spec: ParamSpec = {
        path,
        kind: 'number',
        integer,
        step: inferNumberStep(value, constraint, integer),
        ...(hint ? { hint } : {}),
      };
      if (constraint.min !== undefined) spec.min = constraint.min;
      if (constraint.max !== undefined) spec.max = constraint.max;
      specs[path] = spec;
      return;
    }

    if (typeof value === 'string') {
      const enumOptions = hint ? parseEnumOptionsFromHint(hint) : null;
      specs[path] = {
        path,
        kind: enumOptions ? 'enum' : 'string',
        ...(hint ? { hint } : {}),
        ...(enumOptions ? { enumOptions } : {}),
      };
      return;
    }

    if (Array.isArray(value)) {
      specs[path] = { path, kind: 'json', ...(hint ? { hint } : {}) };
      return;
    }

    specs[path] = { path, kind: 'json', ...(hint ? { hint } : {}) };
  });

  return specs;
}
