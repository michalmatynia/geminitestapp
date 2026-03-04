import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULTS = {
  mode: 'scan',
  root: process.cwd(),
  srcDir: 'src',
  apiDir: path.join('src', 'app', 'api'),
  allowPartial: false,
  logsDir: 'logs',
  checkLogFile: path.join('logs', 'observability-check.log'),
  errorLogFile: path.join('logs', 'observability-check.error.log'),
  maxRuntimeErrorFindings: 100,
  scanRuntimeLogs: true,
  emitCiAnnotations: true,
};

const parseArgs = (argv) => {
  const options = { ...DEFAULTS };
  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length).trim() || DEFAULTS.mode;
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length).trim() || DEFAULTS.root;
    } else if (arg.startsWith('--src-dir=')) {
      options.srcDir = arg.slice('--src-dir='.length).trim() || DEFAULTS.srcDir;
    } else if (arg.startsWith('--api-dir=')) {
      options.apiDir = arg.slice('--api-dir='.length).trim() || DEFAULTS.apiDir;
    } else if (arg === '--allow-partial') {
      options.allowPartial = true;
    } else if (arg.startsWith('--logs-dir=')) {
      options.logsDir = arg.slice('--logs-dir='.length).trim() || DEFAULTS.logsDir;
    } else if (arg.startsWith('--check-log-file=')) {
      options.checkLogFile = arg.slice('--check-log-file='.length).trim() || DEFAULTS.checkLogFile;
    } else if (arg.startsWith('--error-log-file=')) {
      options.errorLogFile = arg.slice('--error-log-file='.length).trim() || DEFAULTS.errorLogFile;
    } else if (arg.startsWith('--max-runtime-error-findings=')) {
      const parsed = Number.parseInt(arg.slice('--max-runtime-error-findings='.length), 10);
      options.maxRuntimeErrorFindings =
        Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULTS.maxRuntimeErrorFindings;
    } else if (arg === '--no-runtime-log-scan') {
      options.scanRuntimeLogs = false;
    } else if (arg === '--no-ci-annotations') {
      options.emitCiAnnotations = false;
    }
  }
  return options;
};

const listFiles = (rootDir, predicate) => {
  const acc = [];
  const walk = (current) => {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && predicate(fullPath)) {
        acc.push(fullPath);
      }
    }
  };
  walk(rootDir);
  return acc;
};

const toRelative = (root, file) => path.relative(root, file).replace(/\\/g, '/');

const toLine = (content, index) => content.slice(0, index).split('\n').length;

const extractCallExpression = (content, startIndex) => {
  let depth = 0;
  let i = startIndex;
  let quote = null;
  let escaped = false;
  while (i < content.length) {
    const ch = content[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === '\'' || ch === '`') {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(startIndex, i + 1);
      }
    }
    i += 1;
  }
  return content.slice(startIndex);
};

const collectRouteCoverage = (root, apiDir) => {
  const apiRoot = path.join(root, apiDir);
  const routeFiles = listFiles(apiRoot, (file) => file.endsWith('route.ts'));

  const hasApiWrapper = (text) => /apiHandler(?:WithParams)?\s*\(/.test(text);
  const isMethodToken = (value) =>
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(value);
  const hasDelegatedMethodExport = (text) =>
    /export const (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=/.test(text);
  const reExportPattern = /export\s+(?:\{[\s\S]*?\}|\*)\s+from\s+['"](\.[^'"]+)['"]/g;

  const resolveModuleFile = (fromFile, modulePath) => {
    const fromDir = path.dirname(fromFile);
    const resolvedBase = path.resolve(fromDir, modulePath);
    const candidates = [
      `${resolvedBase}.ts`,
      `${resolvedBase}.tsx`,
      `${resolvedBase}.js`,
      `${resolvedBase}.jsx`,
      path.join(resolvedBase, 'index.ts'),
      path.join(resolvedBase, 'index.tsx'),
      path.join(resolvedBase, 'index.js'),
      path.join(resolvedBase, 'index.jsx'),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  };

  const getReExportTargets = (file, text) => {
    const targets = [];
    reExportPattern.lastIndex = 0;
    let match = reExportPattern.exec(text);
    while (match) {
      const candidate = resolveModuleFile(file, match[1]);
      if (candidate) targets.push(candidate);
      match = reExportPattern.exec(text);
    }
    return targets;
  };

  const hasWrapperTransitively = (file, seen = new Set()) => {
    if (seen.has(file)) return false;
    seen.add(file);
    if (!fs.existsSync(file)) return false;
    const text = fs.readFileSync(file, 'utf8');
    if (hasApiWrapper(text)) return true;
    const targets = getReExportTargets(file, text);
    return targets.some((target) => hasWrapperTransitively(target, seen));
  };

  let wrapped = 0;
  let delegated = 0;
  for (const file of routeFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const hasWrapper = hasWrapperTransitively(file);
    if (hasWrapper) {
      wrapped += 1;
      continue;
    }
    const reExportTargets = getReExportTargets(file, text);
    const hasMethodReExport =
      /export\s+\{[\s\S]*?\}\s+from\s+['"]\.[^'"]+['"]/.test(text) &&
      /GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS/.test(text);
    const hasDelegatedExport =
      hasDelegatedMethodExport(text) ||
      hasMethodReExport ||
      reExportTargets.some((target) => {
        const delegatedText = fs.readFileSync(target, 'utf8');
        if (hasDelegatedMethodExport(delegatedText)) return true;
        return (
          /export const\s+([A-Z,\s]+)/.test(delegatedText) &&
          delegatedText
            .match(/export const\s+([A-Z,\s]+)/)?.[1]
            ?.split(',')
            .some((token) => isMethodToken(token.trim())) === true
        );
      });
    if (hasDelegatedExport) {
      delegated += 1;
    }
  }

  const uncovered = Math.max(0, routeFiles.length - wrapped - delegated);
  return {
    totalRoutes: routeFiles.length,
    wrappedRoutes: wrapped,
    delegatedRoutes: delegated,
    uncoveredRoutes: uncovered,
  };
};

const collectLoggerServiceViolations = (root, srcDir) => {
  const srcRoot = path.join(root, srcDir);
  const EXCLUDED_FILES = new Set(['src/shared/utils/logger.ts']);
  const files = listFiles(
    srcRoot,
    (file) =>
      /\.(ts|tsx|js|jsx)$/.test(file) &&
      !EXCLUDED_FILES.has(toRelative(root, file)) &&
      !/\.test\./.test(file) &&
      !/\.spec\./.test(file) &&
      !/__tests__/.test(file)
  );
  const violations = [];
  const loggerPattern = /logger\.(info|warn|error|log)\s*\(/g;
  const inlineServicePattern = /(^|[,{]\s*)service\s*:/;
  const servicePrefixPattern = /^\[[A-Za-z0-9_.:-]+\](?:\[[A-Za-z0-9_.:-]+\])*/;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let match = loggerPattern.exec(text);
    while (match) {
      const callStart = match.index + match[0].length - 1;
      const callExpr = extractCallExpression(text, callStart);
      const hasStructuredService = inlineServicePattern.test(callExpr);
      const firstStringArgMatch = callExpr.match(/^\(\s*([`'"])([\s\S]*?)\1\s*(?:,|\))/);
      const firstArgText = firstStringArgMatch?.[2] ?? '';
      const hasServicePrefix = servicePrefixPattern.test(firstArgText);
      if (!hasStructuredService && !hasServicePrefix) {
        violations.push({
          file: toRelative(root, file),
          line: toLine(text, match.index),
          call: callExpr.slice(0, 180).replace(/\s+/g, ' ').trim(),
        });
      }
      match = loggerPattern.exec(text);
    }
  }

  return violations;
};

const readFileIfExists = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);

const collectCoreContractViolations = (root, allowPartial) => {
  const contractFile = path.join(root, 'src', 'shared', 'contracts', 'observability.ts');
  const repositoryFile = path.join(
    root,
    'src',
    'shared',
    'lib',
    'observability',
    'system-log-repository.ts'
  );
  const prismaFile = path.join(root, 'prisma', 'schema.prisma');
  const diagnosticsManifestFile = path.join(
    root,
    'src',
    'shared',
    'lib',
    'observability',
    'observability-index-manifest.ts'
  );
  const apiHandlerFile = path.join(root, 'src', 'shared', 'lib', 'api', 'api-handler.ts');

  const contractText = readFileIfExists(contractFile);
  const repositoryText = readFileIfExists(repositoryFile);
  const prismaText = readFileIfExists(prismaFile);
  const manifestText = readFileIfExists(diagnosticsManifestFile);
  const apiHandlerText = readFileIfExists(apiHandlerFile);

  const violations = [];

  const requireText = (text, pattern, label) => {
    if (!text) {
      if (!allowPartial) {
        violations.push({ type: 'missing_file', message: `${label} not found` });
      }
      return;
    }
    if (!pattern.test(text)) {
      violations.push({ type: 'missing_contract', message: `${label} missing` });
    }
  };

  const requiredFields = ['service', 'traceId', 'correlationId', 'spanId', 'parentSpanId'];
  for (const field of requiredFields) {
    requireText(contractText, new RegExp(`\\b${field}\\b`), `observability contract field "${field}"`);
    requireText(
      repositoryText,
      new RegExp(`\\b${field}\\b`),
      `system-log repository field "${field}"`
    );
    requireText(prismaText, new RegExp(`\\b${field}\\b`), `Prisma SystemLog field "${field}"`);
  }

  requireText(contractText, /\btopServices\b/, 'observability metrics field "topServices"');
  requireText(repositoryText, /\btopServices\b/, 'system-log repository "topServices"');
  requireText(apiHandlerText, /x-trace-id/, 'api-handler response trace header propagation');
  requireText(apiHandlerText, /traceId:/, 'api-handler trace context propagation');
  requireText(apiHandlerText, /correlationId:/, 'api-handler correlation context propagation');
  requireText(
    apiHandlerText,
    /DEFAULT_SLOW_SUCCESS_THRESHOLD_MS\s*=\s*750/,
    'api-handler default slow-success threshold'
  );

  requireText(manifestText, /system_logs/, 'observability index manifest system_logs');
  requireText(manifestText, /activity_logs/, 'observability index manifest activity_logs');
  requireText(manifestText, /traceId/, 'observability index manifest traceId');
  requireText(manifestText, /correlationId/, 'observability index manifest correlationId');
  requireText(manifestText, /context\.fingerprint/, 'observability index manifest fingerprint');

  return violations;
};

const resolveFromRoot = (root, value) => (path.isAbsolute(value) ? value : path.join(root, value));

const toReportPath = (root, file) => {
  const relative = toRelative(root, file);
  return relative.startsWith('..') ? file : relative;
};

const LOG_FILE_PATTERN = /\.(log|txt|json|jsonl|ndjson)$/i;
const ERROR_WORD_PATTERN = /\b(error|exception|fatal|uncaught|unhandled)\b/i;
const NON_ERROR_WORD_PATTERN = /\b(?:no errors?|0 errors?)\b/i;
const ERROR_LEVELS = new Set(['error', 'fatal', 'critical']);

const truncatePreview = (value, max = 220) => {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
};

const readStringFromRecord = (record, keys) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const parseRuntimeLogLine = (rawLine) => {
  const line = rawLine.trim();
  if (!line) return null;

  const hasExplicitErrorTag = /\[(ERROR|FATAL|CRITICAL)\]/i.test(line);
  if (!hasExplicitErrorTag && NON_ERROR_WORD_PATTERN.test(line)) {
    return null;
  }

  if (line.startsWith('{') && line.endsWith('}')) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed;
        const level = readStringFromRecord(record, [
          'level',
          'severity',
          'logLevel',
          'status',
        ])?.toLowerCase();
        const message =
          readStringFromRecord(record, ['message', 'msg', 'detail', 'reason']) ??
          (typeof record['error'] === 'string' ? record['error'] : null) ??
          (record['error'] &&
          typeof record['error'] === 'object' &&
          typeof record['error']['message'] === 'string'
            ? String(record['error']['message']).trim()
            : null);

        if (level && ERROR_LEVELS.has(level)) {
          return {
            level,
            snippet: truncatePreview(message ?? line),
          };
        }

        if (
          message &&
          ERROR_WORD_PATTERN.test(message) &&
          !NON_ERROR_WORD_PATTERN.test(message)
        ) {
          return {
            level: level ?? 'error',
            snippet: truncatePreview(message),
          };
        }
      }
    } catch {
      // Ignore malformed JSON lines and use plain-text detection below.
    }
  }

  if (hasExplicitErrorTag || ERROR_WORD_PATTERN.test(line)) {
    return {
      level: 'error',
      snippet: truncatePreview(line),
    };
  }

  return null;
};

const collectRuntimeLogErrors = (root, logsDir, { excludedFiles, maxFindings }) => {
  const logsRoot = resolveFromRoot(root, logsDir);
  const errorEntries = [];
  const readFailures = [];

  if (!fs.existsSync(logsRoot)) {
    return {
      logsDir,
      filesScanned: 0,
      totalErrors: 0,
      truncated: false,
      readFailures,
      errors: errorEntries,
    };
  }

  const files = listFiles(logsRoot, (file) => LOG_FILE_PATTERN.test(file));
  let filesScanned = 0;
  let totalErrors = 0;

  for (const file of files) {
    const resolved = path.resolve(file);
    if (excludedFiles.has(resolved)) continue;

    filesScanned += 1;
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (error) {
      readFailures.push({
        file: toRelative(root, file),
        reason: error instanceof Error ? error.message : 'Failed to read file',
      });
      continue;
    }

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const parsed = parseRuntimeLogLine(lines[i]);
      if (!parsed) continue;

      totalErrors += 1;
      if (errorEntries.length < maxFindings) {
        errorEntries.push({
          file: toRelative(root, file),
          line: i + 1,
          level: parsed.level,
          snippet: parsed.snippet,
        });
      }
    }
  }

  return {
    logsDir,
    filesScanned,
    totalErrors,
    truncated: totalErrors > errorEntries.length,
    readFailures,
    errors: errorEntries,
  };
};

const buildSummaryLine = (report) =>
  `[observability:${report.status}] routes=${report.routeCoverage.totalRoutes} wrapped=${report.routeCoverage.wrappedRoutes} delegated=${report.routeCoverage.delegatedRoutes} uncovered=${report.routeCoverage.uncoveredRoutes} loggerViolations=${report.logger.totalViolations} coreViolations=${report.core.totalViolations} runtimeErrors=${report.runtimeLogs.totalErrors}`;

const buildErrorComment = (report, errorLogFile) => {
  if (report.runtimeLogs.totalErrors > 0) {
    const suffix = report.runtimeLogs.totalErrors === 1 ? 'entry' : 'entries';
    return `Error discovered in runtime logs: ${report.runtimeLogs.totalErrors} ${suffix}. See ${errorLogFile}.`;
  }
  if (report.logger.totalViolations > 0 || report.core.totalViolations > 0) {
    return `Error discovered in observability contracts: logger violations=${report.logger.totalViolations}, core violations=${report.core.totalViolations}. See ${errorLogFile}.`;
  }
  return null;
};

const persistReportLogs = (report, { checkLogPath, errorLogPath }) => {
  const writeErrors = [];

  try {
    fs.mkdirSync(path.dirname(checkLogPath), { recursive: true });
    fs.appendFileSync(
      checkLogPath,
      `${report.generatedAt} ${buildSummaryLine(report)}${report.comment ? ` comment="${report.comment}"` : ''}\n`,
      'utf8'
    );
  } catch (error) {
    writeErrors.push(
      `Failed to append check log (${checkLogPath}): ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  if (report.status !== 'passed') {
    try {
      fs.mkdirSync(path.dirname(errorLogPath), { recursive: true });
      fs.appendFileSync(
        errorLogPath,
        `${report.generatedAt} ${report.comment ?? 'Observability check failed'}\n${JSON.stringify(report, null, 2)}\n\n`,
        'utf8'
      );
    } catch (error) {
      writeErrors.push(
        `Failed to append error log (${errorLogPath}): ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  return writeErrors;
};

const escapeGithubAnnotation = (value) =>
  String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

const escapeGithubProperty = (value) =>
  escapeGithubAnnotation(value).replace(/:/g, '%3A').replace(/,/g, '%2C');

const emitGithubError = ({ message, file, line }) => {
  const escapedMessage = escapeGithubAnnotation(message);
  if (file && line) {
    const escapedFile = escapeGithubProperty(file);
    console.log(`::error file=${escapedFile},line=${line}::${escapedMessage}`);
    return;
  }
  console.log(`::error::${escapedMessage}`);
};

const emitCiAnnotations = (report) => {
  if (!process.env['GITHUB_ACTIONS']) return;

  for (const violation of report.logger.violations.slice(0, 50)) {
    emitGithubError({
      file: violation.file,
      line: violation.line,
      message: `[observability.check] logger service context missing: ${violation.call}`,
    });
  }

  for (const violation of report.core.violations.slice(0, 50)) {
    emitGithubError({
      message: `[observability.check] core contract violation: ${violation.message}`,
    });
  }

  for (const errorEntry of report.runtimeLogs.errors.slice(0, 50)) {
    emitGithubError({
      file: errorEntry.file,
      line: errorEntry.line,
      message: `[observability.check] runtime log error detected: ${errorEntry.snippet}`,
    });
  }

  if (report.comment) {
    console.log(`::notice::${escapeGithubAnnotation(`[observability.comment] ${report.comment}`)}`);
  }
};

export const runObservabilityCheck = ({
  mode = DEFAULTS.mode,
  root = DEFAULTS.root,
  srcDir = DEFAULTS.srcDir,
  apiDir = DEFAULTS.apiDir,
  allowPartial = DEFAULTS.allowPartial,
  logsDir = DEFAULTS.logsDir,
  checkLogFile = DEFAULTS.checkLogFile,
  errorLogFile = DEFAULTS.errorLogFile,
  maxRuntimeErrorFindings = DEFAULTS.maxRuntimeErrorFindings,
  scanRuntimeLogs = DEFAULTS.scanRuntimeLogs,
} = {}) => {
  const checkLogPath = resolveFromRoot(root, checkLogFile);
  const errorLogPath = resolveFromRoot(root, errorLogFile);
  const excludedFiles = new Set([path.resolve(checkLogPath), path.resolve(errorLogPath)]);

  const routeCoverage = collectRouteCoverage(root, apiDir);
  const loggerViolations = collectLoggerServiceViolations(root, srcDir);
  const coreViolations = collectCoreContractViolations(root, allowPartial);
  const runtimeLogs = scanRuntimeLogs
    ? collectRuntimeLogErrors(root, logsDir, {
        excludedFiles,
        maxFindings: maxRuntimeErrorFindings,
      })
    : {
        logsDir,
        filesScanned: 0,
        totalErrors: 0,
        truncated: false,
        readFailures: [],
        errors: [],
        disabled: true,
      };

  const hasBlockingViolations =
    loggerViolations.length > 0 || coreViolations.length > 0 || runtimeLogs.totalErrors > 0;
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    routeCoverage,
    logger: {
      totalViolations: loggerViolations.length,
      violations: loggerViolations,
    },
    core: {
      totalViolations: coreViolations.length,
      violations: coreViolations,
    },
    runtimeLogs,
    logArtifacts: {
      checkLogFile: toReportPath(root, checkLogPath),
      errorLogFile: toReportPath(root, errorLogPath),
      writeErrors: [],
    },
    status: hasBlockingViolations ? 'failed' : 'passed',
  };

  report.comment = buildErrorComment(report, report.logArtifacts.errorLogFile);
  report.logArtifacts.writeErrors = persistReportLogs(report, {
    checkLogPath,
    errorLogPath,
  });
  if (report.logArtifacts.writeErrors.length > 0) {
    report.core.totalViolations += report.logArtifacts.writeErrors.length;
    report.core.violations.push(
      ...report.logArtifacts.writeErrors.map((message) => ({
        type: 'log_write_error',
        message,
      }))
    );
    report.status = 'failed';
    report.comment =
      report.comment ??
      `Error discovered while writing observability logs. See ${report.logArtifacts.errorLogFile}.`;
  }

  return report;
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const report = runObservabilityCheck(options);
  const summaryLine = buildSummaryLine(report);

  console.log(summaryLine);
  if (report.comment) {
    console.log(`[observability:comment] ${report.comment}`);
  }
  if (options.emitCiAnnotations) {
    emitCiAnnotations(report);
  }
  console.log(JSON.stringify(report, null, 2));

  if (options.mode === 'check' && report.status !== 'passed') {
    process.exit(1);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
