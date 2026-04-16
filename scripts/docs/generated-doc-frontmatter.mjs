import path from 'node:path';

import {
  normalizeDocPath,
  withStructuredMarkdownFrontmatter,
  writeStructuredMarkdownDoc,
  writeStructuredMarkdownDocSync,
} from './markdown-frontmatter-utils.mjs';

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

  if (normalizedPath === 'docs/metrics/type-clusters-plan-latest.md') {
    return {
      owner: 'Platform Team',
      status: 'generated',
      doc_type: 'generated',
      scope: 'cross-feature',
      canonical: true,
    };
  }

  if (
    normalizedPath === 'docs/build/improvements/scan-latest.md' ||
    /^docs\/build\/improvements\/[^/]+\/scan-latest\.md$/u.test(normalizedPath)
  ) {
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

export function isManagedGeneratedDoc(relativePath) {
  return resolveManagedGeneratedDocRule(relativePath) !== null;
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
  return withStructuredMarkdownFrontmatter(
    content,
    getManagedGeneratedDocMeta(relativePath, reviewDate)
  );
}

export async function writeManagedGeneratedDoc({
  root,
  targetPath,
  content,
  reviewDate = new Date().toISOString().slice(0, 10),
}) {
  await writeStructuredMarkdownDoc({
    root,
    targetPath,
    content,
    reviewDate,
    getMeta: getManagedGeneratedDocMeta,
  });
}

export function writeManagedGeneratedDocSync({
  root,
  targetPath,
  content,
  reviewDate = new Date().toISOString().slice(0, 10),
}) {
  writeStructuredMarkdownDocSync({
    root,
    targetPath,
    content,
    reviewDate,
    getMeta: getManagedGeneratedDocMeta,
  });
}
