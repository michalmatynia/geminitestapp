import fs from 'fs';
import path from 'path';

const reportPath = 'scripts/quality/generate-weekly-report.mjs';
const content = fs.readFileSync(reportPath, 'utf8');

const checksPath = 'scripts/quality/lib/weekly-report-checks.mjs';
let checksContent = fs.readFileSync(checksPath, 'utf8');

const markdownPath = 'scripts/quality/lib/weekly-report-markdown.mjs';
let markdownContent = fs.readFileSync(markdownPath, 'utf8');

const buildPreflightPath = 'scripts/quality/lib/weekly-report-build-preflight.mjs';

// Extracted Strings
let newReport = content;

// 1. extract formatDuration
const formatDurationRegex = /const formatDuration = \((.*?)\) => {[\s\S]*?};\n\n/m;
const formatDurationMatch = newReport.match(formatDurationRegex);
const formatDurationStr = `export ${formatDurationMatch[0]}`;
newReport = newReport.replace(formatDurationMatch[0], '');

// 2. extract formatDelta
const formatDeltaRegex = /const formatDelta = \((.*?)\) => {[\s\S]*?};\n\n/m;
const formatDeltaMatch = newReport.match(formatDeltaRegex);
const formatDeltaStr = `export ${formatDeltaMatch[0]}`;
newReport = newReport.replace(formatDeltaMatch[0], '');

// 3. extract toMarkdown
const toMarkdownRegex = /const toMarkdown = \(report\) => {[\s\S]*?};\n\n/m;
let toMarkdownMatch = newReport.match(toMarkdownRegex);
let toMarkdownStr = `export const toMarkdown = (report, { includeFullLint, includeFullUnit, includeE2E }) => {` + toMarkdownMatch[0].slice('const toMarkdown = (report) => {'.length);
newReport = newReport.replace(toMarkdownMatch[0], '');

markdownContent += `\n${formatDurationStr}${formatDeltaStr}${toMarkdownStr}`;
fs.writeFileSync(markdownPath, markdownContent);

// 4. extract isProcessInspectionPermissionError
const isProcessRegex = /const isProcessInspectionPermissionError = \((.*?)\) =>[\s\S]*?\);\n\n/m;
const isProcessMatch = newReport.match(isProcessRegex);
const isProcessStr = `export ${isProcessMatch[0]}`;
newReport = newReport.replace(isProcessMatch[0], '');

// 5. extract listProcessCommands
const listProcessRegex = /const listProcessCommands = async \(\) => {[\s\S]*?};\n\n/m;
const listProcessMatch = newReport.match(listProcessRegex);
const listProcessStr = `export const listProcessCommands = async (cwd) => {` + listProcessMatch[0].slice('const listProcessCommands = async () => {'.length).replace(/cwd: root,/g, 'cwd,');
newReport = newReport.replace(listProcessMatch[0], '');

// 6. extract findActiveRepoBuildProcesses
const findActiveRegex = /const findActiveRepoBuildProcesses = \(processLines\) =>[\s\S]*?}\);\n\n/m;
const findActiveMatch = newReport.match(findActiveRegex);
const findActiveStr = `export const findActiveRepoBuildProcesses = (processLines, root) =>` + findActiveMatch[0].slice('const findActiveRepoBuildProcesses = (processLines) =>'.length);
newReport = newReport.replace(findActiveMatch[0], '');

// 7. extract pathExists
const pathExistsRegex = /const pathExists = async \(absolutePath\) => {[\s\S]*?};\n\n/m;
const pathExistsMatch = newReport.match(pathExistsRegex);
const pathExistsStr = `export ${pathExistsMatch[0]}`;
newReport = newReport.replace(pathExistsMatch[0], '');

// 8. extract preflightBuildLock
const preflightRegex = /const preflightBuildLock = async \(\) => {[\s\S]*?};\n\n/m;
const preflightMatch = newReport.match(preflightRegex);
let preflightStr = `export const preflightBuildLock = async ({ root, buildLockPath, buildStandalonePath, buildTracePath }) => {\n` +
  `  const hasLock = await pathExists(buildLockPath);\n` +
  `  const hasStandalone = await pathExists(buildStandalonePath);\n` +
  `  const hasTrace = await pathExists(buildTracePath);\n\n` +
  `  if (!hasLock && !hasStandalone && !hasTrace) {\n` +
  `    return {\n      action: 'none',\n      message: 'No build preflight cleanup required.',\n    };\n  }\n\n` +
  `  if (hasLock) {\n    let processLines;\n    try {\n      processLines = await listProcessCommands(root);\n    } catch (error) {\n` +
  `      if (isProcessInspectionPermissionError(error)) {\n        const code = typeof error?.code === 'string' ? error.code : 'unknown';\n` +
  `        return {\n          action: 'skip',\n          message:\n            \`Skipping build because .next/lock exists and process inspection is unavailable (\${code}).\`,\n        };\n      }\n      throw error;\n    }\n\n` +
  `    const activeBuilds = findActiveRepoBuildProcesses(processLines, root);\n    if (activeBuilds.length > 0) {\n      return {\n        action: 'skip',\n        message:\n          \`Skipping build because an active next build process is already running for this workspace (\${activeBuilds.length} detected).\`,\n      };\n    }\n  }\n\n` +
  `  const cleanupMessages = [];\n  if (hasLock) {\n    await fs.unlink(buildLockPath);\n    cleanupMessages.push('Removed stale .next/lock before running build check.');\n  }\n  if (hasStandalone) {\n    await fs.rm(buildStandalonePath, { recursive: true, force: true });\n    cleanupMessages.push('Removed .next/standalone before build to reclaim disk space.');\n  }\n  if (hasTrace) {\n    await fs.rm(buildTracePath, { recursive: true, force: true });\n    cleanupMessages.push('Removed stale .next/trace-build before running build check.');\n  }\n\n  return {\n    action: 'removed',\n    message: cleanupMessages.join(' '),\n  };\n};\n\n`;
newReport = newReport.replace(preflightMatch[0], '');

let buildPreflightContent = `import fs from 'node:fs/promises';\nimport { execFile as execFileCallback } from 'node:child_process';\nimport { promisify } from 'node:util';\n\nconst execFile = promisify(execFileCallback);\n\n${isProcessStr}${listProcessStr}${findActiveStr}${pathExistsStr}${preflightStr}`;
fs.writeFileSync(buildPreflightPath, buildPreflightContent);

// 9. extract runCommandCheckAttempt
const runCheckAttemptRegex = /const runCommandCheckAttempt = \(\{ command, commandArgs, timeoutMs \}\) =>[\s\S]*?\}\);\n  \}\);\n\n/m;
const runCheckAttemptMatch = newReport.match(runCheckAttemptRegex);
let runCheckAttemptStr = runCheckAttemptMatch[0].replace(
  'const runCommandCheckAttempt = ({ command, commandArgs, timeoutMs }) =>',
  'export const runCommandCheckAttempt = ({ command, commandArgs, timeoutMs, cwd, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES }) =>'
).replace(
  'cwd: root,',
  'cwd,'
).replace(
  /MAX_OUTPUT_BYTES/g,
  'maxOutputBytes'
).replace(
  /truncateWeeklyCheckOutput\(`\$\{output\}\\n\$\{error\.stack \?\? String\(error\)\}`\.trim\(\)\)/g,
  'truncateWeeklyCheckOutput(`${output}\\n${error.stack ?? String(error)}`.trim(), maxOutputBytes)'
);

newReport = newReport.replace(runCheckAttemptMatch[0], '');

// 10. extract runCommandCheck
// Instead of regex matching to the end of the block, we can just find it starting with "const runCommandCheck = async ({"
// and ending with "};\n\nconst parseScannerSummary" or just match until the end of the function.
let runCheckStartIndex = newReport.indexOf("const runCommandCheck = async ({");
let runCheckEndIndex = newReport.indexOf("const parseScannerSummary = async (scriptName) => {");
let runCheckText = newReport.substring(runCheckStartIndex, runCheckEndIndex);

let runCheckStr = runCheckText.replace(
  'const runCommandCheck = async ({',
  'export const runCommandCheck = async ({'
).replace(
  'confirmFailureRetries = 0,\n}) => {',
  'confirmFailureRetries = 0,\n  cwd,\n  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,\n}) => {'
).replace(
  'timeoutMs,\n    });',
  'timeoutMs,\n      cwd,\n      maxOutputBytes,\n    });'
).replace(
  /MAX_OUTPUT_BYTES/g,
  'maxOutputBytes'
);

newReport = newReport.replace(runCheckText, '');

// Update checksContent to import spawn
if (!checksContent.includes('spawn')) {
  checksContent = `import { spawn } from 'node:child_process';\n` + checksContent;
}

checksContent += `\n${runCheckAttemptStr}${runCheckStr}`;
fs.writeFileSync(checksPath, checksContent);

// Update generate-weekly-report.mjs
newReport = newReport.replace(
  "import {",
  `import {\n  preflightBuildLock,\n} from './lib/weekly-report-build-preflight.mjs';\nimport {`
);

newReport = newReport.replace(
  "import {\n  createWeeklyCheckResult,",
  `import {\n  createWeeklyCheckResult,\n  runCommandCheck,\n  runCommandCheckAttempt,`
);

newReport = newReport.replace(
  "import {\n  buildKangurAiTutorBridgeSnapshotLines,",
  `import {\n  toMarkdown,\n  formatDuration,\n  formatDelta,\n  buildKangurAiTutorBridgeSnapshotLines,`
);

// We need to also clean up the unused import `spawn` in generate-weekly-report.mjs
newReport = newReport.replace("import { spawn, execFile as execFileCallback } from 'node:child_process';", "import { execFile as execFileCallback } from 'node:child_process';");

// fix usage of preflightBuildLock
newReport = newReport.replace(
  "buildPreflight = await preflightBuildLock();",
  "buildPreflight = await preflightBuildLock({ root, buildLockPath: BUILD_LOCK_PATH, buildStandalonePath: BUILD_STANDALONE_PATH, buildTracePath: BUILD_TRACE_PATH });"
);

// fix usage of runCommandCheck
newReport = newReport.replace(
  "await runCommandCheck(check);",
  "await runCommandCheck({ ...check, cwd: root, maxOutputBytes: MAX_OUTPUT_BYTES });"
);

// fix usage of formatDuration and formatDelta which are now imported.
// Wait, `formatDuration` is used in `generate-weekly-report.mjs`!
// Ensure it's imported! It is added to the import from `./lib/weekly-report-markdown.mjs`.

// fix usage of toMarkdown
newReport = newReport.replace(
  "await fs.writeFile(metricsPath, toMarkdown(report), 'utf8');",
  "await fs.writeFile(metricsPath, toMarkdown(report, { includeFullLint, includeFullUnit, includeE2E }), 'utf8');"
);

fs.writeFileSync(reportPath, newReport);

console.log("Refactoring complete");
