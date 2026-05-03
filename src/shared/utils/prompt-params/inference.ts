import { type ParamSpec, type ParamLeaf } from '@/shared/contracts/prompt-engine';

import { splitLineCodeAndLineComment } from './scanner-utils';
import {
  flattenParams,
  looksLikeConstraintHint,
  parseNumericConstraintsFromHint,
  inferNumberStep,
  parseEnumOptionsFromHint,
  isRgbArray,
  isTuple2NumberArray,
} from './utils';

type HintCollection = Record<string, string[]>;

const handleCommentLine = (
  trimmed: string,
  commentsByPath: HintCollection,
  currentLastKeyPath: string | null
): string | null => {
  const commentText = trimmed.slice(2).trim();
  if (currentLastKeyPath !== null && looksLikeConstraintHint(commentText)) {
    // eslint-disable-next-line no-param-reassign
    (commentsByPath[currentLastKeyPath] ??= []).push(commentText);
  }
  return currentLastKeyPath;
};

const processStackPop = (codeTrim: string, stack: string[]): void => {
  const closeCount = (codeTrim.match(/\}/g) ?? []).length;
  for (let i = 0; i < closeCount; i += 1) {
    if (stack.length > 0) stack.pop();
  }
};

const extractKeyFromCode = (codeTrim: string): string | null => {
  const keyMatch = /"([^"]+)"\s*:/.exec(codeTrim);
  if (keyMatch === null) return null;
  return keyMatch[1] ?? null;
};

const updateStack = (codeTrim: string, key: string, stack: string[]): void => {
  const colonIdx = codeTrim.indexOf(':');
  if (codeTrim.includes('{') && colonIdx !== -1 && codeTrim.slice(colonIdx + 1).trim().startsWith('{')) {
    stack.push(key);
  }
};

 
const processLine = (
  line: string,
  stack: string[],
  commentsByPath: HintCollection,
  currentLastKeyPath: string | null
): string | null => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return currentLastKeyPath;
  if (trimmed.startsWith('//')) return handleCommentLine(trimmed, commentsByPath, currentLastKeyPath);

  const { code, comment } = splitLineCodeAndLineComment(line);
  const codeTrim = code.trim();
  if (codeTrim.length === 0) return currentLastKeyPath;

  processStackPop(codeTrim, stack);
  const key = extractKeyFromCode(codeTrim);
  if (key === null || key.length === 0) return currentLastKeyPath;

  const path = [...stack, key].join('.');
  const hint = (comment ?? '').trim();
  if (hint.length > 0 && looksLikeConstraintHint(hint)) {
    // eslint-disable-next-line no-param-reassign
    (commentsByPath[path] ??= []).push(hint);
  }

  updateStack(codeTrim, key, stack);
  return path;
};

export function extractConstraintHintsByPath(rawObjectText: string): Record<string, string> {
  const stack: string[] = [];
  const commentsByPath: HintCollection = {};
  let lastKeyPath: string | null = null;

  const lines = rawObjectText.split(/\r?\n/);
  lines.forEach((line) => {
    lastKeyPath = processLine(line, stack, commentsByPath, lastKeyPath);
  });

  const normalized: Record<string, string> = {};
  Object.entries(commentsByPath).forEach(([path, hints]) => {
    const merged = Array.from(new Set(hints.map((h) => h.trim()).filter((h) => h.length > 0)));
    if (merged.length > 0) normalized[path] = merged.join(' / ');
  });
  return normalized;
}

const isIntegerHint = (pathLower: string, hint: string | undefined): boolean =>
  pathLower.includes('_px') || (hint?.toLowerCase().includes('px') ?? false);

 
const inferNumericSpec = (path: string, value: number, hint: string | undefined, pathLower: string): ParamSpec => {
  const constraint = hint !== undefined ? parseNumericConstraintsFromHint(hint) : {};
  const integer = Number.isInteger(value) && isIntegerHint(pathLower, hint);
  const step = inferNumberStep(value, constraint, integer);
  const spec: ParamSpec = {
    path,
    kind: 'number',
    integer,
    step,
    ...(hint !== undefined ? { hint } : {}),
  };
  if (constraint.min !== undefined) spec.min = constraint.min;
  if (constraint.max !== undefined) spec.max = constraint.max;
  return spec;
};

const inferStringSpec = (path: string, hint: string | undefined): ParamSpec => {
  const enumOptions = hint !== undefined ? parseEnumOptionsFromHint(hint) : null;
  return {
    path,
    kind: enumOptions !== null ? 'enum' : 'string',
    ...(hint !== undefined ? { hint } : {}),
    ...(enumOptions !== null ? { enumOptions } : {}),
  };
};

 
const inferTypedLeafSpec = (path: string, value: unknown, hint: string | undefined, pathLower: string): ParamSpec | null => {
  if (isRgbArray(value) && (pathLower.endsWith('rgb') || pathLower.endsWith('_rgb'))) {
    return { path, kind: 'rgb', integer: true, min: 0, max: 255, step: 1, ...(hint !== undefined ? { hint } : {}) };
  }

  if (isTuple2NumberArray(value) && (pathLower.includes('size_px') || pathLower.endsWith('target_size_px'))) {
    return { path, kind: 'tuple2', integer: true, min: 1, step: 1, ...(hint !== undefined ? { hint } : {}) };
  }

  if (typeof value === 'boolean') {
    return { path, kind: 'boolean', ...(hint !== undefined ? { hint } : {}) };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return inferNumericSpec(path, value, hint, pathLower);
  }

  if (typeof value === 'string') {
    return inferStringSpec(path, hint);
  }

  return null;
};

const inferLeafSpec = (leaf: ParamLeaf, hint: string | undefined): ParamSpec => {
  const { path, value } = leaf;
  const pathLower = path.toLowerCase();
  const typedSpec = inferTypedLeafSpec(path, value, hint, pathLower);
  if (typedSpec !== null) return typedSpec;

  return { path, kind: 'json', ...(hint !== undefined ? { hint } : {}) };
};

export function inferParamSpecs(
  params: Record<string, unknown>,
  rawObjectText: string
): Record<string, ParamSpec> {
  const hints = extractConstraintHintsByPath(rawObjectText);
  const leaves = flattenParams(params).filter((leaf) => leaf.path.length > 0);
  const specs: Record<string, ParamSpec> = {};

  leaves.forEach((leaf) => {
    specs[leaf.path] = inferLeafSpec(leaf, hints[leaf.path]);
  });

  return specs;
}
