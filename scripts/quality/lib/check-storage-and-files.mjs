import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';
import {
  dynamicPublicPathReadAllowlist,
  knownUploadRoots,
} from '../config/storage-and-files.config.mjs';

const SOURCE_ROOTS = ['src/app', 'src/features', 'src/shared'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.cjs', '.js', '.jsx']);
const RUNTIME_UPLOADS_ROOT = path.join('public', 'uploads');
const READ_METHODS = new Set(['readFile', 'stat', 'existsSync', 'createReadStream']);
const ROOT_GUARD_PATTERNS = [
  /getDiskPathFromPublicPath\s*\(/,
  /resolveCaseResolver(?:Image|Ocr)DiskPath\s*\(/,
  /\b(?:uploadsResolved|allowedPrefix|CASE_RESOLVER_UPLOAD_DISK_PREFIX|publicRoot)\b/,
  /\b(?:resolved|diskPath|absolutePath)\.startsWith\s*\(/,
  /Invalid path traversal/,
];

const listSourceFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(extension)) continue;
    if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const createSourceFile = (filePath, text) =>
  ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

const getNodeLocation = (sourceFile, node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    line: position.line + 1,
    column: position.character + 1,
  };
};

const isStringLiteralLike = (node) =>
  Boolean(node) &&
  (ts.isStringLiteralLike(node) ||
    (ts.isNoSubstitutionTemplateLiteral(node) && typeof node.text === 'string'));

const isProcessCwdCall = (node) =>
  Boolean(node) &&
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  ts.isIdentifier(node.expression.expression) &&
  node.expression.expression.text === 'process' &&
  node.expression.name.text === 'cwd';

const readCalleeName = (expression) => {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
};

const collectCodeRoots = (text) => {
  const roots = new Set();
  for (const match of text.matchAll(/\/uploads\/([a-z0-9-]+)/gi)) {
    if (match[1]) roots.add(match[1].toLowerCase());
  }
  for (const match of text.matchAll(/['"]uploads['"]\s*,\s*['"]([a-z0-9-]+)['"]/gi)) {
    if (match[1]) roots.add(match[1].toLowerCase());
  }
  return roots;
};

const hasStrongRootGuard = (text) => ROOT_GUARD_PATTERNS.some((pattern) => pattern.test(text));

const analyzeFile = ({ filePath, root }) => {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = createSourceFile(filePath, text);
  const dynamicPublicResolvers = [];
  const readOps = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const calleeName = readCalleeName(node.expression);
      if (calleeName && READ_METHODS.has(calleeName)) {
        readOps.push(node);
      }

      if (calleeName === 'join' || calleeName === 'resolve') {
        const [first, second, ...rest] = node.arguments;
        const secondIsPublic = isStringLiteralLike(second) && second.text === 'public';
        const hasDynamicTail = rest.some((arg) => !isStringLiteralLike(arg));
        if (isProcessCwdCall(first) && secondIsPublic && hasDynamicTail) {
          dynamicPublicResolvers.push(node);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return {
    relativePath: toRepoRelativePath(root, filePath),
    text,
    sourceFile,
    codeRoots: collectCodeRoots(text),
    dynamicPublicResolvers,
    readOps,
    strongRootGuard: hasStrongRootGuard(text),
  };
};

const listRuntimeRoots = (root) => {
  const uploadsDir = path.join(root, RUNTIME_UPLOADS_ROOT);
  if (!fs.existsSync(uploadsDir)) {
    return {
      exists: false,
      roots: [],
    };
  }

  const roots = fs
    .readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return {
    exists: true,
    roots,
  };
};

export const analyzeStorageAndFiles = ({ root = process.cwd() } = {}) => {
  const issues = [];
  const uploadRootsInCode = new Set(knownUploadRoots.map((value) => value.toLowerCase()));
  const files = SOURCE_ROOTS.flatMap((relativeRoot) => listSourceFiles(path.join(root, relativeRoot)));
  const fileReports = [];
  let dynamicReadRiskCount = 0;

  for (const filePath of files) {
    const report = analyzeFile({ filePath, root });
    fileReports.push({
      file: report.relativePath,
      dynamicPublicResolvers: report.dynamicPublicResolvers.length,
      readOps: report.readOps.length,
      strongRootGuard: report.strongRootGuard,
    });
    for (const codeRoot of report.codeRoots) {
      uploadRootsInCode.add(codeRoot);
    }

    if (
      report.dynamicPublicResolvers.length > 0 &&
      report.readOps.length > 0 &&
      !report.strongRootGuard &&
      !dynamicPublicPathReadAllowlist.includes(report.relativePath)
    ) {
      dynamicReadRiskCount += 1;
      const location = getNodeLocation(report.sourceFile, report.dynamicPublicResolvers[0]);
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'storage-dynamic-public-path-read-without-root-guard',
          file: report.relativePath,
          line: location.line,
          column: location.column,
          message:
            'Builds a disk path under /public from dynamic input without a verified root-prefix guard. Prefer getDiskPathFromPublicPath(...) or path.resolve(...) plus startsWith(...) against /public/uploads.',
          snippet: report.dynamicPublicResolvers[0].getText(report.sourceFile),
        })
      );
    }
  }

  const runtime = listRuntimeRoots(root);
  if (!runtime.exists) {
    issues.push(
      createIssue({
        severity: 'warn',
        ruleId: 'storage-local-uploads-root-missing',
        file: RUNTIME_UPLOADS_ROOT.replace(/\\/g, '/'),
        message:
          'Local uploads root is missing. Create public/uploads before relying on local file storage or keep FILE_STORAGE_SOURCE on fastcomet.',
      })
    );
  }

  for (const runtimeRoot of runtime.roots) {
    if (uploadRootsInCode.has(runtimeRoot.toLowerCase())) continue;
    issues.push(
      createIssue({
        severity: 'warn',
        ruleId: 'storage-runtime-root-unknown',
        file: path.join(RUNTIME_UPLOADS_ROOT, runtimeRoot).replace(/\\/g, '/'),
        message: `Runtime upload root "${runtimeRoot}" is present on disk but not declared in the known/code upload root inventory.`,
      })
    );
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      fileCount: files.length,
      codeUploadRootCount: uploadRootsInCode.size,
      runtimeUploadRootCount: runtime.roots.length,
      dynamicReadRiskCount,
    },
    inventory: {
      knownUploadRoots: [...uploadRootsInCode].sort((left, right) => left.localeCompare(right)),
      runtimeUploadRoots: runtime.roots,
      runtimeUploadsRootExists: runtime.exists,
      dynamicPublicPathReadAllowlist: [...dynamicPublicPathReadAllowlist],
    },
    files: fileReports,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
