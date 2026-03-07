import { recordPortablePathSigningPolicyUsage } from './portable-engine-signing-policy-observability';
import type {
  PortablePathEnvelopeSignatureVerificationMode,
  PortablePathFingerprintVerificationMode,
  PortablePathSigningPolicy,
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
  ResolvePortablePathInputOptions,
} from './portable-engine-resolution-types';

const PORTABLE_PATH_SIGNING_POLICY_BY_PROFILE: Record<
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicy
> = {
  dev: {
    profile: 'dev',
    fingerprintVerificationMode: 'off',
    envelopeSignatureVerificationMode: 'off',
  },
  staging: {
    profile: 'staging',
    fingerprintVerificationMode: 'warn',
    envelopeSignatureVerificationMode: 'warn',
  },
  prod: {
    profile: 'prod',
    fingerprintVerificationMode: 'strict',
    envelopeSignatureVerificationMode: 'strict',
  },
};

export const getPortablePathSigningPolicy = (
  profile: PortablePathSigningPolicyProfile = 'dev'
): PortablePathSigningPolicy => PORTABLE_PATH_SIGNING_POLICY_BY_PROFILE[profile];

export const normalizePortablePathSigningPolicySurface = (
  surface: PortablePathSigningPolicySurface | undefined
): PortablePathSigningPolicySurface => surface ?? 'api';

type ResolvePortablePathVerificationModesOptions = {
  skipUsageTelemetry?: boolean;
};

export const resolvePortablePathVerificationModes = (
  options?: Pick<
    ResolvePortablePathInputOptions,
    | 'signingPolicyProfile'
    | 'signingPolicyTelemetrySurface'
    | 'fingerprintVerificationMode'
    | 'envelopeSignatureVerificationMode'
  >,
  modeOptions?: ResolvePortablePathVerificationModesOptions
): {
  signingPolicy: PortablePathSigningPolicy;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
} => {
  const signingPolicy = getPortablePathSigningPolicy(options?.signingPolicyProfile ?? 'dev');
  const fingerprintVerificationMode =
    options?.fingerprintVerificationMode ?? signingPolicy.fingerprintVerificationMode;
  const envelopeSignatureVerificationMode =
    options?.envelopeSignatureVerificationMode ?? signingPolicy.envelopeSignatureVerificationMode;
  if (!modeOptions?.skipUsageTelemetry) {
    recordPortablePathSigningPolicyUsage({
      profile: signingPolicy.profile,
      surface: normalizePortablePathSigningPolicySurface(options?.signingPolicyTelemetrySurface),
      fingerprintVerificationMode,
      envelopeSignatureVerificationMode,
    });
  }
  return {
    signingPolicy,
    fingerprintVerificationMode,
    envelopeSignatureVerificationMode,
  };
};
