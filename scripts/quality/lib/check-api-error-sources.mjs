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

const listRouteFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listRouteFiles(absolutePath, acc);
      continue;
    }
    if (entry.isFile() && entry.name === 'route.ts') {
      acc.push(absolutePath);
    }
  }
  return acc;
};

const listHandlerFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listHandlerFiles(absolutePath, acc);
      continue;
    }
    if (entry.isFile() && /^handler\.(ts|js)$/.test(entry.name)) {
      acc.push(absolutePath);
    }
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

export const analyzeApiErrorSources = ({ root = process.cwd() } = {}) => {
  const issues = [];
  const apiDir = path.join(root, API_ROOT);
  let routeFileCount = 0;
  let handlerFileCount = 0;

  // --- Analyze route.ts files ---
  const routeFiles = listRouteFiles(apiDir);

  for (const absolutePath of routeFiles) {
    routeFileCount++;
    const relativePath = toRepoRelativePath(root, absolutePath);
    const rel = path.relative(apiDir, absolutePath).replace(/\\/g, '/').replace(/\/route\.ts$/, '');
    const sourceBase = rel.split('/').join('.');
    const text = fs.readFileSync(absolutePath, 'utf8');

    // Check: Does this route use apiHandler?
    const hasApiHandler = /\bapiHandler(?:WithParams)?\s*\(/.test(text);
    const isDelegated = /export\s*\{[^}]+\}\s*from\s*['"]/.test(text);
    const exportsHttpMethods = /export\s+(?:const|async\s+function)\s+(GET|POST|PUT|PATCH|DELETE)\b/.test(text);

    // Rule: api-handler-missing-wrapper
    if (!hasApiHandler && !isDelegated && exportsHttpMethods) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'api-handler-missing-wrapper',
          file: relativePath,
          message: 'Route exports HTTP methods without apiHandler/apiHandlerWithParams wrapper.',
        })
      );
    }

    // Original source mismatch check
    const exportMatches = [
      ...text.matchAll(
        /export const (GET|POST|PUT|PATCH|DELETE) = apiHandler(?:WithParams)?[^\n]*\{\s*source:\s*"([^"]+)"\s*\}/g
      ),
    ];
    const exportMap = new Map(exportMatches.map((m) => [m[1], m[2]]));

    for (const [method, source] of exportMap) {
      if (!method || !source) continue;
      const expected = `${sourceBase}.${method}`;
      if (source !== expected) {
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'source-mismatch-handler',
            file: relativePath,
            message: `Handler source "${source}" does not match expected "${expected}".`,
          })
        );
      }
    }

    // Error response source mismatch
    const errorSourceMatches = [
      ...text.matchAll(/createErrorResponse\([^)]*\{[^}]*source:\s*"([^"]+)"/g),
    ];
    for (const match of errorSourceMatches) {
      const source = match[1];
      if (!source || exportMap.size === 0) continue;
      if (Array.from(exportMap.values()).includes(source)) continue;
      const method = Array.from(exportMap.keys()).find((key) => source.endsWith(`.${key}`));
      if (!method) continue;
      const expected = `${sourceBase}.${method}`;
      if (source !== expected) {
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'source-mismatch-error-response',
            file: relativePath,
            message: `createErrorResponse source "${source}" does not match expected "${expected}".`,
          })
        );
      }
    }

    // Rule: raw-new-response in route files
    const rawResponseRegex = /\bnew\s+Response\s*\(/g;
    let match;
    while ((match = rawResponseRegex.exec(text)) !== null) {
      // Skip if it's inside a comment
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      const lineContent = text.slice(lineStart, match.index);
      if (lineContent.includes('//') || lineContent.includes('*')) continue;

      const line = getLineNumber(text, match.index);
      issues.push(
        createIssue({
          severity: 'warn',
          ruleId: 'raw-new-response',
          file: relativePath,
          line,
          message: 'Direct `new Response()` usage. Consider using createErrorResponse/createSuccessResponse for consistent error handling.',
        })
      );
    }
  }

  // --- Analyze handler.ts files ---
  const handlerFiles = listHandlerFiles(apiDir);

  for (const absolutePath of handlerFiles) {
    handlerFileCount++;
    const relativePath = toRepoRelativePath(root, absolutePath);
    const text = fs.readFileSync(absolutePath, 'utf8');

    // Rule: unchecked-req-json in handler files
    const reqJsonRegex = /\b(?:req|request)\.json\s*\(\s*\)/g;
    let match;
    while ((match = reqJsonRegex.exec(text)) !== null) {
      // Check for nearby parseJsonBody or Zod validation
      const start = Math.max(0, match.index - 300);
      const end = Math.min(text.length, match.index + 300);
      const neighborhood = text.slice(start, end);
      const hasValidation = /parseJsonBody|\.parse\(|\.safeParse\(|z\.object/.test(neighborhood);
      if (!hasValidation) {
        const line = getLineNumber(text, match.index);
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'unchecked-req-json',
            file: relativePath,
            line,
            message: 'req.json() without parseJsonBody or Zod schema. Use parseJsonBody() for consistent validation.',
          })
        );
      }
    }

    // Rule: raw-new-response in handler files
    const rawResponseRegex2 = /\bnew\s+Response\s*\(/g;
    while ((match = rawResponseRegex2.exec(text)) !== null) {
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      const lineContent = text.slice(lineStart, match.index);
      if (lineContent.includes('//') || lineContent.includes('*')) continue;

      const line = getLineNumber(text, match.index);
      issues.push(
        createIssue({
          severity: 'warn',
          ruleId: 'raw-new-response',
          file: relativePath,
          line,
          message: 'Direct `new Response()` usage. Consider using createErrorResponse/createSuccessResponse.',
        })
      );
    }
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      routeFileCount,
      handlerFileCount,
    },
    scope: {
      root: API_ROOT,
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
