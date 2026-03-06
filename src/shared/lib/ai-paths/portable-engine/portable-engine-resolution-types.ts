import type { PortableNodeCodeObjectHashVerificationMode } from './node-code-objects-v2-manifest';

export type PortablePathFingerprintVerificationMode = 'off' | 'warn' | 'strict';
export type PortablePathEnvelopeSignatureVerificationMode =
  PortablePathFingerprintVerificationMode;
export type PortablePathNodeCodeObjectHashVerificationMode =
  PortableNodeCodeObjectHashVerificationMode;

export const PORTABLE_PATH_SIGNING_POLICY_PROFILES = ['dev', 'staging', 'prod'] as const;
export type PortablePathSigningPolicyProfile =
  (typeof PORTABLE_PATH_SIGNING_POLICY_PROFILES)[number];

export const PORTABLE_PATH_SIGNING_POLICY_SURFACES = ['canvas', 'product', 'api'] as const;
export type PortablePathSigningPolicySurface =
  (typeof PORTABLE_PATH_SIGNING_POLICY_SURFACES)[number];

export type PortablePathSigningPolicy = {
  profile: PortablePathSigningPolicyProfile;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
};

export type PortablePathEnvelopeSignatureKeyResolverContext = {
  phase: 'sync' | 'async';
  mode: PortablePathEnvelopeSignatureVerificationMode;
  algorithm: string;
  keyId: string | null;
};

export type PortablePathEnvelopeSignatureKeyResolver = (
  context: PortablePathEnvelopeSignatureKeyResolverContext
) => string | string[] | null | undefined;

export type PortablePayloadLimits = {
  maxPayloadBytes: number;
  maxNodeCount: number;
  maxEdgeCount: number;
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectKeys: number;
  maxDepth: number;
};

export const DEFAULT_PORTABLE_PAYLOAD_LIMITS: PortablePayloadLimits = {
  maxPayloadBytes: 2_000_000,
  maxNodeCount: 500,
  maxEdgeCount: 2_000,
  maxStringLength: 50_000,
  maxArrayLength: 20_000,
  maxObjectKeys: 20_000,
  maxDepth: 80,
};

export type ResolvePortablePathInputOptions = {
  signingPolicyProfile?: PortablePathSigningPolicyProfile;
  signingPolicyTelemetrySurface?: PortablePathSigningPolicySurface;
  repairIdentities?: boolean;
  includeConnections?: boolean;
  enforcePayloadLimits?: boolean;
  limits?: Partial<PortablePayloadLimits>;
  fingerprintVerificationMode?: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode?: PortablePathEnvelopeSignatureVerificationMode;
  nodeCodeObjectHashVerificationMode?: PortablePathNodeCodeObjectHashVerificationMode;
  envelopeSignatureSecret?: string;
  envelopeSignatureSecretsByKeyId?: Record<string, string>;
  envelopeSignatureFallbackSecrets?: string[];
  envelopeSignatureKeyResolver?: PortablePathEnvelopeSignatureKeyResolver;
};

export type ResolvePortablePathInputInternalOptions = ResolvePortablePathInputOptions & {
  __skipSigningPolicyUsageTelemetry?: boolean;
};
