import fs from 'node:fs/promises';
import path from 'node:path';

const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n*/;

function hasMarkdownExtension(fileName) {
  return fileName.endsWith('.md') || fileName.endsWith('.mdx');
}

export function normalizeDocPath(value) {
  return value.replace(/\\/g, '/');
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

export function stripFrontmatter(content) {
  return content.replace(frontmatterPattern, '').replace(/^\r?\n+/, '');
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
  const metadata = getMetricsMarkdownMeta(relativePath, reviewDate);
  const body = stripFrontmatter(content);
  const normalizedBody = body.endsWith('\n') ? body : `${body}\n`;
  const frontmatter = [
    '---',
    `owner: '${metadata.owner}'`,
    `last_reviewed: '${metadata.last_reviewed}'`,
    `status: '${metadata.status}'`,
    `doc_type: '${metadata.doc_type}'`,
    `scope: '${metadata.scope}'`,
    `canonical: ${metadata.canonical ? 'true' : 'false'}`,
    '---',
    '',
  ].join('\n');

  return `${frontmatter}${normalizedBody}`;
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

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(
    targetPath,
    withMetricsMarkdownFrontmatter(relativePath, content, reviewDate),
    'utf8'
  );
}
