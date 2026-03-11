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

const resolvePercentMetric = (directValue, numerator, denominator) => {
  if (Number.isFinite(directValue)) {
    return Number(directValue);
  }

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Number(denominator) <= 0) {
    return null;
  }

  return Number(((Number(numerator) / Number(denominator)) * 100).toFixed(1));
};

export const summarizeKangurAiTutorBridgeSignal = (bridgeSnapshot) => {
  if (!bridgeSnapshot || typeof bridgeSnapshot !== 'object') {
    return null;
  }

  const alertStatus =
    typeof bridgeSnapshot.alertStatus === 'string' ? bridgeSnapshot.alertStatus : null;
  const completionRate =
    Number.isFinite(bridgeSnapshot.bridgeCompletionRatePercent)
      ? Number(bridgeSnapshot.bridgeCompletionRatePercent)
      : null;
  const graphCoverageRate = resolvePercentMetric(
    bridgeSnapshot.knowledgeGraphCoverageRatePercent,
    bridgeSnapshot.knowledgeGraphAppliedCount,
    bridgeSnapshot.messageSucceededCount
  );
  const vectorAssistCount =
    (Number.isFinite(bridgeSnapshot.knowledgeGraphHybridRecallCount)
      ? Number(bridgeSnapshot.knowledgeGraphHybridRecallCount)
      : 0) +
    (Number.isFinite(bridgeSnapshot.knowledgeGraphVectorOnlyRecallCount)
      ? Number(bridgeSnapshot.knowledgeGraphVectorOnlyRecallCount)
      : 0);
  const vectorAssistRate = resolvePercentMetric(
    bridgeSnapshot.knowledgeGraphVectorAssistRatePercent,
    vectorAssistCount,
    bridgeSnapshot.knowledgeGraphSemanticCount
  );

  const suffixParts = [
    graphCoverageRate === null ? null : `graph=${graphCoverageRate}%`,
    vectorAssistRate === null ? null : `vector=${vectorAssistRate}%`,
  ].filter(Boolean);
  const suffix = suffixParts.length > 0 ? ` · ${suffixParts.join(' · ')}` : '';

  if (alertStatus === 'critical') {
    return `bridge funnel critical${completionRate === null ? '' : ` (${completionRate}%)`}${suffix}`;
  }

  if (alertStatus === 'warning') {
    return `bridge funnel degraded${completionRate === null ? '' : ` (${completionRate}%)`}${suffix}`;
  }

  if (alertStatus === 'ok') {
    return `bridge funnel healthy${completionRate === null ? '' : ` (${completionRate}%)`}${suffix}`;
  }

  if (alertStatus === 'insufficient_data') {
    return `bridge funnel insufficient data${suffix}`;
  }

  return null;
};

export const findLatestKangurAiTutorBridgeRun = (runs) => {
  if (!Array.isArray(runs) || runs.length === 0) {
    return null;
  }

  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run = runs[index];
    if (
      run &&
      (run.kangurAiTutorBridge ||
        (typeof run.kangurAiTutorBridgeSummaryText === 'string' &&
          run.kangurAiTutorBridgeSummaryText.trim().length > 0))
    ) {
      return run;
    }
  }

  return null;
};

export const getKangurAiTutorBridgeAgeMs = (runs, signalRunGeneratedAt) => {
  if (!Array.isArray(runs) || runs.length === 0 || typeof signalRunGeneratedAt !== 'string') {
    return null;
  }

  const latestRun = runs[runs.length - 1] ?? null;
  const latestRunMs =
    typeof latestRun?.generatedAt === 'string' ? Date.parse(latestRun.generatedAt) : Number.NaN;
  const signalRunMs = Date.parse(signalRunGeneratedAt);
  if (!Number.isFinite(latestRunMs) || !Number.isFinite(signalRunMs)) {
    return null;
  }

  return Math.max(0, latestRunMs - signalRunMs);
};

export const getKangurAiTutorBridgeAgeRuns = (runs, signalRunGeneratedAt) => {
  if (!Array.isArray(runs) || runs.length === 0 || typeof signalRunGeneratedAt !== 'string') {
    return null;
  }

  const signalIndex = runs.findIndex((run) => run?.generatedAt === signalRunGeneratedAt);
  if (signalIndex === -1) {
    return null;
  }

  return Math.max(0, runs.length - 1 - signalIndex);
};

export const getKangurAiTutorBridgeSignalState = (runs, signalRunGeneratedAt) => {
  if (!Array.isArray(runs) || runs.length === 0) {
    return 'missing';
  }

  if (typeof signalRunGeneratedAt !== 'string' || signalRunGeneratedAt.trim().length === 0) {
    return 'absent';
  }

  const latestRun = runs[runs.length - 1] ?? null;
  if (latestRun?.generatedAt === signalRunGeneratedAt) {
    return 'current';
  }

  return 'stale';
};

export const formatKangurAiTutorBridgeSignalAge = (ageRuns, ageMs) => {
  if (Number.isFinite(ageRuns) && Number(ageRuns) === 0) {
    return '0 runs';
  }

  if (Number.isFinite(ageRuns) && Number.isFinite(ageMs)) {
    const runCount = Number(ageRuns);
    const runLabel = runCount === 1 ? 'run' : 'runs';
    return `${runCount} ${runLabel} / ${formatDuration(Number(ageMs))}`;
  }

  if (Number.isFinite(ageRuns)) {
    const runCount = Number(ageRuns);
    const runLabel = runCount === 1 ? 'run' : 'runs';
    return `${runCount} ${runLabel}`;
  }

  if (Number.isFinite(ageMs)) {
    return formatDuration(Number(ageMs));
  }

  return null;
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
    kangurAiTutorBridge: payload.kangurAiTutorBridge?.summary ?? null,
    kangurAiTutorBridgeSummaryText: summarizeKangurAiTutorBridgeSignal(
      payload.kangurAiTutorBridge?.summary ?? null
    ),
    checks: Object.fromEntries(
      CHECK_IDS.map((checkId) => [checkId, buildCheckSnapshot(checkId, checkMap[checkId])])
    ),
  };
};

export const toWeeklyLaneTrendMarkdown = (payload) => {
  const lines = [];
  const latestRun = payload.runs[payload.runs.length - 1] ?? null;
  const latestBridgeRun = findLatestKangurAiTutorBridgeRun(payload.runs);
  const latestBridgeRunGeneratedAt = latestBridgeRun?.generatedAt ?? null;
  const latestAvailableBridgeState = getKangurAiTutorBridgeSignalState(
    payload.runs,
    latestBridgeRunGeneratedAt
  );
  const latestAvailableBridgeAgeMs = getKangurAiTutorBridgeAgeMs(
    payload.runs,
    latestBridgeRunGeneratedAt
  );
  const latestAvailableBridgeAgeRuns = getKangurAiTutorBridgeAgeRuns(
    payload.runs,
    latestBridgeRunGeneratedAt
  );
  const latestAvailableBridgeAge = formatKangurAiTutorBridgeSignalAge(
    latestAvailableBridgeAgeRuns,
    latestAvailableBridgeAgeMs
  );
  const latestBridgeState = latestRun?.kangurAiTutorBridge
    ? 'current'
    : payload.runs.length > 0
      ? 'absent'
      : 'missing';
  const latestBridgeAlert = latestRun?.kangurAiTutorBridge?.alertStatus ?? null;
  const latestBridgeSignal = latestRun?.kangurAiTutorBridgeSummaryText ?? null;
  const latestAvailableBridgeAlert = latestBridgeRun?.kangurAiTutorBridge?.alertStatus ?? null;
  const latestAvailableBridgeSignal =
    latestBridgeRun?.kangurAiTutorBridgeSummaryText ??
    summarizeKangurAiTutorBridgeSignal(latestBridgeRun?.kangurAiTutorBridge ?? null);
  lines.push('# Weekly Lane Duration Trend');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push(`Runs analyzed: ${payload.summary.runCount}`);
  if (latestBridgeState !== 'missing') {
    lines.push(`Latest Kangur AI Tutor bridge state: ${latestBridgeState}`);
  }
  if (latestBridgeState === 'current' && latestAvailableBridgeAge) {
    lines.push(`Latest Kangur AI Tutor bridge age: ${latestAvailableBridgeAge}`);
  }
  if (typeof latestBridgeAlert === 'string' && latestBridgeAlert.trim().length > 0) {
    lines.push(`Latest Kangur AI Tutor bridge alert: ${latestBridgeAlert}`);
  }
  if (typeof latestBridgeSignal === 'string' && latestBridgeSignal.trim().length > 0) {
    lines.push(`Latest Kangur AI Tutor bridge signal: ${latestBridgeSignal}`);
  }
  if (
    latestBridgeRun &&
    latestRun &&
    latestBridgeRun.generatedAt !== latestRun.generatedAt &&
    (latestAvailableBridgeAlert || latestAvailableBridgeSignal)
  ) {
    lines.push(`Most recent Kangur AI Tutor bridge snapshot: ${latestBridgeRun.generatedAt}`);
    lines.push(`Most recent Kangur AI Tutor bridge state: ${latestAvailableBridgeState}`);
    if (latestAvailableBridgeAge) {
      lines.push(`Most recent Kangur AI Tutor bridge age: ${latestAvailableBridgeAge}`);
    }
    if (
      typeof latestAvailableBridgeAlert === 'string' &&
      latestAvailableBridgeAlert.trim().length > 0
    ) {
      lines.push(`Most recent Kangur AI Tutor bridge alert: ${latestAvailableBridgeAlert}`);
    }
    if (
      typeof latestAvailableBridgeSignal === 'string' &&
      latestAvailableBridgeSignal.trim().length > 0
    ) {
      lines.push(`Most recent Kangur AI Tutor bridge signal: ${latestAvailableBridgeSignal}`);
    }
  }
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

  const includesKangurAiTutorBridge = payload.runs.some((run) => Boolean(run.kangurAiTutorBridge));
  if (includesKangurAiTutorBridge) {
    lines.push('## Kangur AI Tutor Bridge Snapshot');
    lines.push('');
    lines.push(
      '| Run | Suggestions | Completion Rate | Graph Coverage | Vector Assist | Recall Mix | CTA Clicks | Opens | Completions | Alert |'
    );
    lines.push(
      '| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |'
    );
    for (const run of payload.runs) {
      const bridge = run.kangurAiTutorBridge;
      const graphCoverage =
        resolvePercentMetric(
          bridge?.knowledgeGraphCoverageRatePercent,
          bridge?.knowledgeGraphAppliedCount,
          bridge?.messageSucceededCount
        ) ?? '-';
      const vectorAssist =
        resolvePercentMetric(
          bridge?.knowledgeGraphVectorAssistRatePercent,
          (Number.isFinite(bridge?.knowledgeGraphHybridRecallCount)
            ? Number(bridge?.knowledgeGraphHybridRecallCount)
            : 0) +
            (Number.isFinite(bridge?.knowledgeGraphVectorOnlyRecallCount)
              ? Number(bridge?.knowledgeGraphVectorOnlyRecallCount)
              : 0),
          bridge?.knowledgeGraphSemanticCount
        ) ?? '-';
      const recallMix = bridge
        ? [
            `m=${bridge.knowledgeGraphMetadataOnlyRecallCount ?? '-'}`,
            `h=${bridge.knowledgeGraphHybridRecallCount ?? '-'}`,
            `v=${bridge.knowledgeGraphVectorOnlyRecallCount ?? '-'}`,
          ].join(' ')
        : '-';
      lines.push(
        `| ${run.generatedAt} | ${bridge?.bridgeSuggestionCount ?? '-'} | ${bridge?.bridgeCompletionRatePercent ?? '-'} | ${graphCoverage} | ${vectorAssist} | ${recallMix} | ${bridge?.bridgeQuickActionClickCount ?? '-'} | ${bridge?.bridgeFollowUpClickCount ?? '-'} | ${bridge?.bridgeFollowUpCompletionCount ?? '-'} | ${bridge?.alertStatus ?? '-'} |`
      );
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- This trend report summarizes historical `weekly-quality-*.json` runs and prefers `weekly-quality-latest.json` when it contains the richer snapshot for the newest run.');
  lines.push('- Structured gate summaries are preserved for weekly testing, architecture, and observability checks when available.');
  lines.push('- Kangur AI Tutor bridge snapshots are preserved from weekly artifacts when the report includes them.');
  lines.push('- Kangur AI Tutor bridge state is `current` when the newest weekly run carries the signal, `stale` when it is reused from an older weekly artifact, and `absent` when no bridge signal exists yet.');
  lines.push('- Use this to tune per-check timeouts and detect weekly lane runtime drift.');
  return `${lines.join('\n')}\n`;
};
