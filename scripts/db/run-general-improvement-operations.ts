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

function parseArguments(argv: readonly string[]): {
  phase: ImprovementPhase;
  execute: boolean;
  allowWrite: boolean;
  trackIds: string[];
  reportPath: string;
} {
  let phase: ImprovementPhase = 'plan';
  let execute = false;
  let allowWrite = false;
  let reportPath = 'artifacts/improvements/plan-report.json';
  const trackIds: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument) continue;

    if (argument === '--phase') {
      const value = argv[index + 1];
      if (
        value === 'audit' ||
        value === 'classify' ||
        value === 'plan' ||
        value === 'dry-run' ||
        value === 'apply'
      ) {
        phase = value;
      }
      index += 1;
      continue;
    }

    if (argument === '--track') {
      const value = argv[index + 1];
      if (value) {
        trackIds.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
      }
      index += 1;
      continue;
    }

    if (argument === '--report') {
      reportPath = argv[index + 1] ?? reportPath;
      index += 1;
      continue;
    }

    if (argument === '--execute') {
      execute = true;
      continue;
    }

    if (argument === '--allow-write') {
      allowWrite = true;
    }
  }

  const defaultReportPaths: Record<ImprovementPhase, string> = {
    audit: 'artifacts/improvements/audit-report.json',
    classify: 'artifacts/improvements/classify-report.json',
    plan: 'artifacts/improvements/plan-report.json',
    'dry-run': 'artifacts/improvements/dry-run-report.json',
    apply: 'artifacts/improvements/apply-report.json',
  };

  return {
    phase,
    execute,
    allowWrite,
    trackIds,
    reportPath:
      reportPath === 'artifacts/improvements/plan-report.json'
        ? defaultReportPaths[phase]
        : reportPath,
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
      env: process.env,
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
