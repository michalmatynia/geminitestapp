import {
  extractParamsFromPrompt,
  flattenParams,
  inferParamSpecs,
} from '@/features/prompt-engine/prompt-params';
import type {
  ParamSpecDto as ParamSpec,
  ParamSpecKindDto as ParamSpecKind,
} from '@/shared/contracts/prompt-engine';

import type { PromptExploderParamUiControl } from './types';

export type PromptExploderParamUiRecommendation = {
  baseKind: ParamSpecKind;
  recommended: Exclude<PromptExploderParamUiControl, 'auto'>;
  options: PromptExploderParamUiControl[];
  confidence: number;
  reason: string | null;
  canSlider: boolean;
};

export type PromptExploderParamEntry = {
  path: string;
  value: unknown;
  spec: ParamSpec | null;
  selector: PromptExploderParamUiControl;
  resolvedSelector: Exclude<PromptExploderParamUiControl, 'auto'>;
  selectorOptions: PromptExploderParamUiControl[];
  recommendation: PromptExploderParamUiRecommendation;
  comment: string;
  description: string;
};

export type PromptExploderParamEntriesState = {
  entries: PromptExploderParamEntry[];
  paramUiControls: Record<string, PromptExploderParamUiControl>;
  paramComments: Record<string, string>;
  paramDescriptions: Record<string, string>;
};

const PROMPT_EXPLODER_PARAM_UI_CONTROLS: PromptExploderParamUiControl[] = [
  'auto',
  'checkbox',
  'buttons',
  'select',
  'slider',
  'number',
  'text',
  'textarea',
  'json',
  'rgb',
  'tuple2',
];

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

type ScanState = {
  inSingle: boolean;
  inDouble: boolean;
  inTemplate: boolean;
  escaped: boolean;
};

const createScanState = (): ScanState => ({
  inSingle: false,
  inDouble: false,
  inTemplate: false,
  escaped: false,
});

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

const normalizeCommentText = (value: string | null | undefined): string => {
  const normalized = (value ?? '').trim();
  return normalized.replace(/\s+/g, ' ');
};

const normalizeDescriptionText = (value: string | null | undefined): string => {
  const normalized = (value ?? '').trim();
  if (!normalized) return '';
  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

function extractParamMetadataFromRawObject(rawObjectText: string): {
  comments: Record<string, string>;
  descriptions: Record<string, string>;
} {
  const comments: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  const lines = rawObjectText.split(/\r?\n/);
  const stack: string[] = [];
  let pendingDescriptionLines: string[] = [];

  lines.forEach((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      pendingDescriptionLines = [];
      return;
    }

    if (trimmed.startsWith('//')) {
      const value = normalizeCommentText(trimmed.slice(2));
      if (value) pendingDescriptionLines.push(value);
      return;
    }

    const { code, comment } = splitLineCodeAndLineComment(line);
    const codeTrim = code.trim();
    if (!codeTrim) return;

    const closeCount = (codeTrim.match(/}/g) ?? []).length;
    for (let index = 0; index < closeCount; index += 1) {
      if (stack.length > 0) stack.pop();
    }

    const keyMatch = /"([^"]+)"\s*:/.exec(codeTrim);
    if (!keyMatch) {
      pendingDescriptionLines = [];
      return;
    }

    const key = keyMatch[1] ?? '';
    if (!key) {
      pendingDescriptionLines = [];
      return;
    }

    const path = [...stack, key].join('.');
    if (pendingDescriptionLines.length > 0) {
      descriptions[path] = normalizeDescriptionText(pendingDescriptionLines.join('\n'));
    }
    pendingDescriptionLines = [];

    const inlineComment = normalizeCommentText(comment);
    if (inlineComment) {
      comments[path] = inlineComment;
    }

    const afterColon = codeTrim.slice((keyMatch.index ?? 0) + keyMatch[0].length).trim();
    if (afterColon.startsWith('{')) {
      stack.push(key);
    }
  });

  return { comments, descriptions };
}

const inferBaseKind = (value: unknown, spec?: ParamSpec): ParamSpecKind => {
  if (spec?.kind) return spec.kind;
  if (Array.isArray(value)) return 'json';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'string') return 'string';
  return 'json';
};

const canUseSlider = (value: unknown, spec?: ParamSpec): boolean => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (spec?.min !== undefined && spec?.max !== undefined) return true;
  return value >= 0 && value <= 1;
};

export const isPromptExploderParamUiControl = (
  value: unknown
): value is PromptExploderParamUiControl =>
  typeof value === 'string' &&
  PROMPT_EXPLODER_PARAM_UI_CONTROLS.includes(value as PromptExploderParamUiControl);

export const promptExploderParamUiControlLabel = (
  control: PromptExploderParamUiControl
): string => {
  switch (control) {
    case 'auto':
      return 'Auto';
    case 'checkbox':
      return 'Checkbox';
    case 'buttons':
      return 'Buttons';
    case 'select':
      return 'Dropdown';
    case 'slider':
      return 'Slider';
    case 'number':
      return 'Number';
    case 'text':
      return 'Text';
    case 'textarea':
      return 'Textarea';
    case 'json':
      return 'JSON';
    case 'rgb':
      return 'RGB';
    case 'tuple2':
      return 'Tuple';
    default:
      return control;
  }
};

export function recommendPromptExploderParamUiControl(
  value: unknown,
  spec?: ParamSpec
): PromptExploderParamUiRecommendation {
  const baseKind = inferBaseKind(value, spec);
  const sliderOk = canUseSlider(value, spec);

  if (baseKind === 'rgb') {
    return {
      baseKind,
      recommended: 'rgb',
      options: ['auto', 'rgb', 'json'],
      confidence: 0.95,
      reason: null,
      canSlider: false,
    };
  }

  if (baseKind === 'tuple2') {
    return {
      baseKind,
      recommended: 'tuple2',
      options: ['auto', 'tuple2', 'json'],
      confidence: 0.9,
      reason: null,
      canSlider: false,
    };
  }

  if (baseKind === 'boolean') {
    return {
      baseKind,
      recommended: 'checkbox',
      options: ['auto', 'checkbox', 'buttons', 'json'],
      confidence: 1,
      reason: null,
      canSlider: false,
    };
  }

  if (baseKind === 'enum') {
    const count = spec?.enumOptions?.length ?? 0;
    const recommended = count > 0 && count <= 6 ? 'buttons' : 'select';
    return {
      baseKind,
      recommended,
      options: ['auto', 'select', 'buttons', 'text', 'json'],
      confidence: count > 0 ? 0.9 : 0.45,
      reason: count > 0 ? null : 'No enum options detected in hint comments.',
      canSlider: false,
    };
  }

  if (baseKind === 'number') {
    return {
      baseKind,
      recommended: sliderOk ? 'slider' : 'number',
      options: ['auto', 'number', 'slider', 'json'],
      confidence: spec?.min !== undefined && spec?.max !== undefined ? 0.85 : 0.65,
      reason: sliderOk ? null : 'No numeric range detected, so slider may be less useful.',
      canSlider: sliderOk,
    };
  }

  if (baseKind === 'string') {
    const multiline = typeof value === 'string' && (value.includes('\n') || value.includes('\r'));
    return {
      baseKind,
      recommended: multiline ? 'textarea' : 'text',
      options: ['auto', 'text', 'textarea', 'json'],
      confidence: 0.6,
      reason: null,
      canSlider: false,
    };
  }

  return {
    baseKind,
    recommended: 'json',
    options: ['auto', 'json'],
    confidence: 0.35,
    reason: 'Unrecognized structure; edit as JSON.',
    canSlider: false,
  };
}

export function buildPromptExploderParamEntries(args: {
  paramsObject: Record<string, unknown>;
  paramsText: string;
  paramUiControls?: Record<string, PromptExploderParamUiControl> | null;
  paramComments?: Record<string, string> | null;
  paramDescriptions?: Record<string, string> | null;
}): PromptExploderParamEntriesState {
  const leaves = flattenParams(args.paramsObject)
    .filter((leaf) => Boolean(leaf.path))
    .sort((left, right) => left.path.localeCompare(right.path));
  const paths = new Set(leaves.map((leaf) => leaf.path));

  const parsed = extractParamsFromPrompt(args.paramsText);
  const rawObjectText = parsed.ok
    ? parsed.rawObjectText
    : JSON.stringify(args.paramsObject, null, 2);
  const inferredSpecs = inferParamSpecs(args.paramsObject, rawObjectText);
  const metadataFromText = extractParamMetadataFromRawObject(rawObjectText);

  const paramUiControls: Record<string, PromptExploderParamUiControl> = {};
  const paramComments: Record<string, string> = {};
  const paramDescriptions: Record<string, string> = {};

  const entries = leaves.map((leaf) => {
    const path = leaf.path;
    const spec = inferredSpecs[path] ?? null;
    const recommendation = recommendPromptExploderParamUiControl(leaf.value, spec ?? undefined);
    const candidateSelector = args.paramUiControls?.[path];
    const selector = isPromptExploderParamUiControl(candidateSelector) ? candidateSelector : 'auto';
    if (selector !== 'auto') {
      paramUiControls[path] = selector;
    }

    const comment = normalizeCommentText(
      metadataFromText.comments[path] ?? args.paramComments?.[path] ?? spec?.hint ?? ''
    );
    if (comment) {
      paramComments[path] = comment;
    }

    const description = normalizeDescriptionText(
      metadataFromText.descriptions[path] ?? args.paramDescriptions?.[path] ?? ''
    );
    if (description) {
      paramDescriptions[path] = description;
    }

    return {
      path,
      value: leaf.value,
      spec,
      selector,
      resolvedSelector: selector === 'auto' ? recommendation.recommended : selector,
      selectorOptions: recommendation.options,
      recommendation,
      comment,
      description,
    } satisfies PromptExploderParamEntry;
  });

  Object.entries(args.paramUiControls ?? {}).forEach(([path, value]) => {
    if (!paths.has(path)) return;
    if (!isPromptExploderParamUiControl(value) || value === 'auto') return;
    paramUiControls[path] = value;
  });
  Object.entries(args.paramComments ?? {}).forEach(([path, value]) => {
    if (!paths.has(path)) return;
    const normalized = normalizeCommentText(value);
    if (!normalized) return;
    paramComments[path] = normalized;
  });
  Object.entries(args.paramDescriptions ?? {}).forEach(([path, value]) => {
    if (!paths.has(path)) return;
    const normalized = normalizeDescriptionText(value);
    if (!normalized) return;
    paramDescriptions[path] = normalized;
  });

  return {
    entries,
    paramUiControls,
    paramComments,
    paramDescriptions,
  };
}

function decorateJsonWithParamMetadata(
  objectJson: string,
  comments: Record<string, string>,
  descriptions: Record<string, string>
): string {
  const lines = objectJson.split('\n');
  const output: string[] = [];
  const stack: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const keyMatch = /^"([^"]+)"\s*:/.exec(trimmed);

    if (keyMatch) {
      const key = keyMatch[1] ?? '';
      const path = [...stack, key].join('.');
      const indent = line.slice(0, line.length - line.trimStart().length);
      const description = normalizeDescriptionText(descriptions[path]);
      if (description) {
        description.split('\n').forEach((descriptionLine) => {
          output.push(`${indent}// ${descriptionLine}`);
        });
      }

      const comment = normalizeCommentText(comments[path]);
      const nextLine = comment ? `${line} // ${comment}` : line;
      output.push(nextLine);

      const afterColon = trimmed.slice((keyMatch.index ?? 0) + keyMatch[0].length).trim();
      if (afterColon.startsWith('{')) {
        stack.push(key);
      }
    } else {
      output.push(line);
    }

    const closeCount = (trimmed.match(/}/g) ?? []).length;
    for (let index = 0; index < closeCount; index += 1) {
      if (stack.length > 0) stack.pop();
    }
  });

  return output.join('\n');
}

function detectParamsAssignmentPrefix(fallbackText: string): 'equals' | 'colon' {
  if (!fallbackText.trim()) return 'equals';
  const match = /\bparams\b\s*([:=])\s*\{/i.exec(fallbackText);
  if (!match) return 'equals';
  return match[1] === ':' ? 'colon' : 'equals';
}

export function renderPromptExploderParamsText(args: {
  paramsObject: Record<string, unknown>;
  paramComments?: Record<string, string> | null;
  paramDescriptions?: Record<string, string> | null;
  fallbackText?: string;
}): string {
  const objectJson = JSON.stringify(args.paramsObject, null, 2);
  const decoratedObjectJson = decorateJsonWithParamMetadata(
    objectJson,
    args.paramComments ?? {},
    args.paramDescriptions ?? {}
  );
  const assignmentPrefix = detectParamsAssignmentPrefix(args.fallbackText ?? '') === 'colon'
    ? 'params: '
    : 'params = ';
  return `${assignmentPrefix}${decoratedObjectJson}`;
}

export function setParamUiControlForPath(
  current: Record<string, PromptExploderParamUiControl> | null | undefined,
  path: string,
  control: PromptExploderParamUiControl
): Record<string, PromptExploderParamUiControl> {
  const next: Record<string, PromptExploderParamUiControl> = { ...(current ?? {}) };
  if (control === 'auto') {
    delete next[path];
    return next;
  }
  next[path] = control;
  return next;
}

export function setParamTextMetaForPath(
  current: Record<string, string> | null | undefined,
  path: string,
  value: string
): Record<string, string> {
  const next: Record<string, string> = { ...(current ?? {}) };
  const normalized = value.trim();
  if (!normalized) {
    delete next[path];
    return next;
  }
  next[path] = normalized;
  return next;
}

export function sanitizeParamJsonValue(raw: string, fallback: unknown): unknown {
  if (!raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return fallback;
  }
}

export const isParamArrayTupleLength = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item));

export const isParamObjectRecord = (value: unknown): value is Record<string, unknown> =>
  isObjectRecord(value);
