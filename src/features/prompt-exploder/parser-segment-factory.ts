import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';

import { flattenItemsToTextLines } from './parser-list-items';
import { collectMatchedRules } from './parser-runtime-patterns';
import { escapeRegExp, normalizeHeadingLabel } from './parser-text-utils';
import {
  inferTypeFromRuleHints,
  shouldKeepEmptyTitleForCaseResolver,
} from './parser-type-inference';

import type { PatternRuntime } from './parser-runtime-patterns';
import type {
  PromptExploderListItem,
  PromptExploderParamUiControl,
  PromptExploderSegment,
  PromptExploderSegmentType,
  PromptExploderSubsection,
} from './types';

const trimTrailingBlankLines = (value: string): string => value.replace(/\n{3,}$/g, '\n\n').trimEnd();

export const inferSegmentType = (title: string, raw: string): PromptExploderSegmentType => {
  const normalizedTitle = normalizeHeadingLabel(title).toLowerCase();
  const normalizedRaw = raw.trim().toLowerCase();
  const trimmedTitle = title.trim();

  if (/^={3,}.+={3,}$/.test(trimmedTitle)) return 'metadata';
  if (/^\s*[^|\n]+(?:\s*\|\s*[^|\n]+){2,}\s*$/.test(trimmedTitle)) return 'metadata';
  if (
    /\b(params|parameters|config|global settings|global_settings)\b/.test(normalizedTitle) &&
    /\bparams\s*=\s*\{/.test(normalizedRaw)
  ) {
    return 'parameter_block';
  }
  if (/^(p\d+|rl\d+|qa(?:_r)?\d+)/i.test(trimmedTitle)) return 'referential_list';
  if (
    /\b(final qa|quality gate|quality checks?|validation module)\b/.test(normalizedTitle) ||
    /\bpass\b[^\n]{0,80}\bfail\b/i.test(raw)
  ) {
    return 'qa_matrix';
  }
  if (
    /\b(pipeline|workflow|execution template|run report)\b/.test(normalizedTitle) ||
    (/^\s*\d+\.\s+/m.test(raw) &&
      /\b(step|module|parse|run|export|validate|execute)\b/.test(normalizedRaw))
  ) {
    return 'hierarchical_list';
  }
  if (
    /\b(requirements|guidelines|constraints|ruleset|modules|data model|logging and audit|error handling|security notes|dry_run_behavior)\b/.test(
      normalizedTitle
    ) ||
    /^\s*[A-Z]\)\s+.+$/m.test(raw) ||
    /(?:^|\n)\s*(RL\d+|QA(?:_R)?\d+)\b/i.test(raw)
  ) {
    return 'sequence';
  }
  if (/\bonly if\b|\bif\b|\buntil\b/.test(normalizedRaw)) return 'conditional_list';
  if (/^\s*(\d+[.)]|[*-]|[A-Z]\))\s+/m.test(raw)) return 'list';
  return 'assigned_text';
};

export const createPromptExploderSegment = (args: {
  runtime: PatternRuntime;
  createSegmentId: () => string;
  title: string;
  raw: string;
  type?: PromptExploderSegmentType;
  includeInOutput?: boolean;
  code?: string | null;
  condition?: string | null;
  listItems?: PromptExploderListItem[];
  subsections?: PromptExploderSubsection[];
  paramsText?: string;
  paramsObject?: Record<string, unknown> | null;
  paramUiControls?: Record<string, PromptExploderParamUiControl>;
  paramComments?: Record<string, string>;
  paramDescriptions?: Record<string, string>;
  lockType?: boolean;
}): PromptExploderSegment => {
  const inferredType = args.type ?? inferSegmentType(args.title, args.raw);
  const matchedRules = collectMatchedRules(args.runtime, args.raw);
  const matchedPatternIds = matchedRules.map((rule) => rule.id);
  const matchedPatternLabels = matchedRules
    .map((rule) => rule.label.trim())
    .filter((label: string): label is string => label.length > 0);
  const matchedSequenceLabels = [...new Set(
    matchedRules
      .map((rule) => rule.sequenceGroupLabel?.trim() ?? '')
      .filter((label: string): label is string => label.length > 0)
  )];
  const hintedType = inferTypeFromRuleHints(matchedRules, inferredType);
  const type = args.lockType ? inferredType : hintedType;
  const normalizedRaw = trimTrailingBlankLines(args.raw);
  const shouldParseParams = type === 'parameter_block';
  const extractedParams =
    shouldParseParams && !args.paramsObject ? extractParamsFromPrompt(normalizedRaw) : null;
  const resolvedParamsObject = args.paramsObject
    ?? (extractedParams?.ok ? extractedParams.params : null);
  const resolvedParamsText =
    shouldParseParams
      ? (args.paramsText && args.paramsText.trim().length > 0 ? args.paramsText : normalizedRaw)
      : (args.paramsText ?? '');
  const confidenceBase = 0.45;
  const confidenceBoost = matchedRules.reduce(
    (total, rule) => total + Math.max(0, rule.confidenceBoost),
    0
  );
  const confidence = Math.min(
    0.99,
    confidenceBase + matchedPatternIds.length * 0.06 + confidenceBoost
  );
  const resolvedTitle = args.title.trim();
  const keepEmptyTitle = shouldKeepEmptyTitleForCaseResolver(
    matchedPatternIds,
    resolvedTitle || normalizedRaw
  );

  return {
    id: args.createSegmentId(),
    type,
    title: keepEmptyTitle ? '' : (resolvedTitle || 'Untitled Segment'),
    includeInOutput: args.includeInOutput ?? (type !== 'metadata'),
    text: normalizedRaw,
    raw: normalizedRaw,
    code: args.code ?? null,
    condition: args.condition ?? null,
    items: [],
    listItems: args.listItems ?? [],
    subsections: args.subsections ?? [],
    paramsText: resolvedParamsText,
    paramsObject: resolvedParamsObject,
    paramUiControls: args.paramUiControls ?? {},
    paramComments: args.paramComments ?? {},
    paramDescriptions: args.paramDescriptions ?? {},
    matchedPatternIds,
    matchedPatternLabels,
    matchedSequenceLabels,
    confidence,
    validationResults: [],
    segments: [],
  };};

const formatHeadingWithCode = (title: string, code: string | null): string => {
  const normalizedTitle = title.trim();
  if (!code) return normalizedTitle;
  const upperCode = code.toUpperCase();
  if (new RegExp(`^${escapeRegExp(upperCode)}\\b`, 'i').test(normalizedTitle)) {
    return normalizedTitle;
  }
  if (!normalizedTitle) return upperCode;
  return `${upperCode} ${normalizedTitle}`;
};

const formatSubsectionHeading = (subsection: PromptExploderSubsection): string => {
  const code = subsection.code?.trim().toUpperCase() || null;
  const title = subsection.title.trim();
  const condition = subsection.condition?.trim() || null;
  const guidance = subsection.guidance?.trim() || null;

  if (code && title && (condition || guidance)) {
    const detail = condition ?? guidance ?? '';
    return `${code} (${title}): ${detail}`.trim();
  }
  if (code && title) {
    return formatHeadingWithCode(title, code);
  }
  if (code) return code;
  return title;
};

const stripLeadingTitleLine = (text: string, title: string): string => {
  const normalized = trimTrailingBlankLines(text);
  if (!normalized) return '';
  const lines = normalized.split('\n');
  const firstLine = normalizeHeadingLabel(lines[0] ?? '');
  const titleLabel = normalizeHeadingLabel(title);
  if (!firstLine || !titleLabel) return normalized;
  if (firstLine.toLowerCase() !== titleLabel.toLowerCase()) return normalized;
  return trimTrailingBlankLines(lines.slice(1).join('\n'));
};

export const renderPromptExploderSegment = (segment: PromptExploderSegment): string => {
  const lines: string[] = [];

  const appendTitle = (): void => {
    if (segment.title && segment.title.trim().length > 0) {
      if (segment.type === 'referential_list') {
        lines.push(formatHeadingWithCode(segment.title, segment.code ?? null));
        return;
      }      lines.push(segment.title.trim());
    }
  };

  switch (segment.type) {
    case 'metadata':
      if (segment.text) lines.push(segment.text.trim());
      break;
    case 'parameter_block':
      appendTitle();
      if (segment.paramsText && segment.paramsText.trim().length > 0) {
        const body = stripLeadingTitleLine(segment.paramsText, segment.title || '');
        if (body.length > 0) lines.push(body);
      } else if (segment.text && segment.text.trim().length > 0) {
        const body = stripLeadingTitleLine(segment.text, segment.title || '');
        if (body.length > 0) lines.push(body);
      }
      break;
    case 'sequence':
      appendTitle();
      if (segment.condition?.trim()) {
        lines.push(segment.condition.trim());
      }
      segment.subsections.forEach((subsection: PromptExploderSubsection, index: number) => {
        if (index > 0 || lines.length > 0) {
          lines.push('');
        }
        const subsectionHeading = formatSubsectionHeading(subsection);
        if (subsectionHeading) {
          lines.push(subsectionHeading);
        }
        lines.push(...flattenItemsToTextLines(subsection.items || []));
      });
      break;
    case 'qa_matrix':
      appendTitle();
      if (segment.subsections.length > 0) {
        segment.subsections.forEach((subsection: PromptExploderSubsection, index: number) => {
          if (index > 0 || lines.length > 0) {
            lines.push('');
          }
          const subsectionHeading = formatHeadingWithCode(
            subsection.title || '',
            subsection.code || ''
          );
          if (subsectionHeading) {
            lines.push(subsectionHeading);
          }
          lines.push(...flattenItemsToTextLines(subsection.items || []));
        });
        break;
      }
      lines.push(...flattenItemsToTextLines(segment.listItems || []));
      break;
    case 'hierarchical_list':
    case 'conditional_list':
    case 'referential_list':
    case 'list':
      appendTitle();
      lines.push(...flattenItemsToTextLines(segment.listItems || [], {
        ordered: segment.type === 'list' || segment.type === 'hierarchical_list',
      }));
      break;
    case 'assigned_text':
    default:
      appendTitle();
      if (segment.text && segment.text.trim().length > 0) {
        const body = stripLeadingTitleLine(segment.text, segment.title || '');
        if (body.length > 0) {
          lines.push(body);
        }
      }
      break;  }

  return trimTrailingBlankLines(lines.join('\n'));
};
