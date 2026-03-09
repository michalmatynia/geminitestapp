import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n*/;

function normalizeDocPath(value) {
  return value.replace(/\\/g, '/');
}

function stripFrontmatter(content) {
  return content.replace(frontmatterPattern, '').replace(/^\r?\n+/, '');
}

function resolveManagedGeneratedDocRule(relativePath) {
  const normalizedPath = normalizeDocPath(relativePath);
  const baseName = path.posix.basename(normalizedPath);

  if (normalizedPath === 'docs/ui-consolidation/scan-latest.md') {
    return {
      owner: 'Platform Team',
      status: 'generated',
      doc_type: 'generated',
      scope: 'cross-feature',
      canonical: true,
    };
  }

  if (normalizedPath === 'docs/validator/README.md') {
    return {
      owner: 'Products / Platform Team',
      status: 'active',
      doc_type: 'index',
      scope: 'feature:validator',
      canonical: true,
    };
  }

  if (
    normalizedPath === 'docs/validator/function-reference.md' ||
    normalizedPath === 'docs/validator/tooltips.md' ||
    normalizedPath === 'docs/validator/function-inventory.md'
  ) {
    return {
      owner: 'Products / Platform Team',
      status: 'generated',
      doc_type: 'generated',
      scope: 'feature:validator',
      canonical: true,
    };
  }

  if (normalizedPath === 'docs/validator/architecture.md') {
    return {
      owner: 'Products / Platform Team',
      status: 'active',
      doc_type: 'architecture',
      scope: 'feature:validator',
      canonical: true,
    };
  }

  if (normalizedPath === 'docs/validator/examples.md') {
    return {
      owner: 'Products / Platform Team',
      status: 'active',
      doc_type: 'reference',
      scope: 'feature:validator',
      canonical: true,
    };
  }

  if (normalizedPath === 'docs/ai-paths/semantic-grammar/nodes/README.md') {
    return {
      owner: 'AI Paths Team',
      status: 'active',
      doc_type: 'index',
      scope: 'generated',
      canonical: true,
    };
  }

  if (normalizedPath === 'docs/ai-paths/node-code-objects-v2/README.md') {
    return {
      owner: 'AI Paths Team',
      status: 'active',
      doc_type: 'index',
      scope: 'feature:ai-paths',
      canonical: true,
    };
  }

  if (normalizedPath === 'docs/ai-paths/node-code-objects-v3/MIGRATION_GUIDE.md') {
    return {
      owner: 'AI Paths Team',
      status: 'active',
      doc_type: 'reference',
      scope: 'feature:ai-paths',
      canonical: true,
    };
  }

  if (normalizedPath === 'docs/ai-paths/node-code-objects-v3/nodes/README.md') {
    return {
      owner: 'AI Paths Team',
      status: 'active',
      doc_type: 'index',
      scope: 'feature:ai-paths',
      canonical: true,
    };
  }

  if (
    normalizedPath.startsWith('docs/ai-paths/node-code-objects-v3/nodes/') &&
    baseName.endsWith('.md')
  ) {
    return {
      owner: 'AI Paths Team',
      status: 'generated',
      doc_type: 'generated',
      scope: 'feature:ai-paths',
      canonical: true,
    };
  }

  return null;
}

export function getManagedGeneratedDocMeta(relativePath, reviewDate) {
  const rule = resolveManagedGeneratedDocRule(relativePath);
  if (!rule) {
    throw new Error(`No managed generated-doc frontmatter rule for ${normalizeDocPath(relativePath)}`);
  }

  return {
    owner: rule.owner,
    last_reviewed: reviewDate,
    status: rule.status,
    doc_type: rule.doc_type,
    scope: rule.scope,
    canonical: rule.canonical,
  };
}

export function withManagedGeneratedDocFrontmatter(relativePath, content, reviewDate) {
  const metadata = getManagedGeneratedDocMeta(relativePath, reviewDate);
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

export async function writeManagedGeneratedDoc({
  root,
  targetPath,
  content,
  reviewDate = new Date().toISOString().slice(0, 10),
}) {
  const relativePath = normalizeDocPath(path.relative(root, targetPath));
  const normalizedContent = withManagedGeneratedDocFrontmatter(relativePath, content, reviewDate);

  await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
  await fsPromises.writeFile(targetPath, normalizedContent, 'utf8');
}

export function writeManagedGeneratedDocSync({
  root,
  targetPath,
  content,
  reviewDate = new Date().toISOString().slice(0, 10),
}) {
  const relativePath = normalizeDocPath(path.relative(root, targetPath));
  const normalizedContent = withManagedGeneratedDocFrontmatter(relativePath, content, reviewDate);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, normalizedContent, 'utf8');
}
