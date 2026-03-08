import fs from 'node:fs';
import path from 'node:path';

import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';

const SOURCE_DIRS = ['src/features', 'src/shared'];
const CONTEXT_FILE_PATTERNS = [/Context\.tsx$/, /context\.tsx$/];
const PROVIDER_VALUE_FIELD_THRESHOLD = 15;
const OVERSIZED_LOC_THRESHOLD = 500;

const listContextFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listContextFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
    if (CONTEXT_FILE_PATTERNS.some((p) => p.test(entry.name))) {
      acc.push(absolutePath);
    }
  }
  return acc;
};

const listAllTsxFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listAllTsxFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      acc.push(absolutePath);
    }
  }
  return acc;
};

const countLines = (text) => text.split('\n').length;

const countProviderValueFields = (text) => {
  // Look for <XxxContext.Provider value={{ ... }}> or value={someValue}
  // Try to find the value object literal in useMemo or direct value
  const valueMemoMatch = text.match(/useMemo\s*\(\s*\(\)\s*=>\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (valueMemoMatch) {
    const objectBody = valueMemoMatch[1];
    // Count top-level comma-separated fields (rough heuristic)
    const fields = objectBody.split(',').filter((f) => f.trim().length > 0 && /\w/.test(f));
    return fields.length;
  }

  // Try value={{ field1, field2, ... }} pattern
  const valueMatch = text.match(/value=\{\{([\s\S]*?)\}\}/);
  if (valueMatch) {
    const objectBody = valueMatch[1];
    const fields = objectBody.split(',').filter((f) => f.trim().length > 0 && /\w/.test(f));
    return fields.length;
  }

  return 0;
};

const hasGenericErrorThrow = (text) => {
  // Check for `throw new Error(` that isn't an AppError or custom error
  const throwMatches = text.matchAll(/throw\s+new\s+(\w+)\s*\(/g);
  for (const match of throwMatches) {
    const errorClass = match[1];
    if (errorClass === 'Error' || errorClass === 'TypeError' || errorClass === 'RangeError') {
      return true;
    }
  }
  return false;
};

const getContextDirInfo = (contextFilePath) => {
  const dir = path.dirname(contextFilePath);
  const dirName = path.basename(dir);

  // Check if there's a hooks directory or companion hook files
  const hooksDir = path.join(dir, 'hooks');
  const parentHooksDir = path.join(path.dirname(dir), 'hooks');

  const contextBaseName = path.basename(contextFilePath, '.tsx').replace(/Context$/, '');

  const hasStateHook = (searchDir) => {
    if (!fs.existsSync(searchDir)) return false;
    try {
      const entries = fs.readdirSync(searchDir);
      return entries.some((e) =>
        e.toLowerCase().includes(`use${contextBaseName.toLowerCase()}state`) ||
        e.toLowerCase().includes('usestate')
      );
    } catch {
      return false;
    }
  };

  const hasActionsHook = (searchDir) => {
    if (!fs.existsSync(searchDir)) return false;
    try {
      const entries = fs.readdirSync(searchDir);
      return entries.some((e) =>
        e.toLowerCase().includes(`use${contextBaseName.toLowerCase()}actions`) ||
        e.toLowerCase().includes('useactions')
      );
    } catch {
      return false;
    }
  };

  return {
    hasStateHook: hasStateHook(hooksDir) || hasStateHook(parentHooksDir) || hasStateHook(dir),
    hasActionsHook: hasActionsHook(hooksDir) || hasActionsHook(parentHooksDir) || hasActionsHook(dir),
  };
};

export const analyzeContextHealth = ({ root = process.cwd() } = {}) => {
  const issues = [];
  let contextFileCount = 0;

  for (const sourceDir of SOURCE_DIRS) {
    const absoluteDir = path.join(root, sourceDir);
    const contextFiles = listContextFiles(absoluteDir);

    for (const absolutePath of contextFiles) {
      const relativePath = toRepoRelativePath(root, absolutePath);
      const rawText = fs.readFileSync(absolutePath, 'utf8');
      contextFileCount++;

      // Rule: context-generic-error
      if (hasGenericErrorThrow(rawText)) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'context-generic-error',
            file: relativePath,
            message: 'Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking.',
          })
        );
      }

      // Rule: context-monolith
      const fieldCount = countProviderValueFields(rawText);
      if (fieldCount > PROVIDER_VALUE_FIELD_THRESHOLD) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'context-monolith',
            file: relativePath,
            message: `Context provider value has ~${fieldCount} fields (threshold: ${PROVIDER_VALUE_FIELD_THRESHOLD}). Consider splitting into domain-specific contexts.`,
          })
        );
      }

      // Rule: context-oversized
      const loc = countLines(rawText);
      if (loc > OVERSIZED_LOC_THRESHOLD) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'context-oversized',
            file: relativePath,
            message: `Context file is ${loc} lines (threshold: ${OVERSIZED_LOC_THRESHOLD}). Consider extracting logic into hooks or splitting the context.`,
          })
        );
      }

      // Rule: context-missing-split
      const isProvider = rawText.includes('.Provider') || rawText.includes('createContext');
      if (isProvider) {
        const dirInfo = getContextDirInfo(absolutePath);
        if (!dirInfo.hasStateHook && !dirInfo.hasActionsHook) {
          // Only flag if the context seems substantial (not a simple value context)
          if (fieldCount > 3 || loc > 100) {
            issues.push(
              createIssue({
                severity: 'info',
                ruleId: 'context-missing-split',
                file: relativePath,
                message: 'Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization.',
              })
            );
          }
        }
      }
    }
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      contextFileCount,
    },
    scope: {
      sourceDirs: SOURCE_DIRS,
      providerValueFieldThreshold: PROVIDER_VALUE_FIELD_THRESHOLD,
      oversizedLocThreshold: OVERSIZED_LOC_THRESHOLD,
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
