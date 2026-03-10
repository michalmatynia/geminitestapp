'use client';

import { useEffect, type RefObject } from 'react';

import type {
  KangurTutorAnchorKind,
  KangurTutorAnchorMetadata,
  KangurTutorAnchorSurface,
} from '@/features/kangur/ui/context/kangur-tutor-types';
import { useOptionalKangurTutorAnchors } from '@/features/kangur/ui/context/KangurTutorAnchorContext';

type UseKangurTutorAnchorInput = {
  id: string;
  kind: KangurTutorAnchorKind;
  ref: RefObject<HTMLElement | null>;
  surface: KangurTutorAnchorSurface;
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

    const element = input.ref.current;
    if (element) {
      element.dataset['kangurTutorAnchorId'] = input.id;
      element.dataset['kangurTutorAnchorKind'] = input.kind;
      element.dataset['kangurTutorAnchorSurface'] = input.surface;
    }

    const unregister = registerAnchor({
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

    return () => {
      if (element) {
        delete element.dataset['kangurTutorAnchorId'];
        delete element.dataset['kangurTutorAnchorKind'];
        delete element.dataset['kangurTutorAnchorSurface'];
      }
      unregister();
    };
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
