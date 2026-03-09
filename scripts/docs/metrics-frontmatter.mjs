import path from 'node:path';

import {
  normalizeDocPath,
  withStructuredMarkdownFrontmatter,
  writeStructuredMarkdownDoc,
} from './markdown-frontmatter-utils.mjs';

function hasMarkdownExtension(fileName) {
  return fileName.endsWith('.md') || fileName.endsWith('.mdx');
}

export function isMetricsMarkdownDoc(relativePath) {
  const normalizedPath = normalizeDocPath(relativePath);
  return normalizedPath.startsWith('docs/metrics/') && hasMarkdownExtension(normalizedPath);
}

export function isMetricsCanonicalMarkdownDoc(relativePath) {
  const normalizedPath = normalizeDocPath(relativePath);
  const baseName = path.posix.basename(normalizedPath);

  return (
    isMetricsMarkdownDoc(normalizedPath) &&
    (baseName === 'README.md' ||
      baseName === 'route-hotspots.md' ||
      baseName.endsWith('-latest.md'))
  );
}

export function getMetricsMarkdownMeta(relativePath, reviewDate) {
  const normalizedPath = normalizeDocPath(relativePath);
  const isReadme = path.posix.basename(normalizedPath) === 'README.md';
  const canonical = isMetricsCanonicalMarkdownDoc(normalizedPath);

  return {
    owner: 'Platform Team',
    last_reviewed: reviewDate,
    status: isReadme ? 'active' : 'generated',
    doc_type: isReadme ? 'index' : 'generated',
    scope: 'generated',
    canonical,
  };
}

export function withMetricsMarkdownFrontmatter(relativePath, content, reviewDate) {
  return withStructuredMarkdownFrontmatter(
    content,
    getMetricsMarkdownMeta(relativePath, reviewDate)
  );
}

export async function writeMetricsMarkdownFile({
  root,
  targetPath,
  content,
  reviewDate = new Date().toISOString().slice(0, 10),
}) {
  const relativePath = normalizeDocPath(path.relative(root, targetPath));

  if (!isMetricsMarkdownDoc(relativePath)) {
    throw new Error(`Metrics markdown helper expected docs/metrics markdown path, received ${relativePath}`);
  }

  await writeStructuredMarkdownDoc({
    root,
    targetPath,
    content,
    reviewDate,
    getMeta: getMetricsMarkdownMeta,
  });
}
