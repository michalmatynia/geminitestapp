import { useCallback } from 'react';
import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import {
  CASE_RESOLVER_SETTINGS_KEY,
  DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverSettings,
} from '../settings';
import {
  buildCaseResolverRelationGraph,
  toCaseResolverRelationCaseFileNodeId,
} from '../settings-relation-graph';
import {
  appendOwnedFolderRecords,
  createPlaceholderAssetName,
  createUniqueCaseFileName,
  resolveCaseScopedFolderTarget,
} from './useCaseResolverState.helpers';
import {
  buildCombinedOcrText,
  createId,
} from '../utils/caseResolverUtils';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import type { Toast } from '@/shared/contracts/ui';

export function useCaseResolverStateAssetFactoryActions({
  settingsStoreRef,
  toast,
  updateWorkspace,
  workspace,
  defaultTagId,
  defaultCaseIdentifierId,
  defaultCategoryId,
  activeCaseId,
  requestedCaseStatus,
  setSelectedFileId,
  setSelectedFolderPath,
  setSelectedAssetId,
  treeSaveToast,
}: {
  settingsStoreRef: React.MutableRefObject<SettingsStoreValue>;
  toast: Toast;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: { persistToast?: string; persistNow?: boolean; mutationId?: string; source?: string; skipNormalization?: boolean }
  ) => void;
  workspace: CaseResolverWorkspace;
  defaultTagId: string | null;
  defaultCaseIdentifierId: string | null;
  defaultCategoryId: string | null;
  activeCaseId: string | null;
  requestedCaseStatus: 'loading' | 'ready' | 'missing';
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  treeSaveToast: string;
}) {
  const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const handleCreateScanFile = useCallback((targetFolderPath: string | null): void => {
    const runtimeCaseResolverSettings = parseCaseResolverSettings(
      settingsStoreRef.current.get(CASE_RESOLVER_SETTINGS_KEY)
    );
    if (!activeCaseId) {
      toast(
        requestedCaseStatus === 'loading'
          ? 'Case context is still loading. Please wait.'
          : 'Cannot create image file without a selected case.',
        { variant: 'warning' }
      );
      return;
    }
    let createdImageFile = false;
    let createdImageFileId: string | null = null;

    updateWorkspace((current: CaseResolverWorkspace) => {
      const folder = resolveCaseScopedFolderTarget({
        targetFolderPath,
        ownerCaseId: activeCaseId,
        folderRecords: current.folderRecords,
      });
      const name = createUniqueCaseFileName({
        files: current.files,
        folder,
        baseName: 'New Image',
      });
      const createdFileId = createId('case-file');
      const createdFile = createCaseResolverFile({
        id: createdFileId,
        fileType: 'scanfile',
        name,
        folder,
        parentCaseId: activeCaseId,
        editorType: 'document',
        scanSlots: [],
        scanOcrModel:
          runtimeCaseResolverSettings.ocrModel.trim() ||
          (settingsStoreRef.current.get('openai_model') ?? '').trim(),
        scanOcrPrompt: DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
        tagId: defaultTagId,
        caseIdentifierId: defaultCaseIdentifierId,
        categoryId: defaultCategoryId,
      });
      createdImageFile = true;
      createdImageFileId = createdFile.id;
      return {
        ...current,
        files: [...current.files, createdFile],
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId: activeCaseId,
        }),
      };
    }, { persistToast: treeSaveToast });

    if (createdImageFile) {
      setSelectedAssetId(null);
      setSelectedFolderPath(null);
      if (createdImageFileId) {
        setSelectedFileId(createdImageFileId);
      }
      toast('New image file created.', { variant: 'success' });
    }
  }, [
    activeCaseId,
    defaultCaseIdentifierId,
    defaultCategoryId,
    defaultTagId,
    requestedCaseStatus,
    setSelectedAssetId,
    setSelectedFileId,
    setSelectedFolderPath,
    toast,
    treeSaveToast,
    updateWorkspace,
    settingsStoreRef,
  ]);

  const handleCreateDocumentFromText = useCallback((scanFileId: string): void => {
    const sourceScanFile = workspace.files.find(
      (file: CaseResolverFile): boolean =>
        file.id === scanFileId && file.fileType === 'scanfile'
    );
    if (!sourceScanFile) {
      toast('Scan file no longer exists.', { variant: 'warning' });
      return;
    }

    const sourceText = (
      buildCombinedOcrText(sourceScanFile.scanSlots ?? []) ||
      sourceScanFile.documentContentMarkdown ||
      sourceScanFile.documentContentPlainText ||
      sourceScanFile.documentContent ||
      ''
    ).trim();

    if (!sourceText) {
      toast('Run OCR first.', {
        variant: 'warning',
      });
      return;
    }

    let createdDocumentId: string | null = null;
    let createdDocumentName: string | null = null;

    updateWorkspace((current: CaseResolverWorkspace) => {
      const currentSourceScanFile = current.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === scanFileId && file.fileType === 'scanfile'
      );
      if (!currentSourceScanFile) return current;
      if (currentSourceScanFile.isLocked) return current;

      const ownerCaseId =
        currentSourceScanFile.parentCaseId?.trim() || activeCaseId || null;
      if (!ownerCaseId) return current;

      const folder = resolveCaseScopedFolderTarget({
        targetFolderPath: currentSourceScanFile.folder ?? null,
        ownerCaseId,
        folderRecords: current.folderRecords,
      });
      const baseDocumentName = currentSourceScanFile.name.trim()
        ? `${currentSourceScanFile.name.trim()} Text`
        : 'New Document';
      const name = createUniqueCaseFileName({
        files: current.files,
        folder,
        baseName: baseDocumentName,
      });
      const newDocumentId = createId('case-file');
      const createdDocument = createCaseResolverFile({
        id: newDocumentId,
        fileType: 'document',
        name,
        folder,
        parentCaseId: ownerCaseId,
        editorType: 'document',
        documentContentMarkdown: sourceText,
        documentContent: sourceText,
        documentContentPlainText: sourceText,
        tagId: currentSourceScanFile.tagId,
        caseIdentifierId: currentSourceScanFile.caseIdentifierId,
        categoryId: currentSourceScanFile.categoryId,
      });
      const nextFiles = [...current.files, createdDocument];

      const currentRelationGraphRecord =
        current.relationGraph &&
        typeof current.relationGraph === 'object' &&
        !Array.isArray(current.relationGraph)
          ? (current.relationGraph as Record<string, unknown>)
          : {};
      const nextRelationNodes = Array.isArray(currentRelationGraphRecord['nodes'])
        ? [...(currentRelationGraphRecord['nodes'] as unknown[])]
        : [];
      const nextRelationEdges = Array.isArray(currentRelationGraphRecord['edges'])
        ? [...(currentRelationGraphRecord['edges'] as unknown[])]
        : [];
      const nextRelationNodeMeta =
        currentRelationGraphRecord['nodeMeta'] &&
        typeof currentRelationGraphRecord['nodeMeta'] === 'object' &&
        !Array.isArray(currentRelationGraphRecord['nodeMeta'])
          ? {
            ...(currentRelationGraphRecord['nodeMeta'] as Record<string, unknown>),
          }
          : {};
      const nextRelationEdgeMeta =
        currentRelationGraphRecord['edgeMeta'] &&
        typeof currentRelationGraphRecord['edgeMeta'] === 'object' &&
        !Array.isArray(currentRelationGraphRecord['edgeMeta'])
          ? {
            ...(currentRelationGraphRecord['edgeMeta'] as Record<string, unknown>),
          }
          : {};

      const ensureRelationNode = (input: {
        nodeId: string;
        file: CaseResolverFile;
      }): void => {
        const hasNode = nextRelationNodes.some((node: unknown): boolean => {
          if (!isObjectRecord(node)) return false;
          return typeof node['id'] === 'string' && node['id'] === input.nodeId;
        });
        if (!hasNode) {
          nextRelationNodes.push({
            id: input.nodeId,
            type: 'prompt',
            title: input.file.name,
            description: `Document file: ${input.file.id}`,
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 0, y: 0 },
            data: {},
            createdAt: input.file.createdAt,
            updatedAt: input.file.updatedAt,
          });
        }
        const existingMeta = isObjectRecord(nextRelationNodeMeta[input.nodeId])
          ? (nextRelationNodeMeta[input.nodeId] as Record<string, unknown>)
          : null;
        const normalizedFolderPath = normalizeFolderPath(input.file.folder ?? '');
        nextRelationNodeMeta[input.nodeId] = {
          entityType: 'custom',
          entityId: input.file.id,
          label: input.file.name,
          fileKind: 'pdf',
          folderPath: normalizedFolderPath.length > 0 ? normalizedFolderPath : null,
          sourceFileId: input.file.id,
          isStructural: false,
          createdAt:
            typeof existingMeta?.['createdAt'] === 'string'
              ? existingMeta['createdAt']
              : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      };

      const sourceNodeId = toCaseResolverRelationCaseFileNodeId(
        currentSourceScanFile.id
      );
      const createdNodeId = toCaseResolverRelationCaseFileNodeId(createdDocument.id);
      ensureRelationNode({
        nodeId: sourceNodeId,
        file: currentSourceScanFile,
      });
      ensureRelationNode({
        nodeId: createdNodeId,
        file: createdDocument,
      });

      const relationEdgeId = `custom:related:file:${encodeURIComponent(currentSourceScanFile.id)}:${encodeURIComponent(createdDocument.id)}`;
      const hasRelationEdge = nextRelationEdges.some((edge: unknown): boolean => {
        if (!isObjectRecord(edge)) return false;
        return typeof edge['id'] === 'string' && edge['id'] === relationEdgeId;
      });
      if (!hasRelationEdge) {
        nextRelationEdges.push({
          id: relationEdgeId,
          from: sourceNodeId,
          to: createdNodeId,
          label: 'derived from OCR',
          fromPort: 'out',
          toPort: 'in',
        });
      }
      const existingEdgeMeta = isObjectRecord(nextRelationEdgeMeta[relationEdgeId])
        ? (nextRelationEdgeMeta[relationEdgeId])
        : null;
      nextRelationEdgeMeta[relationEdgeId] = {
        relationType: 'related',
        label: 'derived from OCR',
        isStructural: false,
        createdAt:
          typeof existingEdgeMeta?.['createdAt'] === 'string'
            ? existingEdgeMeta['createdAt']
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      createdDocumentId = createdDocument.id;
      createdDocumentName = createdDocument.name;

      return {
        ...current,
        files: nextFiles,
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId,
        }),
        relationGraph: buildCaseResolverRelationGraph({
          source: {
            nodes: nextRelationNodes,
            edges: nextRelationEdges,
            nodeMeta: nextRelationNodeMeta,
            edgeMeta: nextRelationEdgeMeta,
          },
          folders: normalizeFolderPaths([...current.folders, folder]),
          files: nextFiles,
          assets: current.assets,
        }),
      };
    }, {
      persistToast: treeSaveToast,
      source: 'case_view_create_document_from_text',
    });

    if (!createdDocumentId) {
      toast('Could not create document.', { variant: 'warning' });
      return;
    }

    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    setSelectedFileId(createdDocumentId);
    toast(
      createdDocumentName
        ? `Created document "${createdDocumentName}".`
        : 'Created document.',
      { variant: 'success' }
    );
  }, [
    activeCaseId,
    setSelectedAssetId,
    setSelectedFileId,
    setSelectedFolderPath,
    toast,
    treeSaveToast,
    updateWorkspace,
    workspace.files,
  ]);

  const handleCreateImageAsset = useCallback((targetFolderPath: string | null): void => {
    const createdAssetId = createId('asset');
    const ownerCaseId = activeCaseId;
    if (!ownerCaseId) {
      toast(
        requestedCaseStatus === 'loading'
          ? 'Case context is still loading. Please wait.'
          : 'Cannot create image placeholder without a selected case.',
        { variant: 'warning' }
      );
      return;
    }
    updateWorkspace((current: CaseResolverWorkspace) => {
      const folder = resolveCaseScopedFolderTarget({
        targetFolderPath,
        ownerCaseId: ownerCaseId,
        folderRecords: current.folderRecords,
      });
      const name = createPlaceholderAssetName({
        assets: current.assets,
        folder,
        baseName: 'New Image',
      });
      const createdAsset = createCaseResolverAssetFile({
        id: createdAssetId,
        name,
        folder,
        kind: 'image',
      });
      return {
        ...current,
        assets: [...current.assets, createdAsset],
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId,
        }),
      };
    }, { persistToast: treeSaveToast });
    toast('Placeholder created.', { variant: 'success' });
  }, [activeCaseId, requestedCaseStatus, toast, treeSaveToast, updateWorkspace]);

  const handleCreateNodeFile = useCallback((targetFolderPath: string | null): void => {
    const ownerCaseId = activeCaseId;
    if (!ownerCaseId) {
      toast(
        requestedCaseStatus === 'loading'
          ? 'Case context is still loading. Please wait.'
          : 'Cannot create node file without a selected case.',
        { variant: 'warning' }
      );
      return;
    }

    let createdAssetId: string | null = null;
    updateWorkspace((current: CaseResolverWorkspace) => {
      const folder = resolveCaseScopedFolderTarget({
        targetFolderPath,
        ownerCaseId: ownerCaseId,
        folderRecords: current.folderRecords,
      });
      const name = createPlaceholderAssetName({
        assets: current.assets,
        folder,
        baseName: 'New Node File',
      });
      const newId = createId('asset');
      const createdAsset = createCaseResolverAssetFile({
        id: newId,
        name,
        folder,
        kind: 'node_file',
        sourceFileId: ownerCaseId,
        textContent: JSON.stringify(
          {
            kind: 'case_resolver_node_file_snapshot_v1',
            source: 'manual',
            nodes: [],
            edges: [],
            nodeFileMeta: {},
          },
          null,
          2
        ),
      });
      createdAssetId = newId;
      return {
        ...current,
        assets: [...current.assets, createdAsset],
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId,
        }),
      };
    }, { persistToast: treeSaveToast });

    if (createdAssetId) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(createdAssetId);
      toast('Node file created.', { variant: 'success' });
    }
  }, [
    activeCaseId,
    requestedCaseStatus,
    setSelectedAssetId,
    setSelectedFileId,
    setSelectedFolderPath,
    toast,
    treeSaveToast,
    updateWorkspace,
  ]);

  return {
    handleCreateScanFile,
    handleCreateDocumentFromText,
    handleCreateImageAsset,
    handleCreateNodeFile,
  };
}
