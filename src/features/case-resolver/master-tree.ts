import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';


const FOLDER_NODE_PREFIX = 'folder:';
const FILE_NODE_PREFIX = 'file:';
const ASSET_NODE_PREFIX = 'asset:';
const CASE_NODE_PREFIX = 'case:';
const CASE_CONTENT_FOLDER_NODE_PREFIX = 'case_content_folder:';
const CASE_CONTENT_FILE_NODE_PREFIX = 'case_content_file:';
const CASE_CONTENT_NODE_SEPARATOR = '::';

export type CaseResolverMasterNodeRef =
  | { entity: 'folder'; id: string; nodeId: string }
  | { entity: 'file'; id: string; nodeId: string }
  | { entity: 'asset'; id: string; nodeId: string };

export type CaseResolverCaseMasterNodeRef = {
  entity: 'case';
  id: string;
  nodeId: string;
};

export type CaseResolverCaseContentFolderMasterNodeRef = {
  entity: 'case_content_folder';
  caseId: string;
  folderPath: string;
  nodeId: string;
};

export type CaseResolverCaseContentFileMasterNodeRef = {
  entity: 'case_content_file';
  caseId: string;
  fileId: string;
  nodeId: string;
};

export const toCaseResolverFolderNodeId = (folderPath: string): string =>
  `${FOLDER_NODE_PREFIX}${folderPath}`;

export const toCaseResolverFileNodeId = (fileId: string): string =>
  `${FILE_NODE_PREFIX}${fileId}`;

export const toCaseResolverAssetNodeId = (assetId: string): string =>
  `${ASSET_NODE_PREFIX}${assetId}`;

export const toCaseResolverCaseNodeId = (caseId: string): string =>
  `${CASE_NODE_PREFIX}${caseId}`;

export const toCaseResolverCaseContentFolderNodeId = (
  caseId: string,
  folderPath: string
): string =>
  `${CASE_CONTENT_FOLDER_NODE_PREFIX}${encodeURIComponent(caseId)}${CASE_CONTENT_NODE_SEPARATOR}${encodeURIComponent(folderPath)}`;

export const toCaseResolverCaseContentFileNodeId = (
  caseId: string,
  fileId: string
): string =>
  `${CASE_CONTENT_FILE_NODE_PREFIX}${encodeURIComponent(caseId)}${CASE_CONTENT_NODE_SEPARATOR}${encodeURIComponent(fileId)}`;

export const fromCaseResolverFolderNodeId = (value: string): string | null =>
  value.startsWith(FOLDER_NODE_PREFIX) ? value.slice(FOLDER_NODE_PREFIX.length) : null;

export const fromCaseResolverFileNodeId = (value: string): string | null =>
  value.startsWith(FILE_NODE_PREFIX) ? value.slice(FILE_NODE_PREFIX.length) : null;

export const fromCaseResolverAssetNodeId = (value: string): string | null =>
  value.startsWith(ASSET_NODE_PREFIX) ? value.slice(ASSET_NODE_PREFIX.length) : null;

export const fromCaseResolverCaseNodeId = (value: string): string | null =>
  value.startsWith(CASE_NODE_PREFIX) ? value.slice(CASE_NODE_PREFIX.length) : null;

const decodeCaseContentNodePayload = (
  value: string,
  prefix: string
): [string, string] | null => {
  if (!value.startsWith(prefix)) return null;
  const payload = value.slice(prefix.length);
  const separatorIndex = payload.indexOf(CASE_CONTENT_NODE_SEPARATOR);
  if (separatorIndex <= 0) return null;
  const left = payload.slice(0, separatorIndex);
  const right = payload.slice(separatorIndex + CASE_CONTENT_NODE_SEPARATOR.length);
  if (!left || !right) return null;
  try {
    const decodedLeft = decodeURIComponent(left).trim();
    const decodedRight = decodeURIComponent(right).trim();
    if (!decodedLeft || !decodedRight) return null;
    return [decodedLeft, decodedRight];
  } catch {
    return null;
  }
};

export const fromCaseResolverCaseContentFolderNodeId = (
  value: string
): { caseId: string; folderPath: string } | null => {
  const decoded = decodeCaseContentNodePayload(value, CASE_CONTENT_FOLDER_NODE_PREFIX);
  if (!decoded) return null;
  const [caseId, folderPath] = decoded;
  return { caseId, folderPath };
};

export const fromCaseResolverCaseContentFileNodeId = (
  value: string
): { caseId: string; fileId: string } | null => {
  const decoded = decodeCaseContentNodePayload(value, CASE_CONTENT_FILE_NODE_PREFIX);
  if (!decoded) return null;
  const [caseId, fileId] = decoded;
  return { caseId, fileId };
};

export const decodeCaseResolverMasterNodeId = (
  value: string
): CaseResolverMasterNodeRef | null => {
  const folderId = fromCaseResolverFolderNodeId(value);
  if (folderId !== null) return { entity: 'folder', id: folderId, nodeId: value };
  const fileId = fromCaseResolverFileNodeId(value);
  if (fileId !== null) return { entity: 'file', id: fileId, nodeId: value };
  const assetId = fromCaseResolverAssetNodeId(value);
  if (assetId !== null) return { entity: 'asset', id: assetId, nodeId: value };
  return null;
};

export const decodeCaseResolverCaseMasterNodeId = (
  value: string
): CaseResolverCaseMasterNodeRef | null => {
  const caseId = fromCaseResolverCaseNodeId(value);
  if (caseId === null) return null;
  return { entity: 'case', id: caseId, nodeId: value };
};

export const decodeCaseResolverCaseContentFolderNodeId = (
  value: string
): CaseResolverCaseContentFolderMasterNodeRef | null => {
  const decoded = fromCaseResolverCaseContentFolderNodeId(value);
  if (!decoded) return null;
  return {
    entity: 'case_content_folder',
    caseId: decoded.caseId,
    folderPath: decoded.folderPath,
    nodeId: value,
  };
};

export const decodeCaseResolverCaseContentFileNodeId = (
  value: string
): CaseResolverCaseContentFileMasterNodeRef | null => {
  const decoded = fromCaseResolverCaseContentFileNodeId(value);
  if (!decoded) return null;
  return {
    entity: 'case_content_file',
    caseId: decoded.caseId,
    fileId: decoded.fileId,
    nodeId: value,
  };
};

const parentFolderPath = (folderPath: string): string | null => {
  if (!folderPath.includes('/')) return null;
  return folderPath.slice(0, folderPath.lastIndexOf('/'));
};

const normalizeCaseContentFolderPath = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim();

const forEachCaseContentFolderAncestor = (
  folderPath: string,
  callback: (path: string) => void
): void => {
  const normalizedFolderPath = normalizeCaseContentFolderPath(folderPath);
  if (!normalizedFolderPath) return;
  const parts = normalizedFolderPath.split('/').filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    callback(parts.slice(0, index + 1).join('/'));
  }
};

export const resolveCaseResolverFolderTargetForNode = (
  nodes: MasterTreeNode[],
  nodeId: MasterTreeId | null
): string | null => {
  if (nodeId === null) return '';
  const folderPath = fromCaseResolverFolderNodeId(nodeId);
  if (folderPath !== null) return folderPath;
  const node = nodes.find((entry: MasterTreeNode) => entry.id === nodeId);
  if (!node?.parentId) return '';
  return resolveCaseResolverFolderTargetForNode(nodes, node.parentId);
};

export const buildMasterNodesFromCaseResolverWorkspace = (
  workspace: CaseResolverWorkspace
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];
  const folderTimestampByPath = workspace.folderTimestamps ?? {};
  const resolveParentKey = (parentId: string | null): string => parentId ?? '__root__';
  const folderSortIndexByParent = new Map<string, number>();

  const sortedFolders = [...workspace.folders].sort((left: string, right: string) =>
    left.localeCompare(right)
  );

  sortedFolders.forEach((folderPath: string) => {
    const folderNodeId = toCaseResolverFolderNodeId(folderPath);
    const parentPath = parentFolderPath(folderPath);
    const parentNodeId = parentPath ? toCaseResolverFolderNodeId(parentPath) : null;
    const parentKey = resolveParentKey(parentNodeId);
    const folderSortOrder = folderSortIndexByParent.get(parentKey) ?? 0;
    folderSortIndexByParent.set(parentKey, folderSortOrder + 1);
    const folderName = folderPath.includes('/')
      ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
      : folderPath;

    nodes.push({
      id: folderNodeId,
      type: 'folder',
      kind: 'folder',
      parentId: parentNodeId,
      name: folderName,
      path: folderPath,
      sortOrder: folderSortOrder,
      metadata: {
        entity: 'folder',
        rawPath: folderPath,
        createdAt: folderTimestampByPath[folderPath]?.createdAt ?? null,
        updatedAt: folderTimestampByPath[folderPath]?.updatedAt ?? null,
      },
    });
  });

  type FolderFileEntry = {
    id: string;
    name: string;
    kindSortKey: string;
    toNode: (sortOrder: number, parentNodeId: string | null) => MasterTreeNode;
  };
  const fileEntriesByFolder = new Map<string, FolderFileEntry[]>();
  const appendFileEntry = (folderPath: string, entry: FolderFileEntry): void => {
    const current = fileEntriesByFolder.get(folderPath) ?? [];
    current.push(entry);
    fileEntriesByFolder.set(folderPath, current);
  };

  workspace.files.forEach((file: CaseResolverFile) => {
    if (file.fileType === 'case') return;
    const isScanFile = file.fileType === 'scanfile';
    appendFileEntry(file.folder, {
      id: file.id,
      name: file.name,
      kindSortKey: isScanFile ? 'case_file_scan' : 'case_file_document',
      toNode: (sortOrder: number, parentNodeId: string | null): MasterTreeNode => {
        const filePath = file.folder ? `${file.folder}/${file.name}` : file.name;
        return {
          id: toCaseResolverFileNodeId(file.id),
          type: 'file',
          kind: isScanFile ? 'case_file_scan' : 'case_file',
          parentId: parentNodeId,
          name: file.name,
          path: filePath,
          sortOrder,
          metadata: {
            entity: 'file',
            rawId: file.id,
            folder: file.folder,
            isLocked: file.isLocked,
            fileType: file.fileType,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          },
        };
      },
    });
  });
  workspace.assets.forEach((asset: CaseResolverAssetFile) => {
    const isHiddenImagePlaceholder =
      asset.kind === 'image' &&
      (typeof asset.filepath !== 'string' || asset.filepath.trim().length === 0);
    if (isHiddenImagePlaceholder) return;

    appendFileEntry(asset.folder, {
      id: asset.id,
      name: asset.name,
      kindSortKey:
        asset.kind === 'node_file'
          ? 'node_file'
          : asset.kind === 'image'
            ? 'asset_image'
            : asset.kind === 'pdf'
              ? 'asset_pdf'
              : 'asset_file',
      toNode: (sortOrder: number, parentNodeId: string | null): MasterTreeNode => {
        const assetPath = asset.folder ? `${asset.folder}/${asset.name}` : asset.name;
        const kind =
          asset.kind === 'node_file'
            ? 'node_file'
            : asset.kind === 'image'
              ? 'asset_image'
              : asset.kind === 'pdf'
                ? 'asset_pdf'
                : 'asset_file';

        return {
          id: toCaseResolverAssetNodeId(asset.id),
          type: 'file',
          kind,
          parentId: parentNodeId,
          name: asset.name,
          path: assetPath,
          sortOrder,
          metadata: {
            entity: 'asset',
            rawId: asset.id,
            folder: asset.folder,
            assetKind: asset.kind,
            filepath: asset.filepath,
            mimeType: asset.mimeType,
            size: asset.size,
            textContent: asset.textContent,
            description: asset.description,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          },
        };
      },
    });
  });

  fileEntriesByFolder.forEach((entries: FolderFileEntry[], folderPath: string) => {
    const parentNodeId = folderPath ? toCaseResolverFolderNodeId(folderPath) : null;
    const sortedEntries = [...entries].sort((left: FolderFileEntry, right: FolderFileEntry) => {
      const nameDelta = left.name.localeCompare(right.name);
      if (nameDelta !== 0) return nameDelta;
      const kindDelta = left.kindSortKey.localeCompare(right.kindSortKey);
      if (kindDelta !== 0) return kindDelta;
      return left.id.localeCompare(right.id);
    });

    sortedEntries.forEach((entry: FolderFileEntry, index: number) => {
      nodes.push(entry.toNode(10000 + index, parentNodeId));
    });
  });

  return nodes;
};

const resolveNormalizedCaseParentId = (
  file: CaseResolverFile,
  caseFilesById: Map<string, CaseResolverFile>
): string | null => {
  const parentCaseId = file.parentCaseId?.trim() ?? '';
  if (!parentCaseId) return null;
  if (parentCaseId === file.id) return null;
  if (!caseFilesById.has(parentCaseId)) return null;
  return parentCaseId;
};

const resolveCaseSortOrderValue = (file: CaseResolverFile): number =>
  typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
    ? Math.max(0, Math.floor(file.caseTreeOrder))
    : Number.MAX_SAFE_INTEGER;

const compareCaseSiblings = (left: CaseResolverFile, right: CaseResolverFile): number => {
  const orderDelta = resolveCaseSortOrderValue(left) - resolveCaseSortOrderValue(right);
  if (orderDelta !== 0) return orderDelta;
  const nameDelta = left.name.localeCompare(right.name);
  if (nameDelta !== 0) return nameDelta;
  return left.id.localeCompare(right.id);
};

export const buildMasterCaseNodesFromCaseResolverWorkspace = (
  workspace: CaseResolverWorkspace
): MasterTreeNode[] => {
  const caseFiles = workspace.files.filter(
    (file: CaseResolverFile): boolean => file.fileType === 'case'
  );
  if (caseFiles.length === 0) return [];

  const caseFilesById = new Map<string, CaseResolverFile>(
    caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  const parentCaseIdByCaseId = new Map<string, string | null>();
  caseFiles.forEach((file: CaseResolverFile): void => {
    parentCaseIdByCaseId.set(file.id, resolveNormalizedCaseParentId(file, caseFilesById));
  });

  const siblingCaseIdsByParentId = new Map<string | null, string[]>();
  caseFiles.forEach((file: CaseResolverFile): void => {
    const parentCaseId = parentCaseIdByCaseId.get(file.id) ?? null;
    const current = siblingCaseIdsByParentId.get(parentCaseId) ?? [];
    current.push(file.id);
    siblingCaseIdsByParentId.set(parentCaseId, current);
  });

  const normalizedSortOrderByCaseId = new Map<string, number>();
  siblingCaseIdsByParentId.forEach((siblingCaseIds: string[]): void => {
    const sortedSiblings = siblingCaseIds
      .map((caseId: string): CaseResolverFile | null => caseFilesById.get(caseId) ?? null)
      .filter((file: CaseResolverFile | null): file is CaseResolverFile => Boolean(file))
      .sort(compareCaseSiblings);

    sortedSiblings.forEach((file: CaseResolverFile, index: number): void => {
      normalizedSortOrderByCaseId.set(file.id, index);
    });
  });

  const pathByCaseId = new Map<string, string>();
  const resolveCaseLabel = (file: CaseResolverFile): string => {
    const normalized = file.name.trim();
    return normalized.length > 0 ? normalized : file.id;
  };
  const resolveCasePath = (caseId: string, stack: Set<string>): string => {
    const cached = pathByCaseId.get(caseId);
    if (cached !== undefined) return cached;
    const file = caseFilesById.get(caseId);
    if (!file) return caseId;
    const caseLabel = resolveCaseLabel(file);
    if (stack.has(caseId)) return caseLabel;
    const parentCaseId = parentCaseIdByCaseId.get(caseId) ?? null;
    if (!parentCaseId) {
      pathByCaseId.set(caseId, caseLabel);
      return caseLabel;
    }
    stack.add(caseId);
    const parentPath = resolveCasePath(parentCaseId, stack);
    stack.delete(caseId);
    const resolvedPath = `${parentPath}/${caseLabel}`;
    pathByCaseId.set(caseId, resolvedPath);
    return resolvedPath;
  };

  return caseFiles.map((file: CaseResolverFile): MasterTreeNode => {
    const parentCaseId = parentCaseIdByCaseId.get(file.id) ?? null;
    return {
      id: toCaseResolverCaseNodeId(file.id),
      type: 'folder',
      kind: 'case_entry',
      parentId: parentCaseId ? toCaseResolverCaseNodeId(parentCaseId) : null,
      name: resolveCaseLabel(file),
      path: resolveCasePath(file.id, new Set<string>()),
      sortOrder: normalizedSortOrderByCaseId.get(file.id) ?? 0,
      metadata: {
        entity: 'case',
        rawId: file.id,
        parentCaseId,
        folder: file.folder,
        caseStatus: file.caseStatus ?? 'pending',
        caseTreeOrder:
          typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
            ? Math.max(0, Math.floor(file.caseTreeOrder))
            : null,
        isLocked: file.isLocked === true,
        tagId: file.tagId ?? null,
        caseIdentifierId: file.caseIdentifierId ?? null,
        categoryId: file.categoryId ?? null,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    };
  });
};

export const buildMasterCaseContentNodesFromCaseResolverWorkspace = ({
  workspace,
  includeCaseIds,
}: {
  workspace: CaseResolverWorkspace;
  includeCaseIds?: ReadonlySet<string> | null;
}): MasterTreeNode[] => {
  const caseFilesById = new Map<string, CaseResolverFile>(
    workspace.files
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  if (caseFilesById.size === 0) return [];

  const targetCaseIds = (() => {
    if (!includeCaseIds || includeCaseIds.size === 0) {
      return Array.from(caseFilesById.keys());
    }
    return Array.from(includeCaseIds).filter((caseId: string): boolean =>
      caseFilesById.has(caseId)
    );
  })();
  if (targetCaseIds.length === 0) return [];
  const targetCaseIdSet = new Set<string>(targetCaseIds);

  const folderPathsByCaseId = new Map<string, Set<string>>();
  const nonCaseFilesByCaseId = new Map<string, CaseResolverFile[]>();

  const ensureFolderPathSet = (caseId: string): Set<string> => {
    const existing = folderPathsByCaseId.get(caseId);
    if (existing) return existing;
    const next = new Set<string>();
    folderPathsByCaseId.set(caseId, next);
    return next;
  };

  workspace.folderRecords?.forEach((record): void => {
    const ownerCaseId = record.ownerCaseId?.trim() ?? '';
    if (!ownerCaseId || !caseFilesById.has(ownerCaseId)) return;
    if (!targetCaseIdSet.has(ownerCaseId)) return;
    forEachCaseContentFolderAncestor(record.path, (folderPath: string): void => {
      ensureFolderPathSet(ownerCaseId).add(folderPath);
    });
  });

  workspace.files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') return;
    const ownerCaseId = file.parentCaseId?.trim() ?? '';
    if (!ownerCaseId || !caseFilesById.has(ownerCaseId)) return;
    if (!targetCaseIdSet.has(ownerCaseId)) return;
    const current = nonCaseFilesByCaseId.get(ownerCaseId) ?? [];
    current.push(file);
    nonCaseFilesByCaseId.set(ownerCaseId, current);

    forEachCaseContentFolderAncestor(file.folder, (folderPath: string): void => {
      ensureFolderPathSet(ownerCaseId).add(folderPath);
    });
  });

  const nodes: MasterTreeNode[] = [];
  const sortedTargetCaseIds = [...targetCaseIds].sort((left: string, right: string): number =>
    left.localeCompare(right)
  );

  sortedTargetCaseIds.forEach((caseId: string): void => {
    const folderPathSet = folderPathsByCaseId.get(caseId) ?? new Set<string>();
    const folderPaths = Array.from(folderPathSet).sort((left: string, right: string): number =>
      left.localeCompare(right)
    );

    const siblingIndexByParentId = new Map<string, number>();
    const resolveNextSiblingIndex = (parentId: string): number => {
      const current = siblingIndexByParentId.get(parentId) ?? 0;
      siblingIndexByParentId.set(parentId, current + 1);
      return current;
    };

    folderPaths.forEach((folderPath: string): void => {
      const parentPath = parentFolderPath(folderPath);
      const parentId = parentPath
        ? toCaseResolverCaseContentFolderNodeId(caseId, parentPath)
        : toCaseResolverCaseNodeId(caseId);
      const sortOrder = resolveNextSiblingIndex(parentId);
      const folderName = folderPath.includes('/')
        ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
        : folderPath;

      nodes.push({
        id: toCaseResolverCaseContentFolderNodeId(caseId, folderPath),
        type: 'folder',
        kind: 'case_content_folder',
        parentId,
        name: folderName,
        path: folderPath,
        sortOrder,
        metadata: {
          entity: 'case_content_folder',
          caseId,
          folderPath,
          isCaseContentReadonly: true,
          createdAt: workspace.folderTimestamps?.[folderPath]?.createdAt ?? null,
          updatedAt: workspace.folderTimestamps?.[folderPath]?.updatedAt ?? null,
        },
      });
    });

    const caseFiles = [...(nonCaseFilesByCaseId.get(caseId) ?? [])].sort(
      (left: CaseResolverFile, right: CaseResolverFile): number => {
        const folderDelta = left.folder.localeCompare(right.folder);
        if (folderDelta !== 0) return folderDelta;
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      }
    );

    caseFiles.forEach((file: CaseResolverFile): void => {
      const normalizedFolder = normalizeCaseContentFolderPath(file.folder);
      const parentId = normalizedFolder
        ? toCaseResolverCaseContentFolderNodeId(caseId, normalizedFolder)
        : toCaseResolverCaseNodeId(caseId);
      const sortOrder = 10000 + resolveNextSiblingIndex(parentId);
      const nodePath = normalizedFolder ? `${normalizedFolder}/${file.name}` : file.name;

      nodes.push({
        id: toCaseResolverCaseContentFileNodeId(caseId, file.id),
        type: 'file',
        kind: file.fileType === 'scanfile' ? 'case_content_file_scan' : 'case_content_file',
        parentId,
        name: file.name,
        path: nodePath,
        sortOrder,
        metadata: {
          entity: 'case_content_file',
          caseId,
          rawId: file.id,
          fileType: file.fileType,
          folder: file.folder,
          isLocked: file.isLocked === true,
          isCaseContentReadonly: true,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
      });
    });
  });

  return nodes;
};
