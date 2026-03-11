import fs from 'node:fs';
import path from 'node:path';

interface SourceRecoveryEntry {
  productId?: string;
  sku?: string;
  catalogId?: string | null;
  names?: {
    name_en?: string | null;
    name_pl?: string | null;
    name_de?: string | null;
  };
  nameSegments?: {
    en?: string[];
    pl?: string[];
    de?: string[];
  };
}

interface SourceRecoveryReport {
  entries?: SourceRecoveryEntry[];
}

interface ParsedArgs {
  reportPath: string;
  outputPath?: string;
}

const DEFAULT_REPORT_PATH = '/tmp/product-parameter-source-recovery-latest.json';
const DEFAULT_LATEST_OUTPUT_PATH = '/tmp/product-parameter-source-recovery-template-latest.json';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const parseArgs = (): ParsedArgs => {
  const values = new Map<string, string>();

  for (const rawArg of process.argv.slice(2)) {
    if (!rawArg.startsWith('--')) continue;
    const normalized = rawArg.slice(2);
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) continue;
    values.set(normalized.slice(0, separatorIndex), normalized.slice(separatorIndex + 1));
  }

  return {
    reportPath: values.get('report') || DEFAULT_REPORT_PATH,
    outputPath: values.get('output') || undefined,
  };
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const report = JSON.parse(
    fs.readFileSync(path.resolve(parsed.reportPath), 'utf8')
  ) as SourceRecoveryReport;

  const overrides = (report.entries ?? []).map((entry: SourceRecoveryEntry) => ({
    sku: toTrimmedString(entry.sku),
    productId: toTrimmedString(entry.productId),
    classification: 'source-recovery-no-category',
    recommendedAction:
      'Fill proposedParameters from a source import, historical snapshot, or manual reconstruction.',
    currentNames: {
      name_en: entry.names?.name_en ?? null,
      name_pl: entry.names?.name_pl ?? null,
      name_de: entry.names?.name_de ?? null,
      segments_en: entry.nameSegments?.en ?? [],
      segments_pl: entry.nameSegments?.pl ?? [],
      segments_de: entry.nameSegments?.de ?? [],
    },
    catalogId: entry.catalogId ?? null,
    currentParameters: [],
    proposedParameters: [],
    notes: [],
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceReportPath: parsed.reportPath,
    entryCount: overrides.length,
    overrides,
  };

  const outputPath =
    parsed.outputPath || `/tmp/product-parameter-source-recovery-template-${Date.now()}.json`;
  const latestOutputPath = DEFAULT_LATEST_OUTPUT_PATH;

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(latestOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceReportPath: parsed.reportPath,
        entryCount: overrides.length,
        outputPath,
        latestOutputPath,
      },
      null,
      2
    )
  );
};

void main().catch((error: unknown) => {
  console.error('[generate-product-parameter-source-recovery-template] failed', error);
  process.exit(1);
});
