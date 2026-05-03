import fs from 'node:fs/promises';
import path from 'node:path';

import { buildScanOutput } from './lib/scan-output.mjs';
import { writeManagedGeneratedDoc } from '../docs/generated-doc-frontmatter.mjs';

import { toPosix } from './ui-consolidation/constants.mjs';
import { parseFiles } from './ui-consolidation/parser.mjs';
import { analyzeCandidates } from './ui-consolidation/analyzer.mjs';
import { buildMarkdown, buildInventoryCsv } from './ui-consolidation/reporter.mjs';

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const outDir = path.join(root, 'docs', 'ui-consolidation');
const HISTORY_DISABLED = !args.has('--write-history') || args.has('--ci') || args.has('--no-history');
const NO_WRITE = args.has('--no-write');
const SUMMARY_JSON_ONLY = args.has('--summary-json');

const run = async () => {
  const candidates = await parseFiles();
  const result = analyzeCandidates(candidates);
  
  const stamp = result.summary.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, 'scan-latest.json');
  const mdPath = path.join(outDir, 'scan-latest.md');
  const csvPath = path.join(outDir, 'inventory-latest.csv');
  const historicalJsonPath = path.join(outDir, `scan-${stamp}.json`);

  if (!NO_WRITE) {
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await writeManagedGeneratedDoc({
      root,
      targetPath: mdPath,
      content: buildMarkdown(result),
      reviewDate: result.summary.generatedAt.slice(0, 10),
    });
    await fs.writeFile(csvPath, buildInventoryCsv(candidates), 'utf8');
    if (!HISTORY_DISABLED) {
      await fs.writeFile(historicalJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }

    if (!SUMMARY_JSON_ONLY) {
      console.log(`Wrote ${toPosix(path.relative(root, jsonPath))}`);
      console.log(`Wrote ${toPosix(path.relative(root, mdPath))}`);
      console.log(`Wrote ${toPosix(path.relative(root, csvPath))}`);
      if (!HISTORY_DISABLED) {
        console.log(`Wrote ${toPosix(path.relative(root, historicalJsonPath))}`);
      }
    }
  }

  if (SUMMARY_JSON_ONLY) {
    process.stdout.write(
      `${JSON.stringify(
        buildScanOutput({
          scannerName: 'scan-ui-consolidation',
          scannerVersion: '1.0.0',
          summary: result.summary,
          details: {
            candidates,
            opportunities: result.opportunities,
            clusterDiagnostics: result.clusterDiagnostics,
          },
          paths: NO_WRITE
            ? null
            : {
              latestJson: toPosix(path.relative(root, jsonPath)),
              latestMarkdown: toPosix(path.relative(root, mdPath)),
              latestInventoryCsv: toPosix(path.relative(root, csvPath)),
              historyJson: HISTORY_DISABLED ? null : toPosix(path.relative(root, historicalJsonPath)),
            },
          filters: {
            historyDisabled: HISTORY_DISABLED,
            noWrite: NO_WRITE,
          },
          notes: ['ui consolidation scan result'],
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  console.log(
    [
      `Scanned files: ${result.summary.scannedFileCount}`,
      `Opportunities: ${result.summary.totalOpportunities}`,
      `High priority: ${result.summary.highPriorityCount}`,
    ].join(' | ')
  );
};

run().catch((error) => {
  console.error('[ui-consolidation-scan] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
