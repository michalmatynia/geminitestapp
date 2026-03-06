import fs from 'node:fs';
import path from 'node:path';

type RoadmapStatus = 'planned' | 'in_progress' | 'completed' | 'blocked';
type Priority = 'p0' | 'p1' | 'p2';

type ImprovementsRoadmap = {
  schemaVersion?: string;
  generatedAt?: string;
  summary?: {
    goal?: string;
    audience?: string;
    currentTrack?: string;
    overallStatus?: RoadmapStatus;
  };
  roadmap?: Array<{
    id?: string;
    title?: string;
    status?: RoadmapStatus;
    window?: {
      from?: string;
      to?: string;
    };
    priorities?: string[];
    gates?: string[];
    artifacts?: string[];
  }>;
  workstreams?: Array<{
    id?: string;
    version?: string;
    priority?: Priority;
    status?: RoadmapStatus;
    dependencies?: string[];
    outcomes?: string[];
    touchpoints?: string[];
  }>;
  firstSprint?: {
    id?: string;
    window?: {
      from?: string;
      to?: string;
    };
    goals?: string[];
    items?: Array<{
      id?: string;
      status?: RoadmapStatus;
      dependencies?: string[];
      artifacts?: string[];
    }>;
  };
  ci?: {
    requiredScripts?: string[];
    plannedAdditions?: string[];
  };
};

type PackageJson = {
  scripts?: Record<string, string>;
};

const workspaceRoot = process.cwd();
const roadmapPath = path.join(workspaceRoot, 'docs/ai-paths/ai-paths-improvements-roadmap.json');
const packageJsonPath = path.join(workspaceRoot, 'package.json');

const allowedStatuses = new Set<RoadmapStatus>(['planned', 'in_progress', 'completed', 'blocked']);
const allowedPriorities = new Set<Priority>(['p0', 'p1', 'p2']);

const toSafeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toSafeStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(toSafeString).filter(Boolean) : [];

const isValidDateOnly = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);
const hasPath = (relativePath: string): boolean => fs.existsSync(path.join(workspaceRoot, relativePath));

if (!fs.existsSync(roadmapPath)) {
  console.error(`Missing roadmap artifact: ${path.relative(workspaceRoot, roadmapPath)}`);
  process.exit(1);
}

if (!fs.existsSync(packageJsonPath)) {
  console.error('Missing package.json');
  process.exit(1);
}

let roadmap: ImprovementsRoadmap;
let packageJson: PackageJson;

try {
  roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8')) as ImprovementsRoadmap;
} catch (error) {
  console.error(
    `Failed to parse roadmap artifact: ${error instanceof Error ? error.message : 'unknown_error'}`
  );
  process.exit(1);
}

try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
} catch (error) {
  console.error(`Failed to parse package.json: ${error instanceof Error ? error.message : 'unknown_error'}`);
  process.exit(1);
}

const errors: string[] = [];

if (roadmap.schemaVersion !== 'ai-paths.improvements-roadmap.v1') {
  errors.push('schemaVersion must be "ai-paths.improvements-roadmap.v1".');
}
if (Number.isNaN(Date.parse(roadmap.generatedAt ?? ''))) {
  errors.push('generatedAt must be a valid ISO timestamp.');
}

const summaryGoal = toSafeString(roadmap.summary?.goal);
const summaryAudience = toSafeString(roadmap.summary?.audience);
const summaryCurrentTrack = toSafeString(roadmap.summary?.currentTrack);
const summaryOverallStatus = roadmap.summary?.overallStatus;

if (!summaryGoal) {
  errors.push('summary.goal must be a non-empty string.');
}
if (!summaryAudience) {
  errors.push('summary.audience must be a non-empty string.');
}
if (!summaryCurrentTrack) {
  errors.push('summary.currentTrack must be a non-empty version id.');
}
if (!summaryOverallStatus || !allowedStatuses.has(summaryOverallStatus)) {
  errors.push(`summary.overallStatus has invalid status: ${String(summaryOverallStatus)}.`);
}

const roadmapRows = Array.isArray(roadmap.roadmap) ? roadmap.roadmap : [];
if (roadmapRows.length === 0) {
  errors.push('roadmap must contain at least one version row.');
}

const roadmapIds = new Set<string>();
for (const row of roadmapRows) {
  const id = toSafeString(row?.id);
  const title = toSafeString(row?.title);
  const status = row?.status;
  const from = toSafeString(row?.window?.from);
  const to = toSafeString(row?.window?.to);
  const priorities = toSafeStringList(row?.priorities);
  const gates = toSafeStringList(row?.gates);
  const artifacts = toSafeStringList(row?.artifacts);

  if (!id) {
    errors.push('roadmap version id cannot be empty.');
    continue;
  }
  if (roadmapIds.has(id)) {
    errors.push(`duplicate roadmap version id: ${id}`);
  }
  roadmapIds.add(id);

  if (!title) {
    errors.push(`roadmap version ${id} title cannot be empty.`);
  }
  if (!status || !allowedStatuses.has(status)) {
    errors.push(`roadmap version ${id} has invalid status: ${String(status)}.`);
  }
  if (!isValidDateOnly(from) || !isValidDateOnly(to)) {
    errors.push(`roadmap version ${id} must use YYYY-MM-DD dates.`);
  }
  if (priorities.length === 0) {
    errors.push(`roadmap version ${id} must define priorities.`);
  }
  if (gates.length === 0) {
    errors.push(`roadmap version ${id} must define gates.`);
  }
  if (artifacts.length === 0) {
    errors.push(`roadmap version ${id} must define artifacts.`);
  }

  for (const artifactPath of artifacts) {
    if (!hasPath(artifactPath)) {
      errors.push(`roadmap version ${id} references missing artifact: ${artifactPath}`);
    }
  }
}

if (summaryCurrentTrack && !roadmapIds.has(summaryCurrentTrack)) {
  errors.push(`summary.currentTrack references unknown roadmap version: ${summaryCurrentTrack}`);
}

const workstreamRows = Array.isArray(roadmap.workstreams) ? roadmap.workstreams : [];
if (workstreamRows.length === 0) {
  errors.push('workstreams must contain at least one workstream.');
}

const workstreamIds = new Set<string>();
for (const row of workstreamRows) {
  const id = toSafeString(row?.id);
  const version = toSafeString(row?.version);
  const priority = row?.priority;
  const status = row?.status;
  const outcomes = toSafeStringList(row?.outcomes);
  const touchpoints = toSafeStringList(row?.touchpoints);

  if (!id) {
    errors.push('workstream id cannot be empty.');
    continue;
  }
  if (workstreamIds.has(id)) {
    errors.push(`duplicate workstream id: ${id}`);
  }
  workstreamIds.add(id);

  if (!version || !roadmapIds.has(version)) {
    errors.push(`workstream ${id} references unknown version: ${version || '(empty)'}`);
  }
  if (!priority || !allowedPriorities.has(priority)) {
    errors.push(`workstream ${id} has invalid priority: ${String(priority)}.`);
  }
  if (!status || !allowedStatuses.has(status)) {
    errors.push(`workstream ${id} has invalid status: ${String(status)}.`);
  }
  if (outcomes.length === 0) {
    errors.push(`workstream ${id} must define outcomes.`);
  }
  if (touchpoints.length === 0) {
    errors.push(`workstream ${id} must define touchpoints.`);
  }

  for (const touchpointPath of touchpoints) {
    if (!hasPath(touchpointPath)) {
      errors.push(`workstream ${id} references missing touchpoint: ${touchpointPath}`);
    }
  }
}

for (const row of workstreamRows) {
  const id = toSafeString(row?.id);
  const dependencies = toSafeStringList(row?.dependencies);
  for (const dependency of dependencies) {
    if (!workstreamIds.has(dependency)) {
      errors.push(`workstream ${id} dependency is unknown: ${dependency}`);
    }
    if (dependency === id) {
      errors.push(`workstream ${id} cannot depend on itself.`);
    }
  }
}

for (const row of roadmapRows) {
  const id = toSafeString(row?.id);
  const priorities = toSafeStringList(row?.priorities);
  for (const priorityWorkstreamId of priorities) {
    if (!workstreamIds.has(priorityWorkstreamId)) {
      errors.push(`roadmap version ${id} priority references unknown workstream: ${priorityWorkstreamId}`);
    }
  }
}

const firstSprint = roadmap.firstSprint;
if (!firstSprint) {
  errors.push('firstSprint must be defined.');
} else {
  const sprintId = toSafeString(firstSprint.id);
  const sprintFrom = toSafeString(firstSprint.window?.from);
  const sprintTo = toSafeString(firstSprint.window?.to);
  const sprintGoals = toSafeStringList(firstSprint.goals);
  const sprintItems = Array.isArray(firstSprint.items) ? firstSprint.items : [];

  if (!sprintId) {
    errors.push('firstSprint.id must be a non-empty string.');
  }
  if (!isValidDateOnly(sprintFrom) || !isValidDateOnly(sprintTo)) {
    errors.push('firstSprint.window must use YYYY-MM-DD dates.');
  }
  if (sprintGoals.length === 0) {
    errors.push('firstSprint.goals must contain at least one goal.');
  }
  if (sprintItems.length === 0) {
    errors.push('firstSprint.items must contain at least one item.');
  }

  const sprintItemIds = new Set<string>();
  for (const item of sprintItems) {
    const itemId = toSafeString(item?.id);
    const itemStatus = item?.status;
    const itemArtifacts = toSafeStringList(item?.artifacts);

    if (!itemId) {
      errors.push('firstSprint item id cannot be empty.');
      continue;
    }
    if (sprintItemIds.has(itemId)) {
      errors.push(`duplicate firstSprint item id: ${itemId}`);
    }
    sprintItemIds.add(itemId);

    if (!itemStatus || !allowedStatuses.has(itemStatus)) {
      errors.push(`firstSprint item ${itemId} has invalid status: ${String(itemStatus)}.`);
    }
    if (itemArtifacts.length === 0) {
      errors.push(`firstSprint item ${itemId} must define artifacts.`);
    }
    for (const artifactPath of itemArtifacts) {
      if (!hasPath(artifactPath)) {
        errors.push(`firstSprint item ${itemId} references missing artifact: ${artifactPath}`);
      }
    }
  }

  for (const item of sprintItems) {
    const itemId = toSafeString(item?.id);
    const dependencies = toSafeStringList(item?.dependencies);
    for (const dependency of dependencies) {
      if (!sprintItemIds.has(dependency)) {
        errors.push(`firstSprint item ${itemId} dependency is unknown: ${dependency}`);
      }
      if (dependency === itemId) {
        errors.push(`firstSprint item ${itemId} cannot depend on itself.`);
      }
    }
  }
}

const requiredScripts = toSafeStringList(roadmap.ci?.requiredScripts);
if (requiredScripts.length === 0) {
  errors.push('ci.requiredScripts must contain at least one script.');
}

const packageScripts = packageJson.scripts ?? {};
for (const scriptName of requiredScripts) {
  if (!packageScripts[scriptName]) {
    errors.push(`ci.requiredScripts references missing package.json script: ${scriptName}`);
  }
}

if (errors.length > 0) {
  console.error('[ai-paths:improvements-roadmap] validation failed');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[ai-paths:improvements-roadmap] validation passed');
