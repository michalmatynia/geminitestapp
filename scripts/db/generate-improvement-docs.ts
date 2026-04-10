import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeManagedGeneratedDoc } from '../docs/generated-doc-frontmatter.mjs';
import {
  defaultImprovementTrackIds,
  listImprovementTracks,
  type ImprovementPhase,
  type ImprovementTrack,
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
  mode: 'automatic' | 'manual';
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

interface PhaseSnapshot {
  phase: ImprovementPhase;
  status:
    | 'failed'
    | 'blocked'
    | 'passed'
    | 'manual'
    | 'planned'
    | 'not-configured'
    | 'not-selected'
    | 'no-data';
  generatedAt: string | null;
  reportPath: string | null;
  executionMode: 'planned' | 'executed' | null;
  allowWrite: boolean | null;
  stepCount: number;
  automaticStepCount: number;
  manualStepCount: number;
  passedStepCount: number;
  failedStepCount: number;
  blockedStepCount: number;
  plannedStepCount: number;
  outputs: string[];
  steps: StepReport[];
}

interface TrackSummary {
  trackId: string;
  title: string;
  category: ImprovementTrack['docs']['category'];
  defaultSelected: boolean;
  description: string;
  overallStatus: 'failed' | 'blocked' | 'passed' | 'attention' | 'no-data';
  latestGeneratedAt: string | null;
  docDir: string;
  phases: PhaseSnapshot[];
}

const phaseOrder: ImprovementPhase[] = ['audit', 'classify', 'plan', 'dry-run', 'apply'];
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..', '..');

const readJsonIfExists = async <T>(targetPath: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(targetPath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return null;
    }

    throw error;
  }
};

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const toRelativeDocPath = (root: string, absolutePath: string) =>
  path.relative(root, absolutePath).replace(/\\/g, '/');

const fromDocDirectory = (root: string, fromDirectory: string, targetRelativePath: string) => {
  const absoluteTargetPath = path.join(root, targetRelativePath);
  return path.relative(fromDirectory, absoluteTargetPath).replace(/\\/g, '/');
};

const escapeCsv = (value: string | number | boolean | null | undefined) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '""')}"`;
};

const formatList = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const summarizePhaseStatus = (
  report: ImprovementExecutionReport | null,
  track: ImprovementTrack,
): PhaseSnapshot => {
  if (!report) {
    return {
      phase: 'audit',
      status: 'no-data',
      generatedAt: null,
      reportPath: null,
      executionMode: null,
      allowWrite: null,
      stepCount: 0,
      automaticStepCount: 0,
      manualStepCount: 0,
      passedStepCount: 0,
      failedStepCount: 0,
      blockedStepCount: 0,
      plannedStepCount: 0,
      outputs: [],
      steps: [],
    };
  }

  const steps = report.steps.filter((step) => step.trackId === track.id && step.phase === report.phase);
  const selected = report.selectedTrackIds.includes(track.id);
  const outputs = unique(steps.flatMap((step) => step.outputs));
  const base = {
    phase: report.phase,
    generatedAt: report.generatedAt,
    reportPath: report.reportPath,
    executionMode: report.executionMode,
    allowWrite: report.allowWrite,
    stepCount: steps.length,
    automaticStepCount: steps.filter((step) => step.mode === 'automatic').length,
    manualStepCount: steps.filter((step) => step.mode === 'manual').length,
    passedStepCount: steps.filter((step) => step.status === 'passed').length,
    failedStepCount: steps.filter((step) => step.status === 'failed').length,
    blockedStepCount: steps.filter((step) => step.status === 'blocked-by-write-policy').length,
    plannedStepCount: steps.filter((step) => step.status === 'planned').length,
    outputs,
    steps,
  };

  if (!selected && steps.length === 0) {
    return {
      ...base,
      status: 'not-selected',
    };
  }

  if (steps.length === 0) {
    return {
      ...base,
      status: 'not-configured',
    };
  }

  if (base.failedStepCount > 0) {
    return {
      ...base,
      status: 'failed',
    };
  }

  if (base.blockedStepCount > 0) {
    return {
      ...base,
      status: 'blocked',
    };
  }

  if (base.passedStepCount > 0) {
    return {
      ...base,
      status: 'passed',
    };
  }

  if (steps.every((step) => step.status === 'manual')) {
    return {
      ...base,
      status: 'manual',
    };
  }

  return {
    ...base,
    status: 'planned',
  };
};

const buildOverallStatus = (phases: PhaseSnapshot[]): TrackSummary['overallStatus'] => {
  const statuses = phases.map((phase) => phase.status);
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.includes('passed')) return 'passed';
  if (statuses.includes('manual') || statuses.includes('planned') || statuses.includes('not-configured')) {
    return 'attention';
  }
  return 'no-data';
};

const formatTimestamp = (value: string | null) => value ?? 'not available';

const renderTrackMarkdown = (
  root: string,
  docsRoot: string,
  track: ImprovementTrack,
  summary: TrackSummary,
  generatedAt: string,
) => {
  const absoluteTrackDir = path.join(docsRoot, track.id);
  const relatedDocs = track.docs.relatedDocs.map(
    (docPath) => `- [\`${docPath}\`](${fromDocDirectory(root, absoluteTrackDir, docPath)})`
  );
  const generatedArtifacts = track.docs.generatedArtifacts.map(
    (artifactPath) => `- \`${artifactPath}\``
  );

  const phaseRows = summary.phases
    .map(
      (phase) =>
        `| \`${phase.phase}\` | \`${phase.status}\` | ${phase.stepCount} | ${phase.automaticStepCount} | ${phase.manualStepCount} | ${phase.failedStepCount} | ${phase.blockedStepCount} |`
    )
    .join('\n');

  const latestSteps = summary.phases
    .flatMap((phase) => phase.steps.map((step) => ({ phase: phase.phase, step })))
    .map(
      ({ phase, step }) =>
        `| \`${phase}\` | \`${step.status}\` | \`${step.mode}\` | \`${step.id}\` | ${step.script ? `\`${step.script}\`` : 'manual'} |`
    )
    .join('\n');

  return [
    `# ${track.title} Improvement Track`,
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Snapshot',
    '',
    `- Track id: \`${track.id}\``,
    `- Category: \`${track.docs.category}\``,
    `- Included in default read-only bundle: ${track.docs.defaultSelected === false ? 'no' : 'yes'}`,
    `- Overall status: \`${summary.overallStatus}\``,
    `- Latest report timestamp: ${formatTimestamp(summary.latestGeneratedAt)}`,
    '',
    '## Purpose',
    '',
    track.description,
    '',
    '## Commands',
    '',
    formatList(track.docs.commands.map((command) => `\`${command}\``)),
    '',
    '## Generated Artifacts',
    '',
    generatedArtifacts.length > 0 ? generatedArtifacts.join('\n') : '- None',
    '',
    '## Latest Phase Status',
    '',
    '| Phase | Status | Steps | Automatic | Manual | Failed | Blocked |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    phaseRows,
    '',
    '## Latest Steps',
    '',
    latestSteps.length > 0
      ? [
          '| Phase | Status | Mode | Step | Command |',
          '| --- | --- | --- | --- | --- |',
          latestSteps,
        ].join('\n')
      : '- No step data is available for this track yet.',
    '',
    '## Related Docs',
    '',
    relatedDocs.length > 0 ? relatedDocs.join('\n') : '- None',
    '',
    '## Notes',
    '',
    '- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.',
    '- `inventory-latest.csv` is the machine-readable per-step surface for this track.',
  ].join('\n');
};

const renderPortfolioMarkdown = (
  generatedAt: string,
  summaries: TrackSummary[],
  batchReport: ImprovementBatchReport | null,
) => {
  const portfolioRows = summaries
    .map(
      (summary) =>
        `| \`${summary.trackId}\` | \`${summary.category}\` | ${summary.defaultSelected ? 'yes' : 'no'} | \`${summary.overallStatus}\` | ${formatTimestamp(summary.latestGeneratedAt)} | [README](./${summary.trackId}/README.md) | [scan](./${summary.trackId}/scan-latest.md) |`
    )
    .join('\n');

  const batchRows = batchReport
    ? batchReport.phases
        .map(
          (phase) =>
            `| \`${phase.phase}\` | \`${phase.status}\` | ${phase.durationMs} | \`${phase.reportPath}\` |`
        )
        .join('\n')
    : '';

  const applicationTrackIds = listImprovementTracks()
    .filter((track) => ['ui', 'performance', 'quality', 'testing'].includes(track.docs.category))
    .map((track) => track.id);

  return [
    '# Improvement Operations Portfolio',
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Snapshot',
    '',
    `- Total tracks: ${summaries.length}`,
    `- Default read-only tracks: ${summaries.filter((summary) => summary.defaultSelected).length}`,
    `- Tracks with data: ${summaries.filter((summary) => summary.overallStatus !== 'no-data').length}`,
    `- Failed tracks: ${summaries.filter((summary) => summary.overallStatus === 'failed').length}`,
    `- Attention tracks: ${summaries.filter((summary) => summary.overallStatus === 'attention').length}`,
    '',
    '## Canonical Bundles',
    '',
    `- \`npm run improvements:read-only\` -> ${defaultImprovementTrackIds.join(', ')}`,
    `- \`npm run improvements:application\` -> ${applicationTrackIds.join(', ')}`,
    '- `npm run improvements:products` -> products-parameter-integrity, products-category-schema-normalization',
    '- `npm run improvements:refresh-docs` -> regenerate this hub from the latest improvement reports',
    '',
    '## Latest Read-Only Batch',
    '',
    batchReport
      ? [
          `- Generated at: ${batchReport.generatedAt}`,
          `- Selected tracks: ${batchReport.selectedTrackIds.join(', ')}`,
          '',
          '| Phase | Status | Duration (ms) | Report |',
          '| --- | --- | ---: | --- |',
          batchRows,
        ].join('\n')
      : '- No `artifacts/improvements/read-only-batch-report.json` data is available yet.',
    '',
    '## Track Coverage',
    '',
    '| Track | Category | Default | Overall | Latest Report | README | Scan |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    portfolioRows,
    '',
    '## Notes',
    '',
    '- This hub is the canonical improvement-operations surface for broad repo work.',
    '- Legacy single-program surfaces such as `docs/ui-consolidation` remain valid while active, but new improvement tracks should land here.',
    '- `inventory-latest.csv` is the machine-readable portfolio-level inventory.',
  ].join('\n');
};

const writeCsv = async (targetPath: string, header: string[], rows: (string | number | boolean | null)[][]) => {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const content = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  await fs.writeFile(targetPath, `${content}\n`, 'utf8');
};

const writeJson = async (targetPath: string, payload: unknown) => {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const buildImprovementPaths = (root: string) => {
  const artifactsRoot = path.join(root, 'artifacts', 'improvements');
  const docsRoot = path.join(root, 'docs', 'build', 'improvements');
  const reportPathByPhase: Record<ImprovementPhase, string> = {
    audit: path.join(artifactsRoot, 'audit-report.json'),
    classify: path.join(artifactsRoot, 'classify-report.json'),
    plan: path.join(artifactsRoot, 'plan-report.json'),
    'dry-run': path.join(artifactsRoot, 'dry-run-report.json'),
    apply: path.join(artifactsRoot, 'apply-report.json'),
  };

  return {
    artifactsRoot,
    docsRoot,
    reportPathByPhase,
  };
};

export async function refreshImprovementDocs(root: string = repoRoot) {
  const { artifactsRoot, docsRoot, reportPathByPhase } = buildImprovementPaths(root);
  const reports = Object.fromEntries(
    await Promise.all(
      phaseOrder.map(async (phase) => {
        const report = await readJsonIfExists<ImprovementExecutionReport>(reportPathByPhase[phase]);
        return [phase, report];
      })
    )
  ) as Record<ImprovementPhase, ImprovementExecutionReport | null>;
  const batchReport = await readJsonIfExists<ImprovementBatchReport>(
    path.join(artifactsRoot, 'read-only-batch-report.json')
  );
  const generatedAt = new Date().toISOString();

  const trackSummaries: TrackSummary[] = listImprovementTracks().map((track) => {
    const phases = phaseOrder.map((phase) => {
      const report = reports[phase];
      const summary = summarizePhaseStatus(report, track);
      return {
        ...summary,
        phase,
      };
    });

    const latestGeneratedAt = phases
      .filter((phase) => !['not-selected', 'no-data'].includes(phase.status))
      .map((phase) => phase.generatedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

    return {
      trackId: track.id,
      title: track.title,
      category: track.docs.category,
      defaultSelected: track.docs.defaultSelected !== false,
      description: track.description,
      overallStatus: buildOverallStatus(phases),
      latestGeneratedAt,
      docDir: `docs/build/improvements/${track.id}`,
      phases,
    };
  });

  const portfolioJson = {
    schemaVersion: 1,
    generatedAt,
    defaultTrackIds: defaultImprovementTrackIds,
    batchReport,
    tracks: trackSummaries,
  };

  await writeJson(path.join(docsRoot, 'scan-latest.json'), portfolioJson);
  await writeManagedGeneratedDoc({
    root,
    targetPath: path.join(docsRoot, 'scan-latest.md'),
    content: renderPortfolioMarkdown(generatedAt, trackSummaries, batchReport),
    reviewDate: generatedAt.slice(0, 10),
  });
  await writeCsv(
    path.join(docsRoot, 'inventory-latest.csv'),
    [
      'trackId',
      'title',
      'category',
      'defaultSelected',
      'overallStatus',
      'latestGeneratedAt',
      'auditStatus',
      'classifyStatus',
      'planStatus',
      'dryRunStatus',
      'applyStatus',
    ],
    trackSummaries.map((summary) => [
      summary.trackId,
      summary.title,
      summary.category,
      summary.defaultSelected,
      summary.overallStatus,
      summary.latestGeneratedAt,
      summary.phases.find((phase) => phase.phase === 'audit')?.status ?? 'no-data',
      summary.phases.find((phase) => phase.phase === 'classify')?.status ?? 'no-data',
      summary.phases.find((phase) => phase.phase === 'plan')?.status ?? 'no-data',
      summary.phases.find((phase) => phase.phase === 'dry-run')?.status ?? 'no-data',
      summary.phases.find((phase) => phase.phase === 'apply')?.status ?? 'no-data',
    ])
  );

  for (const track of listImprovementTracks()) {
    const summary = trackSummaries.find((item) => item.trackId === track.id);
    if (!summary) continue;

    const trackDir = path.join(docsRoot, track.id);
    await writeJson(path.join(trackDir, 'scan-latest.json'), {
      schemaVersion: 1,
      generatedAt,
      track,
      summary,
    });
    await writeManagedGeneratedDoc({
      root,
      targetPath: path.join(trackDir, 'scan-latest.md'),
      content: renderTrackMarkdown(root, docsRoot, track, summary, generatedAt),
      reviewDate: generatedAt.slice(0, 10),
    });
    await writeCsv(
      path.join(trackDir, 'inventory-latest.csv'),
      [
        'phase',
        'stepId',
        'title',
        'status',
        'mode',
        'writes',
        'script',
        'outputs',
        'reportGeneratedAt',
        'reportPath',
      ],
      summary.phases.flatMap((phase) =>
        phase.steps.map((step) => [
          phase.phase,
          step.id,
          step.title,
          step.status,
          step.mode,
          step.writes,
          step.script ?? '',
          step.outputs.join('|'),
          phase.generatedAt,
          phase.reportPath,
        ])
      )
    );
  }
}

async function main() {
  await refreshImprovementDocs();
  const { docsRoot } = buildImprovementPaths(repoRoot);
  process.stdout.write(`Improvement docs refreshed under ${toRelativeDocPath(repoRoot, docsRoot)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
