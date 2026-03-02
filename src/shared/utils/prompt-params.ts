import type {
  ExtractParamsResultDto,
  ParamSpecDto,
  ParamIssueDto,
  ParamIssueSeverityDto,
  ParamLeaf,
} from '@/shared/contracts/prompt-engine';

import { isObjectRecord } from './object-utils';

export type ExtractParamsResult = ExtractParamsResultDto;
export type ParamSpec = ParamSpecDto;
export type ParamIssue = ParamIssueDto;
export type ParamIssueSeverity = ParamIssueSeverityDto;

type ScanState = {
  inSingle: boolean;
  inDouble: boolean;
  inTemplate: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
  escaped: boolean;
};

type SegmentKind = 'code' | 'comment' | 'single_string' | 'double_string' | 'template_string';

type Segment = { kind: SegmentKind; text: string };

const createScanState = (): ScanState => ({
  inSingle: false,
  inDouble: false,
  inTemplate: false,
  inLineComment: false,
  inBlockComment: false,
  escaped: false,
});

const isInString = (state: ScanState): boolean =>
  state.inSingle || state.inDouble || state.inTemplate;

function segmentizeJsLikeText(input: string): Segment[] {
  const state = createScanState();
  const segments: Segment[] = [];
  let kind: SegmentKind = 'code';
  let buf = '';

  const flush = (): void => {
    if (!buf) return;
    segments.push({ kind, text: buf });
    buf = '';
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (kind === 'comment') {
      buf += char;
      if (state.inLineComment) {
        if (char === '\n') {
          state.inLineComment = false;
          flush();
          kind = 'code';
        }
      } else if (state.inBlockComment) {
        if (char === '*' && next === '/') {
          buf += next;
          index += 1;
          state.inBlockComment = false;
          flush();
          kind = 'code';
        }
      }
      continue;
    }

    if (kind === 'single_string') {
      buf += char;
      if (!state.escaped && char === '\'') {
        state.inSingle = false;
        flush();
        kind = 'code';
      }
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (kind === 'double_string') {
      buf += char;
      if (!state.escaped && char === '"') {
        state.inDouble = false;
        flush();
        kind = 'code';
      }
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (kind === 'template_string') {
      buf += char;
      if (!state.escaped && char === '`') {
        state.inTemplate = false;
        flush();
        kind = 'code';
      }
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    // code
    if (char === '/' && next === '/') {
      flush();
      kind = 'comment';
      state.inLineComment = true;
      buf = '//';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      flush();
      kind = 'comment';
      state.inBlockComment = true;
      buf = '/*';
      index += 1;
      continue;
    }
    if (char === '\'') {
      flush();
      kind = 'single_string';
      state.inSingle = true;
      state.escaped = false;
      buf = '\'';
      continue;
    }
    if (char === '"') {
      flush();
      kind = 'double_string';
      state.inDouble = true;
      state.escaped = false;
      buf = '"';
      continue;
    }
    if (char === '`') {
      flush();
      kind = 'template_string';
      state.inTemplate = true;
      state.escaped = false;
      buf = '`';
      continue;
    }

    buf += char;
  }

  flush();
  return segments;
}

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

export function findMatchingBrace(input: string, startIndex: number): number {
  if (input[startIndex] !== '{') return -1;

  let depth = 0;
  const state = createScanState();

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (state.inLineComment) {
      if (char === '\n') state.inLineComment = false;
      continue;
    }
    if (state.inBlockComment) {
      if (char === '*' && next === '/') {
        state.inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (state.inSingle) {
      if (!state.escaped && char === '\'') state.inSingle = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inDouble) {
      if (!state.escaped && char === '"') state.inDouble = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inTemplate) {
      if (!state.escaped && char === '`') state.inTemplate = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (char === '/' && next === '/') {
      state.inLineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state.inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '\'') {
      state.inSingle = true;
      state.escaped = false;
      continue;
    }
    if (char === '"') {
      state.inDouble = true;
      state.escaped = false;
      continue;
    }
    if (char === '`') {
      state.inTemplate = true;
      state.escaped = false;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) return index;
  }

  return -1;
}

export function stripJsComments(input: string): string {
  const state = createScanState();
  const out: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (state.inLineComment) {
      if (char === '\n') {
        state.inLineComment = false;
        out.push(char);
      }
      continue;
    }

    if (state.inBlockComment) {
      if (char === '*' && next === '/') {
        state.inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (state.inSingle) {
      out.push(char);
      if (!state.escaped && char === '\'') state.inSingle = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inDouble) {
      out.push(char);
      if (!state.escaped && char === '"') state.inDouble = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inTemplate) {
      out.push(char);
      if (!state.escaped && char === '`') state.inTemplate = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (char === '/' && next === '/') {
      state.inLineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state.inBlockComment = true;
      index += 1;
      continue;
    }

    out.push(char);
    if (char === '\'') state.inSingle = true;
    if (char === '"') state.inDouble = true;
    if (char === '`') state.inTemplate = true;
  }

  return out.join('');
}

export function removeTrailingCommas(input: string): string {
  const state = createScanState();
  const out: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';

    if (isInString(state)) {
      out.push(char);
      if (state.inSingle) {
        if (!state.escaped && char === '\'') state.inSingle = false;
        state.escaped = !state.escaped && char === '\\';
        continue;
      }
      if (state.inDouble) {
        if (!state.escaped && char === '"') state.inDouble = false;
        state.escaped = !state.escaped && char === '\\';
        continue;
      }
      if (state.inTemplate) {
        if (!state.escaped && char === '`') state.inTemplate = false;
        state.escaped = !state.escaped && char === '\\';
        continue;
      }
      continue;
    }

    if (char === '\'') {
      state.inSingle = true;
      out.push(char);
      continue;
    }
    if (char === '"') {
      state.inDouble = true;
      out.push(char);
      continue;
    }
    if (char === '`') {
      state.inTemplate = true;
      out.push(char);
      continue;
    }

    if (char === ',') {
      let lookahead = index + 1;
      while (lookahead < input.length) {
        const ahead = input[lookahead] ?? '';
        if (!/\s/.test(ahead)) break;
        lookahead += 1;
      }
      const ahead = input[lookahead] ?? '';
      if (ahead === '}' || ahead === ']') {
        continue; // skip trailing comma
      }
    }

    out.push(char);
  }

  return out.join('');
}

export function extractParamsFromPrompt(prompt: string): ExtractParamsResult {
  const match = /\bparams\b\s*[:=]\s*\{/i.exec(prompt);
  if (!match) {
    return {
      ok: false,
      error: 'Could not find `params = { ... }` (or `params: { ... }`) in the prompt.',
    };
  }

  const objectStart = prompt.indexOf('{', match.index);
  if (objectStart === -1) return { ok: false, error: 'Could not locate params object start.' };

  const objectEndInclusive = findMatchingBrace(prompt, objectStart);
  if (objectEndInclusive === -1) {
    return { ok: false, error: 'Could not find the end of the params object (unbalanced braces).' };
  }

  const rawObjectText = prompt.slice(objectStart, objectEndInclusive + 1);
  const withoutComments = stripJsComments(rawObjectText);
  const jsonText = removeTrailingCommas(withoutComments);

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!isObjectRecord(parsed)) {
      return { ok: false, error: 'Parsed params must be a JSON object.' };
    }
    return {
      ok: true,
      params: parsed,
      objectStart,
      objectEnd: objectEndInclusive + 1,
      rawObjectText,
    };
  } catch {
    try {
      const normalized = normalizeParamsObject(withoutComments);
      const normalizedJson = removeTrailingCommas(normalized);
      const parsed = JSON.parse(normalizedJson) as unknown;
      if (!isObjectRecord(parsed)) {
        return { ok: false, error: 'Parsed params must be a JSON object.' };
      }
      return {
        ok: true,
        params: parsed,
        objectStart,
        objectEnd: objectEndInclusive + 1,
        rawObjectText,
      };
    } catch {
      return {
        ok: false,
        error: 'Failed to parse params (expected JSON-like object with quoted keys/strings).',
      };
    }
  }
}

export function flattenParams(params: Record<string, unknown>): ParamLeaf[] {
  const result: ParamLeaf[] = [];

  const walk = (value: unknown, prefix: string): void => {
    if (isObjectRecord(value)) {
      Object.entries(value).forEach(([key, child]: [string, unknown]) => {
        const nextPath = prefix ? `${prefix}.${key}` : key;
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
    const key = parts[index]!;
    const current = cursor[key];
    const nextNode: Record<string, unknown> = isObjectRecord(current) ? { ...current } : {};
    cursor[key] = nextNode;
    cursor = nextNode;
  }

  cursor[parts[parts.length - 1]!] = nextValue;
  return root;
}

export function getDeepValue(root: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cursor: unknown = root;
  for (let index = 0; index < parts.length; index += 1) {
    const key = parts[index]!;
    if (!isObjectRecord(cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

type NumericConstraint = { min?: number; max?: number };

function splitLineCodeAndLineComment(line: string): { code: string; comment: string | null } {
  const state = createScanState();

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? '';
    const next = line[index + 1] ?? '';

    if (state.inSingle) {
      if (!state.escaped && char === '\'') state.inSingle = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inDouble) {
      if (!state.escaped && char === '"') state.inDouble = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inTemplate) {
      if (!state.escaped && char === '`') state.inTemplate = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (char === '/' && next === '/') {
      return { code: line.slice(0, index), comment: line.slice(index + 2) };
    }

    if (char === '\'') {
      state.inSingle = true;
      state.escaped = false;
      continue;
    }
    if (char === '"') {
      state.inDouble = true;
      state.escaped = false;
      continue;
    }
    if (char === '`') {
      state.inTemplate = true;
      state.escaped = false;
      continue;
    }
  }

  return { code: line, comment: null };
}

function looksLikeConstraintHint(comment: string): boolean {
  const trimmed = comment.trim();
  if (!trimmed) return false;
  if (trimmed.includes('===')) return false;
  if (trimmed.includes('|')) return true;
  if (/[0-9]/.test(trimmed) && (/[<>]=?/.test(trimmed) || /[–-]/.test(trimmed))) return true;
  return false;
}

function normalizeEnumToken(raw: string): string | null {
  const match = /[A-Za-z0-9][A-Za-z0-9_-]*/.exec(raw.trim());
  return match?.[0] ?? null;
}

function parseEnumOptionsFromHint(hint: string): string[] | null {
  if (!hint.includes('|')) return null;
  const options = hint
    .split('|')
    .map((segment: string) => normalizeEnumToken(segment))
    .filter((value: string | null): value is string => Boolean(value));
  const unique = Array.from(new Set(options));
  return unique.length >= 2 ? unique : null;
}

function parseNumericConstraintsFromHint(hint: string): NumericConstraint {
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

function decimalsOf(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value)) return 0;
  const asString = value.toString();
  const idx = asString.indexOf('.');
  return idx === -1 ? 0 : asString.length - idx - 1;
}

function inferNumberStep(value: number, constraint: NumericConstraint, integer: boolean): number {
  if (integer) return 1;
  const decimals = Math.max(
    decimalsOf(value),
    decimalsOf(constraint.min),
    decimalsOf(constraint.max)
  );
  if (decimals >= 2) return 0.01;
  if (decimals === 1) return 0.1;
  if (constraint.min !== undefined && constraint.max !== undefined) {
    const span = Math.abs(constraint.max - constraint.min);
    if (span <= 1) return 0.01;
    if (span <= 10) return 0.1;
    if (span <= 100) return 1;
  }
  return 0.5;
}

function extractConstraintHintsByPath(rawObjectText: string): Record<string, string> {
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

    const closeCount = (codeTrim.match(/}/g) ?? []).length;
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

function isRgbArray(value: unknown): value is [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return false;
  return value.every((v: unknown) => typeof v === 'number' && Number.isFinite(v));
}

function isTuple2NumberArray(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.every((v: unknown) => typeof v === 'number' && Number.isFinite(v));
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

export function validateParamsAgainstSpecs(
  params: Record<string, unknown>,
  specs: Record<string, ParamSpec>
): ParamIssue[] {
  const issues: ParamIssue[] = [];

  Object.values(specs).forEach((spec: ParamSpec) => {
    const value = getDeepValue(params, spec.path);
    if (value === undefined) {
      issues.push({
        path: spec.path,
        severity: 'error',
        code: 'missing',
        message: 'Missing value.',
      });
      return;
    }

    if (spec.kind === 'boolean') {
      if (typeof value !== 'boolean') {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected boolean.',
        });
      }
      return;
    }

    if (spec.kind === 'string') {
      if (typeof value !== 'string') {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected string.',
        });
      }
      return;
    }

    if (spec.kind === 'enum') {
      if (typeof value !== 'string') {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected string enum.',
        });
        return;
      }
      if (spec.enumOptions && !spec.enumOptions.includes(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'enum',
          message: `Value must be one of: ${spec.enumOptions.join(', ')}`,
        });
      }
      return;
    }

    if (spec.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected number.',
        });
        return;
      }
      if (spec.integer && !Number.isInteger(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'integer',
          message: 'Must be an integer.',
        });
      }
      if (spec.min !== undefined && value < spec.min) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'min',
          message: `Must be >= ${spec.min}.`,
        });
      }
      if (spec.max !== undefined && value > spec.max) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'max',
          message: `Must be <= ${spec.max}.`,
        });
      }
      return;
    }

    if (spec.kind === 'rgb') {
      if (!isRgbArray(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected [R,G,B] array.',
        });
        return;
      }
      if (value.some((v: unknown) => typeof v !== 'number' || !Number.isFinite(v))) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'RGB must be numeric.',
        });
        return;
      }
      if (spec.integer && value.some((v: unknown) => !Number.isInteger(v))) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'integer',
          message: 'RGB values must be integers.',
        });
      }
      const min = spec.min;
      if (min !== undefined && value.some((v: unknown) => (v as number) < min)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'min',
          message: `RGB values must be >= ${min}.`,
        });
      }
      const max = spec.max;
      if (max !== undefined && value.some((v: unknown) => (v as number) > max)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'max',
          message: `RGB values must be <= ${max}.`,
        });
      }
      return;
    }

    if (spec.kind === 'tuple2') {
      if (!isTuple2NumberArray(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected [x,y] numeric array.',
        });
        return;
      }
      if (spec.integer && value.some((v: unknown) => !Number.isInteger(v))) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'integer',
          message: 'Values must be integers.',
        });
      }
      const min = spec.min;
      if (min !== undefined && value.some((v: unknown) => (v as number) < min)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'min',
          message: `Values must be >= ${min}.`,
        });
      }
      const max = spec.max;
      if (max !== undefined && value.some((v: unknown) => (v as number) > max)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'max',
          message: `Values must be <= ${max}.`,
        });
      }
      return;
    }
  });

  return issues;
}
