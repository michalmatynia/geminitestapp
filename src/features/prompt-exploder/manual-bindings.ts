import type {
  PromptExploderBinding,
  PromptExploderBindingType,
  PromptExploderSegment,
  PromptExploderSubsection,
} from './types';
import type { ManualBindingBuildResult } from '@/shared/contracts/prompt-exploder';

export type PromptExploderManualBindingDraft = {
  type: PromptExploderBindingType;
  fromSegmentId: string;
  toSegmentId: string;
  fromSubsectionId: string;
  toSubsectionId: string;
  sourceLabel: string;
  targetLabel: string;
};

export const resolveManualBindingSegmentIds = (args: {
  segments: PromptExploderSegment[];
  fromSegmentId: string;
  toSegmentId: string;
}): { fromSegmentId: string; toSegmentId: string } => {
  if (args.segments.length === 0) {
    return {
      fromSegmentId: '',
      toSegmentId: '',
    };
  }

  const firstId = args.segments[0]?.id ?? '';
  const secondId = args.segments[1]?.id ?? firstId;
  const hasFrom = args.segments.some(
    (segment: PromptExploderSegment) => segment.id === args.fromSegmentId
  );
  const hasTo = args.segments.some(
    (segment: PromptExploderSegment) => segment.id === args.toSegmentId
  );

  return {
    fromSegmentId: hasFrom ? args.fromSegmentId : firstId,
    toSegmentId: hasTo ? args.toSegmentId : secondId,
  };
};

export const resolveManualBindingSubsectionIds = (args: {
  segmentById: Map<string, PromptExploderSegment>;
  fromSegmentId: string;
  toSegmentId: string;
  fromSubsectionId: string;
  toSubsectionId: string;
}): { fromSubsectionId: string; toSubsectionId: string } => {
  const fromSegment = args.segmentById.get(args.fromSegmentId);
  const toSegment = args.segmentById.get(args.toSegmentId);
  const fromSubsectionValid = Boolean(
    !args.fromSubsectionId ||
    fromSegment?.subsections.some(
      (subsection: PromptExploderSubsection) => subsection.id === args.fromSubsectionId
    )
  );
  const toSubsectionValid = Boolean(
    !args.toSubsectionId ||
    toSegment?.subsections.some(
      (subsection: PromptExploderSubsection) => subsection.id === args.toSubsectionId
    )
  );

  return {
    fromSubsectionId: fromSubsectionValid ? args.fromSubsectionId : '',
    toSubsectionId: toSubsectionValid ? args.toSubsectionId : '',
  };
};

const findSubsectionById = (
  segment: PromptExploderSegment,
  subsectionId: string
): PromptExploderSubsection | null => {
  return (
    segment.subsections.find(
      (subsection: PromptExploderSubsection) => subsection.id === subsectionId
    ) ?? null
  );
};

export const buildManualBindingFromDraft = (args: {
  segments: PromptExploderSegment[];
  draft: PromptExploderManualBindingDraft;
  createManualBindingId: () => string;
  formatSubsectionLabel: (subsection: PromptExploderSubsection) => string;
}): ManualBindingBuildResult => {
  const fromSegment = args.segments.find(
    (segment: PromptExploderSegment) => segment.id === args.draft.fromSegmentId
  );
  const toSegment = args.segments.find(
    (segment: PromptExploderSegment) => segment.id === args.draft.toSegmentId
  );

  if (!fromSegment || !toSegment) {
    return {
      ok: false,
      error: 'Select valid source and target segments.',
      details: { variant: 'error' },
    };
  }

  const fromSubsection = args.draft.fromSubsectionId
    ? findSubsectionById(fromSegment, args.draft.fromSubsectionId)
    : null;
  const toSubsection = args.draft.toSubsectionId
    ? findSubsectionById(toSegment, args.draft.toSubsectionId)
    : null;

  if (args.draft.fromSubsectionId && !fromSubsection) {
    return {
      ok: false,
      error: 'Selected source subsection no longer exists.',
      details: { variant: 'error' },
    };
  }
  if (args.draft.toSubsectionId && !toSubsection) {
    return {
      ok: false,
      error: 'Selected target subsection no longer exists.',
      details: { variant: 'error' },
    };
  }

  if (
    args.draft.type === 'depends_on' &&
    fromSegment.id === toSegment.id &&
    (fromSubsection?.id ?? null) === (toSubsection?.id ?? null)
  ) {
    return {
      ok: false,
      error: 'Source and target cannot be the exact same endpoint for depends_on bindings.',
      details: { variant: 'info' },
    };
  }

  const defaultSourceLabel =
    (fromSubsection ? args.formatSubsectionLabel(fromSubsection) : fromSegment.title) || '';
  const defaultTargetLabel =
    (toSubsection ? args.formatSubsectionLabel(toSubsection) : toSegment.title) || '';

  return {
    ok: true,
    bindings: [
      {
        id: args.createManualBindingId(),
        type: args.draft.type,
        fromSegmentId: fromSegment.id,
        toSegmentId: toSegment.id,
        fromSubsectionId: fromSubsection?.id ?? null,
        toSubsectionId: toSubsection?.id ?? null,
        sourceLabel: (args.draft.sourceLabel || '').trim() || defaultSourceLabel || 'Source',
        targetLabel: (args.draft.targetLabel || '').trim() || defaultTargetLabel || 'Target',
        origin: 'manual',
      },
    ],
    warnings: [],
  };
};
