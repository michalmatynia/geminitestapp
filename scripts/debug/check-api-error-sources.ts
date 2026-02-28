import fs from 'fs';
import path from 'path';

const apiRoot = fs.existsSync(path.join(process.cwd(), 'src', 'app', 'api'))
  ? path.join(process.cwd(), 'src', 'app', 'api')
  : path.join(process.cwd(), 'app', 'api');

const listRouteFiles = (dir: string, acc: string[] = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listRouteFiles(fullPath, acc);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      acc.push(fullPath);
    }
  }
  return acc;
};

const routeFiles = listRouteFiles(apiRoot);

type Mismatch = {
  file: string;
  kind: 'handler' | 'createErrorResponse';
  method: string;
  source: string;
  expected: string;
};

const mismatches: Mismatch[] = [];

for (const file of routeFiles) {
  const rel = path
    .relative(apiRoot, file)
    .replace(/\\/g, '/')
    .replace(/\/route\.ts$/, '');
  const sourceBase = rel.split('/').join('.');
  const text = fs.readFileSync(file, 'utf8');

  const exportMatches = [
    ...text.matchAll(
      /export const (GET|POST|PUT|PATCH|DELETE) = apiHandler(?:WithParams)?[^\n]*\{ source: \"([^\"]+)\" \}/g
    ),
  ];
  const exportMap = new Map(exportMatches.map((m) => [m[1], m[2]]));
  if (exportMap.size === 0) continue;

  for (const [method, source] of exportMap) {
    if (!method || !source) continue;
    const expected = `${sourceBase}.${method}`;
    if (source !== expected) {
      mismatches.push({
        file: rel,
        kind: 'handler',
        method,
        source,
        expected,
      });
    }
  }

  const errorSourceMatches = [
    ...text.matchAll(/createErrorResponse\([^\)]*\{[^}]*source: \"([^\"]+)\"/g),
  ];
  for (const match of errorSourceMatches) {
    const source = match[1];
    if (!source) continue;
    if (exportMap.size === 0) continue;
    if (Array.from(exportMap.values()).includes(source)) continue;
    const method = Array.from(exportMap.keys()).find((key) => source.endsWith(`.${key}`));
    if (!method) continue;
    const expected = `${sourceBase}.${method}`;
    if (source !== expected) {
      mismatches.push({
        file: rel,
        kind: 'createErrorResponse',
        method,
        source,
        expected,
      });
    }
  }
}

if (mismatches.length > 0) {
  console.error(`[check-api-error-sources] Found ${mismatches.length} mismatch(es):`);
  for (const mismatch of mismatches) {
    console.error(
      `- ${mismatch.file} (${mismatch.kind}) ${mismatch.method}: "${mismatch.source}" -> "${mismatch.expected}"`
    );
  }
  process.exit(1);
}

console.log('[check-api-error-sources] OK');
