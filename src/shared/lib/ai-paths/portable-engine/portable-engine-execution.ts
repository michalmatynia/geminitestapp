import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';
import type {
  EvaluateGraphOptions,
  RuntimeValidationMiddleware,
} from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import { resolveAiPathsRuntimeValidationMiddleware } from '@/shared/lib/ai-paths/core/validation-engine';
import {
  recordPortablePathRunExecutionAttempt,
  recordPortablePathRunExecutionFailure,
  recordPortablePathRunExecutionSuccess,
} from './portable-engine-run-observability';

import { normalizePortablePathSigningPolicySurface } from './portable-engine-signing-policy';
import { resolvePortablePathInputAsync } from './portable-engine-resolvers';
import {
  PortablePathValidationError,
  validatePortablePathConfig,
} from './portable-engine-validation';
import {
  type PortablePathInputSource,
  type PortablePathRunOptions,
  type PortablePathRunResult,
  type PortablePathValidationMode,
} from './portable-engine-types';

export const runPortablePathClient = async (
  input: unknown,
  options: PortablePathRunOptions = {}
): Promise<PortablePathRunResult> => {
  const {
    validateBeforeRun = true,
    validationMode = 'standard',
    validationTriggerNodeId = null,
    runtimeValidationEnabled = true,
    runtimeValidationConfig,
    validationMiddleware,
    signingPolicyProfile,
    signingPolicyTelemetrySurface = 'canvas',
    repairIdentities = true,
    enforcePayloadLimits = true,
    limits,
    fingerprintVerificationMode,
    envelopeSignatureVerificationMode,
    nodeCodeObjectHashVerificationMode,
    envelopeSignatureSecret,
    envelopeSignatureSecretsByKeyId,
    envelopeSignatureFallbackSecrets,
    envelopeSignatureKeyResolver,
    reportAiPathsError,
    ...engineOptions
  } = options;
  const runStartedAt = Date.now();
  const validationModeForTelemetry: PortablePathValidationMode | null = validateBeforeRun
    ? validationMode
    : null;
  const telemetrySurface = normalizePortablePathSigningPolicySurface(signingPolicyTelemetrySurface);
  let resolvedSourceForTelemetry: PortablePathInputSource | null = null;
  const getDurationMs = (): number => Date.now() - runStartedAt;
  recordPortablePathRunExecutionAttempt({
    runner: 'client',
    surface: telemetrySurface,
  });

  const resolved = await resolvePortablePathInputAsync(input, {
    signingPolicyProfile,
    signingPolicyTelemetrySurface,
    repairIdentities,
    includeConnections: false,
    enforcePayloadLimits,
    limits,
    fingerprintVerificationMode,
    envelopeSignatureVerificationMode,
    nodeCodeObjectHashVerificationMode,
    envelopeSignatureSecret,
    envelopeSignatureSecretsByKeyId,
    envelopeSignatureFallbackSecrets,
    envelopeSignatureKeyResolver,
  });
  if (!resolved.ok) {
    const resolveError = `Invalid AI-Path payload: ${resolved.error}`;
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: telemetrySurface,
      source: null,
      validateBeforeRun,
      validationMode: validationModeForTelemetry,
      durationMs: getDurationMs(),
      failureStage: 'resolve',
      error: resolveError,
    });
    throw new Error(resolveError);
  }
  resolvedSourceForTelemetry = resolved.value.source;

  const validation = validateBeforeRun
    ? validatePortablePathConfig(resolved.value.pathConfig, {
      mode: validationMode,
      triggerNodeId: validationTriggerNodeId,
    })
    : null;
  if (validation && !validation.ok) {
    const validationError = new PortablePathValidationError(validation);
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: telemetrySurface,
      source: resolvedSourceForTelemetry,
      validateBeforeRun,
      validationMode: validationModeForTelemetry,
      durationMs: getDurationMs(),
      failureStage: 'validation',
      error: validationError,
    });
    throw validationError;
  }

  const runtimeValidationMiddleware: EvaluateGraphOptions['validationMiddleware'] =
    resolveAiPathsRuntimeValidationMiddleware({
      validationMiddleware: validationMiddleware as RuntimeValidationMiddleware | null,
      runtimeValidationEnabled: Boolean(runtimeValidationEnabled),
      runtimeValidationConfig: (runtimeValidationConfig ??
        resolved.value.pathConfig.aiPathsValidation ??
        null),
      nodes: resolved.value.pathConfig.nodes,
      edges: resolved.value.pathConfig.edges,
    }) ?? (runtimeValidationEnabled === false ? undefined : (() => null));

  let runtimeState: RuntimeState;
  try {
    runtimeState = await evaluateGraphClient({
      nodes: resolved.value.pathConfig.nodes,
      edges: resolved.value.pathConfig.edges,
      ...engineOptions,
      ...(runtimeValidationMiddleware ? { validationMiddleware: runtimeValidationMiddleware } : {}),
      reportAiPathsError: reportAiPathsError ?? (() => {}),
    });
  } catch (error) {
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: telemetrySurface,
      source: resolvedSourceForTelemetry,
      validateBeforeRun,
      validationMode: validationModeForTelemetry,
      durationMs: getDurationMs(),
      failureStage: 'runtime',
      error,
    });
    throw error;
  }
  recordPortablePathRunExecutionSuccess({
    runner: 'client',
    surface: telemetrySurface,
    source: resolvedSourceForTelemetry,
    validateBeforeRun,
    validationMode: validationModeForTelemetry,
    durationMs: getDurationMs(),
  });

  return {
    resolved: resolved.value,
    validation,
    runtimeState,
  };
};
