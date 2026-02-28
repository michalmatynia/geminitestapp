import fs from 'node:fs/promises';
import path from 'node:path';

const walk = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const children = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );

  return children.flat();
};

const run = async () => {
  const root = process.cwd();
  const apiDir = path.join(root, 'src/app/api');
  const files = await walk(apiDir);
  const routeFiles = files.filter((f) => f.endsWith('route.ts') || f.endsWith('route.tsx'));

  const missing = [];

  for (const file of routeFiles) {
    const content = await fs.readFile(file, 'utf8');
    const relativePath = path.relative(root, file);

    const hasForceDynamic = /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(content);
    const hasRevalidate = /export\s+const\s+revalidate\s*=/.test(content);
    const hasCacheControl = /Cache-Control/i.test(content);
    const hasApiHandler = /\bapiHandlerWithParams\b|\bapiHandler\s*\(/.test(content);
    const hasCacheOption = /cacheControl\s*:/.test(content);

    if (
      !hasForceDynamic &&
      !hasRevalidate &&
      !hasCacheControl &&
      !hasApiHandler &&
      !hasCacheOption
    ) {
      missing.push(relativePath);
    }
  }

  console.log(`Checked ${routeFiles.length} routes.`);
  console.log('Routes missing explicit caching policy:');
  missing.forEach((m) => console.log(`- ${m}`));
};

run();
