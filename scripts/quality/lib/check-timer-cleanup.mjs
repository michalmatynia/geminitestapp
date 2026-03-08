import fs from 'node:fs';
import path from 'node:path';

import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';

const SOURCE_ROOT = 'src';

const listTsxFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listTsxFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
    // Only scan .tsx files (React components) and hooks (.ts files with use prefix)
    if (entry.name.endsWith('.tsx') || (entry.name.endsWith('.ts') && entry.name.startsWith('use'))) {
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

export const analyzeTimerCleanup = ({ root = process.cwd() } = {}) => {
  const issues = [];
  let fileCount = 0;

  const sourceFiles = listTsxFiles(path.join(root, SOURCE_ROOT));

  for (const absolutePath of sourceFiles) {
    const relativePath = toRepoRelativePath(root, absolutePath);
    const rawText = fs.readFileSync(absolutePath, 'utf8');
    fileCount++;

    // Rule: setinterval-no-cleanup
    const setIntervalRegex = /\bsetInterval\s*\(/g;
    let match;
    while ((match = setIntervalRegex.exec(rawText)) !== null) {
      if (!rawText.includes('clearInterval')) {
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'setinterval-no-cleanup',
            file: relativePath,
            line,
            message: 'setInterval() used without clearInterval() in the same file. Ensure cleanup in useEffect return.',
          })
        );
        break; // One issue per file for this rule
      }
    }

    // Rule: settimeout-no-cleanup
    // Check if setTimeout is used inside useEffect without cleanup
    const hasUseEffect = rawText.includes('useEffect');
    const setTimeoutRegex = /\bsetTimeout\s*\(/g;
    while ((match = setTimeoutRegex.exec(rawText)) !== null) {
      if (hasUseEffect && !rawText.includes('clearTimeout')) {
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'settimeout-no-cleanup',
            file: relativePath,
            line,
            message: 'setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount.',
          })
        );
        break; // One issue per file
      }
    }

    // Rule: addeventlistener-no-removal
    const addListenerRegex = /\.addEventListener\s*\(/g;
    while ((match = addListenerRegex.exec(rawText)) !== null) {
      if (!rawText.includes('removeEventListener')) {
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'addeventlistener-no-removal',
            file: relativePath,
            line,
            message: 'addEventListener() without matching removeEventListener() in the same file. Ensure cleanup on unmount.',
          })
        );
        break; // One issue per file
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
      fileCount,
    },
    scope: {
      root: SOURCE_ROOT,
      fileTypes: ['.tsx', 'use*.ts'],
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
