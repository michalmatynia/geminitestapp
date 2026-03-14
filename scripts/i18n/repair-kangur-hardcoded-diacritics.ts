import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

import { repairKangurPolishText } from '@/shared/lib/i18n/kangur-polish-diacritics';

type CliOptions = {
  dryRun: boolean;
  includeNonJsx: boolean;
  roots: string[];
};

type FileReport = {
  file: string;
  changes: number;
  nodes: number;
};

const DEFAULT_ROOTS = ['src/features/kangur/ui'];
const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  'test-results',
  'bazel-out',
  'bazel-bin',
  'artifacts',
  'tmp',
]);

const BLOCKED_ATTRS = new Set([
  'className',
  'id',
  'key',
  'href',
  'src',
  'role',
  'style',
  'type',
  'variant',
  'size',
  'testId',
  'dataTestId',
  'transitionSourceId',
  'transitionAcknowledgeMs',
  'targetPageKey',
  'asChild',
  'tabIndex',
]);

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    includeNonJsx: false,
    roots: [],
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run' || arg === '--dryrun') {
      options.dryRun = true;
      return;
    }
    if (arg === '--include-non-jsx') {
      options.includeNonJsx = true;
      return;
    }
    if (arg.startsWith('--root=')) {
      const value = arg.slice('--root='.length).trim();
      if (value) options.roots.push(value);
    }
  });

  if (options.roots.length === 0) {
    options.roots = [...DEFAULT_ROOTS];
  }

  return options;
};

const getScriptKind = (filePath: string): ts.ScriptKind => {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.ts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.Unknown;
};

const shouldSkipDir = (dirName: string): boolean => SKIP_DIRS.has(dirName);

const collectFiles = async (root: string, files: string[]): Promise<void> => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) return;
        await collectFiles(entryPath, files);
        return;
      }
      if (!entry.isFile()) return;
      if (!DEFAULT_EXTENSIONS.has(path.extname(entry.name))) return;
      files.push(entryPath);
    })
  );
};

const isJsxContext = (node: ts.Node): boolean => {
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      ts.isJsxElement(current) ||
      ts.isJsxFragment(current) ||
      ts.isJsxSelfClosingElement(current)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

const getJsxAttributeName = (node: ts.Node | undefined): string | null => {
  if (!node || !ts.isJsxAttribute(node)) return null;
  const nameNode = node.name;
  if (ts.isIdentifier(nameNode)) return nameNode.text;
  if (ts.isJsxNamespacedName(nameNode)) return `${nameNode.namespace.text}:${nameNode.name.text}`;
  return null;
};

const isBlockedAttribute = (attrName: string | null): boolean => {
  if (!attrName) return false;
  if (attrName.startsWith('data-')) return true;
  return BLOCKED_ATTRS.has(attrName);
};

const escapeForQuote = (value: string, quote: string): string => {
  const escaped = value.replace(/\\/g, '\\\\');
  if (quote === "'") {
    return escaped.replace(/'/g, "\\'");
  }
  if (quote === '"') {
    return escaped.replace(/"/g, '\\"');
  }
  if (quote === '`') {
    return escaped.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  }
  return escaped;
};

const shouldProcessLiteral = (
  node: ts.StringLiteralLike,
  text: string,
  options: CliOptions
): boolean => {
  if (!text.trim()) return false;
  const jsxAttr = node.parent && ts.isJsxAttribute(node.parent) ? node.parent : null;
  if (jsxAttr) {
    const name = getJsxAttributeName(jsxAttr);
    if (isBlockedAttribute(name)) return false;
    return true;
  }
  if (isJsxContext(node)) return true;
  if (options.includeNonJsx && /\s/.test(text)) return true;
  return false;
};

const shouldProcessJsxText = (raw: string): boolean => {
  return raw.trim().length > 0;
};

const repairFile = async (filePath: string, options: CliOptions): Promise<FileReport | null> => {
  const content = await fs.readFile(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath)
  );

  const edits: Array<{ start: number; end: number; text: string }> = [];
  let nodes = 0;

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      const raw = content.slice(node.getStart(sourceFile), node.getEnd());
      if (shouldProcessJsxText(raw)) {
        const repaired = repairKangurPolishText(raw);
        if (repaired !== raw) {
          edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: repaired });
          nodes += 1;
        }
      }
      return;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const original = node.text;
      if (!shouldProcessLiteral(node, original, options)) {
        ts.forEachChild(node, visit);
        return;
      }
      const repaired = repairKangurPolishText(original);
      if (repaired !== original) {
        const start = node.getStart(sourceFile);
        const end = node.getEnd();
        const raw = content.slice(start, end);
        const quote = raw[0] ?? '"';
        const escaped = escapeForQuote(repaired, quote);
        edits.push({ start, end, text: `${quote}${escaped}${quote}` });
        nodes += 1;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (edits.length === 0) {
    return null;
  }

  const sorted = edits.sort((a, b) => b.start - a.start);
  let updated = content;
  for (const edit of sorted) {
    updated = `${updated.slice(0, edit.start)}${edit.text}${updated.slice(edit.end)}`;
  }

  if (!options.dryRun) {
    await fs.writeFile(filePath, updated, 'utf8');
  }

  return { file: filePath, changes: edits.length, nodes };
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const files: string[] = [];
  await Promise.all(options.roots.map((root) => collectFiles(root, files)));

  const reports: FileReport[] = [];
  for (const file of files) {
    const report = await repairFile(file, options);
    if (report) reports.push(report);
  }

  const totalChanges = reports.reduce((sum, report) => sum + report.changes, 0);

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        dryRun: options.dryRun,
        includeNonJsx: options.includeNonJsx,
        roots: options.roots,
        filesScanned: files.length,
        filesChanged: reports.length,
        totalChanges,
        reports,
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
