import type {
  PortablePathEnvelopeSignatureVerificationMode,
  PortablePathFingerprintVerificationMode,
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
} from './portable-engine-resolution-types';

export type PortablePathSigningPolicyUsageEvent = {
  at: string;
  profile: PortablePathSigningPolicyProfile;
  surface: PortablePathSigningPolicySurface;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
};

export type PortablePathSigningPolicyUsageByProfile = {
  uses: number;
  bySurface: Record<PortablePathSigningPolicySurface, number>;
  fingerprintModeCounts: Record<PortablePathFingerprintVerificationMode, number>;
  envelopeModeCounts: Record<PortablePathEnvelopeSignatureVerificationMode, number>;
  lastUsedAt: string | null;
  lastSurface: PortablePathSigningPolicySurface | null;
};

export type PortablePathSigningPolicyUsageSnapshot = {
  totals: {
    uses: number;
  };
  byProfile: Record<PortablePathSigningPolicyProfile, PortablePathSigningPolicyUsageByProfile>;
  bySurface: Record<PortablePathSigningPolicySurface, number>;
  recentEvents: PortablePathSigningPolicyUsageEvent[];
};

export type PortablePathSigningPolicyUsageHook = (
  event: PortablePathSigningPolicyUsageEvent,
  snapshot: PortablePathSigningPolicyUsageSnapshot
) => void;

const MAX_PORTABLE_PATH_SIGNING_POLICY_USAGE_EVENTS = 100;

const createEmptyPortablePathSigningPolicySurfaceCounts = (): Record<
  PortablePathSigningPolicySurface,
  number
> => ({
  canvas: 0,
  product: 0,
  api: 0,
});

const createEmptyPortablePathFingerprintVerificationModeCounts = (): Record<
  PortablePathFingerprintVerificationMode,
  number
> => ({
  off: 0,
  warn: 0,
  strict: 0,
});

const createEmptyPortablePathEnvelopeSignatureVerificationModeCounts = (): Record<
  PortablePathEnvelopeSignatureVerificationMode,
  number
> => ({
  off: 0,
  warn: 0,
  strict: 0,
});

const createEmptyPortablePathSigningPolicyByProfile = (): Record<
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicyUsageByProfile
> => ({
  dev: {
    uses: 0,
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    fingerprintModeCounts: createEmptyPortablePathFingerprintVerificationModeCounts(),
    envelopeModeCounts: createEmptyPortablePathEnvelopeSignatureVerificationModeCounts(),
    lastUsedAt: null,
    lastSurface: null,
  },
  staging: {
    uses: 0,
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    fingerprintModeCounts: createEmptyPortablePathFingerprintVerificationModeCounts(),
    envelopeModeCounts: createEmptyPortablePathEnvelopeSignatureVerificationModeCounts(),
    lastUsedAt: null,
    lastSurface: null,
  },
  prod: {
    uses: 0,
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    fingerprintModeCounts: createEmptyPortablePathFingerprintVerificationModeCounts(),
    envelopeModeCounts: createEmptyPortablePathEnvelopeSignatureVerificationModeCounts(),
    lastUsedAt: null,
    lastSurface: null,
  },
});

const createEmptyPortablePathSigningPolicyUsageState =
  (): PortablePathSigningPolicyUsageSnapshot => ({
    totals: {
      uses: 0,
    },
    byProfile: createEmptyPortablePathSigningPolicyByProfile(),
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    recentEvents: [],
  });

let portablePathSigningPolicyUsageState = createEmptyPortablePathSigningPolicyUsageState();
const portablePathSigningPolicyUsageHooks = new Set<PortablePathSigningPolicyUsageHook>();

const clonePortablePathSigningPolicyUsageSnapshot = (
  snapshot: PortablePathSigningPolicyUsageSnapshot
): PortablePathSigningPolicyUsageSnapshot => ({
  totals: { ...snapshot.totals },
  byProfile: {
    dev: {
      ...snapshot.byProfile.dev,
      bySurface: { ...snapshot.byProfile.dev.bySurface },
      fingerprintModeCounts: { ...snapshot.byProfile.dev.fingerprintModeCounts },
      envelopeModeCounts: { ...snapshot.byProfile.dev.envelopeModeCounts },
    },
    staging: {
      ...snapshot.byProfile.staging,
      bySurface: { ...snapshot.byProfile.staging.bySurface },
      fingerprintModeCounts: { ...snapshot.byProfile.staging.fingerprintModeCounts },
      envelopeModeCounts: { ...snapshot.byProfile.staging.envelopeModeCounts },
    },
    prod: {
      ...snapshot.byProfile.prod,
      bySurface: { ...snapshot.byProfile.prod.bySurface },
      fingerprintModeCounts: { ...snapshot.byProfile.prod.fingerprintModeCounts },
      envelopeModeCounts: { ...snapshot.byProfile.prod.envelopeModeCounts },
    },
  },
  bySurface: { ...snapshot.bySurface },
  recentEvents: snapshot.recentEvents.map((event) => ({ ...event })),
});

const emitPortablePathSigningPolicyUsageEvent = (
  event: PortablePathSigningPolicyUsageEvent
): void => {
  if (portablePathSigningPolicyUsageHooks.size === 0) return;
  const snapshot = clonePortablePathSigningPolicyUsageSnapshot(portablePathSigningPolicyUsageState);
  for (const hook of portablePathSigningPolicyUsageHooks) {
    try {
      hook(event, snapshot);
    } catch {
      // Observability hooks must not break portable path resolution flow.
    }
  }
};

export const recordPortablePathSigningPolicyUsage = (input: {
  profile: PortablePathSigningPolicyProfile;
  surface: PortablePathSigningPolicySurface;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
}): void => {
  const event: PortablePathSigningPolicyUsageEvent = {
    at: new Date().toISOString(),
    profile: input.profile,
    surface: input.surface,
    fingerprintVerificationMode: input.fingerprintVerificationMode,
    envelopeSignatureVerificationMode: input.envelopeSignatureVerificationMode,
  };
  portablePathSigningPolicyUsageState.totals.uses += 1;
  portablePathSigningPolicyUsageState.bySurface[input.surface] += 1;
  const profileStats = portablePathSigningPolicyUsageState.byProfile[input.profile];
  profileStats.uses += 1;
  profileStats.bySurface[input.surface] += 1;
  profileStats.fingerprintModeCounts[input.fingerprintVerificationMode] += 1;
  profileStats.envelopeModeCounts[input.envelopeSignatureVerificationMode] += 1;
  profileStats.lastUsedAt = event.at;
  profileStats.lastSurface = input.surface;
  portablePathSigningPolicyUsageState.recentEvents.push(event);
  if (portablePathSigningPolicyUsageState.recentEvents.length > MAX_PORTABLE_PATH_SIGNING_POLICY_USAGE_EVENTS) {
    portablePathSigningPolicyUsageState.recentEvents.shift();
  }
  emitPortablePathSigningPolicyUsageEvent(event);
};

export const registerPortablePathSigningPolicyUsageHook = (
  hook: PortablePathSigningPolicyUsageHook
): (() => void) => {
  portablePathSigningPolicyUsageHooks.add(hook);
  return () => {
    portablePathSigningPolicyUsageHooks.delete(hook);
  };
};

export const getPortablePathSigningPolicyUsageSnapshot = (): PortablePathSigningPolicyUsageSnapshot =>
  clonePortablePathSigningPolicyUsageSnapshot(portablePathSigningPolicyUsageState);

export const resetPortablePathSigningPolicyUsageSnapshot = (): void => {
  portablePathSigningPolicyUsageState = createEmptyPortablePathSigningPolicyUsageState();
};
