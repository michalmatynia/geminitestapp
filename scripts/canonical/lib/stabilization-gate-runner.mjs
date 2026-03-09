import process from 'node:process';
import { spawn } from 'node:child_process';

import { buildScanOutput } from '../../architecture/lib/scan-output.mjs';
import { execScanOutput } from '../../architecture/lib/exec-scan-output.mjs';
import { resolveLatestGeneratedAt } from './stabilization-track.mjs';

const NOOP = () => {};

const createLogHelpers = (logger = console, prefix = 'stabilization:check') => {
  if (!logger) {
    return {
      info: NOOP,
      error: NOOP,
      dump: NOOP,
    };
  }

  return {
    info(message) {
      logger.log(`[${prefix}] ${message}`);
    },
    error(message) {
      logger.error(`[${prefix}] ${message}`);
    },
    dump(label, output) {
      const trimmed = output.trim();
      if (trimmed.length === 0) return;
      const writer = typeof logger.log === 'function' ? logger.log.bind(logger) : console.log;
      writer(`\n[${prefix}] ${label} output:\n${trimmed}`);
    },
  };
};

const runCommand = ({
  command,
  args,
  cwd,
  env = process.env,
}) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';

    child.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('close', (code, signal) => {
      resolve({
        command,
        args,
        code: typeof code === 'number' ? code : 1,
        signal,
        output,
      });
    });

    child.on('error', (error) => {
      const stack = error instanceof Error ? error.stack ?? error.message : String(error);
      output += `\n${stack}`;
      resolve({
        command,
        args,
        code: 1,
        signal: null,
        output,
      });
    });
  });

const runTextStep = async ({ label, command, args, cwd, env, logHelpers }) => {
  const result = await runCommand({ command, args, cwd, env });
  if (result.code === 0) {
    logHelpers.info(`${label}: passed`);
  } else {
    logHelpers.error(`${label}: failed`);
    logHelpers.dump(label, result.output);
  }
  return result;
};

const runScanStep = async ({ label, command, args, cwd, env, logHelpers }) => {
  const result = await execScanOutput({
    command,
    commandArgs: args,
    cwd,
    env,
    sourceName: label,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();

  if (result.output && result.exitCode === 0) {
    logHelpers.info(`${label}: passed`);
  } else {
    if (!result.output) {
      logHelpers.error(
        `${label}: failed to parse summary-json (${result.error ?? 'unknown_error'})`
      );
    }
    logHelpers.error(`${label}: failed`);
    logHelpers.dump(label, output);
  }

  return {
    command,
    args,
    code: result.exitCode ?? 1,
    signal: result.signal,
    output,
    parsed: result.output,
  };
};

const runJsonStep = async ({ label, command, args, cwd, env, logHelpers }) => {
  const result = await runCommand({ command, args, cwd, env });
  let parsed = null;
  try {
    parsed = JSON.parse(result.output);
  } catch (error) {
    logHelpers.error(
      `${label}: failed to parse json output (${error instanceof Error ? error.message : 'unknown_error'})`
    );
  }

  if (result.code === 0 && parsed) {
    logHelpers.info(`${label}: passed`);
  } else {
    logHelpers.error(`${label}: failed`);
    logHelpers.dump(label, result.output);
  }

  return {
    ...result,
    parsed,
  };
};

const runCanonicalGate = async ({ cwd, env, logHelpers }) => {
  const result = await runScanStep({
    label: 'canonical sitewide',
    command: 'node',
    args: ['scripts/canonical/check-sitewide.mjs', '--summary-json'],
    cwd,
    env,
    logHelpers,
  });

  return {
    status: result.code === 0 ? 'pass' : 'fail',
    runtimeFileCount: result.parsed?.summary?.runtimeFileCount ?? null,
    docsArtifactCount: result.parsed?.summary?.docsArtifactCount ?? null,
    generatedAt: result.parsed?.generatedAt ?? null,
    ok: result.code === 0,
  };
};

const runAiGate = async ({ cwd, env, logHelpers }) => {
  const canonical = await runScanStep({
    label: 'ai-paths canonical',
    command: 'node',
    args: ['scripts/ai-paths/check-canonical.mjs', '--summary-json', '--no-write', '--no-history'],
    cwd,
    env,
    logHelpers,
  });

  const outcome = {
    status: canonical.code === 0 ? 'pass' : 'fail',
    sourceFileCount: canonical.parsed?.summary?.sourceFileCount ?? null,
    generatedAt: canonical.parsed?.generatedAt ?? null,
    ok: canonical.code === 0,
  };

  if (canonical.code !== 0) {
    return outcome;
  }

  const portableDiff = await runJsonStep({
    label: 'ai-paths portable schema diff',
    command: 'node',
    args: ['--import', 'tsx', 'scripts/ai-paths/check-portable-schema-diff.ts', '--strict', '--json'],
    cwd,
    env,
    logHelpers,
  });
  if (portableDiff.code !== 0) {
    return {
      ...outcome,
      status: 'fail',
      ok: false,
    };
  }

  const textSteps = [
    {
      label: 'ai-paths semantic grammar docs',
      command: 'node',
      args: ['--import', 'tsx', 'scripts/docs/check-ai-paths-semantic-grammar.ts'],
    },
    {
      label: 'ai-paths node code objects',
      command: 'node',
      args: ['--import', 'tsx', 'scripts/docs/check-ai-paths-node-code-objects.ts'],
    },
    {
      label: 'ai-paths node code objects v3',
      command: 'node',
      args: ['--import', 'tsx', 'scripts/docs/check-ai-paths-node-code-objects-v3.ts'],
    },
    {
      label: 'ai-paths node migration docs',
      command: 'node',
      args: ['--import', 'tsx', 'scripts/docs/check-ai-paths-node-migration-docs.ts'],
    },
    {
      label: 'ai-paths node migration parity evidence',
      command: 'npx',
      args: [
        'vitest',
        'run',
        '__tests__/scripts/docs/node-migration-parity-evidence.test.ts',
        '__tests__/scripts/docs/node-migration-rollout-approvals.test.ts',
        '__tests__/scripts/docs/node-migration-rollout-eligibility.test.ts',
      ],
    },
  ];

  for (const step of textSteps) {
    const result = await runTextStep({
      ...step,
      cwd,
      env,
      logHelpers,
    });
    if (result.code !== 0) {
      return {
        ...outcome,
        status: 'fail',
        ok: false,
      };
    }
  }

  const tooltip = await runScanStep({
    label: 'ai-paths tooltip coverage',
    command: 'node',
    args: ['--import', 'tsx', 'scripts/docs/check-ai-paths-tooltip-coverage.ts', '--summary-json'],
    cwd,
    env,
    logHelpers,
  });
  if (tooltip.code !== 0) {
    return {
      ...outcome,
      status: 'fail',
      ok: false,
      generatedAt: resolveLatestGeneratedAt(outcome.generatedAt, tooltip.parsed?.generatedAt ?? null),
    };
  }

  const trailingTextSteps = [
    {
      label: 'ai-paths kernel transition readiness',
      command: 'node',
      args: ['--import', 'tsx', 'scripts/docs/check-ai-paths-kernel-transition-readiness.ts'],
    },
    {
      label: 'ai-paths improvements roadmap',
      command: 'node',
      args: ['--import', 'tsx', 'scripts/docs/check-ai-paths-improvements-roadmap.ts'],
    },
  ];

  for (const step of trailingTextSteps) {
    const result = await runTextStep({
      ...step,
      cwd,
      env,
      logHelpers,
    });
    if (result.code !== 0) {
      return {
        ...outcome,
        status: 'fail',
        ok: false,
        generatedAt: resolveLatestGeneratedAt(outcome.generatedAt, tooltip.parsed?.generatedAt ?? null),
      };
    }
  }

  return {
    ...outcome,
    generatedAt: resolveLatestGeneratedAt(outcome.generatedAt, tooltip.parsed?.generatedAt ?? null),
  };
};

const runObservabilityGate = async ({ cwd, env, logHelpers }) => {
  const result = await runScanStep({
    label: 'observability check',
    command: 'node',
    args: ['scripts/observability/check-observability.mjs', '--mode=check', '--summary-json'],
    cwd,
    env,
    logHelpers,
  });

  return {
    status: result.code === 0 ? 'pass' : 'fail',
    legacyCompatibilityViolations: result.parsed?.summary?.legacyCompatibilityViolations ?? null,
    runtimeErrors: result.parsed?.summary?.runtimeErrors ?? null,
    generatedAt: result.parsed?.generatedAt ?? null,
    ok: result.code === 0,
  };
};

export const runStabilizationGates = async ({
  cwd = process.cwd(),
  env = process.env,
  logger = console,
  prefix = 'stabilization:check',
} = {}) => {
  const logHelpers = createLogHelpers(logger, prefix);

  const canonical = await runCanonicalGate({ cwd, env, logHelpers });
  const ai = canonical.ok
    ? await runAiGate({ cwd, env, logHelpers })
    : {
        status: 'not-run',
        sourceFileCount: null,
        generatedAt: canonical.generatedAt,
        ok: false,
      };
  const observability = canonical.ok && ai.ok
    ? await runObservabilityGate({ cwd, env, logHelpers })
    : {
        status: 'not-run',
        legacyCompatibilityViolations: null,
        runtimeErrors: null,
        generatedAt: resolveLatestGeneratedAt(canonical.generatedAt, ai.generatedAt),
        ok: false,
      };

  const ok = canonical.ok && ai.ok && observability.ok;
  const generatedAt = resolveLatestGeneratedAt(
    canonical.generatedAt,
    ai.generatedAt,
    observability.generatedAt
  );

  return {
    ok,
    generatedAt,
    canonical,
    ai,
    observability,
  };
};

export const buildStabilizationGateSummaryJson = (result) =>
  buildScanOutput({
    scannerName: 'canonical-stabilization-check',
    generatedAt: result.generatedAt,
    status: result.ok ? 'ok' : 'failed',
    summary: {
      canonicalStatus: result.canonical.status,
      canonicalRuntimeFileCount: result.canonical.runtimeFileCount ?? 0,
      canonicalDocsArtifactCount: result.canonical.docsArtifactCount ?? 0,
      aiStatus: result.ai.status,
      aiSourceFileCount: result.ai.sourceFileCount ?? 0,
      observabilityStatus: result.observability.status,
      observabilityLegacyCompatibilityViolations:
        result.observability.legacyCompatibilityViolations ?? 0,
      observabilityRuntimeErrors: result.observability.runtimeErrors ?? 0,
    },
    details: {
      canonical: result.canonical,
      ai: result.ai,
      observability: result.observability,
    },
    paths: null,
    filters: {
      structured: true,
    },
    notes: ['canonical stabilization aggregate check result'],
  });
