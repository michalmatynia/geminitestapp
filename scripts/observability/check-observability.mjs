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
  maxCheckLogBytes: 1_000_000,
  maxErrorLogBytes: 4_000_000,
  scanRuntimeLogs: true,
  emitCiAnnotations: true,
};

const LOG_SCHEMA_VERSION = 2;

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
    } else if (arg.startsWith('--max-check-log-bytes=')) {
      const parsed = Number.parseInt(arg.slice('--max-check-log-bytes='.length), 10);
      options.maxCheckLogBytes =
        Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULTS.maxCheckLogBytes;
    } else if (arg.startsWith('--max-error-log-bytes=')) {
      const parsed = Number.parseInt(arg.slice('--max-error-log-bytes='.length), 10);
      options.maxErrorLogBytes =
        Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULTS.maxErrorLogBytes;
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

const collectLogSystemEventSourceViolations = (root, srcDir) => {
  const srcRoot = path.join(root, srcDir);
  const files = listFiles(
    srcRoot,
    (file) =>
      /\.(ts|tsx|js|jsx)$/.test(file) &&
      !/\.test\./.test(file) &&
      !/\.spec\./.test(file) &&
      !/__tests__/.test(file)
  );
  const violations = [];
  const logSystemEventPattern = /logSystemEvent\s*\(/g;
  const sourcePropertyPattern = /\bsource\s*:/;
  const sourcePattern = /\bsource\s*:\s*([`'"])([\s\S]*?)\1/;
  const messagePattern = /\bmessage\s*:\s*([`'"])([\s\S]*?)\1/m;
  const canonicalMessagePrefixPattern = /^\[[A-Za-z0-9_./:-]+\](?:\[[A-Za-z0-9_./:-]+\])*/;
  const sourceValuePattern = /^[A-Za-z0-9_$\[\]-]+(?:[./:-][A-Za-z0-9_$\[\]-]+)*$/;

  for (const file of files) {
    const relative = toRelative(root, file);
    const text = fs.readFileSync(file, 'utf8');

    let match = logSystemEventPattern.exec(text);
    while (match) {
      const callStart = match.index + match[0].length - 1;
      const callExpr = extractCallExpression(text, callStart);

      // Stage-3 enforcement focuses on direct object-literal calls.
      if (!/^\(\s*\{/.test(callExpr)) {
        match = logSystemEventPattern.exec(text);
        continue;
      }
      if (/\.\.\./.test(callExpr)) {
        match = logSystemEventPattern.exec(text);
        continue;
      }

      const hasSourceProperty = sourcePropertyPattern.test(callExpr);
      const sourceMatch = callExpr.match(sourcePattern);
      const messageMatch = callExpr.match(messagePattern);
      const messageValue = messageMatch?.[2]?.trim() ?? '';
      const hasLegacyMessagePrefix = canonicalMessagePrefixPattern.test(messageValue);

      if (!hasSourceProperty) {
        if (!hasLegacyMessagePrefix) {
          violations.push({
            file: relative,
            line: toLine(text, match.index),
            message:
              'logSystemEvent call is missing source (or a legacy [scope] message prefix during migration)',
            call: callExpr.slice(0, 180).replace(/\s+/g, ' ').trim(),
          });
        }
        match = logSystemEventPattern.exec(text);
        continue;
      }

      if (!sourceMatch) {
        match = logSystemEventPattern.exec(text);
        continue;
      }

      const quote = sourceMatch[1];
      const sourceValueRaw = sourceMatch[2];
      const sourceValue = sourceValueRaw.trim();

      if (sourceValue.length === 0) {
        violations.push({
          file: relative,
          line: toLine(text, match.index),
          message: 'logSystemEvent source cannot be empty',
          call: callExpr.slice(0, 180).replace(/\s+/g, ' ').trim(),
        });
        match = logSystemEventPattern.exec(text);
        continue;
      }

      if (quote === '`' && /\$\{/.test(sourceValueRaw)) {
        match = logSystemEventPattern.exec(text);
        continue;
      }

      if (!sourceValuePattern.test(sourceValue)) {
        violations.push({
          file: relative,
          line: toLine(text, match.index),
          message:
            'logSystemEvent source has invalid format (expected segmented token like "service.domain.action")',
          call: callExpr.slice(0, 180).replace(/\s+/g, ' ').trim(),
        });
      }

      match = logSystemEventPattern.exec(text);
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

const collectConsoleLogViolations = (root, srcDir) => {
  const srcRoot = path.join(root, srcDir);
  const CONSOLE_ALLOWLIST = new Set([
    'src/shared/utils/logger.ts',
    'src/shared/lib/observability/log-system-event.ts',
  ]);
  const files = listFiles(
    srcRoot,
    (file) =>
      /\.(ts|tsx|js|jsx)$/.test(file) &&
      !CONSOLE_ALLOWLIST.has(toRelative(root, file)) &&
      !/\.test\./.test(file) &&
      !/\.spec\./.test(file) &&
      !/__tests__/.test(file) &&
      !/scripts\//.test(toRelative(root, file))
  );
  const violations = [];
  const consolePattern = /\bconsole\.(log|warn|error|debug|info)\s*\(/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let match = consolePattern.exec(text);
    while (match) {
      violations.push({
        file: toRelative(root, file),
        line: toLine(text, match.index),
        method: match[1],
        message: `console.${match[1]}() should use logSystemEvent() or logger for structured logging`,
      });
      match = consolePattern.exec(text);
    }
  }

  return violations;
};

const collectEmptyCatchBlockViolations = (root, srcDir) => {
  const srcRoot = path.join(root, srcDir);
  const files = listFiles(
    srcRoot,
    (file) =>
      /\.(ts|tsx|js|jsx)$/.test(file) &&
      !/\.test\./.test(file) &&
      !/\.spec\./.test(file) &&
      !/__tests__/.test(file)
  );
  const violations = [];
  // Match catch blocks that are empty or only contain whitespace/comments
  const emptyCatchPattern = /\bcatch\s*\([^)]*\)\s*\{\s*(?:\/\/[^\n]*)?\s*\}/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let match = emptyCatchPattern.exec(text);
    while (match) {
      violations.push({
        file: toRelative(root, file),
        line: toLine(text, match.index),
        message: 'Empty catch block swallows errors silently. Log the error or re-throw it.',
      });
      match = emptyCatchPattern.exec(text);
    }
  }

  return violations;
};

const collectLegacyCompatibilityViolations = (root, srcDir) => {
  const srcRoot = path.join(root, srcDir);
  const files = listFiles(
    srcRoot,
    (file) =>
      /\.(ts|tsx|js|jsx)$/.test(file) &&
      !/\.test\./.test(file) &&
      !/\.spec\./.test(file) &&
      !/__tests__/.test(file)
  );

  const violations = [];
  const addMatchViolation = (file, text, index, message) => {
    violations.push({
      file: toRelative(root, file),
      line: toLine(text, index),
      message,
    });
  };

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const relative = toRelative(root, file);

    const legacyImportPatterns = [
      {
        regex: /@\/features\/observability(?=['"])/g,
        message: 'legacy import "@/features/observability" is not allowed',
      },
      {
        regex: /@\/features\/observability\/public/g,
        message: 'legacy import "@/features/observability/public" is not allowed',
      },
      {
        regex: /@\/features\/observability\/server/g,
        message: 'legacy import "@/features/observability/server" is not allowed',
      },
      {
        regex: /@\/features\/observability\/utils\/client-error-logger/g,
        message:
          'legacy import "@/features/observability/utils/client-error-logger" is not allowed',
      },
      {
        regex: /@\/shared\/lib\/observability\/ai-path-run-static-context/g,
        message: 'legacy import "@/shared/lib/observability/ai-path-run-static-context" is not allowed',
      },
      {
        regex: /@\/shared\/lib\/observability\/runtime-context\/adapters\/ai-path-run/g,
        message:
          'legacy import "@/shared/lib/observability/runtime-context/adapters/ai-path-run" is not allowed',
      },
    ];

    for (const check of legacyImportPatterns) {
      check.regex.lastIndex = 0;
      let match = check.regex.exec(text);
      while (match) {
        addMatchViolation(file, text, match.index, check.message);
        match = check.regex.exec(text);
      }
    }

    if (
      (relative === 'src/app/api/v2/metadata/handler.ts' ||
        relative === 'src/app/api/v2/metadata/[type]/[id]/handler.ts') &&
      /unwrapPayload\s*\(/.test(text)
    ) {
      const index = text.indexOf('unwrapPayload');
      addMatchViolation(
        file,
        text,
        index >= 0 ? index : 0,
        'legacy wrapped payload compatibility helper "unwrapPayload" is not allowed'
      );
    }

    if (
      relative === 'src/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context.ts'
    ) {
      const runtimeLegacyPatterns = [
        {
          regex: /readLegacyAiPathRunRunId\s*\(/g,
          message: 'legacy runtime-context runId inference helper is not allowed',
        },
        {
          regex: /normalizeContextForInference\s*\(/g,
          message: 'legacy runtime-context inference normalization is not allowed',
        },
      ];

      for (const check of runtimeLegacyPatterns) {
        check.regex.lastIndex = 0;
        let match = check.regex.exec(text);
        while (match) {
          addMatchViolation(file, text, match.index, check.message);
          match = check.regex.exec(text);
        }
      }
    }
  }

  const legacyCounterModule = path.join(
    root,
    'src',
    'shared',
    'lib',
    'observability',
    'legacy-compat-counters.ts'
  );
  if (fs.existsSync(legacyCounterModule)) {
    violations.push({
      file: toRelative(root, legacyCounterModule),
      line: 1,
      message: 'legacy compatibility counter module must be removed',
    });
  }

  const forbiddenLegacyFiles = [
    'src/features/observability/public.ts',
    'src/features/observability/server.ts',
    'src/features/observability/index.ts',
    'src/features/observability/constants.ts',
    'src/features/observability/constants/client-logging.ts',
    'src/features/observability/utils/client-error-logger.ts',
    'src/features/observability/utils/error-classifier.ts',
    'src/features/observability/services/error-system.ts',
    'src/features/observability/services/activityService.ts',
    'src/features/observability/services/activity-repository/index.ts',
    'src/features/observability/services/activity-repository/mongo-activity-repository.ts',
    'src/features/observability/services/activity-repository/prisma-activity-repository.ts',
    'src/features/observability/lib/ai-paths-slo-notifier.ts',
    'src/features/observability/lib/critical-error-notifier.ts',
    'src/features/observability/lib/log-redaction.ts',
    'src/features/observability/lib/system-log-repository.ts',
    'src/features/observability/lib/system-logger.ts',
    'src/features/observability/lib/transient-recovery/constants.ts',
    'src/features/observability/lib/transient-recovery/settings.ts',
    'src/features/observability/lib/transient-recovery/with-recovery.ts',
    'src/shared/lib/observability/ai-path-run-static-context.ts',
    'src/shared/lib/observability/runtime-context/adapters/ai-path-run.ts',
  ];

  for (const relativeFile of forbiddenLegacyFiles) {
    const absolute = path.join(root, relativeFile);
    if (!fs.existsSync(absolute)) continue;
    violations.push({
      file: relativeFile,
      line: 1,
      message: `forbidden legacy compatibility file detected: ${relativeFile}`,
    });
  }

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

const normalizeRuntimeErrorFingerprint = (level, snippet) =>
  `${level}:${snippet
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, '<hex>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()}`;

const collectRuntimeLogErrors = (root, logsDir, { excludedFiles, maxFindings }) => {
  const logsRoot = resolveFromRoot(root, logsDir);
  const errorEntries = [];
  const readFailures = [];
  const fingerprintCounts = new Map();

  if (!fs.existsSync(logsRoot)) {
    return {
      logsDir,
      filesScanned: 0,
      totalErrors: 0,
      truncated: false,
      readFailures,
      fingerprints: [],
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

      const fingerprint = normalizeRuntimeErrorFingerprint(parsed.level, parsed.snippet);
      const currentFingerprint = fingerprintCounts.get(fingerprint);
      if (currentFingerprint) {
        currentFingerprint.count += 1;
      } else {
        fingerprintCounts.set(fingerprint, {
          fingerprint,
          level: parsed.level,
          sample: parsed.snippet,
          count: 1,
        });
      }

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
    fingerprints: [...fingerprintCounts.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 25),
    errors: errorEntries,
  };
};

const collectExecutionContext = () => {
  const isGithubActions = Boolean(process.env['GITHUB_ACTIONS']);
  const isCi = isGithubActions || Boolean(process.env['CI']);
  const branch =
    process.env['GITHUB_HEAD_REF'] ??
    process.env['GITHUB_REF_NAME'] ??
    process.env['CI_COMMIT_REF_NAME'] ??
    process.env['BRANCH_NAME'] ??
    null;
  const commit =
    process.env['GITHUB_SHA'] ?? process.env['CI_COMMIT_SHA'] ?? process.env['COMMIT_SHA'] ?? null;

  return {
    environment: isGithubActions ? 'github-actions' : isCi ? 'ci' : 'local',
    branch: branch && branch.trim().length > 0 ? branch : null,
    commit: commit && commit.trim().length > 0 ? commit : null,
    workflow: process.env['GITHUB_WORKFLOW'] ?? null,
    job: process.env['GITHUB_JOB'] ?? null,
    runId: process.env['GITHUB_RUN_ID'] ?? process.env['CI_PIPELINE_ID'] ?? null,
    actor: process.env['GITHUB_ACTOR'] ?? process.env['CI_COMMIT_AUTHOR'] ?? null,
  };
};

const buildSummaryPayload = (report) => ({
  schemaVersion: LOG_SCHEMA_VERSION,
  generatedAt: report.generatedAt,
  mode: report.mode,
  status: report.status,
  context: report.executionContext,
  counters: {
    routes: report.routeCoverage,
    loggerViolations: report.logger.totalViolations,
    eventSourceViolations: report.eventSource.totalViolations,
    coreViolations: report.core.totalViolations,
    consoleLogViolations: report.consoleLogs.totalViolations,
    emptyCatchBlockViolations: report.emptyCatchBlocks.totalViolations,
    legacyCompatibilityViolations: report.legacyCompatibility.totalViolations,
    runtimeErrors: report.runtimeLogs.totalErrors,
  },
  runtime: {
    filesScanned: report.runtimeLogs.filesScanned,
    totalErrors: report.runtimeLogs.totalErrors,
    truncated: report.runtimeLogs.truncated,
    fingerprintCount: Array.isArray(report.runtimeLogs.fingerprints)
      ? report.runtimeLogs.fingerprints.length
      : 0,
  },
  comment: report.comment,
});

const buildSummaryLine = (report) =>
  `[observability:v${LOG_SCHEMA_VERSION}:${report.status}] routes=${report.routeCoverage.totalRoutes} wrapped=${report.routeCoverage.wrappedRoutes} delegated=${report.routeCoverage.delegatedRoutes} uncovered=${report.routeCoverage.uncoveredRoutes} loggerViolations=${report.logger.totalViolations} eventSourceViolations=${report.eventSource.totalViolations} coreViolations=${report.core.totalViolations} consoleLogs=${report.consoleLogs.totalViolations} emptyCatches=${report.emptyCatchBlocks.totalViolations} legacyCompatViolations=${report.legacyCompatibility.totalViolations} runtimeErrors=${report.runtimeLogs.totalErrors}`;

const buildErrorComment = (report, errorLogFile) => {
  if (report.runtimeLogs.totalErrors > 0) {
    const suffix = report.runtimeLogs.totalErrors === 1 ? 'entry' : 'entries';
    const uniqueFingerprints = Array.isArray(report.runtimeLogs.fingerprints)
      ? report.runtimeLogs.fingerprints.length
      : 0;
    return `Error discovered in runtime logs: ${report.runtimeLogs.totalErrors} ${suffix} (${uniqueFingerprints} fingerprints). See ${errorLogFile}.`;
  }
  if (report.legacyCompatibility.totalViolations > 0) {
    return `Error discovered in legacy compatibility guardrails: ${report.legacyCompatibility.totalViolations} violations. See ${errorLogFile}.`;
  }
  if (
    report.logger.totalViolations > 0 ||
    report.eventSource.totalViolations > 0 ||
    report.core.totalViolations > 0
  ) {
    return `Error discovered in observability contracts: logger violations=${report.logger.totalViolations}, event source violations=${report.eventSource.totalViolations}, core violations=${report.core.totalViolations}. See ${errorLogFile}.`;
  }
  return null;
};

const compactJsonLineFile = (filePath, maxBytes, label, writeErrors) => {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0 || !fs.existsSync(filePath)) return;

  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile() || stats.size <= maxBytes) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) return;

    const sizeOfLines = (value) => Buffer.byteLength(`${value.join('\n')}\n`, 'utf8');
    while (lines.length > 1 && sizeOfLines(lines) > maxBytes) {
      lines.shift();
    }

    let nextContent = `${lines.join('\n')}\n`;
    if (Buffer.byteLength(nextContent, 'utf8') > maxBytes) {
      nextContent = `${JSON.stringify({
        schemaVersion: LOG_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        status: 'compacted',
        message: `${label} exceeded ${maxBytes} bytes and was compacted`,
      })}\n`;
    }

    fs.writeFileSync(filePath, nextContent, 'utf8');
  } catch (error) {
    writeErrors.push(
      `Failed to compact ${label} (${filePath}): ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
};

const persistReportLogs = (
  report,
  { checkLogPath, errorLogPath, maxCheckLogBytes, maxErrorLogBytes }
) => {
  const writeErrors = [];
  const summaryPayload = buildSummaryPayload(report);

  try {
    fs.mkdirSync(path.dirname(checkLogPath), { recursive: true });
    fs.appendFileSync(checkLogPath, `${JSON.stringify(summaryPayload)}\n`, 'utf8');
    compactJsonLineFile(checkLogPath, maxCheckLogBytes, 'check log', writeErrors);
  } catch (error) {
    writeErrors.push(
      `Failed to append check log (${checkLogPath}): ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  if (report.status !== 'passed') {
    try {
      fs.mkdirSync(path.dirname(errorLogPath), { recursive: true });
      const errorPayload = {
        schemaVersion: LOG_SCHEMA_VERSION,
        generatedAt: report.generatedAt,
        mode: report.mode,
        status: report.status,
        context: report.executionContext,
        summary: summaryPayload,
        failures: {
          logger: report.logger.violations,
          eventSource: report.eventSource.violations,
          core: report.core.violations,
          consoleLogs: report.consoleLogs.violations,
          emptyCatchBlocks: report.emptyCatchBlocks.violations,
          legacyCompatibility: report.legacyCompatibility.violations,
          runtimeLogErrors: report.runtimeLogs.errors,
          runtimeErrorFingerprints: report.runtimeLogs.fingerprints ?? [],
          runtimeReadFailures: report.runtimeLogs.readFailures ?? [],
        },
      };
      fs.appendFileSync(
        errorLogPath,
        `${JSON.stringify(errorPayload)}\n`,
        'utf8'
      );
      compactJsonLineFile(errorLogPath, maxErrorLogBytes, 'error log', writeErrors);
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

  for (const violation of report.eventSource.violations.slice(0, 50)) {
    emitGithubError({
      file: violation.file,
      line: violation.line,
      message: `[observability.check] logSystemEvent source contract violation: ${violation.message}`,
    });
  }

  for (const violation of report.core.violations.slice(0, 50)) {
    emitGithubError({
      message: `[observability.check] core contract violation: ${violation.message}`,
    });
  }

  for (const violation of report.consoleLogs.violations.slice(0, 50)) {
    emitGithubError({
      file: violation.file,
      line: violation.line,
      message: `[observability.check] ${violation.message}`,
    });
  }

  for (const violation of report.emptyCatchBlocks.violations.slice(0, 50)) {
    emitGithubError({
      file: violation.file,
      line: violation.line,
      message: `[observability.check] ${violation.message}`,
    });
  }

  for (const violation of report.legacyCompatibility.violations.slice(0, 50)) {
    emitGithubError({
      file: violation.file,
      line: violation.line,
      message: `[observability.check] legacy compatibility violation: ${violation.message}`,
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
  maxCheckLogBytes = DEFAULTS.maxCheckLogBytes,
  maxErrorLogBytes = DEFAULTS.maxErrorLogBytes,
  scanRuntimeLogs = DEFAULTS.scanRuntimeLogs,
} = {}) => {
  const checkLogPath = resolveFromRoot(root, checkLogFile);
  const errorLogPath = resolveFromRoot(root, errorLogFile);
  const excludedFiles = new Set([path.resolve(checkLogPath), path.resolve(errorLogPath)]);

  const routeCoverage = collectRouteCoverage(root, apiDir);
  const loggerViolations = collectLoggerServiceViolations(root, srcDir);
  const eventSourceViolations = collectLogSystemEventSourceViolations(root, srcDir);
  const coreViolations = collectCoreContractViolations(root, allowPartial);
  const consoleLogViolations = collectConsoleLogViolations(root, srcDir);
  const emptyCatchBlockViolations = collectEmptyCatchBlockViolations(root, srcDir);
  const legacyCompatibilityViolations = collectLegacyCompatibilityViolations(root, srcDir);
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
      fingerprints: [],
      errors: [],
      disabled: true,
    };

  const hasBlockingViolations =
    loggerViolations.length > 0 ||
    eventSourceViolations.length > 0 ||
    coreViolations.length > 0 ||
    legacyCompatibilityViolations.length > 0 ||
    runtimeLogs.totalErrors > 0;
  const report = {
    schemaVersion: LOG_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    mode,
    executionContext: collectExecutionContext(),
    routeCoverage,
    logger: {
      totalViolations: loggerViolations.length,
      violations: loggerViolations,
    },
    eventSource: {
      totalViolations: eventSourceViolations.length,
      violations: eventSourceViolations,
    },
    core: {
      totalViolations: coreViolations.length,
      violations: coreViolations,
    },
    consoleLogs: {
      totalViolations: consoleLogViolations.length,
      violations: consoleLogViolations,
    },
    emptyCatchBlocks: {
      totalViolations: emptyCatchBlockViolations.length,
      violations: emptyCatchBlockViolations,
    },
    legacyCompatibility: {
      totalViolations: legacyCompatibilityViolations.length,
      violations: legacyCompatibilityViolations,
    },
    runtimeLogs,
    logArtifacts: {
      checkLogFile: toReportPath(root, checkLogPath),
      errorLogFile: toReportPath(root, errorLogPath),
      maxCheckLogBytes,
      maxErrorLogBytes,
      writeErrors: [],
    },
    status: hasBlockingViolations ? 'failed' : 'passed',
  };

  report.comment = buildErrorComment(report, report.logArtifacts.errorLogFile);
  report.logArtifacts.writeErrors = persistReportLogs(report, {
    checkLogPath,
    errorLogPath,
    maxCheckLogBytes,
    maxErrorLogBytes,
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
