export const CHECK_IDS = [
  'build',
  'lint',
  'lintDomains',
  'typecheck',
  'criticalFlows',
  'securitySmoke',
  'unitDomains',
  'fullUnit',
  'e2e',
  'guardrails',
  'uiConsolidation',
  'observability',
];

const STRUCTURED_SUMMARY_CONFIG = Object.freeze({
  criticalFlows: {
    passedKey: 'passedFlows',
    totalKey: 'totalFlows',
    failedKey: 'failedFlows',
  },
  lintDomains: {
    passedKey: 'passedDomains',
    totalKey: 'totalDomains',
    failedKey: 'failedDomains',
    fields: ['timedOutDomains', 'skippedDomains'],
    labels: {
      timedOutDomains: 'timeout',
      skippedDomains: 'skip',
    },
  },
  securitySmoke: {
    passedKey: 'passedSuites',
    totalKey: 'totalSuites',
    failedKey: 'failedSuites',
  },
  unitDomains: {
    passedKey: 'passedDomains',
    totalKey: 'totalDomains',
    failedKey: 'failedDomains',
  },
  e2e: {
    fields: ['exitCode', 'runtimeSource', 'runtimeReused', 'brokerEnabled', 'artifactsRetained'],
    labels: {
      exitCode: 'exit',
      runtimeSource: 'runtime',
      runtimeReused: 'reused',
      brokerEnabled: 'broker',
      artifactsRetained: 'artifacts',
    },
  },
  guardrails: {
    passedKey: 'okMetrics',
    totalKey: 'totalMetrics',
    failedKey: 'failedMetrics',
    fields: ['hardLimitFailures', 'warnMetrics', 'infoMetrics', 'updatedBaseline'],
    labels: {
      hardLimitFailures: 'hard',
      warnMetrics: 'warn',
      infoMetrics: 'info',
      updatedBaseline: 'baseline',
    },
  },
  uiConsolidation: {
    passedKey: 'passedRules',
    totalKey: 'totalRules',
    failedKey: 'failedRules',
    fields: [
      'propForwardingCount',
      'propDepthGte4ChainCount',
      'totalOpportunityCount',
      'highPriorityOpportunityCount',
      'configurationError',
    ],
    labels: {
      propForwardingCount: 'forwarded',
      propDepthGte4ChainCount: 'depth4',
      totalOpportunityCount: 'opps',
      highPriorityOpportunityCount: 'high',
      configurationError: 'config',
    },
  },
  observability: {
    fields: [
      'mode',
      'totalRoutes',
      'uncoveredRoutes',
      'loggerViolations',
      'eventSourceViolations',
      'coreViolations',
      'consoleLogViolations',
      'emptyCatchBlockViolations',
      'legacyCompatibilityViolations',
      'runtimeErrors',
      'logWriteErrors',
    ],
    labels: {
      totalRoutes: 'routes',
      uncoveredRoutes: 'uncovered',
      loggerViolations: 'logger',
      eventSourceViolations: 'event',
      coreViolations: 'core',
      consoleLogViolations: 'console',
      emptyCatchBlockViolations: 'catches',
      legacyCompatibilityViolations: 'legacy',
      runtimeErrors: 'runtime',
      logWriteErrors: 'logWrites',
    },
  },
});

const OMITTED_SUMMARY_KEYS = new Set(['totalDurationMs', 'argumentCount', 'signal']);

const escapeMarkdownTableCell = (value) => String(value).replaceAll('|', '\\|');

const isFiniteNumber = (value) => Number.isFinite(value);

const formatStructuredMetricValue = (value) => {
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }

  if (isFiniteNumber(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
};

const pushStructuredMetric = (tokens, label, value) => {
  const formattedValue = formatStructuredMetricValue(value);
  if (formattedValue === null) {
    return;
  }
  tokens.push(`${label}=${formattedValue}`);
};

export const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const sec = ms / 1000;
  if (sec < 60) {
    return `${sec.toFixed(1)}s`;
  }
  return `${(sec / 60).toFixed(1)}m`;
};

export const summarizeStructuredCheck = (checkId, scanSummary) => {
  const rawSummary = scanSummary?.summary;
  if (!rawSummary || typeof rawSummary !== 'object' || Array.isArray(rawSummary)) {
    return null;
  }

  const config = STRUCTURED_SUMMARY_CONFIG[checkId] ?? null;
  const tokens = [];
  const consumedKeys = new Set();

  if (config?.passedKey && config?.totalKey) {
    const passed = rawSummary[config.passedKey];
    const total = rawSummary[config.totalKey];
    if (isFiniteNumber(passed) && isFiniteNumber(total)) {
      tokens.push(`pass=${passed}/${total}`);
      consumedKeys.add(config.passedKey);
      consumedKeys.add(config.totalKey);
    }

    if (config.failedKey && isFiniteNumber(rawSummary[config.failedKey])) {
      tokens.push(`fail=${rawSummary[config.failedKey]}`);
      consumedKeys.add(config.failedKey);
    }
  }

  const orderedKeys = Array.isArray(config?.fields)
    ? config.fields
    : Object.keys(rawSummary).filter((key) => !OMITTED_SUMMARY_KEYS.has(key));

  for (const key of orderedKeys) {
    if (consumedKeys.has(key) || OMITTED_SUMMARY_KEYS.has(key)) {
      continue;
    }
    pushStructuredMetric(tokens, config?.labels?.[key] ?? key, rawSummary[key]);
  }

  return tokens.length > 0 ? tokens.join(' ') : null;
};

const buildCheckSnapshot = (checkId, check) => {
  if (!check) {
    return null;
  }

  const scanSummary = check.scanSummary ?? null;

  return {
    status: check.status,
    durationMs: check.durationMs,
    exitCode: check.exitCode,
    scanSummary,
    structuredSummaryText: summarizeStructuredCheck(checkId, scanSummary),
  };
};

export const runFromWeeklyReportPayload = (sourceFile, payload) => {
  const generatedAt = payload?.generatedAt;
  if (!generatedAt) {
    return null;
  }

  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  const checkMap = Object.fromEntries(
    checks
      .filter((check) => typeof check?.id === 'string' && check.id.length > 0)
      .map((check) => [check.id, check])
  );

  const totalDurationMs = checks.reduce(
    (acc, check) => acc + (isFiniteNumber(check?.durationMs) ? Number(check.durationMs) : 0),
    0
  );

  return {
    sourceFile,
    generatedAt,
    summary: payload.summary ?? null,
    passRates: payload.passRates ?? null,
    totalDurationMs,
    checks: Object.fromEntries(
      CHECK_IDS.map((checkId) => [checkId, buildCheckSnapshot(checkId, checkMap[checkId])])
    ),
  };
};

export const toWeeklyLaneTrendMarkdown = (payload) => {
  const lines = [];
  lines.push('# Weekly Lane Duration Trend');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push(`Runs analyzed: ${payload.summary.runCount}`);
  lines.push('');
  lines.push('## Run Timeline');
  lines.push('');
  lines.push('| Run | Total Duration | Passed | Failed | Timed out | Skipped |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const run of payload.runs) {
    lines.push(
      `| ${run.generatedAt} | ${formatDuration(run.totalDurationMs)} | ${run.summary?.passed ?? '-'} | ${run.summary?.failed ?? '-'} | ${run.summary?.timedOut ?? '-'} | ${run.summary?.skipped ?? '-'} |`
    );
  }
  lines.push('');

  for (const checkId of CHECK_IDS) {
    const includesStructuredSummary = payload.runs.some((run) =>
      Boolean(run.checks[checkId]?.structuredSummaryText)
    );

    lines.push(`## Check: ${checkId}`);
    lines.push('');
    if (includesStructuredSummary) {
      lines.push('| Run | Status | Duration | Exit | Structured Summary |');
      lines.push('| --- | --- | ---: | ---: | --- |');
    } else {
      lines.push('| Run | Status | Duration | Exit |');
      lines.push('| --- | --- | ---: | ---: |');
    }

    for (const run of payload.runs) {
      const check = run.checks[checkId];
      const baseCells = [
        run.generatedAt,
        (check?.status ?? 'n/a').toUpperCase(),
        formatDuration(check?.durationMs ?? 0),
        check?.exitCode ?? '-',
      ];

      if (includesStructuredSummary) {
        baseCells.push(escapeMarkdownTableCell(check?.structuredSummaryText ?? '-'));
      }

      lines.push(`| ${baseCells.join(' | ')} |`);
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- This trend report summarizes historical `weekly-quality-*.json` runs.');
  lines.push('- Structured gate summaries are preserved for weekly testing, architecture, and observability checks when available.');
  lines.push('- Use this to tune per-check timeouts and detect weekly lane runtime drift.');
  return `${lines.join('\n')}\n`;
};
