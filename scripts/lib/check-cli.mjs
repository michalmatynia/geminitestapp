import { writeSync } from 'node:fs';
import process from 'node:process';

import { buildScanOutput } from '../architecture/lib/scan-output.mjs';

/**
 * @typedef {Object} SummaryJsonOptions
 * @property {string} scannerName
 * @property {string} [scannerVersion]
 * @property {string} generatedAt
 * @property {string} [status]
 * @property {Record<string, unknown>} summary
 * @property {Record<string, unknown> | null} [details]
 * @property {Record<string, unknown> | null} [paths]
 * @property {Record<string, unknown> | null} [filters]
 * @property {string[]} [notes]
 */

export const parseCommonCheckArgs = (argv = process.argv.slice(2)) => {
  const args = new Set(argv);
  return {
    strictMode: args.has('--strict'),
    failOnWarnings: args.has('--fail-on-warnings'),
    shouldWriteHistory: args.has('--write-history') && !args.has('--ci') && !args.has('--no-history'),
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

const writeStdoutSync = (text) => {
  if (!Number.isInteger(process.stdout.fd)) {
    process.stdout.write(text);
    return;
  }

  const buffer = Buffer.from(text, 'utf8');
  let offset = 0;
  while (offset < buffer.length) {
    try {
      const written = writeSync(process.stdout.fd, buffer, offset, buffer.length - offset);
      offset += written;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const code = error.code;
        if (code === 'EAGAIN' || code === 'EINTR') {
          continue;
        }
      }
      throw error;
    }
  }
};

/**
 * @param {SummaryJsonOptions} options
 */
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

  const text = `${JSON.stringify(payload, null, 2)}\n`;
  writeStdoutSync(text);
  return payload;
};
