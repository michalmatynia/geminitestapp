import { buildPromptExploderBindings } from './parser-bindings';
import { collectReferencedParamsFromItems, parseListLines } from './parser-list-items';
import {
  normalizeRuntimeValidationScope,
  resolveRuntimePatterns,
  type PatternRuntime,
} from './parser-runtime-patterns';
import { renderPromptExploderSegment } from './parser-segment-factory';
import { inferTypeFromLearnedTemplates } from './parser-type-inference';
import { parseSegmentsLoop, parseSegmentsRuleDriven } from './utils/parser-loops';
import { normalizePromptSource, trimTrailingBlankLines } from './utils/parser-utils';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderLearnedTemplate,
  PromptExploderRuntimeValidationScope,
} from '@/shared/contracts/prompt-exploder';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderListItem,
  PromptExploderSegment,
} from './types';

export {
  getPromptExploderRuntimePatternCacheSnapshot,
  invalidatePromptExploderRuntimePatternCacheByRuntime,
  prewarmPromptExploderRuntimePatterns,
  resetPromptExploderRuntimePatternCache,
} from './parser-runtime-patterns';

const BRACKET_SECTION_HEADING_RE = /^\s*\[[A-Z0-9 _()\-/:&+.,]{2,}]$/i;
const STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE =
  /^(===\s*STUDIO\s+RELIGHTING|STUDIO\s+RELIGHTING\b)/i;
const REQUIREMENTS_BOUNDARY_FALLBACK_RE = /^(REQUIREMENTS|COMPOSITING\s+REQUIREMENTS)\b/i;
const PIPELINE_BOUNDARY_FALLBACK_RE = /^(PIPELINE|WORKFLOW|PROCESS|EXECUTION\s+TEMPLATE)\b/i;
const FINAL_QA_BOUNDARY_FALLBACK_RE = /^FINAL\s+QA\b/i;

type IdFactory = {
  next: () => string;
  reset: () => void;
};

const createIdFactory = (prefix: string): IdFactory => {
  let count = 0;
  return {
    next: (): string => {
      count += 1;
      return `${prefix}_${count.toString(36)}`;
    },
    reset: (): void => {
      count = 0;
    },
  };
};

const listItemIdFactory = createIdFactory('item');
const logicalConditionIdFactory = createIdFactory('condition');
const segmentIdFactory = createIdFactory('segment');
const subsectionIdFactory = createIdFactory('subsection');
const bindingIdFactory = createIdFactory('binding');

const listItemId = (): string => listItemIdFactory.next();
const logicalConditionId = (): string => logicalConditionIdFactory.next();
const segmentId = (): string => segmentIdFactory.next();
const subsectionId = (): string => subsectionIdFactory.next();
const bindingId = (): string => bindingIdFactory.next();

const parseListLinesWithRuntimeIds = (lines: string[]): PromptExploderListItem[] =>
  parseListLines({
    lines,
    createListItemId: listItemId,
    createLogicalConditionId: logicalConditionId,
  });

const resetParserRuntimeIds = (): void => {
  listItemIdFactory.reset();
  logicalConditionIdFactory.reset();
  segmentIdFactory.reset();
  subsectionIdFactory.reset();
  bindingIdFactory.reset();
};

const CASE_RESOLVER_LABEL_ONLY_SEGMENT_IDS = new Set<string>([
  'segment.case_resolver.heading.addresser_label',
  'segment.case_resolver.heading.addressee_label',
]);
const CASE_RESOLVER_LABEL_ONLY_LINE_RE =
  /^\s*(?:from|od|nadawca|sender|addresser|wnioskodawca|to|do|adresat|recipient|addressee|odbiorca|organ)\s*:\s*$/iu;

const mergeCaseResolverLabeledPartySegments = (
  segments: PromptExploderSegment[]
): PromptExploderSegment[] => {
  if (segments.length === 0) return segments;

  const mergedSegments: PromptExploderSegment[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index];
    if (!current) continue;
    const currentRaw = (current.raw || current.text || '').trim();
    const isLabelOnlySegment =
      currentRaw.length > 0 &&
      CASE_RESOLVER_LABEL_ONLY_LINE_RE.test(currentRaw) &&
      current.matchedPatternIds.some((patternId: string): boolean =>
        CASE_RESOLVER_LABEL_ONLY_SEGMENT_IDS.has(patternId)
      );

    if (!isLabelOnlySegment) {
      mergedSegments.push(current);
      continue;
    }

    const next = segments[index + 1];
    if (!next) {
      mergedSegments.push(current);
      continue;
    }

    const nextRaw = next.raw || next.text || '';
    if (!nextRaw.trim()) {
      mergedSegments.push(current);
      continue;
    }

    mergedSegments.push({
      ...next,
      title: '',
      raw: `${currentRaw}\n${nextRaw}`.trim(),
      text: `${currentRaw}\n${nextRaw}`.trim(),
      matchedPatternIds: [
        ...new Set([...(current.matchedPatternIds ?? []), ...next.matchedPatternIds]),
      ],
      matchedPatternLabels: [
        ...new Set([...(current.matchedPatternLabels ?? []), ...(next.matchedPatternLabels ?? [])]),
      ],
      matchedSequenceLabels: [
        ...new Set([
          ...(current.matchedSequenceLabels ?? []),
          ...(next.matchedSequenceLabels ?? []),
        ]),
      ],
      confidence: Math.max(current.confidence ?? 0, next.confidence ?? 0),
    });
    index += 1;
  }

  return mergedSegments;
};

const renderSegment = (segment: PromptExploderSegment): string =>
  renderPromptExploderSegment(segment);

const buildBindings = (
  segments: PromptExploderSegment[],
  manualBindings: PromptExploderBinding[] = []
): PromptExploderBinding[] => {
  return buildPromptExploderBindings({
    segments,
    manualBindings,
    renderSegment,
    createBindingId: bindingId,
    collectReferencedParamsFromItems,
  });
};

const parseSegments = (prompt: string, runtime: PatternRuntime): PromptExploderSegment[] => {
  return parseSegmentsLoop(prompt, runtime, {
    runtime,
    segmentId,
    subsectionId,
    parseListLinesWithRuntimeIds,
    BRACKET_SECTION_HEADING_RE,
    STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE,
    REQUIREMENTS_BOUNDARY_FALLBACK_RE,
    PIPELINE_BOUNDARY_FALLBACK_RE,
    FINAL_QA_BOUNDARY_FALLBACK_RE,
  });
};

const parseRuleDrivenSegments = (
  prompt: string,
  runtime: PatternRuntime
): PromptExploderSegment[] =>
  parseSegmentsRuleDriven(prompt, runtime, {
    runtime,
    segmentId,
    subsectionId,
    parseListLinesWithRuntimeIds,
    BRACKET_SECTION_HEADING_RE,
    STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE,
    REQUIREMENTS_BOUNDARY_FALLBACK_RE,
    PIPELINE_BOUNDARY_FALLBACK_RE,
    FINAL_QA_BOUNDARY_FALLBACK_RE,
  });

const parseRuntimeSegments = (
  prompt: string,
  runtime: PatternRuntime,
  options: {
    useRuleDriven: boolean;
    mergeCaseResolverLabels: boolean;
  }
): PromptExploderSegment[] => {
  const rawSegments = options.useRuleDriven
    ? parseRuleDrivenSegments(prompt, runtime)
    : parseSegments(prompt, runtime);
  return options.mergeCaseResolverLabels
    ? mergeCaseResolverLabeledPartySegments(rawSegments)
    : rawSegments;
};

const applyLearnedTemplateTypes = (
  segments: PromptExploderSegment[],
  templates: PromptExploderLearnedTemplate[],
  similarityThreshold: number
): PromptExploderSegment[] => {
  if (templates.length === 0) return segments;

  return segments.map((segment) => {
    const inferred = inferTypeFromLearnedTemplates(segment, templates, similarityThreshold);
    if (!inferred.matchedTemplateId && inferred.type === segment.type) {
      return segment;
    }
    const nextPatternLabels = inferred.matchedTemplateId
      ? [
          ...new Set([
            ...(segment.matchedPatternLabels ?? []),
            `Learned Template: ${inferred.type.replaceAll('_', ' ')}`,
          ]),
        ]
      : (segment.matchedPatternLabels ?? []);
    const nextPatternIds = inferred.matchedTemplateId
      ? [
          ...new Set([
            ...segment.matchedPatternIds,
            `segment.learned.${inferred.type}.${inferred.matchedTemplateId}`,
          ]),
        ]
      : segment.matchedPatternIds;
    return {
      ...segment,
      type: inferred.type,
      confidence: inferred.confidence,
      matchedPatternIds: nextPatternIds,
      matchedPatternLabels: nextPatternLabels,
      matchedSequenceLabels: segment.matchedSequenceLabels ?? [],
    };
  });
};

export function explodePromptText(args: {
  prompt: string;
  validationRules?: PromptValidationRule[] | null;
  learnedTemplates?: PromptExploderLearnedTemplate[] | null;
  similarityThreshold?: number;
  validationScope?: PromptExploderRuntimeValidationScope | null;
  runtimeCacheKey?: string | null;
  correlationId?: string | null;
}): PromptExploderDocument {
  const sourcePrompt = normalizePromptSource(args.prompt);
  const validationScope = normalizeRuntimeValidationScope(args.validationScope);
  const runtime = resolveRuntimePatterns(args.validationRules, validationScope, {
    runtimeCacheKey: args.runtimeCacheKey,
    correlationId: args.correlationId,
  });
  resetParserRuntimeIds();
  const parsedSegments = parseRuntimeSegments(sourcePrompt, runtime, {
    useRuleDriven: validationScope === 'case_resolver_prompt_exploder',
    mergeCaseResolverLabels: validationScope === 'case_resolver_prompt_exploder',
  });
  const segments = applyLearnedTemplateTypes(
    parsedSegments,
    args.learnedTemplates ?? [],
    Math.min(0.95, Math.max(0.3, args.similarityThreshold ?? 0.68))
  );
  const bindings = buildBindings(segments);
  const warnings: string[] = [];

  if (segments.length === 0) {
    warnings.push('No segments were detected.');
  }

  if (validationScope === 'prompt_exploder') {
    if (!segments.some((segment) => segment.type === 'parameter_block')) {
      warnings.push('No PARAMS block was detected.');
    }

    if (!segments.some((segment) => segment.type === 'qa_matrix')) {
      warnings.push('No FINAL QA matrix was detected.');
    }
  }

  const reassembledPrompt = reassemblePromptSegments(segments);

  return {
    version: 1,
    sourcePrompt,
    segments,
    bindings,
    warnings,
    reassembledPrompt,
    sections: [],
    subsections: [],
    variables: [],
    dependencies: [],
    rules: [],
    tags: [],
    errors: [],
    diagnostics: [],
  };
}

export function reassemblePromptSegments(segments: PromptExploderSegment[]): string {
  const rendered = segments
    .filter((segment) => segment.includeInOutput)
    .map((segment) => renderSegment(segment))
    .filter((value) => value.trim().length > 0);

  return trimTrailingBlankLines(rendered.join('\n\n'));
}

export function updatePromptExploderDocument(
  document: PromptExploderDocument,
  segments: PromptExploderSegment[],
  manualBindings: PromptExploderBinding[] = []
): PromptExploderDocument {
  const hasSameSegmentsReference = segments === document.segments;
  const bindings = buildBindings(segments, manualBindings);
  const warnings = [...(document.warnings ?? [])];
  const reassembledPrompt = hasSameSegmentsReference
    ? document.reassembledPrompt
    : reassemblePromptSegments(segments);

  return {
    ...document,
    segments,
    bindings,
    reassembledPrompt,
    warnings,
  };
}

export const parsePromptExploderDocument = (
  prompt: string,
  runtime: PatternRuntime
): PromptExploderDocument => {
  const source = normalizePromptSource(prompt);
  resetParserRuntimeIds();

  const mergedSegments = parseRuntimeSegments(source, runtime, {
    useRuleDriven: runtime.headingRules.length > 0,
    mergeCaseResolverLabels: true,
  });
  const bindings = buildBindings(mergedSegments);

  return {
    sourcePrompt: source,
    version: 1,
    segments: mergedSegments,
    bindings,
    sections: [],
    subsections: [],
    variables: [],
    dependencies: [],
    rules: [],
    tags: [],
    errors: [],
    diagnostics: [],
    warnings: [],
    reassembledPrompt: reassemblePromptSegments(mergedSegments),
  };
};

export const parsePromptExploderSegments = (
  prompt: string,
  runtime: PatternRuntime
): PromptExploderSegment[] => {
  const source = normalizePromptSource(prompt);
  resetParserRuntimeIds();

  return parseRuntimeSegments(source, runtime, {
    useRuleDriven: runtime.headingRules.length > 0,
    mergeCaseResolverLabels: true,
  });
};
