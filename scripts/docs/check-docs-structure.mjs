import fs from 'node:fs/promises';
import path from 'node:path';

import {
  directoryContainsMarkdown,
  directoryHasHub,
  getDirectoryHubPath,
  listMarkdownDocsRecursive,
  listDirectMarkdownFiles,
  listDirectNonMarkdownFiles,
  listDocDirectoriesRecursive,
} from './docs-tree-utils.mjs';
import {
  getManagedGeneratedDocMeta,
  isManagedGeneratedDoc,
} from './generated-doc-frontmatter.mjs';
import {
  getFrontmatterField,
  readFrontmatter,
} from './markdown-frontmatter-utils.mjs';
import {
  getMetricsMarkdownMeta,
  isMetricsMarkdownDoc,
} from './metrics-frontmatter.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'docs', 'documentation', 'structure-manifest.json');
const textFileCache = new Map();
const markdownDocStateCache = new Map();

function countLines(content) {
  return content.split(/\r?\n/).length;
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

async function loadManifest() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function readTextFile(relativePath) {
  if (!textFileCache.has(relativePath)) {
    textFileCache.set(relativePath, fs.readFile(path.join(root, relativePath), 'utf8'));
  }

  return textFileCache.get(relativePath);
}

async function readMarkdownDocState(relativePath) {
  if (!markdownDocStateCache.has(relativePath)) {
    markdownDocStateCache.set(
      relativePath,
      (async () => {
        const content = await readTextFile(relativePath);
        return {
          content,
          frontmatter: readFrontmatter(content),
        };
      })()
    );
  }

  return markdownDocStateCache.get(relativePath);
}

async function listRootDocs() {
  return listDirectMarkdownFiles('docs');
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function getDirectoryParent(relativePath) {
  const parentPath = path.dirname(relativePath).replace(/\\/g, '/');
  return parentPath === '.' ? null : parentPath;
}

function buildDirectoryReferenceTokens(relativePath, parentHubPath) {
  const normalizedRelativePath = relativePath.replace(/\\/g, '/');
  const normalizedParentHubPath = parentHubPath.replace(/\\/g, '/');
  const parentDirectory = path.posix.dirname(normalizedParentHubPath);
  const relativeFromParent = path.posix.relative(parentDirectory, normalizedRelativePath);
  const absoluteVariants = [
    normalizedRelativePath,
    `${normalizedRelativePath}/`,
    `${normalizedRelativePath}/README.md`,
    `${normalizedRelativePath}/index.md`,
  ];
  const relativeVariants = [
    relativeFromParent,
    `${relativeFromParent}/`,
    `${relativeFromParent}/README.md`,
    `${relativeFromParent}/index.md`,
    `./${relativeFromParent}`,
    `./${relativeFromParent}/`,
    `./${relativeFromParent}/README.md`,
    `./${relativeFromParent}/index.md`,
  ];

  return [...new Set([...absoluteVariants, ...relativeVariants])];
}

async function listSupersededRootDocs(rootDocs) {
  const supersededDocs = [];

  for (const fileName of rootDocs) {
    const relativePath = path.join('docs', fileName);
    const { frontmatter } = await readMarkdownDocState(relativePath);

    if (frontmatter && /^status:\s*'?(superseded)'?$/m.test(frontmatter)) {
      supersededDocs.push(relativePath);
    }
  }

  return supersededDocs;
}

function findDocReferenceTokens(content) {
  const pattern =
    /docs\/[A-Za-z0-9._/-]+\.(?:md|mdx)|(?:\.\.?\/)+[A-Za-z0-9._/-]+\.(?:md|mdx)/g;
  const matches = [];

  for (const match of content.matchAll(pattern)) {
    matches.push({
      token: match[0],
      index: match.index ?? 0,
    });
  }

  return matches;
}

function resolveDocReference(fromPath, referenceToken) {
  if (referenceToken.startsWith('docs/')) {
    return path.posix.normalize(referenceToken);
  }

  if (referenceToken.startsWith('./') || referenceToken.startsWith('../')) {
    return path.posix.normalize(
      path.posix.join(path.posix.dirname(fromPath), referenceToken)
    );
  }

  return null;
}

async function checkCanonicalFrontmatter(relativePath, requiredFields) {
  const { frontmatter } = await readMarkdownDocState(relativePath);

  if (!frontmatter) {
    return [`${relativePath}: missing YAML frontmatter`];
  }

  const issues = [];
  for (const field of requiredFields) {
    const pattern = new RegExp(`^${field}:\\s*.+$`, 'm');
    if (!pattern.test(frontmatter)) {
      issues.push(`${relativePath}: missing frontmatter field "${field}"`);
    }
  }

  if (!/^canonical:\s*true$/m.test(frontmatter)) {
    issues.push(`${relativePath}: canonical docs must declare canonical: true`);
  }

  return issues;
}

function getGeneratedDocContract(relativePath) {
  if (isMetricsMarkdownDoc(relativePath)) {
    return {
      expected: getMetricsMarkdownMeta(relativePath, '1970-01-01'),
      missingFrontmatterMessage: 'metrics markdown docs must declare YAML frontmatter',
      fieldLabel: 'metrics doc',
      canonicalMembershipLabels: {
        canonical: 'canonical generated metrics doc',
        nonCanonical: 'historical generated metrics doc',
      },
    };
  }

  if (isManagedGeneratedDoc(relativePath)) {
    return {
      expected: getManagedGeneratedDocMeta(relativePath, '1970-01-01'),
      missingFrontmatterMessage: 'managed generated docs must declare YAML frontmatter',
      fieldLabel: 'managed generated doc',
      canonicalMembershipLabels: {
        canonical: 'managed generated canonical doc',
        nonCanonical: 'managed generated non-canonical doc',
      },
    };
  }

  return null;
}

async function checkGeneratedDocContract(relativePath, requiredCanonicalDocSet, requiredFields) {
  const contract = getGeneratedDocContract(relativePath);

  if (!contract) {
    return [];
  }

  const { frontmatter } = await readMarkdownDocState(relativePath);
  const issues = [];
  const expected = contract.expected;

  if (!frontmatter) {
    issues.push(`${relativePath}: ${contract.missingFrontmatterMessage}`);
  } else {
    for (const field of requiredFields) {
      if (getFrontmatterField(frontmatter, field) === null) {
        issues.push(`${relativePath}: missing frontmatter field "${field}"`);
      }
    }

    const lastReviewed = getFrontmatterField(frontmatter, 'last_reviewed');
    if (lastReviewed && !/^\d{4}-\d{2}-\d{2}$/.test(lastReviewed)) {
      issues.push(`${relativePath}: last_reviewed must use YYYY-MM-DD`);
    }

    const expectedFields = {
      owner: expected.owner,
      status: expected.status,
      doc_type: expected.doc_type,
      scope: expected.scope,
      canonical: expected.canonical ? 'true' : 'false',
    };

    for (const [field, expectedValue] of Object.entries(expectedFields)) {
      const actualValue = getFrontmatterField(frontmatter, field);
      if (actualValue !== null && actualValue !== expectedValue) {
        issues.push(
          `${relativePath}: ${contract.fieldLabel} field "${field}" must be ${expectedValue}`
        );
      }
    }
  }

  if (expected.canonical) {
    if (!requiredCanonicalDocSet.has(relativePath)) {
      issues.push(
        `${relativePath}: ${contract.canonicalMembershipLabels.canonical} must be listed in requiredCanonicalDocs`
      );
    }
  } else if (requiredCanonicalDocSet.has(relativePath)) {
    issues.push(
      `${relativePath}: ${contract.canonicalMembershipLabels.nonCanonical} must not be listed in requiredCanonicalDocs`
    );
  }

  return issues;
}

async function checkSupersededRootDoc(relativePath, maxLines) {
  const { content, frontmatter } = await readMarkdownDocState(relativePath);

  if (!frontmatter || !/^status:\s*'?(superseded)'?$/m.test(frontmatter)) {
    return [];
  }

  const issues = [];

  if (!/^canonical:\s*false$/m.test(frontmatter)) {
    issues.push(`${relativePath}: superseded root docs must declare canonical: false`);
  }

  if (!/^superseded_by:\s*.+$/m.test(frontmatter)) {
    issues.push(`${relativePath}: superseded root docs must declare superseded_by`);
  }

  if (countLines(content) > maxLines) {
    issues.push(
      `${relativePath}: superseded root docs must stay at or under ${maxLines} lines`
    );
  }

  return issues;
}

async function checkCompatibilityMirrorPair(pair) {
  const issues = [];
  const canonicalExists = await fileExists(pair.canonical);
  const mirrorExists = await fileExists(pair.mirror);

  if (!canonicalExists) {
    issues.push(`${pair.canonical}: compatibility mirror source is missing`);
    return issues;
  }

  if (!mirrorExists) {
    issues.push(`${pair.mirror}: compatibility mirror file is missing`);
    return issues;
  }

  const [canonicalContent, mirrorContent] = await Promise.all([
    readTextFile(pair.canonical),
    readTextFile(pair.mirror),
  ]);

  if (canonicalContent !== mirrorContent) {
    issues.push(
      `${pair.mirror}: compatibility mirror content diverges from canonical source ${pair.canonical}`
    );
  }

  return issues;
}

async function checkDirectoryIndexPolicy(policy) {
  const issues = [];
  const hubPath = await getDirectoryHubPath(policy.path);

  if (!hubPath) {
    issues.push(`${policy.path}: directory index policy requires a README.md or index.md hub`);
    return issues;
  }

  const hubFileName = path.basename(hubPath);
  const hubContent = await readTextFile(hubPath);

  if (policy.mode === 'complete_direct_files') {
    const directMarkdownFiles = await listDirectMarkdownFiles(policy.path);
    for (const fileName of directMarkdownFiles) {
      if (fileName === hubFileName) {
        continue;
      }

      if (!hubContent.includes(fileName)) {
        issues.push(
          `${hubPath}: complete index policy requires listing direct markdown file ${fileName}`
        );
      }
    }

    return issues;
  }

  if (policy.mode === 'curated_references') {
    if (!Array.isArray(policy.requiredReferences) || policy.requiredReferences.length === 0) {
      issues.push(`${policy.path}: curated index policy requires non-empty requiredReferences`);
      return issues;
    }

    for (const reference of policy.requiredReferences) {
      if (!hubContent.includes(reference)) {
        issues.push(
          `${hubPath}: curated index policy requires reference to ${reference}`
        );
      }
    }

    return issues;
  }

  issues.push(`${policy.path}: unsupported directory index policy mode "${policy.mode}"`);
  return issues;
}

async function checkArtifactDirectoryPolicy(policy) {
  const issues = [];

  if (!(await fileExists(policy.path))) {
    issues.push(`${policy.path}: artifact directory policy path is missing`);
    return issues;
  }

  const directMarkdownFiles = await listDirectMarkdownFiles(policy.path);
  const directNonMarkdownFiles = await listDirectNonMarkdownFiles(policy.path);

  if (directMarkdownFiles.length > 0) {
    issues.push(
      `${policy.path}: artifact directory policy expects a non-markdown bucket; add a hub or remove the artifact policy`
    );
  }

  if (directNonMarkdownFiles.length === 0) {
    issues.push(`${policy.path}: artifact directory policy expects direct non-markdown files`);
  }

  if (!policy.parentHub) {
    issues.push(`${policy.path}: artifact directory policy requires parentHub`);
    return issues;
  }

  if (!(await fileExists(policy.parentHub))) {
    issues.push(`${policy.path}: parent hub ${policy.parentHub} is missing`);
    return issues;
  }

  if (!Array.isArray(policy.requiredReferences) || policy.requiredReferences.length === 0) {
    issues.push(`${policy.path}: artifact directory policy requires non-empty requiredReferences`);
    return issues;
  }

  const parentHubContent = await readTextFile(policy.parentHub);
  for (const reference of policy.requiredReferences) {
    if (!parentHubContent.includes(reference)) {
      issues.push(
        `${policy.parentHub}: artifact directory policy for ${policy.path} requires reference to ${reference}`
      );
    }
  }

  return issues;
}

async function checkDirectoryDiscoverability(relativePath) {
  const issues = [];
  const hubPath = await getDirectoryHubPath(relativePath);

  if (!hubPath) {
    return issues;
  }

  const parentDirectory = getDirectoryParent(relativePath);
  if (!parentDirectory) {
    return issues;
  }

  const parentHubPath = await getDirectoryHubPath(parentDirectory);

  if (!parentHubPath) {
    return issues;
  }

  const parentHubContent = await readTextFile(parentHubPath);
  const referenceTokens = buildDirectoryReferenceTokens(relativePath, parentHubPath);

  if (!referenceTokens.some((token) => parentHubContent.includes(token))) {
    issues.push(
      `${parentHubPath}: parent hub must reference child docs directory ${relativePath}`
    );
  }

  return issues;
}

async function checkReferenceTargetForRootStubReferences(relativePath, rootStubPaths) {
  const content = await readTextFile(relativePath);
  const issues = [];
  const rootStubSet = new Set(rootStubPaths.map((value) => value.replace(/\\/g, '/')));

  for (const reference of findDocReferenceTokens(content)) {
    const resolvedReference = resolveDocReference(relativePath, reference.token);

    if (resolvedReference && rootStubSet.has(resolvedReference)) {
      issues.push(
        `${relativePath}:${lineNumberAt(content, reference.index)}: references root compatibility stub ${resolvedReference}; use the canonical destination instead`
      );
    }
  }

  return issues;
}

async function run() {
  const manifest = await loadManifest();
  const issues = [];

  const rootDocs = await listRootDocs();
  const docsDirectories = await listDocDirectoriesRecursive();
  const allowlist = new Set(manifest.rootAllowlist);
  const supersededRootDocs = await listSupersededRootDocs(rootDocs);
  const markdownDirectoryHubExemptions = new Set(
    manifest.markdownDirectoryHubExemptions ?? []
  );
  const requiredCanonicalDocs = manifest.requiredCanonicalDocs ?? [];
  const requiredCanonicalDocSet = new Set(requiredCanonicalDocs);
  const parentHubReferenceExemptions = new Set(
    manifest.parentHubReferenceExemptions ?? []
  );
  const artifactDirectoryPolicies = manifest.artifactDirectoryPolicies ?? [];
  const artifactDirectoryPolicyMap = new Map(
    artifactDirectoryPolicies.map((policy) => [policy.path, policy])
  );
  const directoryIndexPolicies = manifest.directoryIndexPolicies ?? [];
  const directoryIndexPolicyMap = new Map(
    directoryIndexPolicies.map((policy) => [policy.path, policy])
  );

  for (const fileName of rootDocs) {
    if (!allowlist.has(fileName)) {
      issues.push(`docs/${fileName}: root-level docs file is not in the allowlist`);
    }
  }

  for (const fileName of manifest.rootAllowlist) {
    if (!rootDocs.includes(fileName)) {
      issues.push(`structure manifest references missing root doc docs/${fileName}`);
    }
  }

  const allMarkdownDocs = await listMarkdownDocsRecursive();

  for (const relativePath of allMarkdownDocs) {
    const { frontmatter } = await readMarkdownDocState(relativePath);

    if (getGeneratedDocContract(relativePath)) {
      continue;
    }

    if (frontmatter && /^canonical:\s*true$/m.test(frontmatter)) {
      if (!requiredCanonicalDocSet.has(relativePath)) {
        issues.push(
          `${relativePath}: canonical doc must be listed in requiredCanonicalDocs`
        );
      }
    }
  }

  for (const relativePath of docsDirectories) {
    if (markdownDirectoryHubExemptions.has(relativePath)) {
      continue;
    }

    if (!(await directoryContainsMarkdown(relativePath))) {
      continue;
    }

    if (!(await directoryHasHub(relativePath))) {
      issues.push(
        `${relativePath}: docs directory with markdown content must provide README.md or index.md`
      );
    }
  }

  for (const relativePath of docsDirectories) {
    const directMarkdownFiles = await listDirectMarkdownFiles(relativePath);
    const directNonMarkdownFiles = await listDirectNonMarkdownFiles(relativePath);

    if (directMarkdownFiles.length === 0 && directNonMarkdownFiles.length > 0) {
      if (!artifactDirectoryPolicyMap.has(relativePath)) {
        issues.push(
          `${relativePath}: artifact-only docs directory must declare an artifact directory policy or add a README.md/index.md hub`
        );
      }
    }
  }

  for (const relativePath of docsDirectories) {
    if (markdownDirectoryHubExemptions.has(relativePath)) {
      continue;
    }

    if (!(await directoryContainsMarkdown(relativePath))) {
      continue;
    }

    if (!directoryIndexPolicyMap.has(relativePath)) {
      issues.push(
        `${relativePath}: docs directory with markdown content must declare a directory index policy in the structure manifest`
      );
    }
  }

  for (const relativePath of docsDirectories) {
    if (markdownDirectoryHubExemptions.has(relativePath)) {
      continue;
    }

    if (parentHubReferenceExemptions.has(relativePath)) {
      continue;
    }

    if (!(await directoryContainsMarkdown(relativePath))) {
      continue;
    }

    const discoverabilityIssues = await checkDirectoryDiscoverability(relativePath);
    issues.push(...discoverabilityIssues);
  }

  for (const policy of directoryIndexPolicies) {
    if (!(await fileExists(policy.path))) {
      issues.push(`${policy.path}: directory index policy path is missing`);
      continue;
    }

    const policyIssues = await checkDirectoryIndexPolicy(policy);
    issues.push(...policyIssues);
  }

  for (const policy of artifactDirectoryPolicies) {
    const policyIssues = await checkArtifactDirectoryPolicy(policy);
    issues.push(...policyIssues);
  }

  const maxSupersededRootDocLines = manifest.maxSupersededRootDocLines ?? 25;
  for (const fileName of rootDocs) {
    const docIssues = await checkSupersededRootDoc(
      path.join('docs', fileName),
      maxSupersededRootDocLines
    );
    issues.push(...docIssues);
  }

  for (const relativePath of allMarkdownDocs) {
    const generatedDocIssues = await checkGeneratedDocContract(
      relativePath,
      requiredCanonicalDocSet,
      manifest.requiredFrontmatterFields
    );
    issues.push(...generatedDocIssues);
  }

  for (const relativePath of requiredCanonicalDocs) {
    const exists = await fileExists(relativePath);
    if (!exists) {
      issues.push(`${relativePath}: required canonical doc is missing`);
      continue;
    }

    if (getGeneratedDocContract(relativePath)) {
      continue;
    }

    const docIssues = await checkCanonicalFrontmatter(
      relativePath,
      manifest.requiredFrontmatterFields
    );
    issues.push(...docIssues);
  }

  for (const pair of manifest.compatibilityMirrorPairs ?? []) {
    const mirrorIssues = await checkCompatibilityMirrorPair(pair);
    issues.push(...mirrorIssues);
  }

  const referenceTargets = [
    ...new Set([
      ...requiredCanonicalDocs,
      ...(manifest.additionalReferenceCheckTargets ?? []),
    ]),
  ];
  const referenceTargetExemptions = new Set(manifest.rootStubReferenceExemptions ?? []);

  for (const relativePath of referenceTargets) {
    if (referenceTargetExemptions.has(relativePath)) {
      continue;
    }

    const exists = await fileExists(relativePath);
    if (!exists) {
      issues.push(`${relativePath}: root stub reference check target is missing`);
      continue;
    }

    const referenceIssues = await checkReferenceTargetForRootStubReferences(
      relativePath,
      supersededRootDocs
    );
    issues.push(...referenceIssues);
  }

  if (issues.length > 0) {
    console.error('Docs structure check failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    `Docs structure check passed for ${rootDocs.length} root docs and ${requiredCanonicalDocs.length} canonical docs.`
  );
}

run().catch((error) => {
  console.error('Docs structure check failed unexpectedly.');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
