import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULTS = {
  mode: 'scan',
  root: process.cwd(),
  srcDir: 'src',
  apiDir: path.join('src', 'app', 'api'),
  allowPartial: false,
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

export const runObservabilityCheck = ({
  mode = DEFAULTS.mode,
  root = DEFAULTS.root,
  srcDir = DEFAULTS.srcDir,
  apiDir = DEFAULTS.apiDir,
  allowPartial = DEFAULTS.allowPartial,
} = {}) => {
  const routeCoverage = collectRouteCoverage(root, apiDir);
  const loggerViolations = collectLoggerServiceViolations(root, srcDir);
  const coreViolations = collectCoreContractViolations(root, allowPartial);

  const hasBlockingViolations = loggerViolations.length > 0 || coreViolations.length > 0;
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
    status: hasBlockingViolations ? 'failed' : 'passed',
  };

  return report;
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const report = runObservabilityCheck(options);
  const summaryLine = `[observability:${report.status}] routes=${report.routeCoverage.totalRoutes} wrapped=${report.routeCoverage.wrappedRoutes} delegated=${report.routeCoverage.delegatedRoutes} uncovered=${report.routeCoverage.uncoveredRoutes} loggerViolations=${report.logger.totalViolations} coreViolations=${report.core.totalViolations}`;

  console.log(summaryLine);
  console.log(JSON.stringify(report, null, 2));

  if (options.mode === 'check' && report.status !== 'passed') {
    process.exit(1);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
