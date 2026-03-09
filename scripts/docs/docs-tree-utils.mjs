import fs from 'node:fs/promises';
import path from 'node:path';

import { normalizeDocPath } from './markdown-frontmatter-utils.mjs';

const root = process.cwd();
const directoryEntriesCache = new Map();
const directoryContainsMarkdownCache = new Map();

export function hasMarkdownExtension(fileName) {
  return fileName.endsWith('.md') || fileName.endsWith('.mdx');
}

async function readDirectoryEntries(relativePath) {
  const normalizedRelativePath = normalizeDocPath(relativePath);

  if (!directoryEntriesCache.has(normalizedRelativePath)) {
    directoryEntriesCache.set(
      normalizedRelativePath,
      fs.readdir(path.join(root, normalizedRelativePath), { withFileTypes: true })
    );
  }

  return directoryEntriesCache.get(normalizedRelativePath);
}

export async function listMarkdownDocsRecursive(relativePath = 'docs') {
  const normalizedRelativePath = normalizeDocPath(relativePath);
  const entries = await readDirectoryEntries(normalizedRelativePath);
  const files = [];

  for (const entry of entries) {
    const childRelativePath = normalizeDocPath(
      path.join(normalizedRelativePath, entry.name)
    );

    if (entry.isDirectory()) {
      files.push(...(await listMarkdownDocsRecursive(childRelativePath)));
      continue;
    }

    if (entry.isFile() && hasMarkdownExtension(entry.name)) {
      files.push(normalizeDocPath(childRelativePath));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export async function listDocDirectoriesRecursive(relativePath = 'docs') {
  const normalizedRelativePath = normalizeDocPath(relativePath);
  const directories = [];
  const entries = await readDirectoryEntries(normalizedRelativePath);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const childRelativePath = normalizeDocPath(path.join(normalizedRelativePath, entry.name));
    directories.push(childRelativePath);
    directories.push(...(await listDocDirectoriesRecursive(childRelativePath)));
  }

  return directories.sort((a, b) => a.localeCompare(b));
}

export async function listDirectMarkdownFiles(relativePath) {
  const entries = await readDirectoryEntries(relativePath);
  return entries
    .filter((entry) => entry.isFile() && hasMarkdownExtension(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function listDirectNonMarkdownFiles(relativePath) {
  const entries = await readDirectoryEntries(relativePath);
  return entries
    .filter((entry) => entry.isFile() && !hasMarkdownExtension(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function getDirectoryHubPath(relativePath) {
  const normalizedRelativePath = normalizeDocPath(relativePath);
  const entries = await readDirectoryEntries(normalizedRelativePath);

  for (const candidate of ['README.md', 'index.md']) {
    if (entries.some((entry) => entry.isFile() && entry.name === candidate)) {
      return normalizeDocPath(path.join(normalizedRelativePath, candidate));
    }
  }

  return null;
}

export async function directoryHasHub(relativePath) {
  return (await getDirectoryHubPath(relativePath)) !== null;
}

export async function directoryContainsMarkdown(relativePath) {
  const normalizedRelativePath = normalizeDocPath(relativePath);

  if (!directoryContainsMarkdownCache.has(normalizedRelativePath)) {
    directoryContainsMarkdownCache.set(
      normalizedRelativePath,
      (async () => {
        const entries = await readDirectoryEntries(normalizedRelativePath);

        for (const entry of entries) {
          const childRelativePath = normalizeDocPath(
            path.join(normalizedRelativePath, entry.name)
          );

          if (entry.isFile() && hasMarkdownExtension(entry.name)) {
            return true;
          }

          if (entry.isDirectory() && (await directoryContainsMarkdown(childRelativePath))) {
            return true;
          }
        }

        return false;
      })()
    );
  }

  return directoryContainsMarkdownCache.get(normalizedRelativePath);
}
