const formatPercent = (numerator, denominator) => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 'n/a';
  }

  return `${Number(((numerator / denominator) * 100).toFixed(1))}%`;
};

const formatKnownPercent = (value) => (Number.isFinite(value) ? `${Number(value)}%` : null);

export const buildKangurAiTutorBridgeSnapshotLines = (snapshot) => {
  if (!snapshot) {
    return ['- Kangur AI Tutor bridge snapshot unavailable; inspect JSON payload for error details.'];
  }

  const completionRate =
    snapshot.bridgeCompletionRatePercent === null ? 'n/a' : `${snapshot.bridgeCompletionRatePercent}%`;
  const vectorAssistCount =
    (Number.isFinite(snapshot.knowledgeGraphHybridRecallCount)
      ? snapshot.knowledgeGraphHybridRecallCount
      : 0) +
    (Number.isFinite(snapshot.knowledgeGraphVectorOnlyRecallCount)
      ? snapshot.knowledgeGraphVectorOnlyRecallCount
      : 0);
  const graphCoverageRate =
    formatKnownPercent(snapshot.knowledgeGraphCoverageRatePercent) ??
    formatPercent(snapshot.knowledgeGraphAppliedCount, snapshot.messageSucceededCount);
  const vectorAssistRate =
    formatKnownPercent(snapshot.knowledgeGraphVectorAssistRatePercent) ??
    formatPercent(vectorAssistCount, snapshot.knowledgeGraphSemanticCount);

  return [
    `- Range: ${snapshot.range}`,
    `- Overall status: ${snapshot.overallStatus}`,
    `- Tutor replies: ${snapshot.messageSucceededCount}`,
    `- Neo4j-backed replies: ${snapshot.knowledgeGraphAppliedCount}`,
    `- Graph coverage rate: ${graphCoverageRate}`,
    `- Graph mode split: semantic=${snapshot.knowledgeGraphSemanticCount} | website-help=${snapshot.knowledgeGraphWebsiteHelpCount}`,
    `- Recall mix: metadata=${snapshot.knowledgeGraphMetadataOnlyRecallCount} | hybrid=${snapshot.knowledgeGraphHybridRecallCount} | vector-only=${snapshot.knowledgeGraphVectorOnlyRecallCount}`,
    `- Vector assist rate: ${vectorAssistRate} | attempts=${snapshot.knowledgeGraphVectorRecallAttemptedCount}`,
    `- Bridge suggestions: ${snapshot.bridgeSuggestionCount}`,
    `- Direction split: lesson->game=${snapshot.lessonToGameBridgeSuggestionCount} | game->lesson=${snapshot.gameToLessonBridgeSuggestionCount}`,
    `- Bridge CTA clicks: ${snapshot.bridgeQuickActionClickCount}`,
    `- Bridge follow-up opens: ${snapshot.bridgeFollowUpClickCount}`,
    `- Bridge completions: ${snapshot.bridgeFollowUpCompletionCount}`,
    `- Bridge completion rate: ${completionRate} | alert=${snapshot.alertStatus ?? 'n/a'}`,
  ];
};

export const buildKangurKnowledgeGraphStatusLines = (snapshot) => {
  if (!snapshot) {
    return ['- Kangur knowledge graph status unavailable; inspect JSON payload for error details.'];
  }

  if (snapshot.mode === 'disabled') {
    return [
      '- Mode: disabled',
      `- Message: ${snapshot.message}`,
    ];
  }

  if (snapshot.mode === 'error') {
    return [
      '- Mode: error',
      `- Message: ${snapshot.message}`,
    ];
  }

  const vectorIndexSummary = snapshot.vectorIndexPresent
    ? `${snapshot.vectorIndexType ?? 'unknown'} / ${snapshot.vectorIndexState ?? 'unknown'} / dims=${snapshot.vectorIndexDimensions ?? 'n/a'}`
    : 'absent';
  const embeddingModels =
    Array.isArray(snapshot.embeddingModels) && snapshot.embeddingModels.length > 0
      ? snapshot.embeddingModels.join(', ')
      : 'n/a';

  return [
    `- Semantic readiness: ${snapshot.semanticReadiness}`,
    `- Graph present: ${snapshot.present ? 'yes' : 'no'} | locale=${snapshot.locale ?? 'n/a'} | graphKey=${snapshot.graphKey}`,
    `- Synced at: ${snapshot.syncedAt ?? 'n/a'}`,
    `- Live graph: nodes=${snapshot.liveNodeCount} | edges=${snapshot.liveEdgeCount}`,
    `- Synced graph: nodes=${snapshot.syncedNodeCount ?? 'n/a'} | edges=${snapshot.syncedEdgeCount ?? 'n/a'}`,
    `- Canonical integrity: valid=${snapshot.validCanonicalNodeCount ?? 'n/a'} | invalid=${snapshot.invalidCanonicalNodeCount ?? 'n/a'}`,
    `- Semantic coverage: ${formatKnownPercent(snapshot.semanticCoverageRatePercent) ?? 'n/a'} | semantic nodes=${snapshot.semanticNodeCount}`,
    `- Embedding coverage: ${formatKnownPercent(snapshot.embeddingCoverageRatePercent) ?? 'n/a'} | embedding nodes=${snapshot.embeddingNodeCount}`,
    `- Embedding details: dimensions=${snapshot.embeddingDimensions ?? 'n/a'} | models=${embeddingModels}`,
    `- Vector index: ${vectorIndexSummary}`,
  ];
};

export const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) {
    return 'n/a';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
};

export const formatDelta = (deltaMs) => {
  if (!Number.isFinite(deltaMs)) {
    return 'n/a';
  }
  if (deltaMs === 0) {
    return '0ms';
  }
  return `${deltaMs > 0 ? '+' : '-'}${formatDuration(Math.abs(deltaMs))}`;
};

export const toMarkdown = (report, { includeFullLint, includeFullUnit, includeE2E }) => {
  const lines = [];
  const checkMap = new Map(report.checks.map((check) => [check.id, check]));
  const omittedCheckSet = new Set(report.checkSelection?.omittedChecks ?? []);

  lines.push('# Weekly Quality Report');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Node: ${report.nodeVersion}`);
  lines.push('');
  lines.push('## Quality Check Summary');
  lines.push('');
  lines.push(`- Total checks: ${report.summary.totalChecks}`);
  lines.push(`- Executed checks: ${report.summary.executedChecks}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push(`- Timed out: ${report.summary.timedOut}`);
  lines.push(`- Skipped: ${report.summary.skipped}`);
  if (report.summary.selectionSkipped > 0) {
    lines.push(`- Skipped by selection: ${report.summary.selectionSkipped}`);
  }
  if (report.summary.otherSkipped > 0) {
    lines.push(`- Other skipped: ${report.summary.otherSkipped}`);
  }
  if ((report.checkSelection?.onlyChecks.length ?? 0) > 0) {
    lines.push(`- Only checks: ${report.checkSelection.onlyChecks.join(', ')}`);
  }
  if ((report.checkSelection?.skipChecks.length ?? 0) > 0) {
    lines.push(`- Skipped by selection: ${report.checkSelection.skipChecks.join(', ')}`);
  }
  lines.push('');
  lines.push('## Baseline Status');
  lines.push('');
  lines.push(`- Build pass rate: ${report.passRates.build ?? 'n/a'}%`);
  if (report.buildPreflight?.action && report.buildPreflight.action !== 'none') {
    lines.push(
      `- Build preflight: ${report.buildPreflight.action} (${report.buildPreflight.message})`
    );
  }
  lines.push(`- Lint pass rate: ${report.passRates.lint ?? 'n/a'}%`);
  lines.push(`- Lint-domain pass rate: ${report.passRates.lintDomains ?? 'n/a'}%`);
  lines.push(`- Typecheck pass rate: ${report.passRates.typecheck ?? 'n/a'}%`);
  lines.push(`- Critical-flow gate pass rate: ${report.passRates.criticalFlows ?? 'n/a'}%`);
  lines.push(`- Security smoke gate pass rate: ${report.passRates.securitySmoke ?? 'n/a'}%`);
  lines.push(`- Unit-domain gate pass rate: ${report.passRates.unitDomains ?? 'n/a'}%`);
  lines.push(`- Full unit pass rate: ${report.passRates.fullUnit ?? 'n/a'}%`);
  lines.push(`- E2E test pass rate: ${report.passRates.e2e ?? 'n/a'}%`);
  lines.push(`- Duration budget alerts: ${report.durationAlerts.length}`);
  lines.push('');
  if ((report.checkSelection?.omittedChecks.length ?? 0) > 0) {
    lines.push(`Checks omitted by selection: ${report.checkSelection.omittedChecks.join(', ')}.`);
    lines.push('');
  }
  if (!includeFullLint && checkMap.get('lint')?.status === 'skipped' && !omittedCheckSet.has('lint')) {
    lines.push(
      'Full repository lint was skipped in this run. Use `--include-full-lint` to include the broad `eslint src` sweep.'
    );
    lines.push('');
  }
  if (
    !includeFullUnit &&
    checkMap.get('fullUnit')?.status === 'skipped' &&
    !omittedCheckSet.has('fullUnit')
  ) {
    lines.push(
      'Full unit suite was skipped in this run. Use `--include-full-unit` to include full unit coverage in baseline.'
    );
    lines.push('');
  }
  if (!includeE2E && checkMap.get('e2e')?.status === 'skipped' && !omittedCheckSet.has('e2e')) {
    lines.push('E2E tests were skipped in this run. Use `--include-e2e` for full end-to-end baseline.');
    lines.push('');
  }
  lines.push('## Check Details');
  lines.push('');
  lines.push('| Check | Status | Duration | Exit | Command |');
  lines.push('| --- | --- | ---: | ---: | --- |');
  for (const check of report.checks) {
    const exit = check.exitCode === null ? '-' : String(check.exitCode);
    lines.push(
      `| ${check.label} | ${check.status.toUpperCase()} | ${formatDuration(check.durationMs)} | ${exit} | \`${check.command}\` |`
    );
  }
  lines.push('');

  lines.push('## Guardrail Snapshot');
  lines.push('');
  if (report.stabilization) {
    lines.push(
      `- Stabilization aggregate: ${report.stabilization.ok ? 'PASS' : 'FAIL'} (refreshed ${report.stabilization.generatedAt})`
    );
    lines.push(
      `- Canonical stabilization: ${report.stabilization.canonical.status} | runtime files=${report.stabilization.canonical.runtimeFileCount ?? 'n/a'} | docs=${report.stabilization.canonical.docsArtifactCount ?? 'n/a'}`
    );
    lines.push(
      `- AI stabilization: ${report.stabilization.ai.status} | source files=${report.stabilization.ai.sourceFileCount ?? 'n/a'}`
    );
    lines.push(
      `- Observability stabilization: ${report.stabilization.observability.status} | legacyCompatViolations=${report.stabilization.observability.legacyCompatibilityViolations ?? 'n/a'} | runtimeErrors=${report.stabilization.observability.runtimeErrors ?? 'n/a'}`
    );
  } else {
    lines.push(
      `- Stabilization aggregate: unavailable${report.stabilizationError ? ` (${report.stabilizationError})` : ''}`
    );
  }
  lines.push('');

  lines.push('## Trend Snapshot');
  lines.push('');
  if (report.trends.weeklyLane) {
    const trend = report.trends.weeklyLane;
    lines.push(
      `- Weekly lane trend: runs=${trend.runCount}, window=${trend.oldest ?? '-'} -> ${trend.newest ?? '-'}, delta=${trend.totalDurationDeltaMs === null ? 'n/a' : formatDelta(trend.totalDurationDeltaMs)}`
    );
  } else {
    lines.push('- Weekly lane trend: unavailable');
  }
  if (report.trends.unitDomains) {
    const trend = report.trends.unitDomains;
    lines.push(
      `- Unit-domain trend: runs=${trend.runCount}, window=${trend.oldest ?? '-'} -> ${trend.newest ?? '-'}, delta=${trend.totalDurationDeltaMs === null ? 'n/a' : formatDelta(trend.totalDurationDeltaMs)}`
    );
  } else {
    lines.push('- Unit-domain trend: unavailable');
  }
  if (report.trends.lintDomains) {
    const trend = report.trends.lintDomains;
    lines.push(
      `- Lint-domain trend: runs=${trend.runCount}, window=${trend.oldest ?? '-'} -> ${trend.newest ?? '-'}, delta=${trend.totalDurationDeltaMs === null ? 'n/a' : formatDelta(trend.totalDurationDeltaMs)}`
    );
  } else {
    lines.push('- Lint-domain trend: unavailable');
  }
  lines.push('');

  lines.push('## Duration Budget Alerts');
  lines.push('');
  if (report.durationAlerts.length === 0) {
    lines.push('- No duration budget alerts in this run.');
  } else {
    lines.push('| Check | Duration | Budget | Delta |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const alert of report.durationAlerts) {
      const delta = alert.durationMs - alert.budgetMs;
      lines.push(
        `| ${alert.label} | ${formatDuration(alert.durationMs)} | ${formatDuration(alert.budgetMs)} | +${formatDuration(delta)} |`
      );
    }
  }
  lines.push('');
  if (report.propDrilling.summary && report.uiConsolidation.summary) {
    lines.push(
      `- Prop forwarding components: ${Number(report.propDrilling.summary.componentsWithForwarding ?? 0)}`
    );
    lines.push(
      `- Prop-drilling depth >=4 chains: ${Number(report.propDrilling.summary.highPriorityChainCount ?? 0)}`
    );
    lines.push(
      `- UI opportunities: ${Number(report.uiConsolidation.summary.totalOpportunities ?? 0)}`
    );
    lines.push(
      `- UI high-priority opportunities: ${Number(report.uiConsolidation.summary.highPriorityCount ?? 0)}`
    );
    lines.push(
      `- Raw UI clusters: duplicate=${Number(report.uiConsolidation.summary.duplicateNameClusterCount ?? 0)} | signature=${Number(report.uiConsolidation.summary.propSignatureClusterCount ?? 0)} | token=${Number(report.uiConsolidation.summary.tokenSimilarityClusterCount ?? 0)}`
    );
    if (!report.propDrilling.ok || !report.uiConsolidation.ok) {
      lines.push(
        `- Scanner summary recovered from failing command output.${report.propDrilling.error || report.uiConsolidation.error ? ' Inspect JSON payload for failure details.' : ''}`
      );
    }
  } else {
    lines.push('- Scanner summary unavailable; inspect JSON payload for errors.');
  }
  lines.push('');

  lines.push('## Architecture and Performance Snapshot');
  lines.push('');
  if (report.metrics) {
    const largest = report.metrics.source.largestFile;
    lines.push(`- Source files: ${report.metrics.source.totalFiles}`);
    lines.push(`- Source lines: ${report.metrics.source.totalLines}`);
    lines.push(`- API routes: ${report.metrics.api.totalRoutes}`);
    lines.push(`- Cross-feature edge pairs: ${report.metrics.architecture.crossFeatureEdgePairs}`);
    lines.push(`- Shared->features imports: ${report.metrics.imports.sharedToFeaturesTotalImports}`);
    if (largest) {
      lines.push(`- Largest file: \`${largest.path}\` (${largest.lines} LOC)`);
    }
    lines.push(`- use client files: ${report.metrics.source.useClientFiles}`);
    lines.push(`- setInterval occurrences: ${report.metrics.runtime.setIntervalOccurrences}`);
  } else {
    lines.push('- Metrics snapshot unavailable; inspect JSON payload for error details.');
  }
  lines.push('');

  lines.push('## Kangur AI Tutor Bridge Snapshot');
  lines.push('');
  lines.push(...buildKangurAiTutorBridgeSnapshotLines(report.kangurAiTutorBridge?.summary ?? null));
  lines.push('');

  lines.push('## Kangur Knowledge Graph Status');
  lines.push('');
  lines.push(...buildKangurKnowledgeGraphStatusLines(report.kangurKnowledgeGraphStatus?.summary ?? null));
  lines.push('');

  lines.push('## Top 5 Critical User Flows (Priority Order)');
  lines.push('');
  lines.push('| Priority | Flow | KPI | Target | Scope |');
  lines.push('| ---: | --- | --- | --- | --- |');
  report.criticalFlows.forEach((flow, index) => {
    lines.push(
      `| ${index + 1} | ${flow.name} | ${flow.kpi} | ${flow.target} | \`${flow.scope}\` |`
    );
  });
  lines.push('');

  lines.push('## Notes');
  lines.push('');
  lines.push('- Pass rates are calculated from command exit status for this run (pass=100%, fail/timeout=0%).');
  lines.push('- For full runtime/performance tuning, pair this report with profiling and production telemetry.');

  return `${lines.join('\n')}\n`;
};

