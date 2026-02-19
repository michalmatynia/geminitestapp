import type { PromptExploderSegment } from '../types';

type SegmentInsertPosition = 'before' | 'after';
type SegmentDirection = 'previous' | 'next';

type SegmentEditResult = {
  segments: PromptExploderSegment[];
  selectedSegmentId: string | null;
};

const createSegmentId = (): string =>
  `segment_manual_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeNewLines = (value: string): string => value.replace(/\r\n/g, '\n');

const joinSegmentText = (left: string, right: string): string => {
  const a = normalizeNewLines(left).trimEnd();
  const b = normalizeNewLines(right).trimStart();
  if (!a) return b;
  if (!b) return a;
  return `${a}\n\n${b}`;
};

const createBlankSegment = (
  template?: PromptExploderSegment | null,
  text = ''
): PromptExploderSegment => {
  const normalizedText = normalizeNewLines(text);
  return {
    id: createSegmentId(),
    type: template?.type ?? 'assigned_text',
    title: '',
    includeInOutput: template?.includeInOutput ?? true,
    text: normalizedText,
    raw: normalizedText,
    code: null,
    condition: null,
    listItems: [],
    subsections: [],
    paramsText: '',
    paramsObject: null,
    paramUiControls: {},
    paramComments: {},
    paramDescriptions: {},
    matchedPatternIds: [],
    matchedPatternLabels: [],
    matchedSequenceLabels: [],
    confidence: template?.confidence ?? 0.5,
  };
};

const buildPlaceholderSegment = (): PromptExploderSegment => {
  return createBlankSegment(null, '');
};

const clampIndex = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
};

const resolveSegmentIndex = (
  segments: PromptExploderSegment[],
  segmentId: string
): number => {
  return segments.findIndex((segment: PromptExploderSegment) => segment.id === segmentId);
};

const supportsTextSplit = (segment: PromptExploderSegment): boolean =>
  segment.type === 'assigned_text' ||
  segment.type === 'metadata' ||
  segment.type === 'parameter_block';

export const promptExploderInsertSegmentRelative = (args: {
  segments: PromptExploderSegment[];
  targetSegmentId: string;
  position: SegmentInsertPosition;
  template?: PromptExploderSegment | null | undefined;
}): SegmentEditResult => {
  const { segments, targetSegmentId, position, template } = args;
  const targetIndex = resolveSegmentIndex(segments, targetSegmentId);
  const nextSegment = createBlankSegment(template ?? segments[targetIndex] ?? null, '');
  if (targetIndex < 0) {
    return {
      segments: [...segments, nextSegment],
      selectedSegmentId: nextSegment.id,
    };
  }
  const insertionIndex = position === 'before' ? targetIndex : targetIndex + 1;
  const nextSegments = [...segments];
  nextSegments.splice(insertionIndex, 0, nextSegment);
  return {
    segments: nextSegments,
    selectedSegmentId: nextSegment.id,
  };
};

export const promptExploderRemoveSegmentById = (args: {
  segments: PromptExploderSegment[];
  segmentId: string;
}): SegmentEditResult => {
  const { segments, segmentId } = args;
  if (segments.length === 0) {
    const placeholder = buildPlaceholderSegment();
    return { segments: [placeholder], selectedSegmentId: placeholder.id };
  }
  const targetIndex = resolveSegmentIndex(segments, segmentId);
  if (targetIndex < 0) {
    return { segments, selectedSegmentId: segments[0]?.id ?? null };
  }
  if (segments.length === 1) {
    const placeholder = buildPlaceholderSegment();
    return { segments: [placeholder], selectedSegmentId: placeholder.id };
  }
  const nextSegments = segments.filter((segment) => segment.id !== segmentId);
  const fallbackIndex = Math.max(0, Math.min(targetIndex, nextSegments.length - 1));
  return {
    segments: nextSegments,
    selectedSegmentId: nextSegments[fallbackIndex]?.id ?? null,
  };
};

export const promptExploderSplitSegmentByRange = (args: {
  segments: PromptExploderSegment[];
  segmentId: string;
  selectionStart: number;
  selectionEnd: number;
}): SegmentEditResult => {
  const { segments, segmentId } = args;
  const targetIndex = resolveSegmentIndex(segments, segmentId);
  if (targetIndex < 0) {
    return {
      segments,
      selectedSegmentId: segmentId,
    };
  }

  const target = segments[targetIndex]!;
  if (!supportsTextSplit(target)) {
    return {
      segments,
      selectedSegmentId: segmentId,
    };
  }

  const sourceText = normalizeNewLines(target.text);
  const max = sourceText.length;
  const start = clampIndex(args.selectionStart, 0, max);
  const end = clampIndex(args.selectionEnd, 0, max);
  const left = Math.min(start, end);
  const right = Math.max(start, end);

  const hasSelection = right > left;
  const extracted = hasSelection
    ? sourceText.slice(left, right)
    : sourceText.slice(left);
  if (!extracted.trim()) {
    return {
      segments,
      selectedSegmentId: segmentId,
    };
  }

  const remaining = hasSelection
    ? `${sourceText.slice(0, left)}${sourceText.slice(right)}`
    : sourceText.slice(0, left);
  const nextCurrent: PromptExploderSegment = {
    ...target,
    text: remaining,
    raw: remaining,
    paramsText: target.type === 'parameter_block' ? remaining : target.paramsText,
  };
  const nextSplit = createBlankSegment(target, extracted);
  nextSplit.title = target.title.trim().length > 0 ? `${target.title} (Split)` : '';

  const nextSegments = [...segments];
  nextSegments[targetIndex] = nextCurrent;
  nextSegments.splice(targetIndex + 1, 0, nextSplit);

  return {
    segments: nextSegments,
    selectedSegmentId: nextSplit.id,
  };
};

export const promptExploderMergeSegment = (args: {
  segments: PromptExploderSegment[];
  segmentId: string;
  direction: SegmentDirection;
}): SegmentEditResult => {
  const { segments, segmentId, direction } = args;
  const targetIndex = resolveSegmentIndex(segments, segmentId);
  if (targetIndex < 0) {
    return {
      segments,
      selectedSegmentId: segmentId,
    };
  }

  const peerIndex = direction === 'previous' ? targetIndex - 1 : targetIndex + 1;
  if (peerIndex < 0 || peerIndex >= segments.length) {
    return {
      segments,
      selectedSegmentId: segmentId,
    };
  }

  const baseIndex = direction === 'previous' ? peerIndex : targetIndex;
  const sourceIndex = direction === 'previous' ? targetIndex : peerIndex;
  const base = segments[baseIndex]!;
  const source = segments[sourceIndex]!;
  const mergedText = joinSegmentText(base.text, source.text);
  const mergedSegment: PromptExploderSegment = {
    ...base,
    includeInOutput: base.includeInOutput || source.includeInOutput,
    text: mergedText,
    raw: mergedText,
    paramsText: base.type === 'parameter_block' ? mergedText : base.paramsText,
  };

  const nextSegments = segments.filter((_, index) => index !== sourceIndex);
  const mergedIndex = direction === 'previous' ? baseIndex : targetIndex;
  nextSegments[mergedIndex] = mergedSegment;

  return {
    segments: nextSegments,
    selectedSegmentId: mergedSegment.id,
  };
};
