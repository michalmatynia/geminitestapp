import path from 'node:path';
import { normalizeAbsolute } from '../lib-metrics.mjs'; // Wait, let's redefine it or import properly

const root = process.cwd();

export const resolveImportAbsolute = ({ fromAbsolutePath, sourceSpecifier, sourcePathSet }) => {
  let basePath;
  if (sourceSpecifier.startsWith('@/')) {
    basePath = path.join(root, 'src', sourceSpecifier.slice(2));
  } else if (sourceSpecifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(fromAbsolutePath), sourceSpecifier);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.mjs'),
    path.join(basePath, 'index.cjs'),
  ];

  for (const candidate of candidates) {
    const normalized = path.normalize(candidate);
    if (sourcePathSet.has(normalized)) return normalized;
  }

  return null;
};

export const buildExportedComponentIndex = (fileInfos) => {
  const index = new Map();

  for (const fileInfo of fileInfos.values()) {
    for (const [exportedName, localName] of fileInfo.localExportMap.entries()) {
      const component = fileInfo.components.get(localName);
      if (!component) continue;
      const list = index.get(exportedName) ?? [];
      list.push(component.id);
      index.set(exportedName, list);
    }
  }

  return index;
};

export const resolveNamedExportedComponent = ({
  fileAbsolutePath,
  exportName,
  fileInfos,
  sourcePathSet,
  namedFallbackIndex,
  visited = new Set(),
}) => {
  const visitKey = `${fileAbsolutePath}::${exportName}`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const fileInfo = fileInfos.get(fileAbsolutePath);
  if (!fileInfo) return null;

  const directLocalName = fileInfo.localExportMap.get(exportName);
  if (directLocalName && fileInfo.components.has(directLocalName)) {
    return fileInfo.components.get(directLocalName).id;
  }

  for (const entry of fileInfo.namedReExports) {
    if (entry.exportedName !== exportName) continue;
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileAbsolutePath,
      sourceSpecifier: entry.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) continue;

    const resolved =
      entry.importedName === 'default'
        ? resolveDefaultExportedComponent({
            fileAbsolutePath: targetAbsolute,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          })
        : resolveNamedExportedComponent({
            fileAbsolutePath: targetAbsolute,
            exportName: entry.importedName,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          });

    if (resolved) return resolved;
  }

  for (const exportAllSource of fileInfo.exportAllSpecifiers) {
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileAbsolutePath,
      sourceSpecifier: exportAllSource,
      sourcePathSet,
    });
    if (!targetAbsolute) continue;

    const resolved = resolveNamedExportedComponent({
      fileAbsolutePath: targetAbsolute,
      exportName,
      fileInfos,
      sourcePathSet,
      namedFallbackIndex,
      visited,
    });

    if (resolved) return resolved;
  }

  if (fileInfo.components.has(exportName)) {
    return fileInfo.components.get(exportName).id;
  }

  const fallback = namedFallbackIndex.get(exportName) ?? [];
  if (fallback.length === 1) return fallback[0];

  return null;
};

export const resolveDefaultExportedComponent = ({
  fileAbsolutePath,
  fileInfos,
  sourcePathSet,
  namedFallbackIndex,
  visited = new Set(),
}) => {
  const visitKey = `${fileAbsolutePath}::default`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const fileInfo = fileInfos.get(fileAbsolutePath);
  if (!fileInfo) return null;

  if (fileInfo.defaultExportLocalName && fileInfo.components.has(fileInfo.defaultExportLocalName)) {
    return fileInfo.components.get(fileInfo.defaultExportLocalName).id;
  }

  for (const entry of fileInfo.namedReExports) {
    if (entry.exportedName !== 'default') continue;
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileAbsolutePath,
      sourceSpecifier: entry.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) continue;

    const resolved =
      entry.importedName === 'default'
        ? resolveDefaultExportedComponent({
            fileAbsolutePath: targetAbsolute,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          })
        : resolveNamedExportedComponent({
            fileAbsolutePath: targetAbsolute,
            exportName: entry.importedName,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          });

    if (resolved) return resolved;
  }

  return null;
};

export const resolveEdgeTarget = ({
  fileInfo,
  edge,
  fileInfos,
  sourcePathSet,
  namedFallbackIndex,
}) => {
  if (edge.tagRef.kind === 'identifier') {
    const sameFileComponent = fileInfo.components.get(edge.tagRef.name);
    if (sameFileComponent) return sameFileComponent.id;

    const importBinding = fileInfo.imports.get(edge.tagRef.name);
    if (!importBinding) return null;

    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileInfo.absolutePath,
      sourceSpecifier: importBinding.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) return null;

    if (importBinding.kind === 'default') {
      return resolveDefaultExportedComponent({
        fileAbsolutePath: targetAbsolute,
        fileInfos,
        sourcePathSet,
        namedFallbackIndex,
      });
    }

    if (importBinding.kind === 'named') {
      return resolveNamedExportedComponent({
        fileAbsolutePath: targetAbsolute,
        exportName: importBinding.importedName,
        fileInfos,
        sourcePathSet,
        namedFallbackIndex,
      });
    }

    return null;
  }

  if (edge.tagRef.kind === 'member') {
    const namespaceBinding = fileInfo.imports.get(edge.tagRef.namespace);
    if (!namespaceBinding || namespaceBinding.kind !== 'namespace') return null;
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileInfo.absolutePath,
      sourceSpecifier: namespaceBinding.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) return null;

    return resolveNamedExportedComponent({
      fileAbsolutePath: targetAbsolute,
      exportName: edge.tagRef.member,
      fileInfos,
      sourcePathSet,
      namedFallbackIndex,
    });
  }

  return null;
};
