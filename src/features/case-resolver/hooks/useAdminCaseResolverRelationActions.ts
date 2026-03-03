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

  const buildNodeFileSnapshotText = useCallback(
    (input: {
      graph: CaseResolverGraph;
      nodeId: string;
      sourceFileId: string | null;
      sourceFileName: string | null;
      sourceFileType: 'document' | 'scanfile' | null;
    }): string => {
      const connectedEdges = input.graph.edges
        .filter(
          (edge): boolean => edge.source === input.nodeId || edge.target === input.nodeId
        )
        .sort((left, right) => left.id.localeCompare(right.id));
      const connectedNodeIds = new Set<string>([input.nodeId]);
      connectedEdges.forEach((edge): void => {
        if (typeof edge.source === 'string' && edge.source.trim().length > 0) {
          connectedNodeIds.add(edge.source);
        }
        if (typeof edge.target === 'string' && edge.target.trim().length > 0) {
          connectedNodeIds.add(edge.target);
        }
      });
      const snapshotNodes = input.graph.nodes.filter((node): boolean => connectedNodeIds.has(node.id));
      const snapshotNodeMeta = Object.fromEntries(
        Object.entries(input.graph.nodeMeta ?? {}).filter(([nodeId]): boolean =>
          connectedNodeIds.has(nodeId)
        )
      );
      const connectedEdgeIds = new Set(connectedEdges.map((edge): string => edge.id));
      const snapshotEdgeMeta = Object.fromEntries(
        Object.entries(input.graph.edgeMeta ?? {}).filter(([edgeId]): boolean =>
          connectedEdgeIds.has(edgeId)
        )
      );

      const nodeFileMeta = (() => {
        if (!input.sourceFileId || !input.nodeId) return {};
        return {
          [input.nodeId]: {
            fileId: input.sourceFileId,
            fileType: input.sourceFileType === 'scanfile' ? 'scanfile' : 'document',
            fileName: input.sourceFileName ?? 'Linked document',
          },
        };
      })();

      return JSON.stringify(
        {
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: snapshotNodes,
          edges: connectedEdges,
          nodeMeta: snapshotNodeMeta,
          edgeMeta: snapshotEdgeMeta,
          nodeFileMeta,
        },
        null,
        2
      );
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
          const snapshot = buildNodeFileSnapshotText({
            graph: nextGraph,
            nodeId,
            sourceFileId,
            sourceFileName: sourceFile?.name ?? null,
            sourceFileType: sourceFile?.fileType === 'scanfile' ? 'scanfile' : 'document',
          });
          const createdAsset = createCaseResolverAssetFile({
            id: createdAssetId,
            name,
            folder: normalizedFolder,
            kind: 'node_file',
            sourceFileId,
            textContent: snapshot,
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
    [buildNodeFileSnapshotText, createUniqueNodeFileAssetName, updateWorkspace]
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
    buildNodeFileSnapshotText,
  };
}
