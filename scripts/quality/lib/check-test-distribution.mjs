import fs from 'node:fs';
import path from 'node:path';

import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';

const FEATURES_DIR = 'src/features';
const TEST_DIRS = ['src', '__tests__', 'e2e'];

const listAllFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listAllFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const isTestFile = (filePath) =>
  /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath);

const getLineNumber = (text, index) => {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
};

export const analyzeTestDistribution = ({ root = process.cwd() } = {}) => {
  const issues = [];

  // 1. Find all feature directories
  const featuresDir = path.join(root, FEATURES_DIR);
  const featureNames = fs.existsSync(featuresDir)
    ? fs.readdirSync(featuresDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [];

  // 2. Count test files per feature
  const featureTestCounts = new Map();
  for (const feature of featureNames) {
    featureTestCounts.set(feature, 0);
  }

  // Scan all test directories for test files
  let totalTestFiles = 0;
  let onlyCount = 0;
  let skipCount = 0;
  const testFiles = [];

  for (const testDir of TEST_DIRS) {
    const absoluteDir = path.join(root, testDir);
    const allFiles = listAllFiles(absoluteDir);

    for (const filePath of allFiles) {
      if (!isTestFile(filePath)) continue;
      totalTestFiles++;
      const relativePath = toRepoRelativePath(root, filePath);
      testFiles.push(relativePath);

      // Attribute to feature
      for (const feature of featureNames) {
        if (relativePath.includes(`/features/${feature}/`) || relativePath.includes(`/features/${feature}.`)) {
          featureTestCounts.set(feature, (featureTestCounts.get(feature) || 0) + 1);
        }
      }

      // Check for .only and .skip
      const rawText = fs.readFileSync(filePath, 'utf8');

      // Rule: test-only-left
      const onlyRegex = /\b(?:it|test|describe)\.only\s*\(/g;
      let match;
      while ((match = onlyRegex.exec(rawText)) !== null) {
        onlyCount++;
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'test-only-left',
            file: relativePath,
            line,
            message: '.only() left in test file. This will skip other tests in CI.',
          })
        );
      }

      // Rule: test-skip-left
      const skipRegex = /\b(?:it|test|describe)\.skip\s*\(/g;
      while ((match = skipRegex.exec(rawText)) !== null) {
        skipCount++;
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'info',
            ruleId: 'test-skip-left',
            file: relativePath,
            line,
            message: '.skip() in test file. Consider removing or adding a TODO comment.',
          })
        );
      }
    }
  }

  // Rule: feature-no-tests
  const featuresWithTests = [];
  const featuresWithoutTests = [];
  for (const [feature, count] of featureTestCounts) {
    if (count === 0) {
      featuresWithoutTests.push(feature);
      issues.push(
        createIssue({
          severity: 'warn',
          ruleId: 'feature-no-tests',
          message: `Feature "${feature}" has no test files. Consider adding tests for critical paths.`,
          context: `src/features/${feature}/`,
        })
      );
    } else {
      featuresWithTests.push({ feature, testCount: count });
    }
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      featureCount: featureNames.length,
      featuresWithTestCount: featuresWithTests.length,
      featuresWithoutTestCount: featuresWithoutTests.length,
      totalTestFiles,
      onlyCount,
      skipCount,
    },
    scope: {
      featuresDir: FEATURES_DIR,
      testDirs: TEST_DIRS,
    },
    featuresWithTests: featuresWithTests.sort((a, b) => b.testCount - a.testCount),
    featuresWithoutTests,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
