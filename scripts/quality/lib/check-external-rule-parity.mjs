import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';

import ts from 'typescript';

import { analyzeSecurityStatic } from './check-security-static.mjs';
import { analyzeUnsafePatterns } from './check-unsafe-patterns.mjs';
import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';

const DEFAULT_MANIFEST_PATH = path.join('scripts', 'quality', 'config', 'external-rule-map.json');
const SCAN_ROOTS = ['src', 'scripts'];
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const WORKFLOW_EXTENSIONS = new Set(['.yml', '.yaml']);
const TEST_FILE_PATTERN = /(?:^|\/)__tests__\/|(?:\.test|\.spec)\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const JSDOC_BLOCK_PATTERN = /\/\*\*[\s\S]*?\*\//g;
const JSDOC_IMPORT_PATTERN = /import\((['"])([^'"]+)\1\)/g;
const NON_MODULE_IMPORT_PATTERN = /\.(?:css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|eot|mp4|webm|mp3|wav|ogg)$/i;
const SAFE_HTML_MARKERS = /\bsanitize|sanitized|safehtml|safesvg|dompurify|trustedhtml|safe\b/i;
const FS_PATH_SINKS = new Set([
  'readFile',
  'readFileSync',
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'open',
  'openSync',
  'rm',
  'rmSync',
  'unlink',
  'unlinkSync',
  'copyFile',
  'copyFileSync',
]);
const SENSITIVE_VALUE_SUFFIXES = [
  'label',
  'labels',
  'placeholder',
  'placeholders',
  'hint',
  'hints',
  'title',
  'titles',
  'name',
  'names',
  'key',
  'keys',
  'template',
  'templates',
  'description',
  'descriptions',
  'notice',
  'notices',
  'instruction',
  'instructions',
  'aria',
  'tokenaria',
  'selectedtemplate',
  'min',
  'max',
  'minlength',
  'maxlength',
  'pattern',
  'requirement',
  'requirements',
];
const SENSITIVE_NAME_TOKENS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'apikey',
  'clientsecret',
  'accesstoken',
  'refreshtoken',
  'webtoken',
  'authtoken',
];
const SAFE_FILTER_CALL_NAME_PATTERN = /^(?:build|toMongo)[A-Za-z0-9]*(?:Filter|LookupValues?)$/;
const SAFE_URL_FUNCTION_NAME_PATTERN =
  /^(?:build|resolve|normalize|sanitize|validate|create)[A-Za-z0-9]*(?:Url|URL|Uri|URI|Origin|Endpoint|BaseUrl|BaseURL)$/;
const SAFE_REGEX_HELPER_NAME_PATTERN = /^escapeRegExp|escapeRegex$/;
const SAFE_REDIRECT_FUNCTION_NAME_PATTERN =
  /^(?:build|resolve|normalize|sanitize|validate|prepare|create|localize|get|toError)[A-Za-z0-9]*(?:Href|Path|Navigation|Redirect|Url|URL)$/;
const SAFE_DYNAMIC_DISPATCH_NAME_PATTERN =
  /(?:^[A-Z0-9_]+$|(?:Loaders|Builders|Resolvers|Converters|Readers|Setters|Factories|Handlers|Registry|Registries|Dispatchers|Maps|Lookup|Lookups))$/;
const RESTRICTED_BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
]);
const GITHUB_ACTIONS_SAFE_OWNERS = new Set(['actions', 'github']);
const GITHUB_ACTIONS_FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const HEADING_TAG_NAME_PATTERN = /^h[1-6]$/i;
const BUILTIN_MODULE_NAMES = new Set(
  builtinModules.flatMap((name) => [name, name.replace(/^node:/, '')])
);
const OBSOLETE_HTML_ATTRIBUTE_TAGS = new Map([
  ['align', new Set(['div', 'p', 'table', 'tr', 'td', 'th', 'img', 'hr', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])],
  ['bgcolor', new Set(['body', 'table', 'tr', 'td', 'th'])],
  ['cellpadding', new Set(['table'])],
  ['cellspacing', new Set(['table'])],
  ['valign', new Set(['tr', 'td', 'th', 'col', 'colgroup'])],
  ['hspace', new Set(['img', 'applet'])],
  ['vspace', new Set(['img', 'applet'])],
]);
const TIMING_SENSITIVE_NAME_PATTERN =
  /(?:token|secret|signature|digest|hmac|nonce|csrf|otp|verifier|password)/i;
const TIMING_ROLE_NAME_PATTERN =
  /(?:expected|provided|received|computed|actual|stored|incoming|signed|header|cookie)/i;

const IMPLEMENTED_ANALYZERS = new Map([
  ['quality/security-static', analyzeSecurityStatic],
  ['quality/unsafe-patterns', analyzeUnsafePatterns],
]);

const EXTERNAL_PARITY_ESLINT_RULE_COVERAGE = new Map([
  ['complexity', { status: 'configured', localRuleId: 'complexity' }],
  ['comma-dangle', { status: 'configured', localRuleId: 'comma-dangle' }],
  ['max-lines-per-function', { status: 'configured', localRuleId: 'max-lines-per-function' }],
  ['max-lines', { status: 'configured', localRuleId: 'max-lines' }],
  ['max-params', { status: 'configured', localRuleId: 'max-params' }],
  ['no-await-in-loop', { status: 'configured', localRuleId: 'no-await-in-loop' }],
  [
    'no-top-level-await',
    {
      status: 'configured-via-alias',
      localRuleId: 'no-restricted-syntax',
      rationale: 'Enforced with a top-level AwaitExpression selector instead of a dedicated rule id.',
    },
  ],
  [
    'import/no-unresolved',
    {
      status: 'pending',
      localRuleId: null,
      rationale: 'Legacy ESLint mapping only. The repo now covers import resolution through the implemented import-resolution parity detector.',
    },
  ],
  [
    'no-sync',
    {
      status: 'configured-via-alias',
      localRuleId: 'no-restricted-syntax',
      rationale:
        'Covered heuristically by the .fooSync() no-restricted-syntax selector instead of eslint-plugin-n\'s dedicated no-sync rule.',
    },
  ],
  [
    'no-atomic-updates',
    {
      status: 'pending',
      localRuleId: null,
      rationale: 'Attempted, but this ESLint stack does not expose the rule cleanly in the current flat-config setup.',
    },
  ],
]);

const readManifest = async ({ root, manifestPath = DEFAULT_MANIFEST_PATH }) => {
  const absolutePath = path.join(root, manifestPath);
  const raw = await fsPromises.readFile(absolutePath, 'utf8');
  return {
    absolutePath,
    manifest: JSON.parse(raw),
  };
};

const listSourceFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'docs') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!SCAN_EXTENSIONS.has(ext)) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const listWorkflowFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listWorkflowFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!WORKFLOW_EXTENSIONS.has(ext)) continue;
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

const isTestFile = (relativePath) => TEST_FILE_PATTERN.test(relativePath);

const getLiteralString = (node) => {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
};

const getPropertyNameText = (nameNode) => {
  if (!nameNode) return null;
  if (ts.isIdentifier(nameNode) || ts.isPrivateIdentifier(nameNode)) return nameNode.text;
  if (ts.isStringLiteralLike(nameNode) || ts.isNumericLiteral(nameNode)) return nameNode.text;
  return null;
};

const normalizeName = (value) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

const isSensitiveCredentialName = (value) => {
  const normalized = normalizeName(value);
  if (normalized.length === 0) return false;
  if (SENSITIVE_VALUE_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return false;
  return SENSITIVE_NAME_TOKENS.some(
    (token) => normalized === token || normalized.startsWith(token) || normalized.endsWith(token)
  );
};

const isSuspiciousSecretLiteral = (value) => {
  const trimmed = value.trim();
  if (trimmed.length < 4) return false;
  if (/^[•*xX.-]+$/.test(trimmed)) return false;
  if (/^(password|secret|token|changeme|example)$/i.test(trimmed)) return false;
  if (/^[A-Z0-9_:-]+$/.test(trimmed) && /[_:]/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^[./]/.test(trimmed)) return false;
  return true;
};

const isMetaPropertyImportMeta = (node) =>
  ts.isMetaProperty(node) &&
  node.keywordToken === ts.SyntaxKind.ImportKeyword &&
  node.name.text === 'meta';

const isImportMetaProperty = (node, propertyName) =>
  ts.isPropertyAccessExpression(node) &&
  isMetaPropertyImportMeta(node.expression) &&
  node.name.text === propertyName;

const isPropertyAccess = (node, objectName, propertyName) =>
  ts.isPropertyAccessExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === objectName &&
  node.name.text === propertyName;

const isCallToProperty = (node, objectName, propertyName) =>
  ts.isCallExpression(node) && isPropertyAccess(node.expression, objectName, propertyName);

const unwrapExpression = (node) => {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression?.(current))
  ) {
    current = current.expression;
  }
  return current;
};

const collectFileContext = (sourceFile) => {
  const declarations = [];
  const safePathBindings = new Set(['__dirname', '__filename']);
  const safeUrlBindings = new Set();
  const safeRedirectBindings = new Set();
  const safeRegexBindings = new Set();
  const directFsFunctions = new Set();
  const fsNamespaceBindings = new Set();
  const functionDeclarations = [];
  const safeUrlFunctions = new Set();
  const safeRedirectFunctions = new Set();

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      declarations.push(node);
    }
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)) &&
      node.parent
    ) {
      functionDeclarations.push(node);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      functionDeclarations.push(node);
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      if (
        moduleName === 'node:fs' ||
        moduleName === 'node:fs/promises' ||
        moduleName === 'fs' ||
        moduleName === 'fs/promises'
      ) {
        const clause = node.importClause;
        if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            directFsFunctions.add(element.name.text);
          }
        }
        if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          fsNamespaceBindings.add(clause.namedBindings.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of declarations) {
      const name = declaration.name.text;
      if (!safePathBindings.has(name) && isSafePathExpression(declaration.initializer, safePathBindings)) {
        safePathBindings.add(name);
        changed = true;
      }
      if (
        !safeUrlBindings.has(name) &&
        isSafeUrlExpression(declaration.initializer, safeUrlBindings, safeUrlFunctions)
      ) {
        safeUrlBindings.add(name);
        changed = true;
      }
      if (
        !safeRegexBindings.has(name) &&
        isSafeRegexPatternExpression(declaration.initializer, safeRegexBindings)
      ) {
        safeRegexBindings.add(name);
        changed = true;
      }
      if (
        !safeRedirectBindings.has(name) &&
        isSafeRedirectExpression(
          declaration.initializer,
          safeRedirectBindings,
          safeRedirectFunctions,
          safeUrlBindings,
          safeUrlFunctions
        )
      ) {
        safeRedirectBindings.add(name);
        changed = true;
      }
    }

    for (const candidate of functionDeclarations) {
      let functionName = null;
      let functionNode = null;
      if (ts.isVariableDeclaration(candidate) && ts.isIdentifier(candidate.name)) {
        functionName = candidate.name.text;
        functionNode = candidate.initializer;
      } else if (
        (ts.isFunctionDeclaration(candidate) || ts.isMethodDeclaration(candidate)) &&
        candidate.name
      ) {
        functionName = candidate.name.text;
        functionNode = candidate;
      }

      if (
        !functionName ||
        !functionNode ||
        (!SAFE_URL_FUNCTION_NAME_PATTERN.test(functionName) &&
          !SAFE_REDIRECT_FUNCTION_NAME_PATTERN.test(functionName))
      ) {
        continue;
      }

      const returnExpressions = [];
      if (
        (ts.isArrowFunction(functionNode) || ts.isFunctionExpression(functionNode) || ts.isFunctionDeclaration(functionNode)) &&
        functionNode.body
      ) {
        if (ts.isBlock(functionNode.body)) {
          for (const statement of functionNode.body.statements) {
            if (ts.isReturnStatement(statement) && statement.expression) {
              returnExpressions.push(statement.expression);
            }
          }
        } else {
          returnExpressions.push(functionNode.body);
        }
      }

      const allowedNames = new Set(functionNode.parameters?.map((parameter) => parameter.name.getText()) ?? []);
      if (
        SAFE_URL_FUNCTION_NAME_PATTERN.test(functionName) &&
        !safeUrlFunctions.has(functionName) &&
        returnExpressions.length > 0 &&
        returnExpressions.every((expression) =>
          isSafeUrlExpression(expression, safeUrlBindings, safeUrlFunctions, allowedNames)
        )
      ) {
        safeUrlFunctions.add(functionName);
        changed = true;
      }

      if (
        SAFE_REDIRECT_FUNCTION_NAME_PATTERN.test(functionName) &&
        !safeRedirectFunctions.has(functionName) &&
        returnExpressions.length > 0 &&
        returnExpressions.every((expression) =>
          isSafeRedirectExpression(
            expression,
            safeRedirectBindings,
            safeRedirectFunctions,
            safeUrlBindings,
            safeUrlFunctions,
            allowedNames
          )
        )
      ) {
        safeRedirectFunctions.add(functionName);
        changed = true;
      }
    }
  }

  return {
    safePathBindings,
    safeUrlBindings,
    safeRedirectBindings,
    safeUrlFunctions,
    safeRedirectFunctions,
    safeRegexBindings,
    directFsFunctions,
    fsNamespaceBindings,
  };
};

function isSafePathExpression(node, safePathBindings) {
  if (!node) return false;
  if (getLiteralString(node) !== null) return true;
  if (ts.isIdentifier(node)) return safePathBindings.has(node.text);
  if (isImportMetaProperty(node, 'dirname') || isImportMetaProperty(node, 'filename')) return true;
  if (isCallToProperty(node, 'process', 'cwd') || isCallToProperty(node, 'os', 'tmpdir')) return true;
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'fileURLToPath') {
    return node.arguments.some((argument) => isImportMetaProperty(argument, 'url'));
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'path' &&
    ['join', 'resolve', 'dirname'].includes(node.expression.name.text)
  ) {
    return node.arguments.every((argument) => isSafePathExpression(argument, safePathBindings));
  }
  return false;
}

function isSafeUrlExpression(
  node,
  safeUrlBindings,
  safeUrlFunctions = new Set(),
  allowedIdentifierNames = new Set()
) {
  if (!node) return false;
  const unwrapped = unwrapExpression(node);
  const literal = getLiteralString(unwrapped);
  if (literal !== null) {
    return /^(?:\/|\.{1,2}\/|https?:\/\/)/i.test(literal);
  }
  if (ts.isIdentifier(unwrapped)) {
    return safeUrlBindings.has(unwrapped.text) || allowedIdentifierNames.has(unwrapped.text);
  }
  if (ts.isTemplateExpression(unwrapped)) {
    return unwrapped.templateSpans.every((span) =>
      isSafeUrlExpression(
        span.expression,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      )
    );
  }
  if (
    ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return (
      isSafeUrlExpression(
        unwrapped.left,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      ) &&
      isSafeUrlExpression(
        unwrapped.right,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      )
    );
  }
  if (
    ts.isNewExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression) &&
    unwrapped.expression.text === 'URL' &&
    (unwrapped.arguments?.length ?? 0) > 0
  ) {
    return unwrapped.arguments.every((argument) =>
      isSafeUrlExpression(
        argument,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      )
    );
  }
  if (
    ts.isCallExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression) &&
    safeUrlFunctions.has(unwrapped.expression.text)
  ) {
    return true;
  }
  return false;
}

function isSafeRegexPatternExpression(node, safeRegexBindings = new Set()) {
  if (!node) return false;
  const unwrapped = unwrapExpression(node);
  if (ts.isRegularExpressionLiteral(unwrapped)) return true;
  if (getLiteralString(unwrapped) !== null) return true;
  if (ts.isIdentifier(unwrapped)) return safeRegexBindings.has(unwrapped.text);
  if (
    ts.isCallExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression) &&
    SAFE_REGEX_HELPER_NAME_PATTERN.test(unwrapped.expression.text)
  ) {
    return true;
  }
  if (ts.isTemplateExpression(unwrapped)) {
    return unwrapped.templateSpans.every((span) =>
      isSafeRegexPatternExpression(span.expression, safeRegexBindings)
    );
  }
  if (
    ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return (
      isSafeRegexPatternExpression(unwrapped.left, safeRegexBindings) &&
      isSafeRegexPatternExpression(unwrapped.right, safeRegexBindings)
    );
  }
  return false;
}

function isSafeRedirectExpression(
  node,
  safeRedirectBindings = new Set(),
  safeRedirectFunctions = new Set(),
  safeUrlBindings = new Set(),
  safeUrlFunctions = new Set(),
  allowedIdentifierNames = new Set()
) {
  if (!node) return false;
  const unwrapped = unwrapExpression(node);
  const literal = getLiteralString(unwrapped);
  if (literal !== null) {
    return /^(?:\/|\.{1,2}\/|\?|#|https?:\/\/)/i.test(literal);
  }
  if (ts.isIdentifier(unwrapped)) {
    return safeRedirectBindings.has(unwrapped.text) || allowedIdentifierNames.has(unwrapped.text);
  }
  if (
    ts.isPropertyAccessExpression(unwrapped) &&
    ['origin', 'pathname', 'search', 'hash', 'href'].includes(unwrapped.name.text)
  ) {
    return true;
  }
  if (ts.isTemplateExpression(unwrapped)) {
    return (
      /^(?:\/|\.{1,2}\/|\?|#)/.test(unwrapped.head.text) &&
      unwrapped.templateSpans.every((span) =>
        isSafeRedirectExpression(
          span.expression,
          safeRedirectBindings,
          safeRedirectFunctions,
          safeUrlBindings,
          safeUrlFunctions,
          allowedIdentifierNames
        )
      )
    );
  }
  if (
    ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return (
      isSafeRedirectExpression(
        unwrapped.left,
        safeRedirectBindings,
        safeRedirectFunctions,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      ) ||
      isSafeRedirectExpression(
        unwrapped.right,
        safeRedirectBindings,
        safeRedirectFunctions,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      )
    );
  }
  if (ts.isConditionalExpression(unwrapped)) {
    return (
      isSafeRedirectExpression(
        unwrapped.whenTrue,
        safeRedirectBindings,
        safeRedirectFunctions,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      ) &&
      isSafeRedirectExpression(
        unwrapped.whenFalse,
        safeRedirectBindings,
        safeRedirectFunctions,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      )
    );
  }
  if (ts.isBinaryExpression(unwrapped) && unwrapped.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    return (
      isSafeRedirectExpression(
        unwrapped.left,
        safeRedirectBindings,
        safeRedirectFunctions,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      ) &&
      isSafeRedirectExpression(
        unwrapped.right,
        safeRedirectBindings,
        safeRedirectFunctions,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      )
    );
  }
  if (
    ts.isCallExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression) &&
    (safeRedirectFunctions.has(unwrapped.expression.text) ||
      SAFE_REDIRECT_FUNCTION_NAME_PATTERN.test(unwrapped.expression.text))
  ) {
    return true;
  }
  if (
    ts.isCallExpression(unwrapped) &&
    ts.isPropertyAccessExpression(unwrapped.expression) &&
    unwrapped.expression.name.text === 'toString'
  ) {
    return isSafeRedirectExpression(
      unwrapped.expression.expression,
      safeRedirectBindings,
      safeRedirectFunctions,
      safeUrlBindings,
      safeUrlFunctions,
      allowedIdentifierNames
    );
  }
  if (
    ts.isNewExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression) &&
    unwrapped.expression.text === 'URL' &&
    (unwrapped.arguments?.length ?? 0) > 0
  ) {
    return (
      isSafeRedirectExpression(
        unwrapped.arguments[0],
        safeRedirectBindings,
        safeRedirectFunctions,
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      ) ||
      isSafeUrlExpression(
        unwrapped.arguments[0],
        safeUrlBindings,
        safeUrlFunctions,
        allowedIdentifierNames
      )
    );
  }
  if (isSafeUrlExpression(unwrapped, safeUrlBindings, safeUrlFunctions, allowedIdentifierNames)) {
    return true;
  }
  return false;
}

const createParityIssue = ({
  sourceFile,
  relativePath,
  node,
  severity,
  ruleId,
  message,
  snippet = null,
  context = null,
}) => {
  const location = getNodeLocation(sourceFile, node);
  return createIssue({
    severity,
    ruleId,
    message,
    file: relativePath,
    line: location.line,
    column: location.column,
    snippet,
    context,
  });
};

const createTextParityIssue = ({
  relativePath,
  severity,
  ruleId,
  message,
  line,
  column,
  snippet = null,
  context = null,
}) =>
  createIssue({
    severity,
    ruleId,
    message,
    file: relativePath,
    line,
    column,
    snippet,
    context,
  });

const readPackageDependencyNames = (root) => {
  const packageJsonPath = path.join(root, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return new Set();
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
};

const loadTypeScriptCompilerOptions = (root) => {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    return {
      options: {
        allowJs: true,
        jsx: ts.JsxEmit.ReactJSX,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        resolveJsonModule: true,
      },
      configPath: null,
    };
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    return {
      options: {
        allowJs: true,
        jsx: ts.JsxEmit.ReactJSX,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        resolveJsonModule: true,
      },
      configPath,
    };
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  return {
    options: parsed.options,
    configPath,
  };
};

const getPackageNameFromSpecifier = (specifier) => {
  if (
    !specifier ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('@/') ||
    specifier.startsWith('~/') ||
    specifier.startsWith('#') ||
    specifier.startsWith('node:')
  ) {
    return null;
  }

  if (specifier.startsWith('@')) {
    const segments = specifier.split('/');
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier;
  }

  return specifier.split('/')[0] ?? null;
};

const collectJsdocImportDependencyIssues = ({
  text,
  sourceFile,
  relativePath,
  declaredDependencyNames,
}) => {
  const issues = [];

  for (const commentMatch of text.matchAll(JSDOC_BLOCK_PATTERN)) {
    const commentText = commentMatch[0];
    const commentStart = commentMatch.index ?? 0;

    for (const importMatch of commentText.matchAll(JSDOC_IMPORT_PATTERN)) {
      const importSpecifier = importMatch[2];
      const packageName = getPackageNameFromSpecifier(importSpecifier);
      if (!packageName || BUILTIN_MODULE_NAMES.has(packageName)) continue;
      if (declaredDependencyNames.has(packageName)) continue;

      const importOffset = commentStart + (importMatch.index ?? 0);
      const location = sourceFile.getLineAndCharacterOfPosition(importOffset);
      issues.push(
        createTextParityIssue({
          relativePath,
          severity: 'warn',
          ruleId: 'jsdoc-import-dependency-consistency',
          message:
            'JSDoc import references a package that is not declared in package.json dependencies. Keep documentation imports aligned with declared packages.',
          line: location.line + 1,
          column: location.character + 1,
          snippet: importMatch[0],
          context: {
            importSpecifier,
            packageName,
          },
        })
      );
    }
  }

  return issues;
};

const shouldCheckImportResolution = (specifier) =>
  Boolean(specifier) &&
  !specifier.startsWith('node:') &&
  !BUILTIN_MODULE_NAMES.has(specifier) &&
  !NON_MODULE_IMPORT_PATTERN.test(specifier);

const resolveModuleSpecifier = ({
  specifier,
  containingFile,
  compilerOptions,
  resolutionCache,
}) => {
  const cacheKey = `${containingFile}::${specifier}`;
  if (resolutionCache.has(cacheKey)) {
    return resolutionCache.get(cacheKey);
  }

  const result = ts.resolveModuleName(specifier, containingFile, compilerOptions, ts.sys).resolvedModule ?? null;
  resolutionCache.set(cacheKey, result);
  return result;
};

const collectComparisonNames = (node) => {
  const names = [];
  const visit = (current) => {
    if (!current) return;
    const unwrapped = unwrapExpression(current);
    if (ts.isIdentifier(unwrapped)) {
      names.push(unwrapped.text);
      return;
    }
    if (ts.isPropertyAccessExpression(unwrapped)) {
      names.push(unwrapped.name.text);
      return;
    }
    if (ts.isElementAccessExpression(unwrapped) && ts.isStringLiteralLike(unwrapped.argumentExpression)) {
      names.push(unwrapped.argumentExpression.text);
      return;
    }
    if (ts.isCallExpression(unwrapped)) {
      visit(unwrapped.expression);
      return;
    }
    if (ts.isBinaryExpression(unwrapped)) {
      visit(unwrapped.left);
      visit(unwrapped.right);
      return;
    }
    if (ts.isConditionalExpression(unwrapped)) {
      visit(unwrapped.whenTrue);
      visit(unwrapped.whenFalse);
    }
  };
  visit(node);
  return names;
};

const isLiteralLikeTimingOperand = (node) => {
  const unwrapped = unwrapExpression(node);
  return (
    unwrapped.kind === ts.SyntaxKind.NullKeyword ||
    unwrapped.kind === ts.SyntaxKind.UndefinedKeyword ||
    unwrapped.kind === ts.SyntaxKind.TrueKeyword ||
    unwrapped.kind === ts.SyntaxKind.FalseKeyword ||
    ts.isStringLiteralLike(unwrapped) ||
    ts.isNumericLiteral(unwrapped) ||
    ts.isBigIntLiteral?.(unwrapped)
  );
};

const analyzeTimingComparison = (node) => {
  const leftNames = collectComparisonNames(node.left);
  const rightNames = collectComparisonNames(node.right);
  const leftSensitive = leftNames.filter((name) => TIMING_SENSITIVE_NAME_PATTERN.test(name));
  const rightSensitive = rightNames.filter((name) => TIMING_SENSITIVE_NAME_PATTERN.test(name));
  const leftRole = leftNames.some((name) => TIMING_ROLE_NAME_PATTERN.test(name));
  const rightRole = rightNames.some((name) => TIMING_ROLE_NAME_PATTERN.test(name));

  if (leftSensitive.length === 0 || rightSensitive.length === 0) return null;
  if (!leftRole && !rightRole) return null;
  if (isLiteralLikeTimingOperand(node.left) || isLiteralLikeTimingOperand(node.right)) return null;

  return {
    leftSensitive,
    rightSensitive,
  };
};

const isAssignmentTargetNode = (node) => {
  const unwrapped = unwrapExpression(node);
  return (
    ts.isIdentifier(unwrapped) ||
    ts.isPropertyAccessExpression(unwrapped) ||
    ts.isElementAccessExpression(unwrapped)
  );
};

const sameAssignmentTarget = (left, right, sourceFile) => {
  const normalizedLeft = unwrapExpression(left);
  const normalizedRight = unwrapExpression(right);

  if (normalizedLeft.kind !== normalizedRight.kind) return false;
  return normalizedLeft.getText(sourceFile) === normalizedRight.getText(sourceFile);
};

const containsAsyncSuspension = (node) => {
  let found = false;
  const visit = (current) => {
    if (found || !current) return;
    const unwrapped = unwrapExpression(current);
    if (ts.isAwaitExpression(unwrapped) || ts.isYieldExpression?.(unwrapped)) {
      found = true;
      return;
    }
    if (unwrapped !== node && isFunctionLikeNode(unwrapped)) {
      return;
    }
    ts.forEachChild(unwrapped, visit);
  };
  visit(node);
  return found;
};

const assignmentTargetAppearsInExpression = (target, expression, sourceFile) => {
  let found = false;
  const visit = (current) => {
    if (found || !current) return;
    const unwrapped = unwrapExpression(current);
    const isPropertyNameOnly =
      ts.isIdentifier(unwrapped) &&
      ts.isPropertyAccessExpression(unwrapped.parent) &&
      unwrapped.parent.name === unwrapped;

    if (
      !isPropertyNameOnly &&
      isAssignmentTargetNode(unwrapped) &&
      sameAssignmentTarget(target, unwrapped, sourceFile)
    ) {
      found = true;
      return;
    }
    if (unwrapped !== expression && isFunctionLikeNode(unwrapped)) {
      return;
    }
    ts.forEachChild(unwrapped, visit);
  };
  visit(expression);
  return found;
};

const analyzeAtomicUpdate = (node, sourceFile) => {
  if (!ts.isBinaryExpression(node) || !isAssignmentTargetNode(node.left)) return null;
  const operatorKind = node.operatorToken.kind;

  if (operatorKind === ts.SyntaxKind.EqualsToken) {
    if (
      containsAsyncSuspension(node.right) &&
      assignmentTargetAppearsInExpression(node.left, node.right, sourceFile)
    ) {
      return {
        mode: 'simple-assignment',
        target: unwrapExpression(node.left).getText(sourceFile),
      };
    }
    return null;
  }

  if (
    operatorKind >= ts.SyntaxKind.FirstCompoundAssignment &&
    operatorKind <= ts.SyntaxKind.LastCompoundAssignment &&
    containsAsyncSuspension(node.right)
  ) {
    return {
      mode: 'compound-assignment',
      target: unwrapExpression(node.left).getText(sourceFile),
    };
  }

  return null;
};

const findAncestor = (node, predicate) => {
  let current = node.parent ?? null;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent ?? null;
  }
  return null;
};

const resolveForInLoopKey = (node) => {
  if (
    ts.isVariableDeclarationList(node.initializer) &&
    node.initializer.declarations.length === 1 &&
    ts.isIdentifier(node.initializer.declarations[0]?.name)
  ) {
    return node.initializer.declarations[0].name.text;
  }
  if (ts.isIdentifier(node.initializer)) return node.initializer.text;
  return null;
};

const expressionContainsIdentifier = (node, identifierName) => {
  let found = false;
  const visit = (current) => {
    if (found || !current) return;
    const unwrapped = unwrapExpression(current);
    if (ts.isIdentifier(unwrapped) && unwrapped.text === identifierName) {
      found = true;
      return;
    }
    ts.forEachChild(unwrapped, visit);
  };
  visit(node);
  return found;
};

const blockHasOwnGuardForKey = (block, keyName) => {
  const text = block.getText();
  if (
    text.includes('Object.prototype.hasOwnProperty.call') ||
    text.includes('Object.hasOwn(') ||
    text.includes(`UNSAFE_OBJECT_KEYS.has(${keyName})`) ||
    text.includes('\'__proto__\'') ||
    text.includes('"__proto__"') ||
    text.includes('\'prototype\'') ||
    text.includes('"prototype"') ||
    text.includes('\'constructor\'') ||
    text.includes('"constructor"')
  ) {
    return true;
  }
  return false;
};

const isDynamicPropertyKey = (node) => {
  const unwrapped = unwrapExpression(node);
  if (getLiteralString(unwrapped) !== null) return false;
  if (ts.isNumericLiteral(unwrapped)) return false;
  if (ts.isNoSubstitutionTemplateLiteral(unwrapped)) return false;
  return true;
};

const isSafeDynamicDispatchCall = (node) => {
  if (!ts.isCallExpression(node) || !ts.isElementAccessExpression(node.expression)) return false;
  const target = unwrapExpression(node.expression.expression);
  const key = unwrapExpression(node.expression.argumentExpression);

  if (ts.isIdentifier(target) && SAFE_DYNAMIC_DISPATCH_NAME_PATTERN.test(target.text)) {
    return true;
  }
  if (ts.isIdentifier(key) && /^[A-Z0-9_]+$/.test(key.text)) {
    return true;
  }
  return false;
};

const isFunctionLikeNode = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isArrowFunction(node) ||
  ts.isFunctionExpression(node) ||
  ts.isConstructorDeclaration(node) ||
  ts.isGetAccessorDeclaration(node) ||
  ts.isSetAccessorDeclaration(node);

const isClassLikeNode = (node) => ts.isClassDeclaration(node) || ts.isClassExpression(node);

const hasUseClientDirective = (sourceFile) => {
  for (const statement of sourceFile.statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteralLike(statement.expression)
    ) {
      if (statement.expression.text === 'use client') return true;
      continue;
    }
    break;
  }
  return false;
};

const isTypeContext = (node) => {
  let current = node.parent ?? null;
  while (current) {
    if (ts.isTypeNode(current)) return true;
    if (ts.isImportTypeNode?.(current)) return true;
    if (ts.isHeritageClause(current) || ts.isInterfaceDeclaration(current) || ts.isTypeAliasDeclaration(current)) {
      return true;
    }
    if (ts.isSourceFile(current) || ts.isBlock(current)) break;
    current = current.parent ?? null;
  }
  return false;
};

const containsTypeofAvailabilityCheck = (node, globalName) => {
  let matched = false;
  const visit = (current) => {
    if (matched || !current) return;
    const unwrapped = unwrapExpression(current);
    if (
      ts.isBinaryExpression(unwrapped) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(unwrapped.operatorToken.kind)
    ) {
      const left = unwrapExpression(unwrapped.left);
      const right = unwrapExpression(unwrapped.right);
      const leftIsTypeofGlobal =
        ts.isTypeOfExpression(left) &&
        ts.isIdentifier(left.expression) &&
        left.expression.text === globalName;
      const rightIsTypeofGlobal =
        ts.isTypeOfExpression(right) &&
        ts.isIdentifier(right.expression) &&
        right.expression.text === globalName;
      const leftLiteral = getLiteralString(left);
      const rightLiteral = getLiteralString(right);
      if (
        (leftIsTypeofGlobal && rightLiteral === 'undefined') ||
        (rightIsTypeofGlobal && leftLiteral === 'undefined')
      ) {
        matched = true;
        return;
      }
    }
    ts.forEachChild(unwrapped, visit);
  };
  visit(node);
  return matched;
};

const isGuardedBrowserGlobalAccess = (node, globalName) => {
  let current = node.parent ?? null;
  while (current) {
    if (ts.isConditionalExpression(current)) {
      const guarded = containsTypeofAvailabilityCheck(current.condition, globalName);
      if (guarded) return true;
    }
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      current.right === node.parent
    ) {
      if (containsTypeofAvailabilityCheck(current.left, globalName)) return true;
    }
    if (ts.isSourceFile(current) || ts.isBlock(current) || isFunctionLikeNode(current)) break;
    current = current.parent ?? null;
  }
  return false;
};

const classifyBrowserGlobalAccess = (node) => {
  let current = node.parent ?? null;
  while (current) {
    if (ts.isParameter(current) && current.initializer) {
      return 'default-parameter';
    }
    if (isFunctionLikeNode(current) || isClassLikeNode(current)) {
      return null;
    }
    if (ts.isSourceFile(current)) {
      return 'module';
    }
    current = current.parent ?? null;
  }
  return null;
};

const getJsxTagNameText = (tagName) => {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isJsxNamespacedName(tagName)) return `${tagName.namespace.text}:${tagName.name.text}`;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
  return null;
};

const appendStaticJsxText = (node, parts) => {
  if (ts.isJsxText(node)) {
    parts.push(node.text);
    return true;
  }
  if (ts.isJsxExpression(node)) {
    if (!node.expression) return true;
    const literal = getLiteralString(unwrapExpression(node.expression));
    if (literal === null) return false;
    parts.push(literal);
    return true;
  }
  if (ts.isJsxElement(node)) {
    for (const child of node.children) {
      if (!appendStaticJsxText(child, parts)) return false;
    }
    return true;
  }
  if (ts.isJsxFragment(node)) {
    for (const child of node.children) {
      if (!appendStaticJsxText(child, parts)) return false;
    }
    return true;
  }
  if (ts.isJsxSelfClosingElement(node)) {
    return true;
  }
  return false;
};

const getStaticHeadingText = (jsxElement) => {
  const parts = [];
  for (const child of jsxElement.children) {
    if (!appendStaticJsxText(child, parts)) return null;
  }
  const normalized = parts.join(' ').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
};

const collectDuplicateHeadingIssues = ({ sourceFile, relativePath }) => {
  const issues = [];
  const firstHeadingByText = new Map();

  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      const tagName = getJsxTagNameText(node.openingElement.tagName);
      if (tagName && HEADING_TAG_NAME_PATTERN.test(tagName)) {
        const headingText = getStaticHeadingText(node);
        if (headingText) {
          const normalizedHeading = headingText.toLowerCase();
          const firstHeading = firstHeadingByText.get(normalizedHeading);
          if (firstHeading) {
            issues.push(
              createParityIssue({
                sourceFile,
                relativePath,
                node: node.openingElement.tagName,
                severity: 'warn',
                ruleId: 'duplicate-headings',
                message:
                  'Static heading content is duplicated within the same file. Review heading structure to keep document navigation distinct.',
                snippet: headingText,
                context: {
                  headingText,
                  firstOccurrenceLine: firstHeading.line,
                },
              })
            );
          } else {
            firstHeadingByText.set(normalizedHeading, {
              line: getNodeLocation(sourceFile, node.openingElement.tagName).line,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return issues;
};

const collectObsoleteHtmlAttributeIssues = ({ sourceFile, relativePath }) => {
  const issues = [];

  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = getJsxTagNameText(node.tagName);
      const normalizedTagName = tagName?.toLowerCase() ?? null;
      if (normalizedTagName && /^[a-z][a-z0-9-]*$/.test(normalizedTagName)) {
        for (const attribute of node.attributes.properties) {
          if (!ts.isJsxAttribute(attribute)) continue;
          const attributeName = attribute.name.text.toLowerCase();
          const allowedTags = OBSOLETE_HTML_ATTRIBUTE_TAGS.get(attributeName);
          if (!allowedTags || !allowedTags.has(normalizedTagName)) continue;

          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: attribute.name,
              severity: 'warn',
              ruleId: 'css-scss-compatibility-rules',
              message:
                'Obsolete HTML presentation attribute is used on an intrinsic element. Prefer CSS or component styling over deprecated HTML attributes.',
              snippet: `${normalizedTagName}[${attribute.name.text}]`,
              context: {
                attributeName: attribute.name.text,
                tagName: normalizedTagName,
              },
            })
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return issues;
};

const parseFilterEnvList = (value) =>
  typeof value === 'string' && value.trim().length > 0
    ? [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))]
    : [];

const summarizeExternalRuleFilterResolution = (manifest, externalRuleFilters) =>
  externalRuleFilters
    .map((filterValue) => {
      const normalizedFilter = filterValue.toLowerCase();
      const matches = (manifest.rules ?? [])
        .filter((rule) =>
          (rule.externalRuleNames ?? []).some((ruleName) =>
            ruleName.toLowerCase().includes(normalizedFilter)
          )
        )
        .map((rule) => ({
          normalizedRuleId: rule.normalizedRuleId,
          status: rule.status,
          severity: rule.severity ?? null,
          ownerScanner: rule.ownerScanner ?? null,
          sourceRuleId: rule.sourceScannerRuleId ?? null,
        }))
        .sort((left, right) => left.normalizedRuleId.localeCompare(right.normalizedRuleId));

      return {
        filter: filterValue,
        matchCount: matches.length,
        matches,
      };
    })
    .sort((left, right) => left.filter.localeCompare(right.filter));

const matchesPathFilters = (relativePath, pathFilters) =>
  pathFilters.length === 0 || pathFilters.some((pathFilter) => relativePath.includes(pathFilter));

const analyzeExternalRuleParityLocalRules = ({ root = process.cwd(), env = process.env } = {}) => {
  const issues = [];
  let fileCount = 0;
  const declaredDependencyNames = readPackageDependencyNames(root);
  const { options: compilerOptions } = loadTypeScriptCompilerOptions(root);
  const resolutionCache = new Map();
  const pathFilters = parseFilterEnvList(env?.EXTERNAL_RULE_PARITY_PATHS);

  const absoluteFiles = [];
  for (const scanRoot of SCAN_ROOTS) {
    listSourceFiles(path.join(root, scanRoot), absoluteFiles);
  }

  const workflowFiles = listWorkflowFiles(path.join(root, '.github', 'workflows'));

  for (const absolutePath of absoluteFiles) {
    const relativePath = toRepoRelativePath(root, absolutePath);
    if (isTestFile(relativePath)) continue;
    if (!matchesPathFilters(relativePath, pathFilters)) continue;
    fileCount += 1;

    const text = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = createSourceFile(absolutePath, text);
    const fileUsesClientDirective = hasUseClientDirective(sourceFile);
    issues.push(...collectDuplicateHeadingIssues({ sourceFile, relativePath }));
    issues.push(...collectObsoleteHtmlAttributeIssues({ sourceFile, relativePath }));
    issues.push(
      ...collectJsdocImportDependencyIssues({
        text,
        sourceFile,
        relativePath,
        declaredDependencyNames,
      })
    );
    const {
      safePathBindings,
      safeUrlBindings,
      safeRedirectBindings,
      safeUrlFunctions,
      safeRedirectFunctions,
      safeRegexBindings,
      directFsFunctions,
      fsNamespaceBindings,
    } =
      collectFileContext(sourceFile);

    const visit = (node) => {
      if (
        !fileUsesClientDirective &&
        ts.isIdentifier(node) &&
        RESTRICTED_BROWSER_GLOBALS.has(node.text) &&
        !isTypeContext(node)
      ) {
        const parent = node.parent ?? null;
        const isPropertyName =
          (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
          (ts.isPropertyAssignment(parent) && parent.name === node) ||
          (ts.isShorthandPropertyAssignment(parent) && parent.name === node) ||
          (ts.isParameter(parent) && parent.name === node) ||
          (ts.isVariableDeclaration(parent) && parent.name === node) ||
          (ts.isBindingElement(parent) && parent.name === node) ||
          (ts.isFunctionDeclaration(parent) && parent.name === node) ||
          (ts.isFunctionExpression(parent) && parent.name === node) ||
          (ts.isClassDeclaration(parent) && parent.name === node) ||
          (ts.isClassExpression(parent) && parent.name === node) ||
          (ts.isTypeAliasDeclaration(parent) && parent.name === node) ||
          (ts.isInterfaceDeclaration(parent) && parent.name === node) ||
          (ts.isEnumDeclaration(parent) && parent.name === node) ||
          (ts.isImportSpecifier(parent) && parent.name === node) ||
          (ts.isImportClause(parent) && parent.name === node) ||
          (ts.isExportSpecifier(parent) && parent.name === node);

        const accessKind = classifyBrowserGlobalAccess(node);
        if (
          !isPropertyName &&
          accessKind !== null &&
          !(ts.isTypeOfExpression(parent) && parent.expression === node) &&
          !isGuardedBrowserGlobalAccess(node, node.text)
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node,
              severity: 'error',
              ruleId: 'browser-global-ssr-access',
              message:
                'Restricted browser global is accessed from a non-client file without an obvious runtime guard. Review SSR safety before using browser-only globals.',
              snippet: parent && !ts.isSourceFile(parent) ? parent.getText(sourceFile) : node.getText(sourceFile),
              context: {
                accessKind,
                globalName: node.text,
              },
            })
          );
        }
      }

      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        const importSpecifier = node.moduleSpecifier.text;
        if (
          shouldCheckImportResolution(importSpecifier) &&
          !resolveModuleSpecifier({
            specifier: importSpecifier,
            containingFile: absolutePath,
            compilerOptions,
            resolutionCache,
          })
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: node.moduleSpecifier,
              severity: 'error',
              ruleId: 'import-resolution',
              message:
                'Import/export specifier cannot be resolved with the local TypeScript module resolution settings. Review missing files, aliases, or package dependencies.',
              snippet: importSpecifier,
              context: {
                importSpecifier,
                importKind: ts.isImportDeclaration(node) ? 'import' : 'export',
              },
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length > 0
      ) {
        const importSpecifier = getLiteralString(node.arguments[0]);
        if (
          importSpecifier &&
          shouldCheckImportResolution(importSpecifier) &&
          !resolveModuleSpecifier({
            specifier: importSpecifier,
            containingFile: absolutePath,
            compilerOptions,
            resolutionCache,
          })
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: node.arguments[0],
              severity: 'error',
              ruleId: 'import-resolution',
              message:
                'Dynamic import specifier cannot be resolved with the local TypeScript module resolution settings. Review missing files, aliases, or package dependencies.',
              snippet: importSpecifier,
              context: {
                importSpecifier,
                importKind: 'dynamic-import',
              },
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isElementAccessExpression(node.expression) &&
        isDynamicPropertyKey(node.expression.argumentExpression) &&
        !isSafeDynamicDispatchCall(node)
      ) {
        issues.push(
          createParityIssue({
            sourceFile,
            relativePath,
            node: node.expression.argumentExpression,
            severity: 'error',
            ruleId: 'unsafe-dynamic-object-access',
            message:
              'Dynamic method call uses a computed property name. Review object injection risk before invoking object[key](...).',
            snippet: node.getText(sourceFile),
          })
        );
      }

      if (ts.isForInStatement(node)) {
        const keyDeclaration = resolveForInLoopKey(node);
        const bodyBlock = ts.isBlock(node.statement) ? node.statement : null;

        if (keyDeclaration && bodyBlock && !blockHasOwnGuardForKey(bodyBlock, keyDeclaration)) {
          const loopIssues = [];
          const inspectLoop = (current) => {
            if (
              ts.isBinaryExpression(current) &&
              current.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
              ts.isElementAccessExpression(current.left) &&
              expressionContainsIdentifier(current.left.argumentExpression, keyDeclaration)
            ) {
              loopIssues.push(
                createParityIssue({
                  sourceFile,
                  relativePath,
                  node: current.left.argumentExpression,
                  severity: 'error',
                  ruleId: 'unsafe-dynamic-object-access',
                  message:
                    'for...in loop writes to a dynamic object key without an own-property or unsafe-key guard. Review for prototype pollution risk.',
                  snippet: current.getText(sourceFile),
                })
              );
            }

            if (
              ts.isObjectLiteralExpression(current) &&
              current.properties.some(
                (property) =>
                  ts.isPropertyAssignment(property) &&
                  ts.isComputedPropertyName(property.name) &&
                  expressionContainsIdentifier(property.name.expression, keyDeclaration)
              )
            ) {
              const objectAssignCall = findAncestor(
                current,
                (candidate) =>
                  ts.isCallExpression(candidate) &&
                  ts.isPropertyAccessExpression(candidate.expression) &&
                  ts.isIdentifier(candidate.expression.expression) &&
                  candidate.expression.expression.text === 'Object' &&
                  candidate.expression.name.text === 'assign'
              );
              if (objectAssignCall) {
                loopIssues.push(
                  createParityIssue({
                    sourceFile,
                    relativePath,
                    node: current,
                    severity: 'error',
                    ruleId: 'unsafe-dynamic-object-access',
                    message:
                      'for...in loop builds computed object keys into Object.assign without an own-property or unsafe-key guard. Review for prototype pollution risk.',
                    snippet: objectAssignCall.getText(sourceFile),
                  })
                );
              }
            }

            ts.forEachChild(current, inspectLoop);
          };

          inspectLoop(bodyBlock);
          issues.push(...loopIssues);
        }
      }

      if (
        ts.isBinaryExpression(node) &&
        [
          ts.SyntaxKind.EqualsEqualsToken,
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ].includes(node.operatorToken.kind)
      ) {
        const timingComparison = analyzeTimingComparison(node);
        if (timingComparison) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: node.operatorToken,
              severity: 'error',
              ruleId: 'timing-attack-comparisons',
              message:
                'Direct equality is used on secret-like values. Review token/signature comparisons for timing-attack exposure and prefer timingSafeEqual-style helpers.',
              snippet: node.getText(sourceFile),
              context: {
                leftSensitiveNames: timingComparison.leftSensitive,
                rightSensitiveNames: timingComparison.rightSensitive,
              },
            })
          );
        }
      }

      if (ts.isBinaryExpression(node)) {
        const atomicUpdate = analyzeAtomicUpdate(node, sourceFile);
        if (atomicUpdate) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: node.operatorToken,
              severity: 'warn',
              ruleId: 'no-atomic-updates',
              message:
                'Assignment reads and writes the same target across await/yield suspension. Review for stale writes and split the update into explicit local state handling.',
              snippet: node.getText(sourceFile),
              context: atomicUpdate,
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        (
          (ts.isIdentifier(node.expression) && node.expression.text === 'redirect') ||
          (ts.isPropertyAccessExpression(node.expression) &&
            (
              (
                ts.isIdentifier(node.expression.expression) &&
                ['NextResponse', 'Response', 'res', 'response'].includes(node.expression.expression.text) &&
                node.expression.name.text === 'redirect'
              ) ||
              (
                ts.isPropertyAccessExpression(node.expression.expression) &&
                ts.isIdentifier(node.expression.expression.expression) &&
                node.expression.expression.expression.text === 'window' &&
                node.expression.expression.name.text === 'location' &&
                ['assign', 'replace'].includes(node.expression.name.text)
              )
            ))
        )
      ) {
        const redirectTarget = node.arguments[0];
        if (
          redirectTarget &&
          !isSafeRedirectExpression(
            redirectTarget,
            safeRedirectBindings,
            safeRedirectFunctions,
            safeUrlBindings,
            safeUrlFunctions
          )
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: redirectTarget,
              severity: 'error',
              ruleId: 'open-redirects',
              message:
                'Redirect target is non-literal or not obviously same-origin. Review redirect sinks for user-controlled navigation targets.',
              snippet: redirectTarget.getText(sourceFile),
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'Math' &&
        node.expression.name.text === 'random'
      ) {
        issues.push(
          createParityIssue({
            sourceFile,
            relativePath,
            node: node.expression.name,
            severity: 'error',
            ruleId: 'weak-rng',
            message:
              'Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness.',
            snippet: node.getText(sourceFile),
          })
        );
      }

      if (
        ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) && node.expression.text === 'fetch') ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'got') ||
          (ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === 'axios' &&
            ['get', 'post', 'put', 'patch', 'delete'].includes(node.expression.name.text)))
      ) {
        const requestTarget = node.arguments[0];
        if (
          requestTarget &&
          !isSafeUrlExpression(requestTarget, safeUrlBindings, safeUrlFunctions)
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: requestTarget,
              severity: 'error',
              ruleId: 'ssrf-user-controlled-urls',
              message:
                'Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them.',
              snippet: requestTarget.getText(sourceFile),
            })
          );
        }
      }

      if (
        (ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'RegExp') ||
        (ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'RegExp')
      ) {
        const patternArgument = node.arguments?.[0];
        if (patternArgument && !isSafeRegexPatternExpression(patternArgument, safeRegexBindings)) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: patternArgument,
              severity: 'error',
              ruleId: 'regex-safety-and-dynamic-input',
              message:
                'RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk.',
              snippet: patternArgument.getText(sourceFile),
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'axios' &&
        node.expression.name.text === 'request'
      ) {
        const configArg = node.arguments[0];
        if (configArg && ts.isObjectLiteralExpression(configArg)) {
          const urlProperty = configArg.properties.find(
            (property) =>
              ts.isPropertyAssignment(property) && getPropertyNameText(property.name) === 'url'
          );
          if (
            urlProperty &&
            ts.isPropertyAssignment(urlProperty) &&
            !isSafeUrlExpression(urlProperty.initializer, safeUrlBindings, safeUrlFunctions)
          ) {
            issues.push(
              createParityIssue({
                sourceFile,
                relativePath,
                node: urlProperty.initializer,
                severity: 'error',
                ruleId: 'ssrf-user-controlled-urls',
                message:
                  'axios.request uses a non-literal or non-obviously safe URL. Validate user-controlled URLs before making outbound requests.',
                snippet: urlProperty.initializer.getText(sourceFile),
              })
            );
          }
        }
      }

      if (
        ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) &&
          directFsFunctions.has(node.expression.text) &&
          FS_PATH_SINKS.has(node.expression.text)) ||
          (ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            fsNamespaceBindings.has(node.expression.expression.text) &&
            FS_PATH_SINKS.has(node.expression.name.text)))
      ) {
        const pathArgument = node.arguments[0];
        if (pathArgument && !isSafePathExpression(pathArgument, safePathBindings)) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: pathArgument,
              severity: 'error',
              ruleId: 'filesystem-path-taint',
              message:
                'File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage.',
              snippet: pathArgument.getText(sourceFile),
            })
          );
        }
      }

      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) &&
        ['innerHTML', 'outerHTML'].includes(node.left.name.text) &&
        !SAFE_HTML_MARKERS.test(node.right.getText(sourceFile))
      ) {
        issues.push(
          createParityIssue({
            sourceFile,
            relativePath,
            node: node.left.name,
            severity: 'error',
            ruleId: 'html-and-innerhtml-xss-sinks',
            message:
              'HTML sink assignment is not obviously sanitized. Review innerHTML/outerHTML usage for XSS exposure.',
            snippet: node.getText(sourceFile),
          })
        );
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'insertAdjacentHTML'
      ) {
        const htmlArgument = node.arguments[1];
        if (htmlArgument && !SAFE_HTML_MARKERS.test(htmlArgument.getText(sourceFile))) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: htmlArgument,
              severity: 'error',
              ruleId: 'html-and-innerhtml-xss-sinks',
              message:
                'insertAdjacentHTML is used without an obvious sanitize/safe marker in the HTML argument.',
              snippet: htmlArgument.getText(sourceFile),
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'document' &&
        node.expression.name.text === 'write'
      ) {
        const htmlArgument = node.arguments[0];
        if (htmlArgument && !SAFE_HTML_MARKERS.test(htmlArgument.getText(sourceFile))) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: htmlArgument,
              severity: 'error',
              ruleId: 'html-and-innerhtml-xss-sinks',
              message:
                'document.write is used without an obvious sanitize/safe marker. Review for mixed HTML and unencoded input.',
              snippet: htmlArgument.getText(sourceFile),
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'findOne'
      ) {
        const queryArgument = unwrapExpression(node.arguments[0]);
        if (
          queryArgument &&
          (
            (!ts.isObjectLiteralExpression(queryArgument) &&
              !(ts.isCallExpression(queryArgument) &&
                ts.isIdentifier(queryArgument.expression) &&
                SAFE_FILTER_CALL_NAME_PATTERN.test(queryArgument.expression.text))) ||
            (ts.isObjectLiteralExpression(queryArgument) &&
              queryArgument.properties.some(
                (property) =>
                  ts.isSpreadAssignment(property) ||
                  (ts.isPropertyAssignment(property) && ts.isComputedPropertyName(property.name))
              ))
          )
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: queryArgument,
              severity: 'error',
              ruleId: 'nosql-findone-injection',
              message:
                'findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk.',
              snippet: queryArgument.getText(sourceFile),
            })
          );
        }
      }

      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const sensitiveValue = getLiteralString(node.initializer);
        if (
          sensitiveValue !== null &&
          isSensitiveCredentialName(node.name.text) &&
          isSuspiciousSecretLiteral(sensitiveValue)
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: node.name,
              severity: 'error',
              ruleId: 'hardcoded-passwords',
              message:
                'Sensitive identifier is initialized with a string literal. Move credentials into environment or reviewed secret storage.',
              snippet: node.getText(sourceFile),
            })
          );
        }
      }

      if (ts.isPropertyAssignment(node)) {
        const propertyName = getPropertyNameText(node.name);
        const sensitiveValue = getLiteralString(node.initializer);
        if (
          propertyName &&
          sensitiveValue !== null &&
          isSensitiveCredentialName(propertyName) &&
          isSuspiciousSecretLiteral(sensitiveValue)
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: node.name,
              severity: 'error',
              ruleId: 'hardcoded-passwords',
              message:
                'Sensitive object property is assigned a string literal. Move credentials into environment or reviewed secret storage.',
              snippet: node.getText(sourceFile),
            })
          );
        }
      }

      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        (ts.isIdentifier(node.left) || ts.isPropertyAccessExpression(node.left))
      ) {
        const targetName = ts.isIdentifier(node.left)
          ? node.left.text
          : node.left.name.text;
        const sensitiveValue = getLiteralString(node.right);
        if (
          sensitiveValue !== null &&
          isSensitiveCredentialName(targetName) &&
          isSuspiciousSecretLiteral(sensitiveValue)
        ) {
          issues.push(
            createParityIssue({
              sourceFile,
              relativePath,
              node: node.left,
              severity: 'error',
              ruleId: 'hardcoded-passwords',
              message:
                'Sensitive assignment uses a string literal. Move credentials into environment or reviewed secret storage.',
              snippet: node.getText(sourceFile),
            })
          );
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  for (const absolutePath of workflowFiles) {
    const relativePath = toRepoRelativePath(root, absolutePath);
    if (!matchesPathFilters(relativePath, pathFilters)) continue;
    fileCount += 1;
    const text = fs.readFileSync(absolutePath, 'utf8');
    const lines = text.split(/\r?\n/);

    for (const [index, lineText] of lines.entries()) {
      const match = lineText.match(/^\s*(?:-\s*)?uses:\s*['"]?([^'"#]+?)['"]?\s*(?:#.*)?$/);
      if (!match) continue;

      const usesValue = match[1].trim();
      if (
        usesValue.length === 0 ||
        usesValue.startsWith('./') ||
        usesValue.startsWith('docker://') ||
        usesValue.includes('${{')
      ) {
        continue;
      }

      const atIndex = usesValue.lastIndexOf('@');
      if (atIndex <= 0 || atIndex === usesValue.length - 1) continue;

      const actionRef = usesValue.slice(0, atIndex);
      const versionRef = usesValue.slice(atIndex + 1);
      const owner = actionRef.split('/')[0] ?? null;
      if (!owner || GITHUB_ACTIONS_SAFE_OWNERS.has(owner)) continue;
      if (GITHUB_ACTIONS_FULL_SHA_PATTERN.test(versionRef)) continue;

      issues.push(
        createTextParityIssue({
          relativePath,
          severity: 'warn',
          ruleId: 'github-actions-full-sha',
          message:
            'Third-party GitHub Action is not pinned to a full commit SHA. Prefer immutable action refs in workflows.',
          line: index + 1,
          column: lineText.indexOf('uses:') + 1,
          snippet: usesValue,
          context: {
            actionRef,
            versionRef,
          },
        })
      );
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
      scanRoots: SCAN_ROOTS,
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};

const summarizeManifest = (manifest) => {
  const statusCounts = Object.fromEntries(
    (manifest.statuses ?? []).map((status) => [status, 0])
  );
  const ownerScannerCounts = {};
  const externalRuleNames = [];

  for (const rule of manifest.rules ?? []) {
    statusCounts[rule.status] = (statusCounts[rule.status] ?? 0) + 1;
    ownerScannerCounts[rule.ownerScanner] = (ownerScannerCounts[rule.ownerScanner] ?? 0) + 1;
    for (const name of rule.externalRuleNames ?? []) {
      externalRuleNames.push(name);
    }
  }

  const uniqueExternalRuleNames = new Set(externalRuleNames);

  return {
    normalizedRuleCount: manifest.rules?.length ?? 0,
    externalRuleCount: externalRuleNames.length,
    uniqueExternalRuleNameCount: uniqueExternalRuleNames.size,
    duplicateExternalRuleNameCount: externalRuleNames.length - uniqueExternalRuleNames.size,
    statusCounts,
    ownerScannerCounts,
  };
};

const summarizeEslintParityCoverage = (manifest) => {
  const eslintRules = (manifest.rules ?? []).filter((rule) => rule.status === 'eslint');
  const coverage = eslintRules.map((rule) => {
    const configured = EXTERNAL_PARITY_ESLINT_RULE_COVERAGE.get(rule.sourceScannerRuleId) ?? {
      status: 'pending',
      localRuleId: null,
      rationale: 'No local ESLint parity mapping is recorded for this source rule id yet.',
    };

    return {
      normalizedRuleId: rule.normalizedRuleId,
      sourceRuleId: rule.sourceScannerRuleId ?? null,
      severity: rule.severity ?? null,
      localStatus: configured.status,
      localRuleId: configured.localRuleId ?? null,
      rationale: configured.rationale ?? null,
    };
  });

  const statusCounts = coverage.reduce(
    (acc, rule) => {
      acc[rule.localStatus] = (acc[rule.localStatus] ?? 0) + 1;
      return acc;
    },
    { configured: 0, 'configured-via-alias': 0, pending: 0 }
  );

  return {
    totalRuleCount: coverage.length,
    coveredRuleCount: coverage.filter((rule) =>
      ['configured', 'configured-via-alias'].includes(rule.localStatus)
    ).length,
    pendingRuleCount: coverage.filter((rule) => rule.localStatus === 'pending').length,
    statusCounts,
    rules: coverage.sort((left, right) => left.normalizedRuleId.localeCompare(right.normalizedRuleId)),
  };
};

const translateIssues = ({ report, ruleMap, ownerScanner }) => {
  const translated = [];

  for (const issue of report.issues ?? []) {
    const mappedRule = ruleMap.get(issue.ruleId);
    if (!mappedRule) continue;

    translated.push(
      createIssue({
        severity: mappedRule.severity ?? issue.severity,
        ruleId: mappedRule.normalizedRuleId,
        message: issue.message,
        file: issue.file,
        line: issue.line,
        column: issue.column,
        snippet: issue.snippet ?? null,
        context: {
          externalRuleNames: mappedRule.externalRuleNames ?? [],
          sourceScanner: ownerScanner,
          sourceScannerRuleId: issue.ruleId,
          sourceSeverity: issue.severity,
          ...(issue.context ? { sourceContext: issue.context } : {}),
        },
      })
    );
  }

  return translated;
};

IMPLEMENTED_ANALYZERS.set('quality/external-rule-parity', analyzeExternalRuleParityLocalRules);

export const analyzeExternalRuleParity = async ({
  root = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_PATH,
  env = process.env,
} = {}) => {
  const { absolutePath: manifestAbsolutePath, manifest } = await readManifest({ root, manifestPath });
  const manifestSummary = summarizeManifest(manifest);
  const eslintCoverage = summarizeEslintParityCoverage(manifest);
  const implementedRules = (manifest.rules ?? []).filter((rule) => rule.status === 'implemented');
  const waivedRules = (manifest.rules ?? [])
    .filter((rule) => rule.status === 'waived')
    .map((rule) => ({
      normalizedRuleId: rule.normalizedRuleId,
      severity: rule.severity ?? null,
      externalRuleNames: [...(rule.externalRuleNames ?? [])].sort(),
      rationale: rule.rationale ?? null,
    }))
    .sort((left, right) => left.normalizedRuleId.localeCompare(right.normalizedRuleId));
  const filters = {
    rules: parseFilterEnvList(env?.EXTERNAL_RULE_PARITY_RULES),
    externalRules: parseFilterEnvList(env?.EXTERNAL_RULE_PARITY_EXTERNAL_RULES),
    paths: parseFilterEnvList(env?.EXTERNAL_RULE_PARITY_PATHS),
    severities: parseFilterEnvList(env?.EXTERNAL_RULE_PARITY_SEVERITIES),
  };
  const externalRuleResolution = summarizeExternalRuleFilterResolution(
    manifest,
    filters.externalRules
  );

  const implementedByScanner = new Map();
  const unwiredRules = [];

  for (const rule of implementedRules) {
    if (!rule.ownerScanner || !rule.sourceScannerRuleId) {
      unwiredRules.push({
        normalizedRuleId: rule.normalizedRuleId,
        ownerScanner: rule.ownerScanner ?? null,
        sourceScannerRuleId: rule.sourceScannerRuleId ?? null,
        reason: 'implemented rule is missing scanner ownership or source rule id',
      });
      continue;
    }

    if (!IMPLEMENTED_ANALYZERS.has(rule.ownerScanner)) {
      unwiredRules.push({
        normalizedRuleId: rule.normalizedRuleId,
        ownerScanner: rule.ownerScanner,
        sourceScannerRuleId: rule.sourceScannerRuleId,
        reason: 'implemented rule references an analyzer that is not wired into parity scanning',
      });
      continue;
    }

    const entry = implementedByScanner.get(rule.ownerScanner) ?? [];
    entry.push(rule);
    implementedByScanner.set(rule.ownerScanner, entry);
  }

  const translatedIssues = [];
  const analyzerSummaries = [];

  for (const [ownerScanner, scannerRules] of implementedByScanner.entries()) {
    const analyze = IMPLEMENTED_ANALYZERS.get(ownerScanner);
    const report = await analyze({ root, env });
    const ruleMap = new Map(
      scannerRules.map((rule) => [rule.sourceScannerRuleId, rule])
    );
    const analyzerIssues = translateIssues({ report, ruleMap, ownerScanner });
    translatedIssues.push(...analyzerIssues);

    analyzerSummaries.push({
      scannerId: ownerScanner,
      upstreamStatus: report.status,
      fileCount: report.summary?.fileCount ?? 0,
      upstreamIssueCount: report.summary?.total ?? report.issues?.length ?? 0,
      translatedIssueCount: analyzerIssues.length,
      mappedRuleIds: scannerRules.map((rule) => rule.normalizedRuleId).sort(),
      sourceRuleIds: scannerRules.map((rule) => rule.sourceScannerRuleId).sort(),
    });
  }

  const filteredIssues = translatedIssues.filter((issue) => {
    if (filters.rules.length > 0 && !filters.rules.includes(issue.ruleId)) {
      return false;
    }
    if (
      filters.paths.length > 0 &&
      !filters.paths.some((pathFilter) => (issue.file ?? '').includes(pathFilter))
    ) {
      return false;
    }
    if (filters.severities.length > 0 && !filters.severities.includes(issue.severity)) {
      return false;
    }
    return true;
  });

  const sortedIssues = sortIssues(filteredIssues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      normalizedRuleCount: manifestSummary.normalizedRuleCount,
      externalRuleCount: manifestSummary.externalRuleCount,
      uniqueExternalRuleNameCount: manifestSummary.uniqueExternalRuleNameCount,
      duplicateExternalRuleNameCount: manifestSummary.duplicateExternalRuleNameCount,
      implementedRuleCount: implementedRules.length,
      wiredImplementedRuleCount: implementedRules.length - unwiredRules.length,
      waivedRuleCount: waivedRules.length,
      eslintRuleCount: eslintCoverage.totalRuleCount,
      coveredEslintRuleCount: eslintCoverage.coveredRuleCount,
      pendingEslintRuleCount: eslintCoverage.pendingRuleCount,
    },
    manifest: {
      version: manifest.version ?? null,
      generatedAt: manifest.generatedAt ?? null,
      source: manifest.source ?? null,
      path: path.relative(root, manifestAbsolutePath).replace(/\\/g, '/'),
      ...manifestSummary,
    },
    implementedCoverage: {
      implementedRuleCount: implementedRules.length,
      wiredRuleCount: implementedRules.length - unwiredRules.length,
      unwiredRules,
    },
    waivedCoverage: {
      waivedRuleCount: waivedRules.length,
      rules: waivedRules,
    },
    filters,
    externalRuleResolution,
    eslintCoverage,
    analyzers: analyzerSummaries.sort((left, right) =>
      left.scannerId.localeCompare(right.scannerId)
    ),
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
