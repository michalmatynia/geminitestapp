import type {
  AiPathsValidationConfig,
  GraphCompileReport,
  PathConfig,
  RunPreflightReport,
} from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import type { CanvasSemanticDocument } from '@/shared/contracts/ai-paths-semantic-grammar';
import type { EvaluateGraphOptions } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import type {
  PathIdentityRepairWarning,
  PathIdentityValidationIssue,
} from '@/shared/lib/ai-paths/core/utils/node-identity';

import type {
  AiPathPortablePackage,
  AiPathPortablePackageEnvelope,
  PortablePathInputSource,
} from './portable-engine-contract';
import type { PortablePathMigrationWarning } from './portable-engine-migration-types';
import type {
  PortablePathEnvelopeSignatureKeyResolver,
  PortablePathEnvelopeSignatureVerificationMode,
  PortablePathFingerprintVerificationMode,
  PortablePathNodeCodeObjectHashVerificationMode,
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
  PortablePayloadLimits,
  ResolvePortablePathInputOptions,
} from './portable-engine-resolution-types';

export type PortablePathValidationMode = 'standard' | 'strict';

export type ResolvedPortablePathInput = {
  source: PortablePathInputSource;
  pathConfig: PathConfig;
  semanticDocument: CanvasSemanticDocument;
  portablePackage: AiPathPortablePackage | null;
  portableEnvelope: AiPathPortablePackageEnvelope | null;
  canonicalPackage: AiPathPortablePackage;
  identityRepaired: boolean;
  identityWarnings: PathIdentityRepairWarning[];
  migrationWarnings: PortablePathMigrationWarning[];
  payloadByteSize: number | null;
};

export type ResolvePortablePathInputResult =
  | { ok: true; value: ResolvedPortablePathInput }
  | { ok: false; error: string };

export type ValidatePortablePathConfigOptions = {
  mode?: PortablePathValidationMode;
  triggerNodeId?: string | null;
};

export type ValidatePortablePathInputOptions = ResolvePortablePathInputOptions &
  ValidatePortablePathConfigOptions;

export type PortablePathValidationReport = {
  ok: boolean;
  mode: PortablePathValidationMode;
  pathConfig: PathConfig;
  identityIssues: PathIdentityValidationIssue[];
  compileReport: GraphCompileReport;
  preflightReport: RunPreflightReport | null;
};

export type ValidatePortablePathInputResult =
  | {
      ok: true;
      value: PortablePathValidationReport & {
        resolved: ResolvedPortablePathInput;
      };
    }
  | { ok: false; error: string };

export type PortablePathRunOptions = Omit<EvaluateGraphOptions, 'reportAiPathsError'> & {
  validateBeforeRun?: boolean;
  validationMode?: PortablePathValidationMode;
  validationTriggerNodeId?: string | null;
  runtimeValidationEnabled?: boolean;
  runtimeValidationConfig?: AiPathsValidationConfig | null;
  signingPolicyProfile?: PortablePathSigningPolicyProfile;
  signingPolicyTelemetrySurface?: PortablePathSigningPolicySurface;
  repairIdentities?: boolean;
  enforcePayloadLimits?: boolean;
  limits?: Partial<PortablePayloadLimits>;
  fingerprintVerificationMode?: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode?: PortablePathEnvelopeSignatureVerificationMode;
  nodeCodeObjectHashVerificationMode?: PortablePathNodeCodeObjectHashVerificationMode;
  envelopeSignatureSecret?: string;
  envelopeSignatureSecretsByKeyId?: Record<string, string>;
  envelopeSignatureFallbackSecrets?: string[];
  envelopeSignatureKeyResolver?: PortablePathEnvelopeSignatureKeyResolver;
  reportAiPathsError?: EvaluateGraphOptions['reportAiPathsError'];
};

export type PortablePathRunResult = {
  resolved: ResolvedPortablePathInput;
  validation: PortablePathValidationReport | null;
  runtimeState: RuntimeState;
};
