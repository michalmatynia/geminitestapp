import 'server-only';

import { evaluateGraphServer } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { createAiPathsRuntimeValidationMiddleware } from '@/shared/lib/ai-paths/core/validation-engine';
import type { EvaluateGraphOptions } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';

import {
  PortablePathValidationError,
  resolvePortablePathInputAsync,
  runPortablePathClient,
  type PortablePathRunOptions,
  type PortablePathRunResult,
  validatePortablePathConfig,
} from './index';
import {
  recordPortablePathRunExecutionAttempt,
  recordPortablePathRunExecutionFailure,
  recordPortablePathRunExecutionSuccess,
} from './portable-engine-observability';

export { runPortablePathClient };
export * from './sinks.server';

const isRuntimeValidationMiddleware = (
  value: unknown
): value is NonNullable<EvaluateGraphOptions['validationMiddleware']> => typeof value === 'function';

export const runPortablePathServer = async (
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
    signingPolicyTelemetrySurface = 'api',
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
  const validationModeForTelemetry = validateBeforeRun ? validationMode : null;
  const telemetrySurface = signingPolicyTelemetrySurface;
  let resolvedSourceForTelemetry: PortablePathRunResult['resolved']['source'] | null = null;
  const getDurationMs = (): number => Date.now() - runStartedAt;
  recordPortablePathRunExecutionAttempt({
    runner: 'server',
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
      runner: 'server',
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
      runner: 'server',
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

  const runtimeValidationMiddlewareOverride: EvaluateGraphOptions['validationMiddleware'] =
    isRuntimeValidationMiddleware(validationMiddleware) ? validationMiddleware : undefined;
  const runtimeValidationMiddleware: EvaluateGraphOptions['validationMiddleware'] =
    runtimeValidationMiddlewareOverride ??
    (runtimeValidationEnabled
      ? createAiPathsRuntimeValidationMiddleware({
        config: runtimeValidationConfig ?? resolved.value.pathConfig.aiPathsValidation ?? null,
        nodes: resolved.value.pathConfig.nodes,
        edges: resolved.value.pathConfig.edges,
      })
      : undefined);

  let runtimeState: PortablePathRunResult['runtimeState'];
  try {
    runtimeState = await evaluateGraphServer({
      nodes: resolved.value.pathConfig.nodes,
      edges: resolved.value.pathConfig.edges,
      ...engineOptions,
      ...(runtimeValidationMiddleware ? { validationMiddleware: runtimeValidationMiddleware } : {}),
      reportAiPathsError: reportAiPathsError ?? (() => {}),
    });
  } catch (error) {
    recordPortablePathRunExecutionFailure({
      runner: 'server',
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
    runner: 'server',
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
