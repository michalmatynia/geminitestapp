import fs from 'node:fs';
import path from 'node:path';

interface SourceRecoveryOverride {
  sku?: string;
  productId?: string;
  catalogId?: string | null;
  [key: string]: unknown;
}

interface SourceRecoveryTemplate {
  generatedAt?: string;
  sourceReportPath?: string;
  overrides?: SourceRecoveryOverride[];
}

interface ParsedArgs {
  inputPath: string;
  outputDir: string;
}

const DEFAULT_INPUT_PATH = '/tmp/product-parameter-source-recovery-template-latest.json';
const DEFAULT_OUTPUT_DIR = '/tmp/product-parameter-source-recovery-batches';

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
    inputPath: values.get('input') || DEFAULT_INPUT_PATH,
    outputDir: values.get('output-dir') || DEFAULT_OUTPUT_DIR,
  };
};

const getSkuFamily = (sku: string): string => {
  const match = sku.match(/^[A-Z]+/);
  return match?.[0] || 'UNKNOWN';
};

const sanitizeFileToken = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const template = JSON.parse(
    fs.readFileSync(path.resolve(parsed.inputPath), 'utf8')
  ) as SourceRecoveryTemplate;

  const overrides = Array.isArray(template.overrides) ? template.overrides : [];
  fs.mkdirSync(parsed.outputDir, { recursive: true });

  const grouped = new Map<string, SourceRecoveryOverride[]>();

  for (const override of overrides) {
    const sku = toTrimmedString(override.sku);
    const catalogId = toTrimmedString(override.catalogId) || 'unknown-catalog';
    const family = getSkuFamily(sku);
    const key = `${family}__${catalogId}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(override);
    grouped.set(key, bucket);
  }

  const batches = [...grouped.entries()]
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .map(([key, batchOverrides]) => {
      const [family = 'UNKNOWN', catalogId = 'unknown-catalog'] = key.split('__');
      const filename = `${sanitizeFileToken(family)}__${sanitizeFileToken(catalogId)}.json`;
      const outputPath = path.join(parsed.outputDir, filename);
      const payload = {
        generatedAt: new Date().toISOString(),
        sourceTemplatePath: parsed.inputPath,
        family,
        catalogId,
        entryCount: batchOverrides.length,
        overrides: batchOverrides,
      };

      fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

      return {
        family,
        catalogId,
        entryCount: batchOverrides.length,
        outputPath,
        sampleSkus: batchOverrides
          .slice(0, 10)
          .map((override: SourceRecoveryOverride) => toTrimmedString(override.sku))
          .filter(Boolean),
      };
    });

  const manifestPath = path.join(parsed.outputDir, 'manifest.json');
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        inputPath: parsed.inputPath,
        outputDir: parsed.outputDir,
        batchCount: batches.length,
        batches,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        inputPath: parsed.inputPath,
        outputDir: parsed.outputDir,
        batchCount: batches.length,
        manifestPath,
      },
      null,
      2
    )
  );
};

void main().catch((error: unknown) => {
  console.error('[split-product-parameter-source-recovery-template] failed', error);
  process.exit(1);
});
