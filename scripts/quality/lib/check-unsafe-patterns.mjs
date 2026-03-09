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
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const DOUBLE_ASSERTION_ALLOWLIST = new Set([
  // Add justified cases here
]);

const listSourceFiles = (absoluteDir, { includeTests = false } = {}, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, { includeTests }, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    if (!includeTests && /\.test\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const isTestFile = (filePath) => /\.test\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath);

const isTypeDeclarationFile = (filePath) => filePath.endsWith('.d.ts');

const stripStringsAndComments = (text) => {
  // Replace string literals and template literals with placeholders
  let result = text;
  // Block comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length));
  // Single-line strings (double/single quotes) — simple approach
  result = result.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, (match) => ' '.repeat(match.length));
  // Template literals (basic — doesn't handle nested)
  result = result.replace(/`(?:[^`\\]|\\.)*`/g, (match) => ' '.repeat(match.length));
  // Single-line comments
  result = result.replace(/\/\/.*$/gm, (match) => ' '.repeat(match.length));
  return result;
};

const RULES = [
  {
    id: 'double-assertion',
    severity: 'error',
    pattern: /\bas\s+unknown\s+as\s+/g,
    message: 'Unsafe double type assertion (as unknown as). Use a type guard or proper narrowing instead.',
    skipTests: true,
    skipTypeDeclarations: true,
    allowlist: DOUBLE_ASSERTION_ALLOWLIST,
    stripContent: true,
  },
  {
    id: 'ts-ignore-no-reason',
    severity: 'warn',
    // @ts-ignore not followed by explanatory text (at least one word character after whitespace)
    pattern: /\/\/\s*@ts-ignore(?:\s*$|\s*\/\/|\s*\*\/)/gm,
    message: '@ts-ignore without an explanatory comment. Add a reason: // @ts-ignore -- reason here',
    skipTests: false,
    skipTypeDeclarations: false,
    allowlist: null,
    stripContent: false,
  },
  {
    id: 'ts-expect-error-no-reason',
    severity: 'warn',
    pattern: /\/\/\s*@ts-expect-error(?:\s*$|\s*\/\/|\s*\*\/)/gm,
    message: '@ts-expect-error without an explanatory comment. Add a reason: // @ts-expect-error -- reason here',
    skipTests: false,
    skipTypeDeclarations: false,
    allowlist: null,
    stripContent: false,
  },
  {
    id: 'explicit-any',
    severity: 'info',
    // Matches ": any", "as any", "<any>", but not "any" as part of a word
    pattern: /(?::\s*any\b|(?<!\w)as\s+any\b)/g,
    message: 'Explicit `any` type usage. Consider using a specific type or `unknown`.',
    skipTests: true,
    skipTypeDeclarations: true,
    allowlist: null,
    stripContent: true,
  },
  {
    id: 'eslint-disable',
    severity: 'info',
    pattern: /\/[/*]\s*eslint-disable(?:-next-line|-line)?\s+([^\s*][^\n*]*)/g,
    message: null, // Dynamically generated with the disabled rule names
    skipTests: false,
    skipTypeDeclarations: false,
    allowlist: null,
    stripContent: false,
  },
  {
    id: 'non-null-assertion',
    severity: 'info',
    // Match identifier followed by ! then . or [ (non-null assertion access)
    // Exclude type positions by not matching after : or extends or implements
    pattern: /\w+!\s*[.[]/g,
    message: 'Non-null assertion operator `!`. Consider using optional chaining or a null check.',
    skipTests: true,
    skipTypeDeclarations: true,
    allowlist: null,
    stripContent: true,
  },
];

const getLineNumber = (text, index) => {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
};

export const analyzeUnsafePatterns = ({ root = process.cwd(), includeTests = false } = {}) => {
  const issues = [];
  const trendCounters = {
    doubleAssertionCount: 0,
    anyCount: 0,
    eslintDisableCount: 0,
    nonNullAssertionCount: 0,
    tsIgnoreCount: 0,
    tsExpectErrorCount: 0,
  };
  const eslintDisabledRules = new Map(); // ruleName -> count
  let fileCount = 0;

  const sourceFiles = listSourceFiles(path.join(root, SOURCE_ROOT), { includeTests });

  for (const absolutePath of sourceFiles) {
    const relativePath = toRepoRelativePath(root, absolutePath);
    const isTest = isTestFile(absolutePath);
    const isTypeDec = isTypeDeclarationFile(absolutePath);
    const rawText = fs.readFileSync(absolutePath, 'utf8');
    fileCount++;

    for (const rule of RULES) {
      if (rule.skipTests && isTest) continue;
      if (rule.skipTypeDeclarations && isTypeDec) continue;
      if (rule.allowlist?.has(relativePath)) continue;

      const searchText = rule.stripContent ? stripStringsAndComments(rawText) : rawText;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;

      while ((match = regex.exec(searchText)) !== null) {
        const line = getLineNumber(rawText, match.index);

        let message = rule.message;
        if (rule.id === 'eslint-disable') {
          const disabledRules = (match[1] || '').trim();
          message = `eslint-disable comment disabling: ${disabledRules}`;
          // Track which rules are disabled
          for (const ruleName of disabledRules.split(/[,\s]+/).filter(Boolean)) {
            eslintDisabledRules.set(ruleName, (eslintDisabledRules.get(ruleName) || 0) + 1);
          }
        }

        // Update trend counters
        if (rule.id === 'double-assertion') trendCounters.doubleAssertionCount++;
        if (rule.id === 'explicit-any') trendCounters.anyCount++;
        if (rule.id === 'eslint-disable') trendCounters.eslintDisableCount++;
        if (rule.id === 'non-null-assertion') trendCounters.nonNullAssertionCount++;
        if (rule.id === 'ts-ignore-no-reason') trendCounters.tsIgnoreCount++;
        if (rule.id === 'ts-expect-error-no-reason') trendCounters.tsExpectErrorCount++;

        issues.push(
          createIssue({
            severity: rule.severity,
            ruleId: rule.id,
            file: relativePath,
            line,
            message,
          })
        );
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
      includeTests,
      doubleAssertionAllowlist: [...DOUBLE_ASSERTION_ALLOWLIST],
    },
    trendCounters,
    eslintDisabledRules: Object.fromEntries(
      [...eslintDisabledRules.entries()].sort((a, b) => b[1] - a[1])
    ),
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
