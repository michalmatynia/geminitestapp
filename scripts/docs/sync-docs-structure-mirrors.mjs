import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'docs', 'documentation', 'structure-manifest.json');

async function loadManifest() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function ensureMirrorPair(pair) {
  const canonicalPath = path.join(root, pair.canonical);
  const mirrorPath = path.join(root, pair.mirror);
  const canonicalContent = await fs.readFile(canonicalPath, 'utf8');

  await fs.mkdir(path.dirname(mirrorPath), { recursive: true });

  let currentMirrorContent = null;
  try {
    currentMirrorContent = await fs.readFile(mirrorPath, 'utf8');
  } catch {
    currentMirrorContent = null;
  }

  if (currentMirrorContent === canonicalContent) {
    return { updated: false, mirror: pair.mirror, canonical: pair.canonical };
  }

  await fs.writeFile(mirrorPath, canonicalContent, 'utf8');
  return { updated: true, mirror: pair.mirror, canonical: pair.canonical };
}

async function run() {
  const manifest = await loadManifest();
  const pairs = manifest.compatibilityMirrorPairs ?? [];

  if (pairs.length === 0) {
    console.log('No compatibility mirrors declared in the docs structure manifest.');
    return;
  }

  const results = [];
  for (const pair of pairs) {
    results.push(await ensureMirrorPair(pair));
  }

  const updated = results.filter((result) => result.updated);

  if (updated.length === 0) {
    console.log(`Docs structure mirrors already in sync for ${results.length} pair(s).`);
    return;
  }

  console.log(`Updated ${updated.length} docs structure mirror pair(s):`);
  for (const result of updated) {
    console.log(`- ${result.mirror} <= ${result.canonical}`);
  }
}

run().catch((error) => {
  console.error('Failed to sync docs structure mirrors.');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
