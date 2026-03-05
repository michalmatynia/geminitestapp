import fs from 'node:fs';
import path from 'node:path';

type KernelTransitionPhaseStatus = 'planned' | 'in_progress' | 'completed' | 'blocked';
type KernelParityStatus = 'planned' | 'in_progress' | 'parity_verified' | 'rolled_out';
type KernelParityCoverage = 'unit' | 'integration' | 'e2e' | 'manual';

type KernelTransitionReadiness = {
  schemaVersion: string;
  generatedAt: string;
  migrationSchemaVersion: string;
  summary?: {
    goal?: string;
    currentPhase?: string;
    overallStatus?: KernelTransitionPhaseStatus;
  };
  phases?: Array<{
    id?: string;
    title?: string;
    status?: KernelTransitionPhaseStatus;
    dependencies?: string[];
    gates?: string[];
    artifacts?: string[];
  }>;
  featureParityMatrix?: Array<{
    id?: string;
    status?: KernelParityStatus;
    coverage?: KernelParityCoverage;
    requiredInvariants?: string[];
    evidence?: string[];
  }>;
  integrationTouchpoints?: Array<{
    id?: string;
    pages?: string[];
    adapterArtifact?: string;
    flags?: string[];
  }>;
  rollout?: {
    killSwitches?: string[];
    waves?: Array<{
      id?: string;
      order?: number;
      description?: string;
      gateRefs?: string[];
    }>;
  };
  ci?: {
    requiredScripts?: string[];
  };
};

type PackageJson = {
  scripts?: Record<string, string>;
};

const workspaceRoot = process.cwd();
const readinessPath = path.join(workspaceRoot, 'docs/ai-paths/kernel-transition-readiness.json');
const allowedPhaseStatuses = new Set<KernelTransitionPhaseStatus>([
  'planned',
  'in_progress',
  'completed',
  'blocked',
]);
const allowedParityStatuses = new Set<KernelParityStatus>([
  'planned',
  'in_progress',
  'parity_verified',
  'rolled_out',
]);
const allowedCoverage = new Set<KernelParityCoverage>(['unit', 'integration', 'e2e', 'manual']);

const toSafeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

if (!fs.existsSync(readinessPath)) {
  console.error(`Missing readiness contract: ${path.relative(workspaceRoot, readinessPath)}`);
  process.exit(1);
}

let readiness: KernelTransitionReadiness;
try {
  readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8')) as KernelTransitionReadiness;
} catch (error) {
  console.error(
    `Failed to parse readiness contract: ${error instanceof Error ? error.message : 'unknown_error'}`
  );
  process.exit(1);
}

const errors: string[] = [];

if (readiness.schemaVersion !== 'ai-paths.kernel-transition-readiness.v1') {
  errors.push(
    'schemaVersion must be "ai-paths.kernel-transition-readiness.v1".'
  );
}
if (readiness.migrationSchemaVersion !== 'ai-paths.portable-engine.v2') {
  errors.push('migrationSchemaVersion must be "ai-paths.portable-engine.v2".');
}
if (Number.isNaN(Date.parse(readiness.generatedAt))) {
  errors.push('generatedAt must be a valid ISO timestamp.');
}

const phaseRows = Array.isArray(readiness.phases) ? readiness.phases : [];
if (phaseRows.length === 0) {
  errors.push('phases must contain at least one phase.');
}

const phaseIds = new Set<string>();
for (const phase of phaseRows) {
  const id = toSafeString(phase?.id);
  const title = toSafeString(phase?.title);
  const status = phase?.status;
  const gates = Array.isArray(phase?.gates) ? phase.gates.map(toSafeString).filter(Boolean) : [];
  const artifacts = Array.isArray(phase?.artifacts)
    ? phase.artifacts.map(toSafeString).filter(Boolean)
    : [];

  if (!id) {
    errors.push('phase id cannot be empty.');
    continue;
  }
  if (phaseIds.has(id)) {
    errors.push(`duplicate phase id: ${id}`);
  }
  phaseIds.add(id);

  if (!title) {
    errors.push(`phase ${id} title cannot be empty.`);
  }
  if (!status || !allowedPhaseStatuses.has(status)) {
    errors.push(`phase ${id} has invalid status: ${String(status)}.`);
  }
  if (gates.length === 0) {
    errors.push(`phase ${id} must define at least one gate.`);
  }
  if (artifacts.length === 0) {
    errors.push(`phase ${id} must define at least one artifact.`);
  }

  for (const artifactPath of artifacts) {
    const absolute = path.join(workspaceRoot, artifactPath);
    if (!fs.existsSync(absolute)) {
      errors.push(`phase ${id} references missing artifact: ${artifactPath}`);
    }
  }
}

for (const phase of phaseRows) {
  const id = toSafeString(phase?.id);
  const dependencies = Array.isArray(phase?.dependencies)
    ? phase.dependencies.map(toSafeString).filter(Boolean)
    : [];
  for (const dependency of dependencies) {
    if (!phaseIds.has(dependency)) {
      errors.push(`phase ${id} dependency is unknown: ${dependency}`);
    }
    if (dependency === id) {
      errors.push(`phase ${id} cannot depend on itself.`);
    }
  }
}

const parityRows = Array.isArray(readiness.featureParityMatrix) ? readiness.featureParityMatrix : [];
if (parityRows.length === 0) {
  errors.push('featureParityMatrix must contain at least one feature.');
}
const parityIds = new Set<string>();
for (const feature of parityRows) {
  const id = toSafeString(feature?.id);
  const status = feature?.status;
  const coverage = feature?.coverage;
  const requiredInvariants = Array.isArray(feature?.requiredInvariants)
    ? feature.requiredInvariants.map(toSafeString).filter(Boolean)
    : [];
  const evidence = Array.isArray(feature?.evidence)
    ? feature.evidence.map(toSafeString).filter(Boolean)
    : [];

  if (!id) {
    errors.push('featureParityMatrix id cannot be empty.');
    continue;
  }
  if (parityIds.has(id)) {
    errors.push(`duplicate feature parity id: ${id}`);
  }
  parityIds.add(id);

  if (!status || !allowedParityStatuses.has(status)) {
    errors.push(`feature ${id} has invalid status: ${String(status)}.`);
  }
  if (!coverage || !allowedCoverage.has(coverage)) {
    errors.push(`feature ${id} has invalid coverage: ${String(coverage)}.`);
  }
  if (requiredInvariants.length === 0) {
    errors.push(`feature ${id} must define requiredInvariants.`);
  }
  if (evidence.length === 0) {
    errors.push(`feature ${id} must define at least one evidence artifact.`);
  }

  for (const evidencePath of evidence) {
    if (!/^[a-z0-9_\-/]+(\.[a-z0-9]+)?$/i.test(evidencePath)) continue;
    const absolute = path.join(workspaceRoot, evidencePath);
    if (!fs.existsSync(absolute)) {
      errors.push(`feature ${id} references missing evidence: ${evidencePath}`);
    }
  }
}

const touchpoints = Array.isArray(readiness.integrationTouchpoints) ? readiness.integrationTouchpoints : [];
if (touchpoints.length === 0) {
  errors.push('integrationTouchpoints must contain at least one touchpoint.');
}
const touchpointIds = new Set<string>();
for (const touchpoint of touchpoints) {
  const id = toSafeString(touchpoint?.id);
  const pages = Array.isArray(touchpoint?.pages) ? touchpoint.pages.map(toSafeString).filter(Boolean) : [];
  const adapterArtifact = toSafeString(touchpoint?.adapterArtifact);
  const flags = Array.isArray(touchpoint?.flags) ? touchpoint.flags.map(toSafeString).filter(Boolean) : [];

  if (!id) {
    errors.push('integrationTouchpoint id cannot be empty.');
    continue;
  }
  if (touchpointIds.has(id)) {
    errors.push(`duplicate integrationTouchpoint id: ${id}`);
  }
  touchpointIds.add(id);

  if (pages.length === 0) {
    errors.push(`integrationTouchpoint ${id} must include at least one page.`);
  }
  if (!adapterArtifact) {
    errors.push(`integrationTouchpoint ${id} adapterArtifact cannot be empty.`);
  } else if (!fs.existsSync(path.join(workspaceRoot, adapterArtifact))) {
    errors.push(`integrationTouchpoint ${id} adapterArtifact missing: ${adapterArtifact}`);
  }
  if (flags.length === 0) {
    errors.push(`integrationTouchpoint ${id} must include at least one rollout flag.`);
  }
  for (const flag of flags) {
    if (!flag.startsWith('AI_PATHS_') && !flag.startsWith('NEXT_PUBLIC_AI_PATHS_')) {
      errors.push(`integrationTouchpoint ${id} has invalid flag naming: ${flag}`);
    }
  }
}

const rollout = readiness.rollout;
if (!isObjectRecord(rollout)) {
  errors.push('rollout must be an object.');
} else {
  const killSwitches = Array.isArray(rollout.killSwitches)
    ? rollout.killSwitches.map(toSafeString).filter(Boolean)
    : [];
  const waves = Array.isArray(rollout.waves) ? rollout.waves : [];
  if (killSwitches.length === 0) {
    errors.push('rollout.killSwitches must contain at least one flag.');
  }
  const killSwitchSet = new Set<string>();
  for (const flag of killSwitches) {
    if (killSwitchSet.has(flag)) {
      errors.push(`duplicate rollout kill switch: ${flag}`);
    }
    killSwitchSet.add(flag);
    if (!flag.startsWith('AI_PATHS_') && !flag.startsWith('NEXT_PUBLIC_AI_PATHS_')) {
      errors.push(`rollout kill switch has invalid naming: ${flag}`);
    }
  }
  if (waves.length === 0) {
    errors.push('rollout.waves must contain at least one wave.');
  }
  const waveIds = new Set<string>();
  let previousOrder = 0;
  for (const wave of waves) {
    const id = toSafeString(wave?.id);
    const description = toSafeString(wave?.description);
    const order = typeof wave?.order === 'number' ? wave.order : Number.NaN;
    const gateRefs = Array.isArray(wave?.gateRefs) ? wave.gateRefs.map(toSafeString).filter(Boolean) : [];

    if (!id) {
      errors.push('rollout wave id cannot be empty.');
      continue;
    }
    if (waveIds.has(id)) {
      errors.push(`duplicate rollout wave id: ${id}`);
    }
    waveIds.add(id);
    if (!Number.isFinite(order) || order <= 0) {
      errors.push(`rollout wave ${id} has invalid order.`);
    } else if (order < previousOrder) {
      errors.push(`rollout waves must be ordered ascending by order (wave ${id}).`);
    } else {
      previousOrder = order;
    }
    if (!description) {
      errors.push(`rollout wave ${id} description cannot be empty.`);
    }
    if (gateRefs.length === 0) {
      errors.push(`rollout wave ${id} must include gateRefs.`);
    }
    for (const ref of gateRefs) {
      if (!phaseIds.has(ref)) {
        errors.push(`rollout wave ${id} references unknown phase gateRef: ${ref}`);
      }
    }
  }
}

const packageJsonPath = path.join(workspaceRoot, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  errors.push('Missing package.json for script validation.');
} else {
  let packageJson: PackageJson = {};
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
  } catch (error) {
    errors.push(
      `Failed to parse package.json: ${error instanceof Error ? error.message : 'unknown_error'}`
    );
  }
  const scripts = isObjectRecord(packageJson.scripts) ? packageJson.scripts : {};
  const requiredScripts = Array.isArray(readiness.ci?.requiredScripts)
    ? readiness.ci?.requiredScripts.map(toSafeString).filter(Boolean)
    : [];
  if (requiredScripts.length === 0) {
    errors.push('ci.requiredScripts must contain at least one npm script name.');
  }
  for (const scriptName of requiredScripts) {
    if (!scripts[scriptName]) {
      errors.push(`ci.requiredScripts references missing npm script: ${scriptName}`);
    }
  }
}

if (errors.length > 0) {
  console.error(
    `Kernel transition readiness check failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`
  );
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  [
    'Kernel transition readiness contract is valid.',
    `Phases: ${phaseRows.length}.`,
    `Feature parity entries: ${parityRows.length}.`,
    `Touchpoints: ${touchpoints.length}.`,
  ].join(' ')
);
