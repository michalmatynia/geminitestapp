import type {
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

const resolveManualBindingSegments = ({
  draft,
  segments,
}: {
  draft: PromptExploderManualBindingDraft;
  segments: PromptExploderSegment[];
}): {
  fromSegment: PromptExploderSegment | null;
  toSegment: PromptExploderSegment | null;
} => ({
  fromSegment:
    segments.find((segment: PromptExploderSegment) => segment.id === draft.fromSegmentId) ?? null,
  toSegment:
    segments.find((segment: PromptExploderSegment) => segment.id === draft.toSegmentId) ?? null,
});

const resolveManualBindingSubsections = ({
  draft,
  fromSegment,
  toSegment,
}: {
  draft: PromptExploderManualBindingDraft;
  fromSegment: PromptExploderSegment;
  toSegment: PromptExploderSegment;
}): {
  fromSubsection: PromptExploderSubsection | null;
  toSubsection: PromptExploderSubsection | null;
} => ({
  fromSubsection: draft.fromSubsectionId
    ? findSubsectionById(fromSegment, draft.fromSubsectionId)
    : null,
  toSubsection: draft.toSubsectionId ? findSubsectionById(toSegment, draft.toSubsectionId) : null,
});

const validateManualBindingDraft = ({
  draft,
  fromSegment,
  fromSubsection,
  toSegment,
  toSubsection,
}: {
  draft: PromptExploderManualBindingDraft;
  fromSegment: PromptExploderSegment | null;
  fromSubsection: PromptExploderSubsection | null;
  toSegment: PromptExploderSegment | null;
  toSubsection: PromptExploderSubsection | null;
}): ManualBindingBuildResult | null => {
  if (!fromSegment || !toSegment) {
    return {
      ok: false,
      error: 'Select valid source and target segments.',
      details: { variant: 'error' },
    };
  }
  if (draft.fromSubsectionId && !fromSubsection) {
    return {
      ok: false,
      error: 'Selected source subsection no longer exists.',
      details: { variant: 'error' },
    };
  }
  if (draft.toSubsectionId && !toSubsection) {
    return {
      ok: false,
      error: 'Selected target subsection no longer exists.',
      details: { variant: 'error' },
    };
  }
  if (
    draft.type === 'depends_on' &&
    fromSegment.id === toSegment.id &&
    (fromSubsection?.id ?? null) === (toSubsection?.id ?? null)
  ) {
    return {
      ok: false,
      error: 'Source and target cannot be the exact same endpoint for depends_on bindings.',
      details: { variant: 'info' },
    };
  }
  return null;
};

const resolveManualBindingLabels = ({
  draft,
  formatSubsectionLabel,
  fromSegment,
  fromSubsection,
  toSegment,
  toSubsection,
}: {
  draft: PromptExploderManualBindingDraft;
  formatSubsectionLabel: (subsection: PromptExploderSubsection) => string;
  fromSegment: PromptExploderSegment;
  fromSubsection: PromptExploderSubsection | null;
  toSegment: PromptExploderSegment;
  toSubsection: PromptExploderSubsection | null;
}): { sourceLabel: string; targetLabel: string } => {
  const defaultSourceLabel =
    (fromSubsection ? formatSubsectionLabel(fromSubsection) : fromSegment.title) || '';
  const defaultTargetLabel =
    (toSubsection ? formatSubsectionLabel(toSubsection) : toSegment.title) || '';

  return {
    sourceLabel: (draft.sourceLabel || '').trim() || defaultSourceLabel || 'Source',
    targetLabel: (draft.targetLabel || '').trim() || defaultTargetLabel || 'Target',
  };
};

export const buildManualBindingFromDraft = (args: {
  segments: PromptExploderSegment[];
  draft: PromptExploderManualBindingDraft;
  createManualBindingId: () => string;
  formatSubsectionLabel: (subsection: PromptExploderSubsection) => string;
}): ManualBindingBuildResult => {
  const { fromSegment, toSegment } = resolveManualBindingSegments({
    draft: args.draft,
    segments: args.segments,
  });
  const { fromSubsection, toSubsection } =
    fromSegment && toSegment
      ? resolveManualBindingSubsections({
          draft: args.draft,
          fromSegment,
          toSegment,
        })
      : { fromSubsection: null, toSubsection: null };
  const validationError = validateManualBindingDraft({
    draft: args.draft,
    fromSegment,
    fromSubsection,
    toSegment,
    toSubsection,
  });
  if (validationError) {
    return validationError;
  }
  if (!fromSegment || !toSegment) {
    return {
      ok: false,
      error: 'Select valid source and target segments.',
      details: { variant: 'error' },
    };
  }

  const { sourceLabel, targetLabel } = resolveManualBindingLabels({
    draft: args.draft,
    formatSubsectionLabel: args.formatSubsectionLabel,
    fromSegment,
    fromSubsection,
    toSegment,
    toSubsection,
  });

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
        sourceLabel,
        targetLabel,
        origin: 'manual',
      },
    ],
    warnings: [],
  };
};
