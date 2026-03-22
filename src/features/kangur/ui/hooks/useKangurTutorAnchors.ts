'use client';

import { useEffect, useRef, type RefObject } from 'react';

import type {
  KangurTutorAnchorKind,
  KangurTutorAnchorSurface,
} from '@/features/kangur/ui/context/kangur-tutor-types';
import { useOptionalKangurTutorAnchors } from '@/features/kangur/ui/context/KangurTutorAnchorContext';

export type KangurTutorAnchorConfig = {
  id: string;
  kind: KangurTutorAnchorKind;
  surface: KangurTutorAnchorSurface;
  enabled: boolean;
  priority: number;
  contentId: string | null;
  label: string;
  assignmentId?: string | null;
  ref: RefObject<HTMLElement | null>;
};

export function useKangurTutorAnchors(anchors: KangurTutorAnchorConfig[]): void {
  const context = useOptionalKangurTutorAnchors();
  const registerAnchor = context?.registerAnchor;
  const unregistersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!registerAnchor) {
      return;
    }

    const unregisters: Array<() => void> = [];

    for (const anchor of anchors) {
      if (!anchor.enabled) {
        continue;
      }

      const element = anchor.ref.current;
      if (element) {
        element.dataset['kangurTutorAnchorId'] = anchor.id;
        element.dataset['kangurTutorAnchorKind'] = anchor.kind;
        element.dataset['kangurTutorAnchorSurface'] = anchor.surface;
      }

      const ref = anchor.ref;
      const unregister = registerAnchor({
        id: anchor.id,
        kind: anchor.kind,
        surface: anchor.surface,
        priority: anchor.priority,
        metadata: {
          contentId: anchor.contentId,
          label: anchor.label,
          assignmentId: anchor.assignmentId ?? null,
        },
        getRect: () => ref.current?.getBoundingClientRect() ?? null,
      });

      unregisters.push(() => {
        if (element) {
          delete element.dataset['kangurTutorAnchorId'];
          delete element.dataset['kangurTutorAnchorKind'];
          delete element.dataset['kangurTutorAnchorSurface'];
        }
        unregister();
      });
    }

    unregistersRef.current = unregisters;

    return () => {
      for (const fn of unregisters) {
        fn();
      }
    };
    // We intentionally depend on the serialized anchor state to avoid
    // re-running the effect on every render while still picking up changes.
  }, [registerAnchor, serializeAnchors(anchors)]);
}

function serializeAnchors(anchors: KangurTutorAnchorConfig[]): string {
  return anchors
    .map(
      (a) =>
        `${a.id}:${a.enabled ? '1' : '0'}:${a.priority}:${a.contentId ?? ''}:${a.label}:${a.assignmentId ?? ''}`
    )
    .join('|');
}
