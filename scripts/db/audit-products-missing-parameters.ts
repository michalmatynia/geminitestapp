import 'dotenv/config';

import { writeFile } from 'fs/promises';

import { productService } from '@/shared/lib/products/services/productService';

type AuditRow = {
  id: string;
  sku: string | null;
  name_en: string | null;
  name_pl: string | null;
  categoryId: string | null;
  updatedAt: string | null | undefined;
};

type AuditReport = {
  generatedAt: string;
  scannedCount: number;
  suspiciousCount: number;
  reportPath: string;
  latestReportPath: string;
  products: AuditRow[];
};

const DEFAULT_PAGE_SIZE = 200;
const LATEST_REPORT_PATH = '/tmp/product-missing-parameters-audit-latest.json';

const parsePageSize = (): number => {
  const value = process.argv
    .slice(2)
    .find((arg: string) => arg.startsWith('--page-size='))
    ?.split('=')[1];
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.floor(parsed);
};

const hasParameterLikeSegments = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.includes(' | ');

async function main(): Promise<void> {
  const pageSize = parsePageSize();
  const rows: AuditRow[] = [];
  let page = 1;
  let scannedCount = 0;
  let total = 0;

  do {
    const result = await productService.getProductsWithCount({ page, pageSize });
    total = result.total;
    scannedCount += result.products.length;

    for (const product of result.products) {
      const parameterCount = Array.isArray(product.parameters) ? product.parameters.length : 0;
      const looksDenormalized =
        hasParameterLikeSegments(product.name_en) || hasParameterLikeSegments(product.name_pl);

      if (parameterCount > 0 || !looksDenormalized) {
        continue;
      }

      rows.push({
        id: product.id,
        sku: product.sku ?? null,
        name_en: product.name_en ?? null,
        name_pl: product.name_pl ?? null,
        categoryId: product.categoryId ?? null,
        updatedAt: product.updatedAt,
      });
    }

    page += 1;
  } while ((page - 1) * pageSize < total);

  const reportPath = `/tmp/product-missing-parameters-audit-${Date.now()}.json`;
  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    scannedCount,
    suspiciousCount: rows.length,
    reportPath,
    latestReportPath: LATEST_REPORT_PATH,
    products: rows,
  };

  const serializedReport = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(reportPath, serializedReport);
  await writeFile(LATEST_REPORT_PATH, serializedReport);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

void main().catch((error: unknown) => {
  console.error('[audit-products-missing-parameters] failed', error);
  process.exit(1);
});
