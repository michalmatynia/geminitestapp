import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'docs', 'documentation', 'structure-manifest.json');

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

function hasMarkdownExtension(fileName) {
  return fileName.endsWith('.md') || fileName.endsWith('.mdx');
}

function readFrontmatter(content) {
  const match = content.match(frontmatterPattern);
  return match ? match[1] : null;
}

function countLines(content) {
  return content.split(/\r?\n/).length;
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

async function loadManifest() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function listRootDocs() {
  const docsRoot = path.join(root, 'docs');
  const entries = await fs.readdir(docsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && hasMarkdownExtension(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function listSupersededRootDocs(rootDocs) {
  const supersededDocs = [];

  for (const fileName of rootDocs) {
    const relativePath = path.join('docs', fileName);
    const content = await fs.readFile(path.join(root, relativePath), 'utf8');
    const frontmatter = readFrontmatter(content);

    if (frontmatter && /^status:\s*'?(superseded)'?$/m.test(frontmatter)) {
      supersededDocs.push(relativePath);
    }
  }

  return supersededDocs;
}

function findDocReferenceTokens(content) {
  const pattern =
    /docs\/[A-Za-z0-9._/-]+\.(?:md|mdx)|(?:\.\.?\/)+[A-Za-z0-9._/-]+\.(?:md|mdx)/g;
  const matches = [];

  for (const match of content.matchAll(pattern)) {
    matches.push({
      token: match[0],
      index: match.index ?? 0,
    });
  }

  return matches;
}

function resolveDocReference(fromPath, referenceToken) {
  if (referenceToken.startsWith('docs/')) {
    return path.posix.normalize(referenceToken);
  }

  if (referenceToken.startsWith('./') || referenceToken.startsWith('../')) {
    return path.posix.normalize(
      path.posix.join(path.posix.dirname(fromPath), referenceToken)
    );
  }

  return null;
}

async function checkCanonicalFrontmatter(relativePath, requiredFields) {
  const fullPath = path.join(root, relativePath);
  const content = await fs.readFile(fullPath, 'utf8');
  const frontmatter = readFrontmatter(content);

  if (!frontmatter) {
    return [`${relativePath}: missing YAML frontmatter`];
  }

  const issues = [];
  for (const field of requiredFields) {
    const pattern = new RegExp(`^${field}:\\s*.+$`, 'm');
    if (!pattern.test(frontmatter)) {
      issues.push(`${relativePath}: missing frontmatter field "${field}"`);
    }
  }

  if (!/^canonical:\s*true$/m.test(frontmatter)) {
    issues.push(`${relativePath}: canonical docs must declare canonical: true`);
  }

  return issues;
}

async function checkSupersededRootDoc(relativePath, maxLines) {
  const fullPath = path.join(root, relativePath);
  const content = await fs.readFile(fullPath, 'utf8');
  const frontmatter = readFrontmatter(content);

  if (!frontmatter || !/^status:\s*'?(superseded)'?$/m.test(frontmatter)) {
    return [];
  }

  const issues = [];

  if (!/^canonical:\s*false$/m.test(frontmatter)) {
    issues.push(`${relativePath}: superseded root docs must declare canonical: false`);
  }

  if (!/^superseded_by:\s*.+$/m.test(frontmatter)) {
    issues.push(`${relativePath}: superseded root docs must declare superseded_by`);
  }

  if (countLines(content) > maxLines) {
    issues.push(
      `${relativePath}: superseded root docs must stay at or under ${maxLines} lines`
    );
  }

  return issues;
}

async function checkCompatibilityMirrorPair(pair) {
  const issues = [];
  const canonicalExists = await fileExists(pair.canonical);
  const mirrorExists = await fileExists(pair.mirror);

  if (!canonicalExists) {
    issues.push(`${pair.canonical}: compatibility mirror source is missing`);
    return issues;
  }

  if (!mirrorExists) {
    issues.push(`${pair.mirror}: compatibility mirror file is missing`);
    return issues;
  }

  const [canonicalContent, mirrorContent] = await Promise.all([
    fs.readFile(path.join(root, pair.canonical), 'utf8'),
    fs.readFile(path.join(root, pair.mirror), 'utf8'),
  ]);

  if (canonicalContent !== mirrorContent) {
    issues.push(
      `${pair.mirror}: compatibility mirror content diverges from canonical source ${pair.canonical}`
    );
  }

  return issues;
}

async function checkReferenceTargetForRootStubReferences(relativePath, rootStubPaths) {
  const content = await fs.readFile(path.join(root, relativePath), 'utf8');
  const issues = [];
  const rootStubSet = new Set(rootStubPaths.map((value) => value.replace(/\\/g, '/')));

  for (const reference of findDocReferenceTokens(content)) {
    const resolvedReference = resolveDocReference(relativePath, reference.token);

    if (resolvedReference && rootStubSet.has(resolvedReference)) {
      issues.push(
        `${relativePath}:${lineNumberAt(content, reference.index)}: references root compatibility stub ${resolvedReference}; use the canonical destination instead`
      );
    }
  }

  return issues;
}

async function run() {
  const manifest = await loadManifest();
  const issues = [];

  const rootDocs = await listRootDocs();
  const allowlist = new Set(manifest.rootAllowlist);
  const supersededRootDocs = await listSupersededRootDocs(rootDocs);

  for (const fileName of rootDocs) {
    if (!allowlist.has(fileName)) {
      issues.push(`docs/${fileName}: root-level docs file is not in the allowlist`);
    }
  }

  for (const fileName of manifest.rootAllowlist) {
    if (!rootDocs.includes(fileName)) {
      issues.push(`structure manifest references missing root doc docs/${fileName}`);
    }
  }

  const maxSupersededRootDocLines = manifest.maxSupersededRootDocLines ?? 25;
  for (const fileName of rootDocs) {
    const docIssues = await checkSupersededRootDoc(
      path.join('docs', fileName),
      maxSupersededRootDocLines
    );
    issues.push(...docIssues);
  }

  for (const relativePath of manifest.requiredCanonicalDocs) {
    const exists = await fileExists(relativePath);
    if (!exists) {
      issues.push(`${relativePath}: required canonical doc is missing`);
      continue;
    }

    const docIssues = await checkCanonicalFrontmatter(
      relativePath,
      manifest.requiredFrontmatterFields
    );
    issues.push(...docIssues);
  }

  for (const pair of manifest.compatibilityMirrorPairs ?? []) {
    const mirrorIssues = await checkCompatibilityMirrorPair(pair);
    issues.push(...mirrorIssues);
  }

  const referenceTargets = [
    ...new Set([
      ...manifest.requiredCanonicalDocs,
      ...(manifest.additionalReferenceCheckTargets ?? []),
    ]),
  ];
  const referenceTargetExemptions = new Set(manifest.rootStubReferenceExemptions ?? []);

  for (const relativePath of referenceTargets) {
    if (referenceTargetExemptions.has(relativePath)) {
      continue;
    }

    const exists = await fileExists(relativePath);
    if (!exists) {
      issues.push(`${relativePath}: root stub reference check target is missing`);
      continue;
    }

    const referenceIssues = await checkReferenceTargetForRootStubReferences(
      relativePath,
      supersededRootDocs
    );
    issues.push(...referenceIssues);
  }

  if (issues.length > 0) {
    console.error('Docs structure check failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    `Docs structure check passed for ${rootDocs.length} root docs and ${manifest.requiredCanonicalDocs.length} canonical docs.`
  );
}

run().catch((error) => {
  console.error('Docs structure check failed unexpectedly.');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
