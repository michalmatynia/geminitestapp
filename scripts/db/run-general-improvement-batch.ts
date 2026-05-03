import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  defaultImprovementTrackIds,
  getImprovementTrack,
  type ImprovementPhase,
} from './general-improvement-operations';
import { refreshImprovementDocs } from './generate-improvement-docs';

interface PhaseResult {
  phase: ImprovementPhase;
  status: 'passed' | 'failed';
  durationMs: number;
  reportPath: string;
}

interface ImprovementBatchReport {
  kind: 'general-improvement-batch-report';
  generatedAt: string;
  selectedTrackIds: string[];
  phases: PhaseResult[];
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..', '..');

function parseArguments(argv: readonly string[]): {
  trackIds: string[];
  reportPath: string;
} {
  const trackIds: string[] = [];
  let reportPath = 'artifacts/improvements/read-only-batch-report.json';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument) continue;

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
    }
  }

  return {
    trackIds,
    reportPath,
  };
}

async function runPhase(
  phase: ImprovementPhase,
  trackIds: string[],
): Promise<PhaseResult> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const reportPath = `artifacts/improvements/${phase}-report.json`;
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(
      npmCommand,
      [
        'run',
        `improvements:${phase}`,
        '--',
        '--track',
        trackIds.join(','),
        '--report',
        reportPath,
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        env: process.env,
      },
    );

    child.on('close', (code) => {
      resolve({
        phase,
        status: code === 0 ? 'passed' : 'failed',
        durationMs: Date.now() - startedAt,
        reportPath,
      });
    });
  });
}

async function writeReport(
  reportPath: string,
  report: ImprovementBatchReport,
): Promise<void> {
  const resolvedReportPath = path.join(repoRoot, reportPath);
  await fs.mkdir(path.dirname(resolvedReportPath), { recursive: true });
  await fs.writeFile(resolvedReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const { trackIds, reportPath } = parseArguments(process.argv.slice(2));
  const selectedTrackIds = trackIds.length > 0 ? trackIds : defaultImprovementTrackIds;
  const unknownTrackIds = selectedTrackIds.filter(
    (trackId) => !getImprovementTrack(trackId),
  );

  if (unknownTrackIds.length > 0) {
    process.stderr.write(`Unknown improvement tracks: ${unknownTrackIds.join(', ')}\n`);
    process.exitCode = 1;
    return;
  }

  const phases: ImprovementPhase[] = ['audit', 'classify', 'plan'];
  const phaseResults: PhaseResult[] = [];

  for (const phase of phases) {
    const result = await runPhase(phase, selectedTrackIds);
    phaseResults.push(result);
  }

  const report: ImprovementBatchReport = {
    kind: 'general-improvement-batch-report',
    generatedAt: new Date().toISOString(),
    selectedTrackIds,
    phases: phaseResults,
  };

  await writeReport(reportPath, report);
  await refreshImprovementDocs(repoRoot);
  process.stdout.write(`General improvement batch report wrote ${reportPath}\n`);
  process.stdout.write('Improvement docs refreshed.\n');

  if (phaseResults.some((result) => result.status === 'failed')) {
    process.stdout.write(
      'General improvement batch completed with one or more failed phases. See the batch report for the full cross-phase picture.\n'
    );
    process.exitCode = 1;
  }
}

void main();
