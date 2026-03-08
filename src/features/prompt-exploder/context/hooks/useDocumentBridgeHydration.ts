'use client';

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import {
  readPromptExploderDraftPayload,
  type PromptExploderBridgeSource,
  type PromptExploderCaseResolverContext,
} from '../../bridge';
import type { DocumentActions } from '../document/DocumentActionsContext';

export const useDocumentBridgeHydration = ({
  clearDocument,
  incomingBridgeSource,
  incomingCaseResolverContext,
  lastHydratedDraftPayloadKeyRef,
  setIncomingBridgeSource,
  setIncomingCaseResolverContext,
  setPromptText,
}: {
  clearDocument: () => void;
  incomingBridgeSource: PromptExploderBridgeSource | null;
  incomingCaseResolverContext: PromptExploderCaseResolverContext | null;
  lastHydratedDraftPayloadKeyRef: MutableRefObject<string | null>;
  setIncomingBridgeSource: Dispatch<SetStateAction<PromptExploderBridgeSource | null>>;
  setIncomingCaseResolverContext: Dispatch<SetStateAction<PromptExploderCaseResolverContext | null>>;
  setPromptText: DocumentActions['setPromptText'];
}) => {
  useEffect(() => {
    const payload = readPromptExploderDraftPayload();
    const rawPayloadContext = payload?.caseResolverContext ?? null;
    const isConsumableDraftPayload = payload !== null && payload.target === 'prompt-exploder';
    const nextBridgeSource = isConsumableDraftPayload ? (payload?.source ?? null) : null;
    if (nextBridgeSource !== incomingBridgeSource) {
      setIncomingBridgeSource(nextBridgeSource);
    }
    const payloadContext = isConsumableDraftPayload ? rawPayloadContext : null;
    if (
      (incomingCaseResolverContext?.fileId ?? null) !== (payloadContext?.fileId ?? null) ||
      (incomingCaseResolverContext?.sessionId ?? null) !== (payloadContext?.sessionId ?? null)
    ) {
      setIncomingCaseResolverContext(payloadContext);
    }
    const promptFromPayload = isConsumableDraftPayload ? (payload?.prompt ?? null) : null;
    const payloadKey = payload
      ? [
          payload.createdAt,
          payload.source ?? '',
          payload.target ?? '',
          payload.caseResolverContext?.fileId ?? '',
          payload.caseResolverContext?.sessionId ?? '',
          String(payload.prompt.length),
        ].join('|')
      : null;
    if (promptFromPayload && payloadKey && lastHydratedDraftPayloadKeyRef.current !== payloadKey) {
      lastHydratedDraftPayloadKeyRef.current = payloadKey;
      clearDocument();
      setPromptText(promptFromPayload);
    }
  }, [
    clearDocument,
    incomingBridgeSource,
    incomingCaseResolverContext,
    lastHydratedDraftPayloadKeyRef,
    setIncomingBridgeSource,
    setIncomingCaseResolverContext,
    setPromptText,
  ]);
};
