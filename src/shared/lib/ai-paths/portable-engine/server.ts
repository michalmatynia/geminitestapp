import 'server-only';

import { evaluateGraphServer } from '@/shared/lib/ai-paths/core/runtime/engine-server';

import {
  PortablePathValidationError,
  resolvePortablePathInputAsync,
  runPortablePathClient,
  type PortablePathRunOptions,
  type PortablePathRunResult,
  validatePortablePathConfig,
} from './index';

export { runPortablePathClient };
export * from './sinks.server';

export const runPortablePathServer = async (
  input: unknown,
  options: PortablePathRunOptions = {}
): Promise<PortablePathRunResult> => {
  const {
    validateBeforeRun = true,
    validationMode = 'standard',
    validationTriggerNodeId = null,
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
    throw new Error(`Invalid AI-Path payload: ${resolved.error}`);
  }

  const validation = validateBeforeRun
    ? validatePortablePathConfig(resolved.value.pathConfig, {
      mode: validationMode,
      triggerNodeId: validationTriggerNodeId,
    })
    : null;
  if (validation && !validation.ok) {
    throw new PortablePathValidationError(validation);
  }

  const runtimeState = await evaluateGraphServer({
    nodes: resolved.value.pathConfig.nodes,
    edges: resolved.value.pathConfig.edges,
    ...engineOptions,
    reportAiPathsError: reportAiPathsError ?? (() => {}),
  });

  return {
    resolved: resolved.value,
    validation,
    runtimeState,
  };
};
