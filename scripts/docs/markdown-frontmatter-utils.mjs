import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n*/;
const frontmatterBodyPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

export function normalizeDocPath(value) {
  return value.replace(/\\/g, '/');
}

export function stripFrontmatter(content) {
  return content.replace(frontmatterPattern, '').replace(/^\r?\n+/, '');
}

export function hasFrontmatter(content) {
  return frontmatterPattern.test(content);
}

export function readFrontmatter(content) {
  const match = content.match(frontmatterBodyPattern);
  return match ? match[1] : null;
}

export function getFrontmatterField(frontmatter, field) {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!match) {
    return null;
  }

  const rawValue = match[1].trim();
  if (
    (rawValue.startsWith('\'') && rawValue.endsWith('\'')) ||
    (rawValue.startsWith('"') && rawValue.endsWith('"'))
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

export function withStructuredMarkdownFrontmatter(content, metadata) {
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

export async function writeStructuredMarkdownDoc({
  root,
  targetPath,
  content,
  reviewDate = new Date().toISOString().slice(0, 10),
  getMeta,
}) {
  const relativePath = normalizeDocPath(path.relative(root, targetPath));
  const normalizedContent = withStructuredMarkdownFrontmatter(
    content,
    getMeta(relativePath, reviewDate)
  );

  await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
  await fsPromises.writeFile(targetPath, normalizedContent, 'utf8');
}

export function writeStructuredMarkdownDocSync({
  root,
  targetPath,
  content,
  reviewDate = new Date().toISOString().slice(0, 10),
  getMeta,
}) {
  const relativePath = normalizeDocPath(path.relative(root, targetPath));
  const normalizedContent = withStructuredMarkdownFrontmatter(
    content,
    getMeta(relativePath, reviewDate)
  );

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, normalizedContent, 'utf8');
}
