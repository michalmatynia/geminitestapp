'use client';

import { useCallback, type MutableRefObject } from 'react';

import type { Toast } from '@/shared/contracts/ui';
import { recordPromptValidationCounter } from '@/shared/lib/prompt-core/runtime-observability';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { promptExploderClampNumber } from '../../helpers/formatting';
import { explodePromptWithValidationRuntime } from '../../prompt-validation-orchestrator';
import { leavePromptRuntimeScope, tryEnterPromptRuntimeScope } from '../../runtime-load-shedder';

import type { PromptExploderDocument, PromptExploderLearnedTemplate } from '../../types';
import type { DocumentActions } from '../document/DocumentActionsContext';
import type { PromptExploderSettingsState } from '../SettingsContext';

export const useDocumentExplodeAction = ({
  promptText,
  promptExploderSettings,
  runtimeGuardrailIssue,
  runtimeSelection,
  explodeInFlightRef,
  lastExplosionRef,
  setDocumentState,
  setManualBindings,
  setSelectedSegmentId,
  toast,
}: {
  promptText: string;
  promptExploderSettings: PromptExploderSettingsState['promptExploderSettings'];
  runtimeGuardrailIssue: PromptExploderSettingsState['runtimeGuardrailIssue'];
  runtimeSelection: PromptExploderSettingsState['runtimeSelection'];
  explodeInFlightRef: MutableRefObject<boolean>;
  lastExplosionRef: MutableRefObject<{
    signature: string;
    document: PromptExploderDocument;
  } | null>;
  setDocumentState: DocumentActions['setDocumentState'];
  setManualBindings: DocumentActions['setManualBindings'];
  setSelectedSegmentId: DocumentActions['setSelectedSegmentId'];
  toast: Toast;
}) =>
  useCallback(() => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      toast('Enter a prompt first.', { variant: 'info' });
      return;
    }

    if (runtimeGuardrailIssue) {
      toast(runtimeGuardrailIssue, { variant: 'error' });
      return;
    }

    if (explodeInFlightRef.current) {
      recordPromptValidationCounter('runtime_backpressure_drop', 1, {
        scope: runtimeSelection.identity.scope,
      });
      toast('Prompt explosion is already running.', { variant: 'info' });
      return;
    }

    if (!tryEnterPromptRuntimeScope(runtimeSelection.identity.scope)) {
      recordPromptValidationCounter('runtime_backpressure_drop', 1, {
        scope: runtimeSelection.identity.scope,
      });
      toast('Runtime is busy for this scope. Try again in a moment.', {
        variant: 'info',
      });
      return;
    }

    explodeInFlightRef.current = true;

    try {
      const similarityThreshold = promptExploderClampNumber(
        promptExploderSettings.learning.similarityThreshold,
        0.3,
        0.95
      );
      const learnedTemplateSignature = runtimeSelection.runtimeLearnedTemplates
        .map(
          (template: PromptExploderLearnedTemplate) =>
            `${template.id}:${template.state}:${template.updatedAt}`
        )
        .join('|');
      const runtimeSignature = [
        trimmed,
        runtimeSelection.identity.cacheKey,
        similarityThreshold.toFixed(4),
        learnedTemplateSignature,
      ].join('::');
      if (lastExplosionRef.current?.signature === runtimeSignature) {
        recordPromptValidationCounter('runtime_fast_path_hit', 1, {
          scope: runtimeSelection.identity.scope,
        });
        const nextDocument = lastExplosionRef.current.document;
        setManualBindings([]);
        setDocumentState(nextDocument);
        setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
        toast(`Reused ${nextDocument.segments.length} cached segment(s).`, {
          variant: 'info',
        });
        return;
      }

      recordPromptValidationCounter('runtime_fast_path_miss', 1, {
        scope: runtimeSelection.identity.scope,
      });

      const orchestratorEnabled = promptExploderSettings.runtime.orchestratorEnabled ?? true;
      if (!orchestratorEnabled) {
        toast('Prompt runtime orchestrator is disabled in settings.', {
          variant: 'error',
        });
        return;
      }

      const nextDocument = explodePromptWithValidationRuntime({
        prompt: trimmed,
        runtime: runtimeSelection,
        similarityThreshold,
      });
      lastExplosionRef.current = {
        signature: runtimeSignature,
        document: nextDocument,
      };

      setManualBindings([]);
      setDocumentState(nextDocument);
      setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
      toast(`Exploded into ${nextDocument.segments.length} segment(s).`, {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'DocumentProvider',
          action: 'handleExplode',
          correlationId: runtimeSelection.correlationId,
          scope: runtimeSelection.identity.scope,
          stack: runtimeSelection.identity.stack,
          level: 'error',
        },
      });
      toast(error instanceof Error ? error.message : 'Explosion failed.', {
        variant: 'error',
      });
    } finally {
      explodeInFlightRef.current = false;
      leavePromptRuntimeScope(runtimeSelection.identity.scope);
    }
  }, [
    promptText,
    promptExploderSettings,
    runtimeGuardrailIssue,
    runtimeSelection,
    explodeInFlightRef,
    lastExplosionRef,
    setDocumentState,
    setManualBindings,
    setSelectedSegmentId,
    toast,
  ]);
