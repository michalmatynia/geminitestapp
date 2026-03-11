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

const isE2eTestFile = (relativePath) => relativePath.startsWith('e2e/');

const negativePathFileHint = /(?:^|\/|\.)(?:invalid|error|fail|missing|denied|unauthori[sz]ed|forbidden|reject|guard|fallback|timeout|not-found)(?:[./-]|$)/i;
const negativePathContentHint =
  /\.\s*rejects\b|\btoThrow(?:Error)?\b|\bassert\.rejects\b|\bthrows?\b|\bunauthori[sz]ed\b|\bforbidden\b|\binvalid\b|\bmissing\b|\bnot found\b/i;

const createFeatureSignal = (feature) => ({
  feature,
  testCount: 0,
  fastTestCount: 0,
  e2eTestCount: 0,
  negativePathTestCount: 0,
});

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
  const featureSignals = new Map();
  for (const feature of featureNames) {
    featureSignals.set(feature, createFeatureSignal(feature));
  }

  // Scan all test directories for test files
  let totalTestFiles = 0;
  let onlyCount = 0;
  let skipCount = 0;
  let todoCount = 0;
  const testFiles = [];

  for (const testDir of TEST_DIRS) {
    const absoluteDir = path.join(root, testDir);
    const allFiles = listAllFiles(absoluteDir);

    for (const filePath of allFiles) {
      if (!isTestFile(filePath)) continue;
      totalTestFiles++;
      const relativePath = toRepoRelativePath(root, filePath);
      testFiles.push(relativePath);

      const rawText = fs.readFileSync(filePath, 'utf8');
      const isNegativePathTest =
        negativePathFileHint.test(relativePath) || negativePathContentHint.test(rawText);
      const isFastTest = !isE2eTestFile(relativePath);

      // Attribute to feature
      for (const feature of featureNames) {
        if (relativePath.includes(`/features/${feature}/`) || relativePath.includes(`/features/${feature}.`)) {
          const signal = featureSignals.get(feature) ?? createFeatureSignal(feature);
          signal.testCount += 1;
          if (isFastTest) {
            signal.fastTestCount += 1;
          } else {
            signal.e2eTestCount += 1;
          }
          if (isNegativePathTest) {
            signal.negativePathTestCount += 1;
          }
          featureSignals.set(feature, signal);
        }
      }

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

      const todoRegex = /\b(?:it|test|describe)\.todo\s*\(/g;
      while ((match = todoRegex.exec(rawText)) !== null) {
        todoCount++;
        const line = getLineNumber(rawText, match.index);
        issues.push(
          createIssue({
            severity: 'info',
            ruleId: 'test-todo-left',
            file: relativePath,
            line,
            message: '.todo() in test file. Convert placeholders into executable coverage when the behavior is ready.',
          })
        );
      }
    }
  }

  // Rule: feature-no-tests
  const featuresWithTests = [];
  const featuresWithoutTests = [];
  const featuresWithoutFastTests = [];
  const featuresWithoutNegativeTests = [];
  for (const [feature, signal] of featureSignals) {
    if (signal.testCount === 0) {
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
      featuresWithTests.push(signal);
      if (signal.fastTestCount === 0) {
        featuresWithoutFastTests.push(feature);
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'feature-no-fast-tests',
            message: `Feature "${feature}" has tests, but none of them are fast local tests outside e2e.`,
            context: `src/features/${feature}/`,
          })
        );
      }
      if (signal.negativePathTestCount === 0) {
        featuresWithoutNegativeTests.push(feature);
        issues.push(
          createIssue({
            severity: 'info',
            ruleId: 'feature-no-negative-tests',
            message: `Feature "${feature}" has tests, but no negative-path signal was detected in its attributed test files.`,
            context: `src/features/${feature}/`,
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
      featureCount: featureNames.length,
      featuresWithTestCount: featuresWithTests.length,
      featuresWithoutTestCount: featuresWithoutTests.length,
      featuresWithoutFastTestCount: featuresWithoutFastTests.length,
      featuresWithoutNegativeTestCount: featuresWithoutNegativeTests.length,
      totalTestFiles,
      onlyCount,
      skipCount,
      todoCount,
    },
    scope: {
      featuresDir: FEATURES_DIR,
      testDirs: TEST_DIRS,
    },
    featuresWithTests: featuresWithTests.sort((left, right) => {
      if (right.testCount !== left.testCount) {
        return right.testCount - left.testCount;
      }
      return left.feature.localeCompare(right.feature);
    }),
    featuresWithoutTests,
    featuresWithoutFastTests,
    featuresWithoutNegativeTests,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
