import fs from 'node:fs';
import path from 'node:path';

import { productService } from '@/shared/lib/products/services/productService';

interface CuratedOverrideRow {
  sku?: string;
  productId?: string;
  proposedParameters?: Array<Record<string, unknown>>;
}

interface CuratedOverrideFile {
  overrides?: CuratedOverrideRow[];
}

interface ParsedArgs {
  apply: boolean;
  inputPath: string;
}

const DEFAULT_INPUT_PATH = '/tmp/product-parameter-curated-overrides-latest.json';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const parseArgs = (): ParsedArgs => {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (const rawArg of process.argv.slice(2)) {
    if (!rawArg.startsWith('--')) continue;
    const normalized = rawArg.slice(2);
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) {
      flags.add(normalized);
      continue;
    }
    values.set(normalized.slice(0, separatorIndex), normalized.slice(separatorIndex + 1));
  }

  return {
    apply: flags.has('apply'),
    inputPath: values.get('input') || DEFAULT_INPUT_PATH,
  };
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const overrideFile = JSON.parse(
    fs.readFileSync(path.resolve(parsed.inputPath), 'utf8')
  ) as CuratedOverrideFile;

  const overrides = (overrideFile.overrides ?? []).filter(
    (entry: CuratedOverrideRow) =>
      toTrimmedString(entry.productId).length > 0 &&
      Array.isArray(entry.proposedParameters) &&
      entry.proposedParameters.length > 0
  );

  const previews = overrides.map((entry: CuratedOverrideRow) => ({
    sku: toTrimmedString(entry.sku),
    productId: toTrimmedString(entry.productId),
    parameterCount: Array.isArray(entry.proposedParameters) ? entry.proposedParameters.length : 0,
  }));

  if (parsed.apply) {
    for (const entry of overrides) {
      await productService.updateProduct(toTrimmedString(entry.productId), {
        parameters: entry.proposedParameters,
      });
    }
  }

  const reportPath = `/tmp/product-parameter-curated-apply-${Date.now()}.json`;
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        inputPath: parsed.inputPath,
        apply: parsed.apply,
        overrideCount: overrides.length,
        reportPath,
        previews,
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
        apply: parsed.apply,
        overrideCount: overrides.length,
        reportPath,
      },
      null,
      2
    )
  );
};

void main().catch((error: unknown) => {
  console.error('[apply-product-parameter-curated-overrides] failed', error);
  process.exit(1);
});
