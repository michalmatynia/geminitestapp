import process from 'node:process';

import { buildScanOutput } from '../architecture/lib/scan-output.mjs';

export const parseCommonCheckArgs = (argv = process.argv.slice(2)) => {
  const args = new Set(argv);
  return {
    strictMode: args.has('--strict'),
    failOnWarnings: args.has('--fail-on-warnings'),
    shouldWriteHistory: !args.has('--ci') && !args.has('--no-history'),
    noWrite: args.has('--no-write'),
    summaryJson: args.has('--summary-json'),
  };
};

export const buildStaticCheckFilters = ({
  strictMode = false,
  failOnWarnings = false,
} = {}) => ({
  strictMode,
  failOnWarnings,
  historyDisabled: true,
  noWrite: true,
});

export const writeSummaryJson = ({
  scannerName,
  scannerVersion = '1.0.0',
  generatedAt,
  status = 'ok',
  summary,
  details = null,
  paths = null,
  filters = null,
  notes = [],
}) => {
  const payload = buildScanOutput({
    scannerName,
    scannerVersion,
    generatedAt,
    status,
    summary,
    details,
    paths,
    filters,
    notes,
  });

  console.log(JSON.stringify(payload, null, 2));
  return payload;
};
