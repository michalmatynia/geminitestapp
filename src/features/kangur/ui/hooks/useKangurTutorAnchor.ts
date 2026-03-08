'use client';

import { useEffect, type RefObject } from 'react';

import { useOptionalKangurTutorAnchors } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import type {
  KangurTutorAnchorKind,
  KangurTutorAnchorMetadata,
} from '@/features/kangur/ui/context/kangur-tutor-types';

type UseKangurTutorAnchorInput = {
  id: string;
  kind: KangurTutorAnchorKind;
  ref: RefObject<HTMLElement | null>;
  surface: 'lesson' | 'test' | 'game';
  enabled?: boolean;
  priority?: number;
  metadata?: KangurTutorAnchorMetadata;
};

export function useKangurTutorAnchor(input: UseKangurTutorAnchorInput): void {
  const context = useOptionalKangurTutorAnchors();
  const registerAnchor = context?.registerAnchor;
  const metadataContentId = input.metadata?.contentId ?? null;
  const metadataLabel = input.metadata?.label ?? null;
  const metadataAssignmentId = input.metadata?.assignmentId ?? null;

  useEffect(() => {
    if (!registerAnchor || !input.enabled) {
      return;
    }

    return registerAnchor({
      id: input.id,
      kind: input.kind,
      surface: input.surface,
      priority: input.priority ?? 0,
      metadata: {
        contentId: metadataContentId,
        label: metadataLabel,
        assignmentId: metadataAssignmentId,
      },
      getRect: () => input.ref.current?.getBoundingClientRect() ?? null,
    });
  }, [
    input.enabled,
    input.id,
    input.kind,
    input.priority,
    input.ref,
    input.surface,
    metadataAssignmentId,
    metadataContentId,
    metadataLabel,
    registerAnchor,
  ]);
}
