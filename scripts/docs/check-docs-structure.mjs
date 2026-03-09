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

async function run() {
  const manifest = await loadManifest();
  const issues = [];

  const rootDocs = await listRootDocs();
  const allowlist = new Set(manifest.rootAllowlist);

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
