'use client';

import React from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { VersionNode } from '../context/VersionGraphContext';

export type VersionNodeDetailsModalRuntimeValue = EntityModalProps<VersionNode> & {
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
};

const {
  Context: VersionNodeDetailsModalRuntimeContext,
  useStrictContext: useVersionNodeDetailsModalRuntime,
  useOptionalContext: useOptionalVersionNodeDetailsModalRuntime,
} = createStrictContext<VersionNodeDetailsModalRuntimeValue>({
  hookName: 'useVersionNodeDetailsModalRuntime',
  providerName: 'VersionNodeDetailsModalRuntimeProvider',
  displayName: 'VersionNodeDetailsModalRuntimeContext',
});

export {
  VersionNodeDetailsModalRuntimeContext,
  useVersionNodeDetailsModalRuntime,
  useOptionalVersionNodeDetailsModalRuntime,
};

export function VersionNodeDetailsModalRuntimeProvider({
  value,
  children,
}: {
  value: VersionNodeDetailsModalRuntimeValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VersionNodeDetailsModalRuntimeContext.Provider value={value}>
      {children}
    </VersionNodeDetailsModalRuntimeContext.Provider>
  );
}
