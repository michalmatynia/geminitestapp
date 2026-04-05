import path from 'node:path';

const isPathWithinRoot = (candidatePath, rootPath) => {
  const resolvedCandidatePath = path.resolve(candidatePath);
  const resolvedRootPath = path.resolve(rootPath);
  return (
    resolvedCandidatePath === resolvedRootPath ||
    resolvedCandidatePath.startsWith(`${resolvedRootPath}${path.sep}`)
  );
};

export const resolveRepoPath = (rootDir, relativePath) => {
  const resolvedRootDir = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRootDir, relativePath);
  if (!isPathWithinRoot(resolvedPath, resolvedRootDir)) {
    throw new Error(`[path-safety] path must stay within ${resolvedRootDir}.`);
  }

  return resolvedPath;
};
