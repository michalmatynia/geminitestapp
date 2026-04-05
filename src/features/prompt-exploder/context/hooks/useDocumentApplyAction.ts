'use client';

import { useCallback } from 'react';

import type { Toast } from '@/shared/contracts/ui/base';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  savePromptExploderApplyPrompt,
  savePromptExploderApplyPromptForCaseResolver,
} from '../../bridge';
import { reassemblePromptSegments } from '../../parser';
import {
  buildCaseResolverSegmentCaptureRules,
  resolveCaseResolverBridgePayloadForTransfer,
} from '../../utils/case-resolver-extraction';

import type { PromptExploderCaseResolverContext } from '../../bridge';
import type { DocumentCoreState, DocumentPromptState } from '../DocumentContext';
import type { PromptExploderSettingsState } from '../SettingsContext';

export const useDocumentApplyAction = ({
  documentState,
  incomingCaseResolverContext,
  promptText,
  promptExploderSettings,
  returnTarget,
  returnTo,
  router,
  runtimeSelection,
  toast,
}: {
  documentState: DocumentCoreState['documentState'];
  incomingCaseResolverContext: PromptExploderCaseResolverContext | null;
  promptText: DocumentPromptState['promptText'];
  promptExploderSettings: PromptExploderSettingsState['promptExploderSettings'];
  returnTarget: DocumentPromptState['returnTarget'];
  returnTo: string;
  router: { push: (href: string) => void };
  runtimeSelection: PromptExploderSettingsState['runtimeSelection'];
  toast: Toast;
}) =>
  useCallback(async () => {
    try {
      const reassembled = documentState
        ? reassemblePromptSegments(documentState.segments)
        : promptText.trim();
      if (!reassembled) {
        toast('No reassembled text available to apply.', { variant: 'warning' });
        return;
      }

      if (returnTarget === 'case-resolver') {
        const resolvedContextFileId = incomingCaseResolverContext?.fileId?.trim() ?? '';
        const resolvedContextSessionId = incomingCaseResolverContext?.sessionId?.trim() ?? '';
        if (!resolvedContextFileId) {
          toast('Cannot apply to Case Resolver without a valid target document context.', {
            variant: 'error',
          });
          return;
        }

        const transferSegments = documentState?.segments ?? [];
        let captureParties;
        let captureMetadata;
        let hasCaptureData = false;

        if (transferSegments.length > 0) {
          const captureRules = buildCaseResolverSegmentCaptureRules(
            runtimeSelection.runtimeValidationRules,
            runtimeSelection.identity.scope
          );
          const isRulesOnlyCaptureMode =
            promptExploderSettings.runtime.caseResolverExtractionMode === 'rules_only';
          if (isRulesOnlyCaptureMode && captureRules.length === 0) {
            toast(
              'No Case Resolver capture rules are active for this validation scope. Configure capture rules before applying.',
              { variant: 'warning' }
            );
          }
          const transferPayload = resolveCaseResolverBridgePayloadForTransfer({
            segments: transferSegments,
            captureRules,
            mode: promptExploderSettings.runtime.caseResolverExtractionMode,
          });
          hasCaptureData = transferPayload.hasCaptureData;
          captureParties = transferPayload.payload.parties;
          captureMetadata = transferPayload.payload.metadata;
        } else {
          toast(
            'No exploded segments detected. Applying raw prompt text without structured captures.',
            { variant: 'info' }
          );
        }

        if (!hasCaptureData) {
          if (promptExploderSettings.runtime.caseResolverExtractionMode === 'rules_only') {
            toast(
              'No addresser/addressee/date captures found in rules-only mode. No fallback extraction will run; applying will transfer text only.',
              { variant: 'warning' }
            );
          } else {
            toast('No addresser/addressee/date captures found. Applying will transfer text only.', {
              variant: 'warning',
            });
          }
        }

        const transferContext = {
          fileId: resolvedContextFileId,
          fileName: incomingCaseResolverContext?.fileName?.trim() || resolvedContextFileId,
          ...(resolvedContextSessionId
            ? {
              sessionId: resolvedContextSessionId,
            }
            : {}),
          ...(typeof incomingCaseResolverContext?.documentVersionAtStart === 'number'
            ? {
              documentVersionAtStart: incomingCaseResolverContext.documentVersionAtStart,
            }
            : {}),
        };
        savePromptExploderApplyPromptForCaseResolver(
          reassembled,
          transferContext,
          captureParties,
          captureMetadata
        );
      } else {
        savePromptExploderApplyPrompt(reassembled);
      }

      router.push(returnTo);
    } catch (error) {
      logClientCatch(error, {
        source: 'DocumentProvider',
        action: 'handleApplyToImageStudio',
        scope: runtimeSelection.identity.scope,
        stack: runtimeSelection.identity.stack,
        level: 'error',
      });
      toast(error instanceof Error ? error.message : 'Failed to apply prompt output.', {
        variant: 'error',
      });
    }
  }, [
    documentState,
    incomingCaseResolverContext,
    promptExploderSettings.runtime.caseResolverExtractionMode,
    promptText,
    returnTarget,
    returnTo,
    router,
    runtimeSelection,
    toast,
  ]);
