import { PromptExploderSegment, PromptExploderBinding } from '../types';
import { buildPromptExploderBindings } from '../parser-bindings';
import { collectReferencedParamsFromItems } from '../parser-list-items';
import { renderPromptExploderSegment } from '../parser-segment-factory';

export const CASE_RESOLVER_LABEL_ONLY_SEGMENT_IDS = new Set<string>([
  'segment.case_resolver.heading.addresser_label',
  'segment.case_resolver.heading.addressee_label',
]);

export const CASE_RESOLVER_LABEL_ONLY_LINE_RE =
  /^\s*(?:from|od|nadawca|sender|addresser|wnioskodawca|to|do|adresat|recipient|addressee|odbiorca|organ)\s*:\s*$/iu;

export const mergeCaseResolverLabeledPartySegments = (
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
      raw: `${currentRaw}
${nextRaw}`.trim(),
      text: `${currentRaw}
${nextRaw}`.trim(),
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

export const buildBindings = (
  segments: PromptExploderSegment[],
  manualBindings: PromptExploderBinding[] = [],
  createBindingId: () => string
): PromptExploderBinding[] => {
  return buildPromptExploderBindings({
    segments,
    manualBindings,
    renderSegment: renderPromptExploderSegment,
    createBindingId,
    collectReferencedParamsFromItems,
  });
};
