import fs from 'node:fs/promises';
import path from 'node:path';

import { listMarkdownDocsRecursive } from './docs-tree-utils.mjs';
import {
  hasFrontmatter,
} from './markdown-frontmatter-utils.mjs';

const root = process.cwd();

async function run() {
  const markdownDocs = await listMarkdownDocsRecursive();
  const missingFrontmatter = [];
  const missingByDirectory = new Map();

  for (const relativePath of markdownDocs) {
    const content = await fs.readFile(path.join(root, relativePath), 'utf8');
    if (hasFrontmatter(content)) {
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
