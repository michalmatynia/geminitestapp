import fs from 'node:fs';
import path from 'node:path';

import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';

const API_ROOT = path.join('src', 'app', 'api');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const listSourceFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    if (/\.test\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const getLineNumber = (text, index) => {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
};

const VALIDATION_MARKERS = [
  'parseJsonBody',
  'z.object',
  'z.array',
  'z.string',
  'z.number',
  '.parse(',
  '.safeParse(',
  'zodSchema',
  'schema.parse',
  'schema.safeParse',
];

const hasNearbyValidation = (text, matchIndex, range = 500) => {
  const start = Math.max(0, matchIndex - range);
  const end = Math.min(text.length, matchIndex + range);
  const neighborhood = text.slice(start, end);
  return VALIDATION_MARKERS.some((marker) => neighborhood.includes(marker));
};

const extractDynamicRouteParams = (relativePath) => {
  const params = [];
  const matches = relativePath.matchAll(/\[([^\]]+)\]/g);
  for (const match of matches) {
    params.push(match[1]);
  }
  return params;
};

export const analyzeApiInputValidation = ({ root = process.cwd() } = {}) => {
  const issues = [];
  let fileCount = 0;
  let totalHandlers = 0;
  let validatedHandlers = 0;

  const apiDir = path.join(root, API_ROOT);
  const sourceFiles = listSourceFiles(apiDir);

  for (const absolutePath of sourceFiles) {
    const relativePath = toRepoRelativePath(root, absolutePath);
    const rawText = fs.readFileSync(absolutePath, 'utf8');
    fileCount++;

    const isRouteFile = /route\.(ts|js)$/.test(absolutePath);
    const isHandlerFile = /handler\.(ts|js)$/.test(absolutePath);

    if (!isRouteFile && !isHandlerFile) continue;
    totalHandlers++;

    // Check for req.json() without schema validation
    const reqJsonRegex = /\breq\.json\s*\(\s*\)/g;
    let match;
    let hasUnvalidatedJson = false;
    while ((match = reqJsonRegex.exec(rawText)) !== null) {
      if (!hasNearbyValidation(rawText, match.index)) {
        hasUnvalidatedJson = true;
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'req-json-no-schema',
            file: relativePath,
            line,
            message: 'req.json() called without Zod schema validation. Use parseJsonBody() with a Zod schema.',
          })
        );
      }
    }

    // Also check request.json() pattern
    const requestJsonRegex = /\brequest\.json\s*\(\s*\)/g;
    while ((match = requestJsonRegex.exec(rawText)) !== null) {
      if (!hasNearbyValidation(rawText, match.index)) {
        hasUnvalidatedJson = true;
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'req-json-no-schema',
            file: relativePath,
            line,
            message: 'request.json() called without Zod schema validation. Use parseJsonBody() with a Zod schema.',
          })
        );
      }
    }

    // Check for unvalidated URL params in dynamic routes
    const routeParams = extractDynamicRouteParams(relativePath);
    if (routeParams.length > 0) {
      const hasParamValidation = VALIDATION_MARKERS.some((m) => rawText.includes(m));
      if (!hasParamValidation) {
        for (const param of routeParams) {
          // Check if the param is actually used
          if (rawText.includes(`params.${param}`) || rawText.includes(`params['${param}']`)) {
            issues.push(
              createIssue({
                severity: 'warn',
                ruleId: 'url-param-unvalidated',
                file: relativePath,
                message: `Dynamic route param "${param}" is used without Zod validation.`,
              })
            );
          }
        }
      }
    }

    // Check for unvalidated searchParams
    const searchParamsRegex = /searchParams\.get\s*\(/g;
    while ((match = searchParamsRegex.exec(rawText)) !== null) {
      if (!hasNearbyValidation(rawText, match.index, 300)) {
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'query-param-unvalidated',
            file: relativePath,
            line,
            message: 'searchParams.get() used without Zod schema validation.',
          })
        );
      }
    }

    if (!hasUnvalidatedJson) {
      validatedHandlers++;
    }
  }

  const coveragePercent = totalHandlers > 0 ? Math.round((validatedHandlers / totalHandlers) * 100) : 100;
  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      fileCount,
      totalHandlers,
      validatedHandlers,
      coveragePercent,
    },
    scope: {
      root: API_ROOT,
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
