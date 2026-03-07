'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useBrain } from '../context/BrainContext';
import type { AiBrainAssignment, AiBrainCapabilityKey, AiBrainSettings } from '../settings';

export type BrainRoutingStateContextValue = {
  settings: AiBrainSettings;
  effectiveCapabilityAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  isPending: boolean;
  editingCapability: AiBrainCapabilityKey | null;
};

export type BrainRoutingActionsContextValue = {
  onToggleEnabled: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  onEdit: (capability: AiBrainCapabilityKey) => void;
  onCloseEdit: () => void;
};

const {
  Context: BrainRoutingStateContext,
  useStrictContext: useBrainRoutingStateContext,
  useOptionalContext: useOptionalBrainRoutingStateContext,
} = createStrictContext<BrainRoutingStateContextValue>({
  hookName: 'useBrainRoutingStateContext',
  providerName: 'BrainRoutingProvider',
  displayName: 'BrainRoutingStateContext',
  errorFactory: internalError,
});

const {
  Context: BrainRoutingActionsContext,
  useStrictContext: useBrainRoutingActionsContext,
  useOptionalContext: useOptionalBrainRoutingActionsContext,
} = createStrictContext<BrainRoutingActionsContextValue>({
  hookName: 'useBrainRoutingActionsContext',
  providerName: 'BrainRoutingProvider',
  displayName: 'BrainRoutingActionsContext',
  errorFactory: internalError,
});

type BrainRoutingProviderProps = {
  children: React.ReactNode;
};

export function BrainRoutingProvider({
  children,
}: BrainRoutingProviderProps): React.JSX.Element {
  const { settings, effectiveCapabilityAssignments, saving, setCapabilityEnabled } = useBrain();
  const [editingCapability, setEditingCapability] =
    React.useState<AiBrainCapabilityKey | null>(null);

  const stateValue = React.useMemo(
    (): BrainRoutingStateContextValue => ({
      settings,
      effectiveCapabilityAssignments,
      isPending: saving,
      editingCapability,
    }),
    [effectiveCapabilityAssignments, editingCapability, saving, settings]
  );
  const actionsValue = React.useMemo(
    (): BrainRoutingActionsContextValue => ({
      onToggleEnabled: setCapabilityEnabled,
      onEdit: setEditingCapability,
      onCloseEdit: () => {
        setEditingCapability(null);
      },
    }),
    [setCapabilityEnabled]
  );

  return (
    <BrainRoutingActionsContext.Provider value={actionsValue}>
      <BrainRoutingStateContext.Provider value={stateValue}>
        {children}
      </BrainRoutingStateContext.Provider>
    </BrainRoutingActionsContext.Provider>
  );
}

export {
  useBrainRoutingStateContext,
  useOptionalBrainRoutingStateContext,
  useBrainRoutingActionsContext,
  useOptionalBrainRoutingActionsContext,
};
