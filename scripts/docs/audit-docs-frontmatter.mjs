import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

function hasMarkdownExtension(fileName) {
  return fileName.endsWith('.md') || fileName.endsWith('.mdx');
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

async function listMarkdownDocs(relativePath = 'docs') {
  const entries = await fs.readdir(path.join(root, relativePath), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const childRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listMarkdownDocs(childRelativePath)));
      continue;
    }

    if (entry.isFile() && hasMarkdownExtension(entry.name)) {
      files.push(normalizePath(childRelativePath));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function run() {
  const markdownDocs = await listMarkdownDocs();
  const missingFrontmatter = [];
  const missingByDirectory = new Map();

  for (const relativePath of markdownDocs) {
    const content = await fs.readFile(path.join(root, relativePath), 'utf8');
    if (frontmatterPattern.test(content)) {
      continue;
    }

    missingFrontmatter.push(relativePath);
    const directoryPath = path.posix.dirname(relativePath);
    missingByDirectory.set(directoryPath, (missingByDirectory.get(directoryPath) ?? 0) + 1);
  }

  const sortedDirectories = [...missingByDirectory.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });

  console.log('Docs frontmatter audit');
  console.log(`- markdown docs scanned: ${markdownDocs.length}`);
  console.log(`- docs missing frontmatter: ${missingFrontmatter.length}`);

  if (sortedDirectories.length > 0) {
    console.log('- top directories by missing frontmatter:');
    for (const [directoryPath, count] of sortedDirectories.slice(0, 20)) {
      console.log(`  - ${directoryPath}: ${count}`);
    }
  }

  if (process.argv.includes('--files')) {
    console.log('- files missing frontmatter:');
    for (const relativePath of missingFrontmatter) {
      console.log(`  - ${relativePath}`);
    }
  }
}

run().catch((error) => {
  console.error('Docs frontmatter audit failed.');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
