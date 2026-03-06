import { useCallback } from 'react';
import type {
  CaseResolverAssetFile,
  CaseResolverGraph,
  CaseResolverRelationGraph,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';
import {
  createCaseResolverAssetFile,
  normalizeFolderPath,
  normalizeFolderPaths,
} from '../settings';
import { createId } from '@/features/case-resolver/utils/caseResolverUtils';

export function useAdminCaseResolverRelationActions({
  workspace: _workspace,
  updateWorkspace,
}: {
  workspace: CaseResolverWorkspace;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      mutationId?: string;
      source?: string;
      skipNormalization?: boolean;
    }
  ) => void;
}) {
  const createUniqueNodeFileAssetName = useCallback(
    (assets: CaseResolverAssetFile[], folder: string, baseName: string): string => {
      const normalizedFolder = normalizeFolderPath(folder);
      const normalizedBaseName = baseName.trim() || 'New Node File';
      const namesInFolder = new Set(
        assets
          .filter((asset: CaseResolverAssetFile): boolean => asset.folder === normalizedFolder)
          .map((asset: CaseResolverAssetFile): string => asset.name.trim().toLowerCase())
      );
      if (!namesInFolder.has(normalizedBaseName.toLowerCase())) return normalizedBaseName;
      let index = 2;
      while (index < 10_000) {
        const candidate = `${normalizedBaseName} ${index}`;
        if (!namesInFolder.has(candidate.toLowerCase())) {
          return candidate;
        }
        index += 1;
      }
      return `${normalizedBaseName}-${createId('dup')}`;
    },
    []
  );

  const handleGraphChange = useCallback(
    (nextGraph: CaseResolverGraph): void => {
      updateWorkspace((current: CaseResolverWorkspace) => {
        if (!current.activeFileId) return current;
        const activeFileIdx = current.files.findIndex((file) => file.id === current.activeFileId);
        if (activeFileIdx < 0) return current;
        const activeFileLocal = current.files[activeFileIdx];
        if (!activeFileLocal?.graph) return current;
        if (activeFileLocal.isLocked) return current;

        const activeGraph = activeFileLocal.graph;
        const previousSourceFileIdByNode = activeGraph.documentSourceFileIdByNode ?? {};
        const nextSourceFileIdByNode = nextGraph.documentSourceFileIdByNode ?? {};
        const nextNodeIds = new Set(
          nextGraph.nodes
            .map((node) => node.id)
            .filter(
              (nodeId: string): boolean => typeof nodeId === 'string' && nodeId.trim().length > 0
            )
        );
        const filesById = new Map(current.files.map((file) => [file.id, file]));
        const existingNodeFileMap = activeGraph.nodeFileAssetIdByNode ?? {};
        const nextNodeFileMap: Record<string, string> = {};
        Object.entries(existingNodeFileMap).forEach(([nodeId, assetId]: [string, string]): void => {
          const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
          if (!normalizedAssetId) return;
          if (!nextNodeIds.has(nodeId)) return;
          nextNodeFileMap[nodeId] = normalizedAssetId;
        });

        let nextAssets = current.assets;
        let assetsChanged = false;
        const now = new Date().toISOString();

        const createNodeFileAssetForNode = (nodeId: string, sourceFileId: string): void => {
          if (nextNodeFileMap[nodeId]) return;
          const sourceFile = filesById.get(sourceFileId) ?? null;
          const normalizedFolder = normalizeFolderPath(
            sourceFile?.folder ?? activeFileLocal.folder ?? ''
          );
          const baseName = `${(sourceFile?.name ?? 'Document').trim() || 'Document'} Node File`;
          const name = createUniqueNodeFileAssetName(nextAssets, normalizedFolder, baseName);
          const createdAssetId = createId('asset');
          const createdAsset = createCaseResolverAssetFile({
            id: createdAssetId,
            name,
            folder: normalizedFolder,
            kind: 'node_file',
            sourceFileId,
            textContent: '',
            description: 'Auto-created from canvas document drop.',
          });
          nextAssets = [...nextAssets, createdAsset];
          nextNodeFileMap[nodeId] = createdAssetId;
          assetsChanged = true;
        };

        Object.entries(nextSourceFileIdByNode).forEach(
          ([nodeId, sourceFileId]: [string, string]): void => {
            if (!nextNodeIds.has(nodeId)) return;
            const normalizedSourceFileId =
              typeof sourceFileId === 'string' ? sourceFileId.trim() : '';
            if (!normalizedSourceFileId) return;
            const hadPreviousSource = Boolean(previousSourceFileIdByNode[nodeId]?.trim());
            if (hadPreviousSource) return;
            createNodeFileAssetForNode(nodeId, normalizedSourceFileId);
          }
        );

        Object.entries({ ...nextNodeFileMap }).forEach(
          ([nodeId, assetId]: [string, string]): void => {
            const normalizedNodeId = typeof nodeId === 'string' ? nodeId.trim() : '';
            const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
            if (!normalizedNodeId || !normalizedAssetId) {
              delete nextNodeFileMap[nodeId];
              return;
            }
            if (!nextNodeIds.has(normalizedNodeId)) {
              delete nextNodeFileMap[nodeId];
              return;
            }
            const hasMappedAsset = nextAssets.some(
              (asset: CaseResolverAssetFile): boolean =>
                asset.id === normalizedAssetId && asset.kind === 'node_file'
            );
            if (!hasMappedAsset) {
              delete nextNodeFileMap[nodeId];
            }
          }
        );

        const nextNodeFileMapKeys = Object.keys(nextNodeFileMap);
        const normalizedNodeFileMap = nextNodeFileMapKeys.length > 0 ? nextNodeFileMap : undefined;
        const currentComparableGraph = {
          ...activeGraph,
          ...(activeGraph.nodeFileAssetIdByNode &&
          Object.keys(activeGraph.nodeFileAssetIdByNode).length > 0
            ? { nodeFileAssetIdByNode: activeGraph.nodeFileAssetIdByNode }
            : {}),
        };
        const nextComparableGraph = {
          ...nextGraph,
          ...(normalizedNodeFileMap ? { nodeFileAssetIdByNode: normalizedNodeFileMap } : {}),
        };
        const graphChanged =
          stableStringify(currentComparableGraph) !== stableStringify(nextComparableGraph);

        if (!graphChanged && !assetsChanged) return current;

        const nextFiles = graphChanged
          ? current.files.map((file) => {
              if (file.id !== activeFileLocal.id) return file;
              return {
                ...file,
                graph: nextComparableGraph,
                updatedAt: now,
              };
            })
          : current.files;

        return {
          ...current,
          files: nextFiles,
          assets: assetsChanged ? nextAssets : current.assets,
          folders: assetsChanged
            ? normalizeFolderPaths([
                ...current.folders,
                ...nextAssets.map((asset: CaseResolverAssetFile): string => asset.folder),
              ])
            : current.folders,
        };
      });
    },
    [createUniqueNodeFileAssetName, updateWorkspace]
  );

  const handleRelationGraphChange = useCallback(
    (nextGraph: CaseResolverRelationGraph): void => {
      updateWorkspace(
        (current: CaseResolverWorkspace) => {
          if (stableStringify(current.relationGraph) === stableStringify(nextGraph)) {
            return current;
          }
          return {
            ...current,
            relationGraph: nextGraph,
          };
        },
        {
          persistNow: true,
          source: 'case_view_relation_graph_change',
        }
      );
    },
    [updateWorkspace]
  );

  return {
    handleGraphChange,
    handleRelationGraphChange,
    createUniqueNodeFileAssetName,
  };
}
