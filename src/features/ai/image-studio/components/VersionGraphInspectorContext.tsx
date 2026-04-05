'use client';

import React from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { VersionNode } from '../context/VersionGraphContext';

type VersionGraphInspectorContextValue = {
  selectedNode: VersionNode | null;
  compositeLoading: boolean;
  compositeBusy: boolean;
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
  onFlattenComposite: (slotId: string) => void;
  onRefreshCompositePreview?: ((slotId: string) => void) | undefined;
  onSelectNode: (id: string | null) => void;
  onOpenDetails?: ((id: string) => void) | undefined;
  onFocusNode?: ((id: string) => void) | undefined;
  onIsolateBranch?: ((id: string) => void) | undefined;
  annotationDraft: string;
  onAnnotationChange: (value: string) => void;
  onAnnotationBlur: () => void;
};

const { Context: VersionGraphInspectorContext, useStrictContext: useVersionGraphInspectorContext } =
  createStrictContext<VersionGraphInspectorContextValue>({
    hookName: 'useVersionGraphInspectorContext',
    providerName: 'VersionGraphInspectorProvider',
    displayName: 'VersionGraphInspectorContext',
    errorFactory: () =>
      internalError(
        'useVersionGraphInspectorContext must be used inside VersionGraphInspectorProvider'
      ),
  });

export function VersionGraphInspectorProvider({
  value,
  children,
}: {
  value: VersionGraphInspectorContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VersionGraphInspectorContext.Provider value={value}>
      {children}
    </VersionGraphInspectorContext.Provider>
  );
}
export { useVersionGraphInspectorContext };
