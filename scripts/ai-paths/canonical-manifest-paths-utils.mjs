import fs from 'node:fs';
import path from 'node:path';

export const DOCS_REGISTRY_CONSTANTS_PATH =
  'src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.constants.ts';
export const NODE_VALIDATOR_MANIFEST_PATH = 'docs/ai-paths/node-validator-central-manifest.json';
export const TOOLTIP_MANIFEST_PATH = 'docs/ai-paths/tooltip-central-manifest.json';

const readTextFile = (root, relativePath) => {
  const absolutePath = path.join(root, relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
};

const readJsonFile = (root, relativePath) => JSON.parse(readTextFile(root, relativePath));

const extractConstValue = (source, name) => {
  const regex = new RegExp(`export const ${name} =\\s*'([^']+)';`);
  const match = source.match(regex);
  return match?.[1] ?? null;
};

const findSourcePathById = (manifest, id) => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return null;
  const rawSources = manifest.sources;
  if (!Array.isArray(rawSources)) return null;
  const source = rawSources.find((entry) => entry && typeof entry === 'object' && entry.id === id);
  if (!source || typeof source.path !== 'string') return null;
  return source.path;
};

export const evaluateCanonicalManifestPathRules = ({ root }) => {
  const findings = [];
  const addFinding = (file, message) => findings.push({ file, message });

  let constantsSource = '';
  try {
    constantsSource = readTextFile(root, DOCS_REGISTRY_CONSTANTS_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to read constants file';
    addFinding(DOCS_REGISTRY_CONSTANTS_PATH, message);
    return findings;
  }

  const nodeDocsCatalogSourcePath = extractConstValue(constantsSource, 'NODE_DOCS_CATALOG_SOURCE_PATH');
  if (!nodeDocsCatalogSourcePath) {
    addFinding(DOCS_REGISTRY_CONSTANTS_PATH, 'missing exported constant "NODE_DOCS_CATALOG_SOURCE_PATH".');
  }
  const docsSnippetsSourcePath = extractConstValue(constantsSource, 'DOCS_SNIPPETS_SOURCE_PATH');
  if (!docsSnippetsSourcePath) {
    addFinding(DOCS_REGISTRY_CONSTANTS_PATH, 'missing exported constant "DOCS_SNIPPETS_SOURCE_PATH".');
  }
  if (!nodeDocsCatalogSourcePath || !docsSnippetsSourcePath) {
    return findings;
  }

  let nodeValidatorManifest = null;
  let tooltipManifest = null;
  try {
    nodeValidatorManifest = readJsonFile(root, NODE_VALIDATOR_MANIFEST_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to parse JSON';
    addFinding(NODE_VALIDATOR_MANIFEST_PATH, message);
  }
  try {
    tooltipManifest = readJsonFile(root, TOOLTIP_MANIFEST_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to parse JSON';
    addFinding(TOOLTIP_MANIFEST_PATH, message);
  }

  const nodeValidatorNodeDocsPath = findSourcePathById(nodeValidatorManifest, 'node-docs-catalog');
  if (!nodeValidatorNodeDocsPath) {
    addFinding(
      NODE_VALIDATOR_MANIFEST_PATH,
      'missing source "node-docs-catalog" or source.path is not a string.'
    );
  } else if (nodeValidatorNodeDocsPath !== nodeDocsCatalogSourcePath) {
    addFinding(
      NODE_VALIDATOR_MANIFEST_PATH,
      `source "node-docs-catalog" must point to "${nodeDocsCatalogSourcePath}" (found "${nodeValidatorNodeDocsPath}").`
    );
  }

  const nodeValidatorSnippetsPath = findSourcePathById(nodeValidatorManifest, 'docs-snippets');
  if (!nodeValidatorSnippetsPath) {
    addFinding(
      NODE_VALIDATOR_MANIFEST_PATH,
      'missing source "docs-snippets" or source.path is not a string.'
    );
  } else if (nodeValidatorSnippetsPath !== docsSnippetsSourcePath) {
    addFinding(
      NODE_VALIDATOR_MANIFEST_PATH,
      `source "docs-snippets" must point to "${docsSnippetsSourcePath}" (found "${nodeValidatorSnippetsPath}").`
    );
  }

  const tooltipSnippetsPath = findSourcePathById(tooltipManifest, 'ai-paths-doc-snippets');
  if (!tooltipSnippetsPath) {
    addFinding(
      TOOLTIP_MANIFEST_PATH,
      'missing source "ai-paths-doc-snippets" or source.path is not a string.'
    );
  } else if (tooltipSnippetsPath !== docsSnippetsSourcePath) {
    addFinding(
      TOOLTIP_MANIFEST_PATH,
      `source "ai-paths-doc-snippets" must point to "${docsSnippetsSourcePath}" (found "${tooltipSnippetsPath}").`
    );
  }

  return findings;
};
