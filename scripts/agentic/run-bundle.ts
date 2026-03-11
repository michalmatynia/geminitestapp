import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot, type BazelTarget, type ImpactBundle } from './domain-manifests';
import { loadAgentWorkOrder } from './work-order-execution';
import { buildAgenticBundlePlan } from './bundle-plan';

interface BundleExecutionReport {
  kind: 'agentic-bundle-execution-report';
  generatedAt: string;
  workOrderPath: string;
  bundle: ImpactBundle;
  priority: string;
  targets: Array<{
    target: BazelTarget;
    status: 'passed' | 'failed';
    durationMs: number;
  }>;
}

function parseArguments(argv: readonly string[]): {
  workOrderPath: string;
  bundle: ImpactBundle | null;
  reportDirectory: string;
} {
  let workOrderPath = 'artifacts/agent-work-order.json';
  let bundle: ImpactBundle | null = null;
  let reportDirectory = 'artifacts/agent-bundle-reports';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--work-order') {
      workOrderPath = argv[index + 1] ?? workOrderPath;
      index += 1;
      continue;
    }

    if (argument === '--bundle') {
      bundle = (argv[index + 1] as ImpactBundle | undefined) ?? null;
      index += 1;
      continue;
    }

    if (argument === '--report-dir') {
      reportDirectory = argv[index + 1] ?? reportDirectory;
      index += 1;
    }
  }

  return { workOrderPath, bundle, reportDirectory };
}

function runBazelTarget(target: BazelTarget): Promise<{ target: BazelTarget; status: 'passed' | 'failed'; durationMs: number }> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(npmCommand, ['run', 'bazel', '--', 'run', target], {
      cwd: agenticRepoRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({
        target,
        status: code === 0 ? 'passed' : 'failed',
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

async function main(): Promise<void> {
  const { workOrderPath, bundle, reportDirectory } = parseArguments(process.argv.slice(2));
  if (!bundle) {
    throw new Error('Missing required --bundle argument');
  }

  const workOrder = await loadAgentWorkOrder(workOrderPath);
  const bundlePlan = buildAgenticBundlePlan(workOrder, workOrderPath);
  const bundleEntry = bundlePlan.bundles.find((entry) => entry.bundle === bundle);

  if (!bundleEntry) {
    throw new Error(`Bundle ${bundle} is not present in the work order`);
  }

  const results: BundleExecutionReport['targets'] = [];
  let hasFailure = false;

  for (const target of bundleEntry.targets) {
    process.stdout.write(`Executing bundle ${bundle}: ${target}\n`);
    const result = await runBazelTarget(target);
    results.push(result);
    if (result.status === 'failed') {
      hasFailure = true;
    }
  }

  const report: BundleExecutionReport = {
    kind: 'agentic-bundle-execution-report',
    generatedAt: new Date().toISOString(),
    workOrderPath,
    bundle,
    priority: bundleEntry.priority,
    targets: results,
  };

  const resolvedReportDirectory = path.join(agenticRepoRoot, reportDirectory);
  await fs.mkdir(resolvedReportDirectory, { recursive: true });
  await fs.writeFile(
    path.join(resolvedReportDirectory, `${bundle}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  if (hasFailure) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
