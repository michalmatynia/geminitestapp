import fs from 'node:fs';
import path from 'node:path';

import { analyzeExternalRuleParity } from './lib/check-external-rule-parity.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const DEFAULT_MANIFEST_PATH = path.join('scripts', 'quality', 'config', 'external-rule-map.json');

const parseRepeatedArgValues = (argv, prefix) => {
  const values = [];
  for (const arg of argv) {
    if (!arg.startsWith(prefix)) continue;
    const rawValue = arg.slice(prefix.length).trim();
    if (rawValue.length === 0) continue;
    for (const part of rawValue.split(',')) {
      const normalized = part.trim();
      if (normalized.length > 0) values.push(normalized);
    }
  }
  return [...new Set(values)];
};

const readManifest = (root = process.cwd(), manifestPath = DEFAULT_MANIFEST_PATH) => {
  const absolutePath = path.join(root, manifestPath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
};

const normalizeForMatch = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const collectSuggestedRuleNames = (manifest, externalFilter) => {
  const normalizedFilter = normalizeForMatch(externalFilter);
  const filterTokens = new Set(normalizedFilter.split(/\s+/).filter((token) => token.length >= 3));
  const suggestions = [];

  for (const rule of manifest.rules ?? []) {
    for (const externalRuleName of rule.externalRuleNames ?? []) {
      const normalizedRuleName = normalizeForMatch(externalRuleName);
      const ruleTokens = new Set(normalizedRuleName.split(/\s+/).filter((token) => token.length >= 3));
      let score = 0;

      if (normalizedRuleName.includes(normalizedFilter) || normalizedFilter.includes(normalizedRuleName)) {
        score += 4;
      }

      for (const token of filterTokens) {
        if (ruleTokens.has(token)) score += 1;
      }

      if (score <= 0) continue;

      suggestions.push({
        externalRuleName,
        score,
      });
    }
  }

  return [...new Map(
    suggestions
      .sort((left, right) =>
        right.score - left.score || left.externalRuleName.localeCompare(right.externalRuleName)
      )
      .slice(0, 5)
      .map((entry) => [entry.externalRuleName, entry])
  ).values()].map((entry) => entry.externalRuleName);
};

const resolveNormalizedRuleFilters = ({
  manifest,
  normalizedRuleFilters,
  externalRuleFilters,
}) => {
  const resolved = new Set(normalizedRuleFilters);
  const unmatchedExternalFilters = [];

  for (const externalFilter of externalRuleFilters) {
    const normalizedExternalFilter = externalFilter.toLowerCase();
    const matchingRules = (manifest.rules ?? []).filter((rule) =>
      (rule.externalRuleNames ?? []).some((ruleName) =>
        ruleName.toLowerCase().includes(normalizedExternalFilter)
      )
    );

    if (matchingRules.length === 0) {
      unmatchedExternalFilters.push({
        filter: externalFilter,
        suggestions: collectSuggestedRuleNames(manifest, externalFilter),
      });
      continue;
    }

    for (const rule of matchingRules) {
      resolved.add(rule.normalizedRuleId);
    }
  }

  return {
    rules: [...resolved],
    unmatchedExternalFilters,
  };
};

const filterCatalogRules = ({
  manifest,
  normalizedRuleFilters,
  externalRuleFilters,
  catalogStatusFilters,
}) => {
  const normalizedCatalogStatuses = new Set(catalogStatusFilters);

  return [...(manifest.rules ?? [])]
    .filter((rule) => {
      if (
        normalizedCatalogStatuses.size > 0 &&
        !normalizedCatalogStatuses.has(rule.status)
      ) {
        return false;
      }
      if (
        normalizedRuleFilters.length > 0 &&
        !normalizedRuleFilters.includes(rule.normalizedRuleId)
      ) {
        return false;
      }
      if (
        externalRuleFilters.length > 0 &&
        !(rule.externalRuleNames ?? []).some((ruleName) =>
          externalRuleFilters.some((filterValue) =>
            ruleName.toLowerCase().includes(filterValue.toLowerCase())
          )
        )
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => left.normalizedRuleId.localeCompare(right.normalizedRuleId));
};

const renderHelpText = () =>
  [
    'External Rule Parity',
    '',
    'Usage:',
    '  node scripts/quality/check-external-rule-parity.mjs [options]',
    '',
    'Options:',
    '  --rule=<normalized-rule-id>[,<id>...]     Limit report to selected normalized rule ids.',
    '  --external-rule=<name-fragment>[,...]     Resolve external rule names to local normalized rule ids.',
    '  --path=<substring>[,<substring>...]       Limit scan/report to files containing the given path fragment.',
    '  --severity=<error|warn|info>[,...]        Limit report to selected severities.',
    '  --catalog-status=<implemented|eslint|waived>[,...]  Filter `--list-rules` output by manifest status.',
    '  --list-rules                              Print the normalized rule catalog from the manifest and exit.',
    '  --summary-json                            Emit scan output as a structured JSON envelope.',
    '  --strict                                  Exit non-zero when errors are present.',
    '  --fail-on-warnings                        With --strict, also fail on warnings.',
    '  --no-write                                Do not write docs/metrics artifacts.',
    '  --write-history                           Write timestamped history artifacts in addition to latest.',
    '  --help                                    Show this help text and exit.',
    '',
    'Examples:',
    '  npm run check:external-rule-parity',
    '  npm run check:external-rule-parity -- --external-rule="Open Redirect"',
    '  npm run check:external-rule-parity -- --list-rules --catalog-status=implemented',
    '  npm run check:external-rule-parity -- --rule=no-atomic-updates --path=src/app/api/image-studio --severity=warn',
    '  npm run check:external-rule-parity -- --list-rules',
    '',
  ].join('\n');

const renderRuleCatalog = ({ rules, catalogStatusFilters }) => {
  const lines = [];
  lines.push('External Rule Parity Rule Catalog');
  lines.push('');
  if (catalogStatusFilters.length > 0) {
    lines.push(`Catalog status filters: ${catalogStatusFilters.join(', ')}`);
    lines.push('');
  }
  lines.push('| Normalized Rule | Status | Severity | Owner | Source Rule | External Rule Names |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const rule of rules) {
    lines.push(
      `| ${rule.normalizedRuleId} | ${rule.status} | ${rule.severity ?? '-'} | ${rule.ownerScanner ?? '-'} | ${rule.sourceScannerRuleId ?? '-'} | ${(rule.externalRuleNames ?? []).join('<br/>') || '-'} |`
    );
  }
  lines.push('');
  lines.push('Use `--rule=<normalized-rule-id>` or `--external-rule=<name-fragment>` to filter to one or more entries above.');
  lines.push('');
  return lines.join('\n');
};

const argv = process.argv.slice(2);
const ruleFilters = parseRepeatedArgValues(argv, '--rule=');
const externalRuleFilters = parseRepeatedArgValues(argv, '--external-rule=');
const pathFilters = parseRepeatedArgValues(argv, '--path=');
const severityFilters = parseRepeatedArgValues(argv, '--severity=');
const catalogStatusFilters = parseRepeatedArgValues(argv, '--catalog-status=');

if (argv.includes('--help')) {
  process.stdout.write(renderHelpText());
  process.exit(0);
}

if (argv.includes('--list-rules')) {
  const manifest = readManifest();
  const catalogRules = filterCatalogRules({
    manifest,
    normalizedRuleFilters: ruleFilters,
    externalRuleFilters,
    catalogStatusFilters,
  });
  process.stdout.write(
    renderRuleCatalog({
      rules: catalogRules,
      catalogStatusFilters,
    })
  );
  process.exit(0);
}

const manifest = readManifest();
const resolvedRuleFilters = resolveNormalizedRuleFilters({
  manifest,
  normalizedRuleFilters: ruleFilters,
  externalRuleFilters,
});

if (resolvedRuleFilters.unmatchedExternalFilters.length > 0) {
  const lines = ['Unmatched external rule filters:'];
  for (const unmatched of resolvedRuleFilters.unmatchedExternalFilters) {
    lines.push(`- ${unmatched.filter}`);
    if (unmatched.suggestions.length > 0) {
      lines.push(`  Suggestions: ${unmatched.suggestions.join(' | ')}`);
    }
  }
  lines.push('');
  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(1);
}

if (resolvedRuleFilters.rules.length > 0) {
  process.env.EXTERNAL_RULE_PARITY_RULES = resolvedRuleFilters.rules.join(',');
}
if (externalRuleFilters.length > 0) {
  process.env.EXTERNAL_RULE_PARITY_EXTERNAL_RULES = externalRuleFilters.join(',');
}
if (pathFilters.length > 0) {
  process.env.EXTERNAL_RULE_PARITY_PATHS = pathFilters.join(',');
}
if (severityFilters.length > 0) {
  process.env.EXTERNAL_RULE_PARITY_SEVERITIES = severityFilters.join(',');
}

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# External Rule Parity');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Normalized rules: ${payload.summary.normalizedRuleCount}`);
  lines.push(`- External rule names: ${payload.summary.externalRuleCount}`);
  lines.push(`- Unique external rule names: ${payload.summary.uniqueExternalRuleNameCount}`);
  lines.push(`- Duplicate external rule names: ${payload.summary.duplicateExternalRuleNameCount}`);
  lines.push(`- Implemented rules: ${payload.summary.implementedRuleCount}`);
  lines.push(`- Wired implemented rules: ${payload.summary.wiredImplementedRuleCount}`);
  lines.push(`- Waived rules: ${payload.summary.waivedRuleCount}`);
  lines.push(`- ESLint-native parity rules: ${payload.summary.eslintRuleCount}`);
  lines.push(`- Covered ESLint-native parity rules: ${payload.summary.coveredEslintRuleCount}`);
  lines.push(`- Pending ESLint-native parity rules: ${payload.summary.pendingEslintRuleCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- Info: ${payload.summary.infoCount}`);
  if ((payload.filters?.rules?.length ?? 0) > 0) {
    lines.push(`- Rule filters: ${(payload.filters.rules ?? []).join(', ')}`);
  }
  if ((payload.filters?.externalRules?.length ?? 0) > 0) {
    lines.push(`- External rule filters: ${(payload.filters.externalRules ?? []).join(', ')}`);
  }
  if ((payload.filters?.paths?.length ?? 0) > 0) {
    lines.push(`- Path filters: ${(payload.filters.paths ?? []).join(', ')}`);
  }
  if ((payload.filters?.severities?.length ?? 0) > 0) {
    lines.push(`- Severity filters: ${(payload.filters.severities ?? []).join(', ')}`);
  }
  lines.push('');
  lines.push('## Manifest Status Counts');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('| --- | ---: |');
  for (const [status, count] of Object.entries(payload.manifest.statusCounts ?? {})) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push('');
  lines.push('## Analyzer Coverage');
  lines.push('');
  lines.push('| Scanner | Files | Upstream Issues | Translated Issues |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const analyzer of payload.analyzers ?? []) {
    lines.push(
      `| ${analyzer.scannerId} | ${analyzer.fileCount} | ${analyzer.upstreamIssueCount} | ${analyzer.translatedIssueCount} |`
    );
  }
  lines.push('');

  if ((payload.implementedCoverage?.unwiredRules?.length ?? 0) > 0) {
    lines.push('## Unwired Implemented Rules');
    lines.push('');
    lines.push('| Rule | Scanner | Source Rule | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const rule of payload.implementedCoverage.unwiredRules) {
      lines.push(
        `| ${rule.normalizedRuleId} | ${rule.ownerScanner ?? '-'} | ${rule.sourceScannerRuleId ?? '-'} | ${rule.reason} |`
      );
    }
    lines.push('');
  }

  if ((payload.eslintCoverage?.rules?.length ?? 0) > 0) {
    lines.push('## ESLint Parity Coverage');
    lines.push('');
    lines.push('| Normalized Rule | Source Rule | Local Status | Local Rule | Rationale |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const rule of payload.eslintCoverage.rules) {
      lines.push(
        `| ${rule.normalizedRuleId} | ${rule.sourceRuleId ?? '-'} | ${rule.localStatus} | ${rule.localRuleId ?? '-'} | ${rule.rationale ?? '-'} |`
      );
    }
    lines.push('');
  }

  if ((payload.waivedCoverage?.rules?.length ?? 0) > 0) {
    lines.push('## Waived Rules');
    lines.push('');
    lines.push('| Normalized Rule | Severity | External Rule Names | Rationale |');
    lines.push('| --- | --- | --- | --- |');
    for (const rule of payload.waivedCoverage.rules) {
      lines.push(
        `| ${rule.normalizedRuleId} | ${rule.severity ?? '-'} | ${(rule.externalRuleNames ?? []).join('<br/>') || '-'} | ${rule.rationale ?? '-'} |`
      );
    }
    lines.push('');
  }

  if ((payload.externalRuleResolution?.length ?? 0) > 0) {
    lines.push('## External Rule Filter Resolution');
    lines.push('');
    lines.push('| External Filter | Match Count | Matches |');
    lines.push('| --- | ---: | --- |');
    for (const resolution of payload.externalRuleResolution) {
      const matches =
        resolution.matches?.length > 0
          ? resolution.matches
              .map(
                (match) =>
                  `${match.normalizedRuleId} (${match.status}${match.sourceRuleId ? ` / ${match.sourceRuleId}` : ''})`
              )
              .join('<br/>')
          : '-';
      lines.push(`| ${resolution.filter} | ${resolution.matchCount} | ${matches} |`);
    }
    lines.push('');
  }

  lines.push('## Rule Breakdown');
  lines.push('');
  if ((payload.rules?.length ?? 0) === 0) {
    lines.push('No implemented parity issues detected.');
  } else {
    lines.push(...renderRuleTable(payload.rules));
  }
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No implemented parity issues detected.');
  } else {
    const maxIssues = 200;
    const displayIssues = payload.issues.slice(0, maxIssues);
    lines.push(...renderIssueTable(displayIssues));
    if (payload.issues.length > maxIssues) {
      lines.push('');
      lines.push(`> Showing first ${maxIssues} of ${payload.issues.length} issues.`);
    }
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This scanner normalizes external rule names onto the local quality framework.');
  lines.push('- `implemented` rules are translated from existing analyzers and parity detectors.');
  lines.push('- `eslint` entries are reconciled separately against the local ESLint coverage map so pending parity gaps stay visible.');
  lines.push('- Keep ESLint changes narrow. Use this parity lane for the broader external taxonomy.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'external-rule-parity',
  analyze: analyzeExternalRuleParity,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[external-rule-parity] status=${payload.status} normalized=${payload.summary.normalizedRuleCount} external=${payload.summary.externalRuleCount} implemented=${payload.summary.implementedRuleCount} eslintCovered=${payload.summary.coveredEslintRuleCount}/${payload.summary.eslintRuleCount} translated=${payload.summary.total} duration=${formatDuration(payload.durationMs)}`,
    `  filters rules=${payload.filters?.rules?.join('|') || '<none>'} external=${payload.filters?.externalRules?.join('|') || '<none>'} paths=${payload.filters?.paths?.join('|') || '<none>'} severities=${payload.filters?.severities?.join('|') || '<none>'}`,
  ],
});
