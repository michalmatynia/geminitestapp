import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  defaultImprovementTrackIds,
  getImprovementTrack,
  type ImprovementPhase,
  type ImprovementStep,
} from './general-improvement-operations';

type StepStatus =
  | 'planned'
  | 'passed'
  | 'failed'
  | 'manual'
  | 'blocked-by-write-policy';

interface StepReport {
  id: string;
  title: string;
  trackId: string;
  phase: ImprovementPhase;
  mode: ImprovementStep['mode'];
  writes: boolean;
  status: StepStatus;
  script?: string;
  outputs: string[];
  instructions: string[];
  durationMs?: number;
}

interface ImprovementExecutionReport {
  kind: 'general-improvement-report';
  generatedAt: string;
  phase: ImprovementPhase;
  executionMode: 'planned' | 'executed';
  allowWrite: boolean;
  selectedTrackIds: string[];
  reportPath: string;
  steps: StepReport[];
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..', '..');
const DEFAULT_CHILD_MAX_OLD_SPACE_SIZE_MB = 12_288;

function ensureNodeHeapOption(nodeOptions: string | undefined): string {
  const normalized = nodeOptions?.trim();
  if (normalized && /--max-old-space-size(?:=|\s)\d+/u.test(normalized)) {
    return normalized;
  }

  return [normalized, `--max-old-space-size=${DEFAULT_CHILD_MAX_OLD_SPACE_SIZE_MB}`]
    .filter(Boolean)
    .join(' ');
}

const DEFAULT_REPORT_PATH_BY_PHASE: Record<ImprovementPhase, string> = {
  audit: 'artifacts/improvements/audit-report.json',
  classify: 'artifacts/improvements/classify-report.json',
  plan: 'artifacts/improvements/plan-report.json',
  'dry-run': 'artifacts/improvements/dry-run-report.json',
  apply: 'artifacts/improvements/apply-report.json',
};

const parseImprovementPhase = (value: string | undefined): ImprovementPhase | null => {
  if (
    value === 'audit' ||
    value === 'classify' ||
    value === 'plan' ||
    value === 'dry-run' ||
    value === 'apply'
  ) {
    return value;
  }

  return null;
};

const appendTrackIds = (trackIds: string[], value: string | undefined): void => {
  if (!value) {
    return;
  }

  trackIds.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
};

const applyArgument = (
  result: {
    phase: ImprovementPhase;
    execute: boolean;
    allowWrite: boolean;
    trackIds: string[];
    reportPath: string;
  },
  argument: string,
  value: string | undefined
): boolean => {
  switch (argument) {
    case '--phase':
      result.phase = parseImprovementPhase(value) ?? result.phase;
      return true;
    case '--track':
      appendTrackIds(result.trackIds, value);
      return true;
    case '--report':
      result.reportPath = value ?? result.reportPath;
      return true;
    case '--execute':
      result.execute = true;
      return false;
    case '--allow-write':
      result.allowWrite = true;
      return false;
    default:
      return false;
  }
};

function parseArguments(argv: readonly string[]): {
  phase: ImprovementPhase;
  execute: boolean;
  allowWrite: boolean;
  trackIds: string[];
  reportPath: string;
} {
  const result = {
    phase: 'plan' as ImprovementPhase,
    execute: false,
    allowWrite: false,
    trackIds: [] as string[],
    reportPath: 'artifacts/improvements/plan-report.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument) continue;

    if (applyArgument(result, argument, argv[index + 1])) {
      index += 1;
    }
  }

  return {
    phase: result.phase,
    execute: result.execute,
    allowWrite: result.allowWrite,
    trackIds: result.trackIds,
    reportPath:
      result.reportPath === 'artifacts/improvements/plan-report.json'
        ? DEFAULT_REPORT_PATH_BY_PHASE[result.phase]
        : result.reportPath,
  };
}

async function runPackageScript(script: string): Promise<{
  status: StepStatus;
  durationMs: number;
}> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(npmCommand, ['run', script], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: ensureNodeHeapOption(process.env['NODE_OPTIONS']),
      },
    });

    child.on('close', (code) => {
      resolve({
        status: code === 0 ? 'passed' : 'failed',
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

async function writeReport(
  reportPath: string,
  report: ImprovementExecutionReport,
): Promise<void> {
  const resolvedReportPath = path.join(repoRoot, reportPath);
  await fs.mkdir(path.dirname(resolvedReportPath), { recursive: true });
  await fs.writeFile(resolvedReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const { phase, execute, allowWrite, trackIds, reportPath } = parseArguments(
    process.argv.slice(2),
  );
  const selectedTrackIds = trackIds.length > 0 ? trackIds : defaultImprovementTrackIds;
  const selectedTracks = selectedTrackIds.map((trackId) => getImprovementTrack(trackId));
  const unknownTrackIds = selectedTracks
    .map((track, index) => ({ track, trackId: selectedTrackIds[index] }))
    .filter((entry) => !entry.track)
    .map((entry) => entry.trackId);

  if (unknownTrackIds.length > 0) {
    process.stderr.write(`Unknown improvement tracks: ${unknownTrackIds.join(', ')}\n`);
    process.exitCode = 1;
    return;
  }

  const steps = selectedTracks.flatMap((track) =>
    (track?.phases[phase] ?? []).map((step) => ({ trackId: track?.id ?? '', step })),
  );

  const stepReports: StepReport[] = [];
  let hasFailure = false;

  for (const { trackId, step } of steps) {
    const report: StepReport = {
      id: step.id,
      title: step.title,
      trackId,
      phase,
      mode: step.mode,
      writes: step.writes,
      status: 'planned',
      outputs: step.outputs,
      instructions:
        step.body.kind === 'manual' ? step.body.instructions : [],
      script: step.body.kind === 'script' ? step.body.script : undefined,
    };

    if (step.mode === 'manual' || step.body.kind !== 'script') {
      report.status = 'manual';
      stepReports.push(report);
      continue;
    }

    if (!execute) {
      stepReports.push(report);
      continue;
    }

    if (step.writes && !allowWrite) {
      report.status = 'blocked-by-write-policy';
      stepReports.push(report);
      hasFailure = true;
      continue;
    }

    process.stdout.write(`Running ${trackId}:${step.id} via npm run ${step.body.script}\n`);
    const result = await runPackageScript(step.body.script);
    report.status = result.status;
    report.durationMs = result.durationMs;
    stepReports.push(report);

    if (result.status === 'failed') {
      hasFailure = true;
    }
  }

  const executionReport: ImprovementExecutionReport = {
    kind: 'general-improvement-report',
    generatedAt: new Date().toISOString(),
    phase,
    executionMode: execute ? 'executed' : 'planned',
    allowWrite,
    selectedTrackIds,
    reportPath,
    steps: stepReports,
  };

  await writeReport(reportPath, executionReport);
  process.stdout.write(`General improvement report wrote ${reportPath}\n`);

  if (hasFailure) {
    process.exitCode = 1;
  }
}

void main();
