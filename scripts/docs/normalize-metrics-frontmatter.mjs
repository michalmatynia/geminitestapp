import fs from 'node:fs/promises';
import path from 'node:path';

import {
  isMetricsCanonicalMarkdownDoc,
  withMetricsMarkdownFrontmatter,
} from './metrics-frontmatter.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'docs', 'documentation', 'structure-manifest.json');

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function parseReviewDate() {
  const flag = process.argv.find((value) => value.startsWith('--review-date='));
  if (flag) {
    return flag.slice('--review-date='.length);
  }

  return new Date().toISOString().slice(0, 10);
}

async function listMetricsMarkdownDocs(relativePath = 'docs/metrics') {
  const entries = await fs.readdir(path.join(root, relativePath), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const childRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listMetricsMarkdownDocs(childRelativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(normalizePath(childRelativePath));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function loadManifest() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

function replaceMetricsCanonicalDocs(requiredCanonicalDocs, metricsCanonicalDocs) {
  const normalizedEntries = requiredCanonicalDocs.map((value) => normalizePath(value));
  const firstMetricsIndex = normalizedEntries.findIndex((value) => value.startsWith('docs/metrics/'));
  const nonMetricsDocs = normalizedEntries.filter((value) => !value.startsWith('docs/metrics/'));
  const insertIndex =
    firstMetricsIndex >= 0
      ? firstMetricsIndex
      : nonMetricsDocs.findIndex((value) => value === 'docs/migrations/README.md');

  const targetIndex = insertIndex >= 0 ? insertIndex : nonMetricsDocs.length;
  const updatedDocs = [...nonMetricsDocs];
  updatedDocs.splice(targetIndex, 0, ...metricsCanonicalDocs);
  return updatedDocs;
}

async function run() {
  const reviewDate = parseReviewDate();
  const metricsDocs = await listMetricsMarkdownDocs();
  let rewrittenMetricsDocs = 0;

  for (const relativePath of metricsDocs) {
    const fullPath = path.join(root, relativePath);
    const content = await fs.readFile(fullPath, 'utf8');
    const normalizedContent = withMetricsMarkdownFrontmatter(relativePath, content, reviewDate);

    if (normalizedContent === content) {
      continue;
    }

    await fs.writeFile(fullPath, normalizedContent, 'utf8');
    rewrittenMetricsDocs += 1;
  }

  const manifest = await loadManifest();
  const metricsCanonicalDocs = metricsDocs.filter(isMetricsCanonicalMarkdownDoc);
  const updatedRequiredCanonicalDocs = replaceMetricsCanonicalDocs(
    manifest.requiredCanonicalDocs ?? [],
    metricsCanonicalDocs
  );
  const manifestChanged =
    JSON.stringify(updatedRequiredCanonicalDocs) !==
    JSON.stringify(manifest.requiredCanonicalDocs ?? []);

  if (manifestChanged) {
    manifest.requiredCanonicalDocs = updatedRequiredCanonicalDocs;
    await fs.writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  console.log(`review_date=${reviewDate}`);
  console.log(`metrics_docs_scanned=${metricsDocs.length}`);
  console.log(`metrics_docs_rewritten=${rewrittenMetricsDocs}`);
  console.log(`canonical_metrics_docs=${metricsCanonicalDocs.length}`);
  console.log(`manifest_updated=${manifestChanged ? 'true' : 'false'}`);
}

run().catch((error) => {
  console.error('Failed to normalize metrics frontmatter.');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
