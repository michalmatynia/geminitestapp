import fs from 'node:fs/promises';
import path from 'node:path';
import {
  COMPONENT_FAMILY_RE,
  NON_CONSOLIDATION_NAME_RE,
  CLUSTER_FAMILY_ALLOWLIST,
  STOP_WORDS,
  THIN_RE_EXPORT_RE,
  toPosix,
} from './constants.mjs';

const root = process.cwd();

export const countLines = (content) => {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
};

export const walk = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const children = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );

  return children.flat();
};

export const shouldIncludeFile = (relativePath) => {
  if (!relativePath.endsWith('.tsx')) return false;
  if (relativePath.includes('/__tests__/')) return false;
  if (relativePath.startsWith('src/shared/ui/')) return true;
  if (relativePath.includes('/components/')) return true;
  if (relativePath.startsWith('src/app/')) return true;
  if (COMPONENT_FAMILY_RE.test(relativePath)) return true;
  return false;
};

export const getFamily = (basename, relativePath) => {
  const match = basename.match(COMPONENT_FAMILY_RE) ?? relativePath.match(COMPONENT_FAMILY_RE);
  if (match) return match[1];
  if (basename === 'page.tsx') return 'Page';
  return 'Unknown';
};

export const isClusterEligible = (candidate) => {
  if (NON_CONSOLIDATION_NAME_RE.test(candidate.basename)) return false;
  if (!CLUSTER_FAMILY_ALLOWLIST.has(candidate.family)) return false;
  if (candidate.thinReExportWrapper) return false;
  return true;
};

export const getScope = (relativePath) => {
  const featureMatch = relativePath.match(/^src\/features\/([^/]+)\//);
  if (featureMatch) return `feature:${featureMatch[1]}`;
  if (relativePath.startsWith('src/shared/ui/')) return 'shared-ui';
  if (relativePath.startsWith('src/shared/lib/')) return 'shared-lib';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};

export const getDomain = (relativePath) => {
  if (relativePath.startsWith('src/features/')) return 'feature';
  if (relativePath.startsWith('src/shared/ui/')) return 'shared-ui';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};

export const stripCommentsAndStrings = (content) =>
  content
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/`(?:\\.|[^`])*`/g, ' ')
    .replace(/"(?:\\.|[^"])*"/g, ' ')
    .replace(/'(?:\\.|[^'])*'/g, ' ');

export const isThinReExportWrapper = (rawContent) => {
  const normalized = rawContent
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .trim();
  if (!normalized) return false;
  const withoutUseClient = normalized.replace(/^['"]use client['"]\s*;?\s*/m, '').trim();
  if (!withoutUseClient) return false;
  return THIN_RE_EXPORT_RE.test(withoutUseClient);
};

export const extractSimilarityTokens = (content) => {
  const stripped = stripCommentsAndStrings(content).toLowerCase();
  const rawTokens = stripped.match(/[a-z][a-z0-9_-]{2,}/g) ?? [];
  const tokens = [];
  for (const token of rawTokens) {
    if (STOP_WORDS.has(token)) continue;
    tokens.push(token);
  }
  return new Set(tokens);
};

export const parsePropsSignature = (content) => {
  const patterns = [
    /function\s+[A-Z][A-Za-z0-9_]*\s*\(\s*{([^)]{1,800})}\s*(?::[^)]*)?\)/m,
    /const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\(\s*{([^)]{1,800})}\s*(?::[^)]*)?\)\s*=>/m,
    /const\s+[A-Z][A-Za-z0-9_]*\s*:\s*React\.FC<[^>]+>\s*=\s*\(\s*{([^)]{1,800})}\s*\)\s*=>/m,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (!match) continue;
    const inside = match[1];
    const keys = inside
      .split(',')
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => raw.replace(/=.*$/, '').trim())
      .map((raw) => raw.replace(/^\.{3}/, '').trim())
      .map((raw) => raw.replace(/:.*$/, '').trim())
      .filter((raw) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw));

    const deduped = [...new Set(keys)].sort();
    if (deduped.length < 2) return null;
    return deduped.join('|');
  }

  return null;
};

export const extractImports = (content) => {
  const imports = new Set();
  for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    imports.add(match[1]);
  }
  for (const match of content.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.add(match[1]);
  }
  return [...imports];
};

export const parseFiles = async () => {
  const srcFiles = await walk(path.join(root, 'src'));
  const candidates = [];

  for (const absolutePath of srcFiles) {
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (!shouldIncludeFile(relativePath)) continue;
    const raw = await fs.readFile(absolutePath, 'utf8');
    const basename = path.basename(relativePath);
    const imports = extractImports(raw);

    const record = {
      path: relativePath,
      basename,
      domain: getDomain(relativePath),
      scope: getScope(relativePath),
      family: getFamily(basename, relativePath),
      lines: countLines(raw),
      useClient: /^\s*['"]use client['"]\s*;?/m.test(raw),
      imports,
      templateImports: imports.filter((entry) => entry.startsWith('@/shared/ui/templates')).length,
      uiPrimitiveImports: imports.filter((entry) => entry.startsWith('@/shared/ui/')).length,
      tokenSet: extractSimilarityTokens(raw),
      propsSignature: parsePropsSignature(raw),
      thinReExportWrapper: isThinReExportWrapper(raw),
    };

    candidates.push(record);
  }

  return candidates;
};
