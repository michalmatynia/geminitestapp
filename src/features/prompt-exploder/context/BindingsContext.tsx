'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

import {
  promptExploderCreateManualBindingId,
  promptExploderFormatSubsectionLabel,
} from '../helpers/segment-helpers';
import {
  buildManualBindingFromDraft,
  resolveManualBindingSegmentIds,
  resolveManualBindingSubsectionIds,
  type PromptExploderManualBindingDraft,
} from '../manual-bindings';
import { useDocumentState, useDocumentActions } from './DocumentContext';

import type { PromptExploderSubsection } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export type BindingDraft = PromptExploderManualBindingDraft;

export interface BindingsState {
  bindingDraft: BindingDraft;
  fromSubsectionOptions: Array<LabeledOptionDto<string>>;
  toSubsectionOptions: Array<LabeledOptionDto<string>>;
}

export interface BindingsActions {
  setBindingDraft: React.Dispatch<React.SetStateAction<BindingDraft>>;
  handleAddManualBinding: () => void;
  handleRemoveManualBinding: (bindingId: string) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const BindingsStateContext = createContext<BindingsState | null>(null);
const BindingsActionsContext = createContext<BindingsActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function BindingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const { documentState, manualBindings, segmentById } = useDocumentState();
  const { syncManualBindings } = useDocumentActions();

  const [bindingDraft, setBindingDraft] = useState<BindingDraft>({
    type: 'depends_on',
    fromSegmentId: '',
    toSegmentId: '',
    fromSubsectionId: '',
    toSubsectionId: '',
    sourceLabel: '',
    targetLabel: '',
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const fromSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.fromSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection: PromptExploderSubsection) => {
      options.push({
        value: subsection.id,
        label: promptExploderFormatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.fromSegmentId, segmentById]);

  const toSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.toSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection: PromptExploderSubsection) => {
      options.push({
        value: subsection.id,
        label: promptExploderFormatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.toSegmentId, segmentById]);

  // ── Sync binding draft with document ───────────────────────────────────────

  useEffect(() => {
    const segments = documentState?.segments ?? [];
    const resolved = resolveManualBindingSegmentIds({
      segments,
      fromSegmentId: bindingDraft.fromSegmentId,
      toSegmentId: bindingDraft.toSegmentId,
    });
    if (
      resolved.fromSegmentId === bindingDraft.fromSegmentId &&
      resolved.toSegmentId === bindingDraft.toSegmentId &&
      (segments.length > 0 || (!bindingDraft.fromSubsectionId && !bindingDraft.toSubsectionId))
    ) {
      return;
    }
    setBindingDraft((previous) => ({
      ...previous,
      fromSegmentId: resolved.fromSegmentId,
      toSegmentId: resolved.toSegmentId,
      fromSubsectionId: segments.length === 0 ? '' : previous.fromSubsectionId,
      toSubsectionId: segments.length === 0 ? '' : previous.toSubsectionId,
    }));
  }, [bindingDraft.fromSegmentId, bindingDraft.toSegmentId, documentState?.segments]);

  useEffect(() => {
    if (!documentState) return;
    const resolved = resolveManualBindingSubsectionIds({
      segmentById,
      fromSegmentId: bindingDraft.fromSegmentId,
      toSegmentId: bindingDraft.toSegmentId,
      fromSubsectionId: bindingDraft.fromSubsectionId,
      toSubsectionId: bindingDraft.toSubsectionId,
    });
    if (
      resolved.fromSubsectionId === bindingDraft.fromSubsectionId &&
      resolved.toSubsectionId === bindingDraft.toSubsectionId
    ) {
      return;
    }
    setBindingDraft((previous) => ({
      ...previous,
      fromSubsectionId: resolved.fromSubsectionId,
      toSubsectionId: resolved.toSubsectionId,
    }));
  }, [
    bindingDraft.fromSegmentId,
    bindingDraft.fromSubsectionId,
    bindingDraft.toSegmentId,
    bindingDraft.toSubsectionId,
    documentState,
    segmentById,
  ]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAddManualBinding = useCallback(() => {
    if (!documentState) {
      toast('Explode a prompt before adding bindings.', { variant: 'info' });
      return;
    }
    const builtBinding = buildManualBindingFromDraft({
      segments: documentState.segments,
      draft: bindingDraft,
      createManualBindingId: promptExploderCreateManualBindingId,
      formatSubsectionLabel: promptExploderFormatSubsectionLabel,
    });
    if (!builtBinding.ok) {
      const variant =
        typeof builtBinding.details?.['variant'] === 'string'
          ? (builtBinding.details['variant'] as 'info' | 'error' | 'success')
          : 'error';
      toast(builtBinding.error, { variant });
      return;
    }
    syncManualBindings([...manualBindings, ...builtBinding.bindings]);
    setBindingDraft((previous) => ({
      ...previous,
      sourceLabel: '',
      targetLabel: '',
    }));
    toast('Manual binding added.', { variant: 'success' });
  }, [bindingDraft, documentState, manualBindings, syncManualBindings, toast]);

  const handleRemoveManualBinding = useCallback(
    (bindingId: string) => {
      const nextManual = manualBindings.filter((binding) => binding.id !== bindingId);
      syncManualBindings(nextManual);
    },
    [manualBindings, syncManualBindings]
  );

  // ── Memoized context values ────────────────────────────────────────────────

  const stateValue = useMemo<BindingsState>(
    () => ({
      bindingDraft,
      fromSubsectionOptions,
      toSubsectionOptions,
    }),
    [bindingDraft, fromSubsectionOptions, toSubsectionOptions]
  );

  const actionsValue = useMemo<BindingsActions>(
    () => ({
      setBindingDraft,
      handleAddManualBinding,
      handleRemoveManualBinding,
    }),
    [handleAddManualBinding, handleRemoveManualBinding]
  );

  return (
    <BindingsStateContext.Provider value={stateValue}>
      <BindingsActionsContext.Provider value={actionsValue}>
        {children}
      </BindingsActionsContext.Provider>
    </BindingsStateContext.Provider>
  );
}

// ── Hook exports ─────────────────────────────────────────────────────────────

export const useBindingsState = (): BindingsState => {
  const ctx = React.useContext(BindingsStateContext);
  if (!ctx) throw internalError('useBindingsState must be used within BindingsProvider');
  return ctx;
};

export const useBindingsActions = (): BindingsActions => {
  const ctx = React.useContext(BindingsActionsContext);
  if (!ctx) throw internalError('useBindingsActions must be used within BindingsProvider');
  return ctx;
};

export { BindingsStateContext, BindingsActionsContext };
