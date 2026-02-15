'use client';

import { ChevronRight, Eye, EyeOff, FileImage, FileText, FolderOpen, Plus, Trash2, Upload, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverFileViewer } from '@/features/case-resolver/components/CaseResolverFileViewer';
import { CaseResolverFolderTree } from '@/features/case-resolver/components/CaseResolverFolderTree';
import { CaseResolverRichTextEditor } from '@/features/case-resolver/components/CaseResolverRichTextEditor';
import {
  CaseResolverPageProvider,
  type CaseResolverPageContextValue,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AppModal, Button, Input, Label, Textarea, SelectSimple, useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  parseCaseResolverCategories,
  parseCaseResolverTags,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
  renameFolderPath,
  upsertFileGraph,
} from '../settings';

import type {
  CaseResolverAssetFile,
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverFileType,
  CaseResolverGraph,
  CaseResolverPartyReference,
  CaseResolverScanSlot,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const createScanSlot = (name = 'Scan'): CaseResolverScanSlot => ({
  id: createId('scan-slot'),
  name,
  filepath: null,
  sourceFileId: null,
  mimeType: null,
  size: null,
  ocrText: '',
});

const folderBaseName = (path: string): string => {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return '';
  if (!normalized.includes('/')) return normalized;
  return normalized.slice(normalized.lastIndexOf('/') + 1);
};

const isPathWithinFolder = (candidatePath: string, folderPath: string): boolean => (
  candidatePath === folderPath || candidatePath.startsWith(`${folderPath}/`)
);

const createUniqueFolderPath = (existingFolders: string[], targetFolderPath: string | null): string => {
  const parent = normalizeFolderPath(targetFolderPath ?? '');
  const existing = new Set(existingFolders.map((folder: string) => normalizeFolderPath(folder)));
  const baseName = 'new-folder';

  let index = 1;
  while (index < 10000) {
    const candidateName = index === 1 ? baseName : `${baseName}-${index}`;
    const candidatePath = normalizeFolderPath(parent ? `${parent}/${candidateName}` : candidateName);
    if (candidatePath && !existing.has(candidatePath)) {
      return candidatePath;
    }
    index += 1;
  }

  return normalizeFolderPath(parent ? `${parent}/${baseName}-${Date.now()}` : `${baseName}-${Date.now()}`);
};

const promptForName = (label: string, fallback: string): string | null => {
  const result = window.prompt(label, fallback);
  if (!result) return null;
  const normalized = result.trim();
  if (!normalized) return null;
  return normalized;
};

type UploadedCaseResolverAsset = {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string | null;
  size: number | null;
  originalName?: string | null;
  folder?: string | null;
  kind?: string | null;
};

type CaseResolverFileEditDraft = {
  id: string;
  fileType: CaseResolverFileType;
  name: string;
  folder: string;
  documentDate: string;
  documentContent: string;
  scanSlots: CaseResolverScanSlot[];
  addresser: CaseResolverPartyReference | null;
  addressee: CaseResolverPartyReference | null;
  tagId: string | null;
  categoryId: string | null;
};

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';

const buildCombinedOcrText = (slots: CaseResolverScanSlot[]): string => {
  const parts = slots
    .map((slot: CaseResolverScanSlot): string => {
      const text = slot.ocrText.trim();
      if (!text) return '';
      return text;
    })
    .filter((value: string): boolean => value.length > 0);
  return parts.join('\n\n');
};

const formatFileSize = (size: number | null): string => {
  if (size === null || !Number.isFinite(size) || size < 0) return 'Unknown';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeRichTextForPdf = (value: string): string => {
  if (!value.trim()) return '<p></p>';
  if (typeof window === 'undefined') return value;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(value, 'text/html');
  parsed.querySelectorAll('script, iframe, object, embed').forEach((node: Element) => {
    node.remove();
  });
  parsed.querySelectorAll('*').forEach((element: Element) => {
    Array.from(element.attributes).forEach((attribute: Attr) => {
      if (attribute.name.toLowerCase().startsWith('on')) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return parsed.body.innerHTML || '<p></p>';
};

const toLocalDateLabel = (value: string): string => {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return 'Not specified';
  }
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }
  return parsed.toLocaleDateString();
};

const buildDocumentPdfMarkup = ({
  folderPath,
  documentDate,
  addresserLabel,
  addresseeLabel,
  documentContent,
}: {
  folderPath: string;
  documentDate: string;
  addresserLabel: string;
  addresseeLabel: string;
  documentContent: string;
}): string => {
  const normalizedFolder = normalizeFolderPath(folderPath) || '(root)';
  const normalizedDocumentDate = toLocalDateLabel(documentDate);
  const normalizedAddresser = addresserLabel.trim() || 'Not selected';
  const normalizedAddressee = addresseeLabel.trim() || 'Not selected';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Case Resolver Document - PDF Preview</title>
    <style>
      @page {
        size: A4;
        margin: 14mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        background: #e8edf3;
        color: #111827;
        font-family: "Times New Roman", Georgia, serif;
      }

      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 20px auto;
        background: #ffffff;
        box-shadow: 0 0 0 1px #d1d5db, 0 10px 24px rgba(17, 24, 39, 0.16);
        padding: 16mm;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 18px;
      }

      .document-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 14px;
      }

      .document-date {
        font-size: 12px;
        color: #111827;
      }

      .meta-card {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 8px 10px;
      }

      .meta-label {
        color: #6b7280;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .meta-value {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.4;
        color: #111827;
        word-break: break-word;
      }

      .content {
        font-size: 12pt;
        line-height: 1.5;
      }

      .content p {
        margin: 0 0 0.9em 0;
      }

      .content h1,
      .content h2,
      .content h3,
      .content h4 {
        margin: 0.5em 0 0.35em 0;
        line-height: 1.25;
      }

      .content ul,
      .content ol {
        margin: 0 0 1em 1.4em;
        padding: 0;
      }

      .content blockquote {
        margin: 0 0 1em 0;
        padding-left: 12px;
        border-left: 3px solid #9ca3af;
      }

      .content table {
        border-collapse: collapse;
        width: 100%;
        margin: 0 0 1em 0;
      }

      .content th,
      .content td {
        border: 1px solid #d1d5db;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }

      .content img {
        max-width: 100%;
        height: auto;
      }

      @media print {
        body {
          background: #ffffff;
        }

        .sheet {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="document-header">
        <div class="document-date">Date: ${escapeHtml(normalizedDocumentDate)}</div>
      </header>
      <section class="meta">
        <article class="meta-card">
          <div class="meta-label">Folder</div>
          <div class="meta-value">${escapeHtml(normalizedFolder)}</div>
        </article>
        <article class="meta-card">
          <div class="meta-label">Addresser</div>
          <div class="meta-value">${escapeHtml(normalizedAddresser)}</div>
        </article>
        <article class="meta-card">
          <div class="meta-label">Addressee</div>
          <div class="meta-value">${escapeHtml(normalizedAddressee)}</div>
        </article>
      </section>
      <section class="content">${documentContent}</section>
    </main>
  </body>
</html>`;
};

const removeLinkedDocumentFileId = (
  graph: CaseResolverGraph,
  fileId: string
): CaseResolverGraph => {
  const source = graph.documentFileLinksByNode ?? {};
  let changed = false;
  const nextLinks: Record<string, string[]> = {};

  Object.entries(source).forEach(([nodeId, links]: [string, string[]]) => {
    const filtered = links.filter((linkedFileId: string) => linkedFileId !== fileId);
    if (filtered.length !== links.length) {
      changed = true;
    }
    nextLinks[nodeId] = filtered;
  });

  if (!changed) {
    return graph;
  }

  return {
    ...graph,
    documentFileLinksByNode: nextLinks,
  };
};

export function AdminCaseResolverPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { isMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories]
  );
  const filemakerDatabase = useMemo(
    () => parseFilemakerDatabase(rawFilemakerDatabase),
    [rawFilemakerDatabase]
  );
  const filemakerPartyOptions = useMemo(
    () => buildFilemakerPartyOptions(filemakerDatabase),
    [filemakerDatabase]
  );
  const caseResolverTagOptions = useMemo(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: tag.name,
      })),
    [caseResolverTags]
  );
  const caseResolverCategoryOptions = useMemo(() => {
    const byId = new Map<string, CaseResolverCategory>(
      caseResolverCategories.map(
        (category: CaseResolverCategory): [string, CaseResolverCategory] => [category.id, category]
      )
    );
    const resolveDepth = (category: CaseResolverCategory): number => {
      let depth = 0;
      let parentId = category.parentId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        depth += 1;
        parentId = parent.parentId;
      }
      return depth;
    };
    return caseResolverCategories
      .map((category: CaseResolverCategory) => ({
        value: category.id,
        label: `${' '.repeat(resolveDepth(category) * 2)}${category.name}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [caseResolverCategories]);
  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;

  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(parsedWorkspace.activeFileId);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [editingDocumentDraft, setEditingDocumentDraft] = useState<CaseResolverFileEditDraft | null>(null);
  const [isUploadingScanDraftFiles, setIsUploadingScanDraftFiles] = useState(false);
  const [uploadingScanSlotId, setUploadingScanSlotId] = useState<string | null>(null);
  const scanBulkUploadInputRef = useRef<HTMLInputElement | null>(null);
  const scanSlotUploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setWorkspace(parsedWorkspace);
  }, [parsedWorkspace]);

  useEffect(() => {
    if (workspace.activeFileId && workspace.files.some((file) => file.id === workspace.activeFileId)) {
      return;
    }
    setWorkspace((prev: CaseResolverWorkspace) =>
      normalizeCaseResolverWorkspace({
        ...prev,
        activeFileId: prev.files[0]?.id ?? null,
      })
    );
  }, [workspace.activeFileId, workspace.files]);

  useEffect(() => {
    if (!selectedAssetId) return;
    if (workspace.assets.some((asset: CaseResolverAssetFile) => asset.id === selectedAssetId)) return;
    setSelectedAssetId(null);
  }, [selectedAssetId, workspace.assets]);

  useEffect(() => {
    if (!selectedFileId) return;
    if (workspace.files.some((file: CaseResolverFile) => file.id === selectedFileId)) return;
    setSelectedFileId(null);
  }, [selectedFileId, workspace.files]);

  useEffect(() => {
    if (!editingDocumentDraft) return;
    if (workspace.files.some((file: CaseResolverFile) => file.id === editingDocumentDraft.id)) return;
    setEditingDocumentDraft(null);
  }, [editingDocumentDraft, workspace.files]);

  useEffect(() => {
    if (editingDocumentDraft) return;
    setIsUploadingScanDraftFiles(false);
    setUploadingScanSlotId(null);
    scanSlotUploadInputRefs.current = {};
  }, [editingDocumentDraft]);

  const activeFile = useMemo(
    (): CaseResolverFile | null =>
      workspace.activeFileId
        ? workspace.files.find((file: CaseResolverFile) => file.id === workspace.activeFileId) ?? null
        : null,
    [workspace.activeFileId, workspace.files]
  );
  const selectedAsset = useMemo(
    (): CaseResolverAssetFile | null =>
      selectedAssetId
        ? workspace.assets.find((asset: CaseResolverAssetFile) => asset.id === selectedAssetId) ?? null
        : null,
    [selectedAssetId, workspace.assets]
  );
  const isNodeFileSelected = selectedAsset?.kind === 'node_file';
  const shouldShowAssetPreview = Boolean(selectedAsset) && !isNodeFileSelected;
  const canTogglePreviewPage = isNodeFileSelected || Boolean(activeFile);
  const shouldShowPreviewPage = shouldShowAssetPreview || (canTogglePreviewPage && isPreviewPageVisible);

  useEffect(() => {
    if (!isPreviewPageVisible) return;
    if (canTogglePreviewPage || shouldShowAssetPreview) return;
    setIsPreviewPageVisible(false);
  }, [canTogglePreviewPage, isPreviewPageVisible, shouldShowAssetPreview]);

  useEffect(() => {
    if (activeFile) return;
    setIsPartiesModalOpen(false);
  }, [activeFile]);

  const serializedWorkspace = useMemo(
    () => JSON.stringify(workspace),
    [workspace]
  );
  const lastPersistedValueRef = useRef<string>(JSON.stringify(parsedWorkspace));
  const pendingSaveToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (serializedWorkspace === lastPersistedValueRef.current) return;
    const timer = window.setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          await updateSetting.mutateAsync({
            key: CASE_RESOLVER_WORKSPACE_KEY,
            value: serializedWorkspace,
          });
          lastPersistedValueRef.current = serializedWorkspace;
          const pendingToast = pendingSaveToastRef.current;
          if (pendingToast) {
            toast(pendingToast, { variant: 'success' });
            pendingSaveToastRef.current = null;
          }
        } catch (error) {
          pendingSaveToastRef.current = null;
          toast(
            error instanceof Error
              ? error.message
              : 'Failed to save Case Resolver workspace.',
            { variant: 'error' }
          );
        }
      })();
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [serializedWorkspace, toast, updateSetting]);

  const updateWorkspace = useCallback(
    (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
      options?: { persistToast?: string }
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const updated = updater(current);
        if (updated === current) {
          return current;
        }
        if (options?.persistToast) {
          pendingSaveToastRef.current = options.persistToast;
        }
        const next = normalizeCaseResolverWorkspace(updated);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!requestedFileId) return;
    if (!workspace.files.some((file: CaseResolverFile) => file.id === requestedFileId)) return;

    updateWorkspace((current: CaseResolverWorkspace) => {
      if (current.activeFileId === requestedFileId) {
        return current;
      }
      return {
        ...current,
        activeFileId: requestedFileId,
      };
    });
    setSelectedFileId(requestedFileId);
    setSelectedFolderPath((current: string | null) => (current === null ? current : null));
    setSelectedAssetId((current: string | null) => (current === null ? current : null));
  }, [requestedFileId, updateWorkspace, workspace.files]);

  const handleSelectFile = useCallback(
    (fileId: string): void => {
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setSelectedFolderPath(null);
        setSelectedAssetId(null);
        return;
      }

      setSelectedFileId(fileId);
      updateWorkspace((current: CaseResolverWorkspace) => {
        if (current.activeFileId === fileId) {
          return current;
        }
        return {
          ...current,
          activeFileId: fileId,
        };
      });
      setSelectedFolderPath((current: string | null) => (current === null ? current : null));
      setSelectedAssetId((current: string | null) => (current === null ? current : null));
    },
    [selectedFileId, updateWorkspace]
  );

  const handleSelectAsset = useCallback((assetId: string): void => {
    setSelectedFileId(null);
    setSelectedAssetId(assetId);
    setSelectedFolderPath(null);
  }, []);

  const handleSelectFolder = useCallback((folderPath: string | null): void => {
    if (folderPath !== null && selectedFolderPath === folderPath) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
      return;
    }

    setSelectedFileId(null);
    setSelectedFolderPath(folderPath);
    setSelectedAssetId(null);
  }, [selectedFolderPath]);

  const handleCreateFolder = useCallback(
    (targetFolderPath: string | null): void => {
      let createdPath: string | null = null;

      updateWorkspace((current: CaseResolverWorkspace) => {
        const nextPath = createUniqueFolderPath(current.folders, targetFolderPath);
        createdPath = nextPath;
        if (current.folders.includes(nextPath)) return current;
        return {
          ...current,
          folders: normalizeFolderPaths([...current.folders, nextPath]),
        };
      }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
      if (!createdPath) return;
      setSelectedFileId(null);
      setSelectedAssetId(null);
      setSelectedFolderPath(createdPath);
    },
    [updateWorkspace]
  );

  const handleCreateFile = useCallback(
    (targetFolderPath: string | null): void => {
      const fileName = promptForName('Case name', 'New Case');
      if (!fileName) return;
      const folder = normalizeFolderPath(targetFolderPath ?? '');
      const file = createCaseResolverFile({
        id: createId('case-file'),
        fileType: 'document',
        name: fileName,
        folder,
        tagId: defaultTagId,
        categoryId: defaultCategoryId,
      });

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: [...current.files, file],
        activeFileId: file.id,
        folders: normalizeFolderPaths([...current.folders, folder]),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
      setSelectedFileId(file.id);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
    },
    [defaultCategoryId, defaultTagId, updateWorkspace]
  );

  const handleCreateScanFile = useCallback(
    (targetFolderPath: string | null): void => {
      const fileName = promptForName('Scan file name', 'New Scan File');
      if (!fileName) return;
      const folder = normalizeFolderPath(targetFolderPath ?? '');
      const file = createCaseResolverFile({
        id: createId('case-file'),
        fileType: 'scanfile',
        name: fileName,
        folder,
        documentContent: '',
        scanSlots: [],
        tagId: defaultTagId,
        categoryId: defaultCategoryId,
      });

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: [...current.files, file],
        activeFileId: file.id,
        folders: normalizeFolderPaths([...current.folders, folder]),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
      setSelectedFileId(file.id);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
    },
    [defaultCategoryId, defaultTagId, updateWorkspace]
  );

  const handleCreateNodeFile = useCallback(
    (targetFolderPath: string | null): void => {
      const fileName = promptForName('Node file name', 'Node File');
      if (!fileName) return;
      const folder = normalizeFolderPath(targetFolderPath ?? '');
      const asset = createCaseResolverAssetFile({
        id: createId('case-asset'),
        name: fileName,
        folder,
        kind: 'node_file',
        textContent: '',
      });

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: [...current.assets, asset],
        folders: normalizeFolderPaths([...current.folders, folder]),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
      setSelectedFileId(null);
      setSelectedAssetId(asset.id);
      setSelectedFolderPath(null);
    },
    [updateWorkspace]
  );

  const uploadAssetsToServer = useCallback(
    async (files: File[], targetFolderPath: string | null): Promise<CaseResolverAssetFile[]> => {
      if (files.length === 0) return [];
      const folder = normalizeFolderPath(targetFolderPath ?? '');
      const formData = new FormData();
      files.forEach((file: File) => {
        formData.append('files', file);
      });
      formData.append('folder', folder);

      const response = await fetch('/api/case-resolver/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const fallbackMessage = `Upload failed (${response.status})`;
        let detail = fallbackMessage;
        try {
          const payload = await response.json() as { error?: string | { message?: string } };
          if (typeof payload.error === 'string') {
            detail = payload.error;
          } else if (payload.error && typeof payload.error.message === 'string') {
            detail = payload.error.message;
          }
        } catch {
          detail = fallbackMessage;
        }
        throw new Error(detail);
      }

      const payload = await response.json() as UploadedCaseResolverAsset | UploadedCaseResolverAsset[];
      const uploaded = Array.isArray(payload) ? payload : [payload];
      return uploaded.map((entry: UploadedCaseResolverAsset) => {
        const resolvedFolder =
          typeof entry.folder === 'string' && entry.folder.trim().length > 0
            ? entry.folder
            : folder;
        return createCaseResolverAssetFile({
          id: createId('case-asset'),
          name: (entry.originalName ?? '').trim() || entry.filename,
          folder: resolvedFolder,
          kind: entry.kind,
          filepath: entry.filepath,
          sourceFileId: entry.id,
          mimeType: entry.mimetype,
          size: entry.size,
        });
      });
    },
    []
  );

  const handleUploadAssets = useCallback(
    async (files: File[], targetFolderPath: string | null): Promise<CaseResolverAssetFile[]> => {
      try {
        const nextAssets = await uploadAssetsToServer(files, targetFolderPath);
        if (nextAssets.length === 0) return [];

        const uploadedFolders = nextAssets.map((asset: CaseResolverAssetFile) => asset.folder);
        updateWorkspace((current: CaseResolverWorkspace) => ({
          ...current,
          assets: [...current.assets, ...nextAssets],
          folders: normalizeFolderPaths([...current.folders, ...uploadedFolders]),
        }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

        if (nextAssets[0]) {
          setSelectedFileId(null);
          setSelectedAssetId(nextAssets[0].id);
        }
        setSelectedFolderPath(null);
        return nextAssets;
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during asset upload.',
          { variant: 'error' }
        );
        return [];
      }
    },
    [toast, updateWorkspace, uploadAssetsToServer]
  );

  const handleMoveFile = useCallback(
    async (fileId: string, targetFolder: string): Promise<void> => {
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: current.files.map((file: CaseResolverFile) =>
          file.id === fileId
            ? {
              ...file,
              folder: normalizedTarget,
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
        folders: normalizeFolderPaths([...current.folders, normalizedTarget]),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleMoveAsset = useCallback(
    async (assetId: string, targetFolder: string): Promise<void> => {
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: current.assets.map((asset: CaseResolverAssetFile) =>
          asset.id === assetId
            ? {
              ...asset,
              folder: normalizedTarget,
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
        folders: normalizeFolderPaths([...current.folders, normalizedTarget]),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const moveFolderInternal = useCallback(
    (current: CaseResolverWorkspace, sourceFolder: string, targetParent: string): CaseResolverWorkspace => {
      const normalizedSource = normalizeFolderPath(sourceFolder);
      const normalizedTargetParent = normalizeFolderPath(targetParent);
      const baseName = folderBaseName(normalizedSource);
      const destination = normalizeFolderPath(
        normalizedTargetParent ? `${normalizedTargetParent}/${baseName}` : baseName
      );

      if (!normalizedSource || !baseName) return current;
      if (destination === normalizedSource) return current;
      if (destination.startsWith(`${normalizedSource}/`)) return current;

      return {
        ...current,
        folders: normalizeFolderPaths(
          current.folders.map((folder: string) =>
            renameFolderPath(folder, normalizedSource, destination)
          )
        ),
        files: current.files.map((file: CaseResolverFile) => ({
          ...file,
          folder: renameFolderPath(file.folder, normalizedSource, destination),
          updatedAt:
            file.folder === renameFolderPath(file.folder, normalizedSource, destination)
              ? file.updatedAt
              : new Date().toISOString(),
        })),
        assets: current.assets.map((asset: CaseResolverAssetFile) => ({
          ...asset,
          folder: renameFolderPath(asset.folder, normalizedSource, destination),
          updatedAt:
            asset.folder === renameFolderPath(asset.folder, normalizedSource, destination)
              ? asset.updatedAt
              : new Date().toISOString(),
        })),
      };
    },
    []
  );

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      updateWorkspace(
        (current: CaseResolverWorkspace) =>
          moveFolderInternal(current, folderPath, targetFolder),
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
      );
    },
    [moveFolderInternal, updateWorkspace]
  );

  const handleRenameFolder = useCallback(
    async (folderPath: string, nextFolderPath: string): Promise<void> => {
      const normalizedSource = normalizeFolderPath(folderPath);
      const normalizedTarget = normalizeFolderPath(nextFolderPath);
      if (!normalizedSource || !normalizedTarget) return;
      if (normalizedSource === normalizedTarget) return;
      if (normalizedTarget.startsWith(`${normalizedSource}/`)) return;

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        folders: normalizeFolderPaths(
          current.folders.map((folder: string) =>
            renameFolderPath(folder, normalizedSource, normalizedTarget)
          )
        ),
        files: current.files.map((file: CaseResolverFile) => {
          const nextFolder = renameFolderPath(file.folder, normalizedSource, normalizedTarget);
          if (nextFolder === file.folder) return file;
          return {
            ...file,
            folder: nextFolder,
            updatedAt: new Date().toISOString(),
          };
        }),
        assets: current.assets.map((asset: CaseResolverAssetFile) => {
          const nextFolder = renameFolderPath(asset.folder, normalizedSource, normalizedTarget);
          if (nextFolder === asset.folder) return asset;
          return {
            ...asset,
            folder: nextFolder,
            updatedAt: new Date().toISOString(),
          };
        }),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

      if (selectedFolderPath && renameFolderPath(selectedFolderPath, normalizedSource, normalizedTarget) !== selectedFolderPath) {
        setSelectedFolderPath(
          renameFolderPath(selectedFolderPath, normalizedSource, normalizedTarget)
        );
      }
    },
    [selectedFolderPath, updateWorkspace]
  );

  const handleToggleFolderLock = useCallback(
    (folderPath: string): void => {
      const normalizedFolder = normalizeFolderPath(folderPath);
      if (!normalizedFolder) return;

      updateWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace => {
          const filesInFolder = current.files.filter((file: CaseResolverFile): boolean =>
            isPathWithinFolder(file.folder, normalizedFolder)
          );
          if (filesInFolder.length === 0) {
            return current;
          }

          const shouldLockFolder = filesInFolder.some((file: CaseResolverFile): boolean => !file.isLocked);
          const now = new Date().toISOString();
          let hasChanged = false;

          const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
            if (!isPathWithinFolder(file.folder, normalizedFolder)) {
              return file;
            }
            if (file.isLocked === shouldLockFolder) {
              return file;
            }
            hasChanged = true;
            return {
              ...file,
              isLocked: shouldLockFolder,
              updatedAt: now,
            };
          });

          if (!hasChanged) return current;
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
      );
    },
    [updateWorkspace]
  );

  const handleDeleteFolder = useCallback(
    (folderPath: string): void => {
      const normalizedFolder = normalizeFolderPath(folderPath);
      if (!normalizedFolder) return;

      const filesInFolder = workspace.files.filter((file: CaseResolverFile): boolean =>
        isPathWithinFolder(file.folder, normalizedFolder)
      );
      const assetsInFolder = workspace.assets.filter((asset: CaseResolverAssetFile): boolean =>
        isPathWithinFolder(asset.folder, normalizedFolder)
      );

      if (filesInFolder.some((file: CaseResolverFile): boolean => file.isLocked)) {
        toast('Folder contains locked files. Unlock them before removing the folder.', { variant: 'warning' });
        return;
      }

      if (
        typeof window !== 'undefined' &&
        !window.confirm(
          `Delete folder "${normalizedFolder}" and all nested content (${filesInFolder.length} files, ${assetsInFolder.length} assets)?`
        )
      ) {
        return;
      }

      const removedFileIds = new Set(filesInFolder.map((file: CaseResolverFile) => file.id));
      const removedAssetIds = new Set(assetsInFolder.map((asset: CaseResolverAssetFile) => asset.id));
      const now = new Date().toISOString();

      updateWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace => {
          const currentRemovedFileIds = new Set(
            current.files
              .filter((file: CaseResolverFile): boolean => isPathWithinFolder(file.folder, normalizedFolder))
              .map((file: CaseResolverFile) => file.id)
          );
          const nextFilesBase = current.files.filter(
            (file: CaseResolverFile): boolean => !isPathWithinFolder(file.folder, normalizedFolder)
          );

          const nextFiles = nextFilesBase.map((file: CaseResolverFile): CaseResolverFile => {
            let nextGraph = file.graph;
            currentRemovedFileIds.forEach((removedId: string) => {
              nextGraph = removeLinkedDocumentFileId(nextGraph, removedId);
            });
            if (nextGraph === file.graph) {
              return file;
            }
            return {
              ...file,
              graph: nextGraph,
              updatedAt: now,
            };
          });

          return {
            ...current,
            folders: current.folders.filter(
              (path: string): boolean => !isPathWithinFolder(path, normalizedFolder)
            ),
            files: nextFiles,
            assets: current.assets.filter(
              (asset: CaseResolverAssetFile): boolean => !isPathWithinFolder(asset.folder, normalizedFolder)
            ),
            activeFileId:
              current.activeFileId && currentRemovedFileIds.has(current.activeFileId)
                ? (nextFiles[0]?.id ?? null)
                : current.activeFileId,
          };
        },
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
      );

      setSelectedFolderPath((current: string | null) =>
        current && isPathWithinFolder(current, normalizedFolder) ? null : current
      );
      setSelectedFileId((current: string | null) =>
        current && removedFileIds.has(current) ? null : current
      );
      setSelectedAssetId((current: string | null) =>
        current && removedAssetIds.has(current) ? null : current
      );
      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
        current && removedFileIds.has(current.id) ? null : current
      );
    },
    [toast, updateWorkspace, workspace.assets, workspace.files, workspace.folders]
  );

  const handleRenameFile = useCallback(
    async (fileId: string, nextName: string): Promise<void> => {
      const normalizedName = nextName.trim();
      if (!normalizedName) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: current.files.map((file: CaseResolverFile) =>
          file.id === fileId
            ? {
              ...file,
              name: normalizedName,
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleRenameAsset = useCallback(
    async (assetId: string, nextName: string): Promise<void> => {
      const normalizedName = nextName.trim();
      if (!normalizedName) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: current.assets.map((asset: CaseResolverAssetFile) =>
          asset.id === assetId
            ? {
              ...asset,
              name: normalizedName,
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleOpenFileEditor = useCallback(
    (fileId: string): void => {
      try {
        const target = workspace.files.find((file: CaseResolverFile) => file.id === fileId);
        if (!target) {
          toast('File not found.', { variant: 'warning' });
          return;
        }

        setEditingDocumentDraft({
          id: target.id,
          fileType: target.fileType,
          name: target.name,
          folder: target.folder,
          documentDate: target.documentDate,
          documentContent: target.documentContent,
          scanSlots: target.scanSlots,
          addresser: target.addresser,
          addressee: target.addressee,
          tagId: target.tagId,
          categoryId: target.categoryId,
        });
        setSelectedFileId(fileId);
        setSelectedAssetId(null);
        setSelectedFolderPath(null);
        updateWorkspace((current: CaseResolverWorkspace) => {
          if (current.activeFileId === fileId) {
            return current;
          }
          return {
            ...current,
            activeFileId: fileId,
          };
        });
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : 'An unknown error occurred while opening the file editor.',
          { variant: 'error' }
        );
      }
    },
    [toast, updateWorkspace, workspace.files]
  );

  const handleCloseFileEditor = useCallback((): void => {
    setEditingDocumentDraft(null);
  }, []);

  const handleAddScanSlotToDraft = useCallback((): void => {
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
      if (current?.fileType !== 'scanfile') return current;
      return {
        ...current,
        scanSlots: [
          ...current.scanSlots,
          createScanSlot(`Scan ${current.scanSlots.length + 1}`),
        ],
      };
    });
  }, []);

  const handleRemoveScanSlotFromDraft = useCallback((slotId: string): void => {
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
      if (current?.fileType !== 'scanfile') return current;
      return {
        ...current,
        scanSlots: current.scanSlots.filter((slot: CaseResolverScanSlot): boolean => slot.id !== slotId),
      };
    });
  }, []);

  const handlePopulateCombinedOcrFromSlots = useCallback((): void => {
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
      if (current?.fileType !== 'scanfile') return current;
      return {
        ...current,
        documentContent: buildCombinedOcrText(current.scanSlots),
      };
    });
  }, []);

  const handleUploadScanFilesToDraft = useCallback(
    async (files: File[], options?: { slotId?: string }): Promise<void> => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (files.length === 0) return;

      const requestedSlotId = options?.slotId ?? null;
      const normalizedFolder = normalizeFolderPath(
        editingDocumentDraft.folder ? `${editingDocumentDraft.folder}/scans` : 'scans'
      );

      setIsUploadingScanDraftFiles(true);
      setUploadingScanSlotId(requestedSlotId);
      try {
        const uploadSet = requestedSlotId ? [files[0] as File] : files;
        const uploadedAssets = await uploadAssetsToServer(uploadSet, normalizedFolder);
        if (uploadedAssets.length === 0) return;

        setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
          if (current?.fileType !== 'scanfile') return current;

          if (requestedSlotId) {
            const first = uploadedAssets[0];
            if (!first) return current;
            return {
              ...current,
              scanSlots: current.scanSlots.map((slot: CaseResolverScanSlot): CaseResolverScanSlot => {
                if (slot.id !== requestedSlotId) return slot;
                return {
                  ...slot,
                  name: first.name,
                  filepath: first.filepath,
                  sourceFileId: first.sourceFileId,
                  mimeType: first.mimeType,
                  size: first.size,
                };
              }),
            };
          }

          const appendedSlots = uploadedAssets.map((asset: CaseResolverAssetFile, index: number): CaseResolverScanSlot => ({
            ...createScanSlot(asset.name || `Scan ${current.scanSlots.length + index + 1}`),
            name: asset.name,
            filepath: asset.filepath,
            sourceFileId: asset.sourceFileId,
            mimeType: asset.mimeType,
            size: asset.size,
          }));
          return {
            ...current,
            scanSlots: [...current.scanSlots, ...appendedSlots],
          };
        });
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : 'Failed to upload scan files.',
          { variant: 'error' }
        );
      } finally {
        setUploadingScanSlotId(null);
        setIsUploadingScanDraftFiles(false);
      }
    },
    [editingDocumentDraft, toast, uploadAssetsToServer]
  );

  const buildPdfMarkupFromDraft = useCallback(
    (draft: CaseResolverFileEditDraft): string => {
      const addresserLabel =
        resolveFilemakerPartyLabel(filemakerDatabase, draft.addresser) ?? 'Not selected';
      const addresseeLabel =
        resolveFilemakerPartyLabel(filemakerDatabase, draft.addressee) ?? 'Not selected';
      return buildDocumentPdfMarkup({
        folderPath: draft.folder,
        documentDate: draft.documentDate,
        addresserLabel,
        addresseeLabel,
        documentContent: sanitizeRichTextForPdf(draft.documentContent),
      });
    },
    [filemakerDatabase]
  );

  const openPdfWindow = useCallback(
    (pdfMarkup: string, options?: { autoPrint?: boolean }): void => {
      const previewWindow = window.open('', '_blank', 'width=1100,height=900');
      if (!previewWindow) {
        toast('Failed to open PDF window. Please allow popups for this site.', { variant: 'error' });
        return;
      }

      previewWindow.document.open();
      previewWindow.document.write(pdfMarkup);
      previewWindow.document.close();

      if (!options?.autoPrint) {
        return;
      }

      const triggerPrint = (): void => {
        previewWindow.focus();
        previewWindow.print();
      };
      if (previewWindow.document.readyState === 'complete') {
        window.setTimeout(triggerPrint, 120);
      } else {
        previewWindow.addEventListener('load', (): void => {
          window.setTimeout(triggerPrint, 120);
        }, { once: true });
      }
    },
    [toast]
  );

  const handlePreviewPdf = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'document') return;
    openPdfWindow(buildPdfMarkupFromDraft(editingDocumentDraft));
  }, [buildPdfMarkupFromDraft, editingDocumentDraft, openPdfWindow]);

  const handleExportPdf = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'document') return;
    openPdfWindow(buildPdfMarkupFromDraft(editingDocumentDraft), { autoPrint: true });
  }, [buildPdfMarkupFromDraft, editingDocumentDraft, openPdfWindow]);

  const handleToggleFileLock = useCallback(
    (fileId: string): void => {
      updateWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace => {
          let hasChanged = false;
          const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
            if (file.id !== fileId) return file;
            hasChanged = true;
            return {
              ...file,
              isLocked: !file.isLocked,
              updatedAt: new Date().toISOString(),
            };
          });
          if (!hasChanged) return current;
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
      );
    },
    [updateWorkspace]
  );

  const handleDeleteFile = useCallback(
    (fileId: string): void => {
      const target = workspace.files.find((file: CaseResolverFile) => file.id === fileId);
      if (!target) return;
      if (target.isLocked) {
        toast('File is locked. Unlock it before removing.', { variant: 'warning' });
        return;
      }

      updateWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace => {
          let hasChanged = false;
          const nextFiles = current.files
            .filter((file: CaseResolverFile): boolean => {
              if (file.id === fileId) {
                hasChanged = true;
                return false;
              }
              return true;
            })
            .map((file: CaseResolverFile): CaseResolverFile => {
              const nextGraph = removeLinkedDocumentFileId(file.graph, fileId);
              if (nextGraph === file.graph) {
                return file;
              }
              return {
                ...file,
                graph: nextGraph,
                updatedAt: new Date().toISOString(),
              };
            });

          if (!hasChanged) return current;

          return {
            ...current,
            files: nextFiles,
            activeFileId:
              current.activeFileId === fileId
                ? (nextFiles[0]?.id ?? null)
                : current.activeFileId,
          };
        },
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
      );

      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
        current?.id === fileId ? null : current
      );
      setSelectedFileId((current: string | null) => (current === fileId ? null : current));
    },
    [toast, updateWorkspace, workspace.files]
  );

  const handleSaveFileEditor = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const normalizedName = editingDocumentDraft.name.trim();
    if (!normalizedName) {
      toast('Document name is required.', { variant: 'error' });
      return;
    }
    const normalizedTagId =
      editingDocumentDraft.tagId && caseResolverTags.some((tag: CaseResolverTag) => tag.id === editingDocumentDraft.tagId)
        ? editingDocumentDraft.tagId
        : null;
    const normalizedCategoryId =
      editingDocumentDraft.categoryId &&
      caseResolverCategories.some((category: CaseResolverCategory) => category.id === editingDocumentDraft.categoryId)
        ? editingDocumentDraft.categoryId
        : null;
    if (caseResolverTags.length > 0 && !normalizedTagId) {
      toast('Select a document tag.', { variant: 'error' });
      return;
    }
    if (caseResolverCategories.length > 0 && !normalizedCategoryId) {
      toast('Select a document category.', { variant: 'error' });
      return;
    }
    const normalizedFolder = normalizeFolderPath(editingDocumentDraft.folder);
    const now = new Date().toISOString();

    updateWorkspace(
      (current: CaseResolverWorkspace): CaseResolverWorkspace => ({
        ...current,
        files: current.files.map((file: CaseResolverFile): CaseResolverFile =>
          file.id === editingDocumentDraft.id
            ? {
              ...file,
              name: normalizedName,
              fileType: editingDocumentDraft.fileType,
              folder: normalizedFolder,
              documentDate: editingDocumentDraft.documentDate,
              documentContent: editingDocumentDraft.documentContent,
              scanSlots:
                editingDocumentDraft.fileType === 'scanfile'
                  ? editingDocumentDraft.scanSlots
                  : [],
              addresser: editingDocumentDraft.addresser,
              addressee: editingDocumentDraft.addressee,
              tagId: normalizedTagId,
              categoryId: normalizedCategoryId,
              updatedAt: now,
            }
            : file
        ),
        folders: normalizeFolderPaths([...current.folders, normalizedFolder]),
      }),
      { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
    );

    setEditingDocumentDraft(null);
  }, [caseResolverCategories, caseResolverTags, editingDocumentDraft, toast, updateWorkspace]);

  const handleUpdateSelectedAsset = useCallback(
    (patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>): void => {
      if (!selectedAssetId) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: current.assets.map((asset: CaseResolverAssetFile) =>
          asset.id === selectedAssetId
            ? {
              ...asset,
              ...(typeof patch.textContent === 'string' ? { textContent: patch.textContent } : {}),
              ...(typeof patch.description === 'string' ? { description: patch.description } : {}),
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
      }));
    },
    [selectedAssetId, updateWorkspace]
  );

  const handleGraphChange = useCallback(
    (nextGraph: CaseResolverGraph): void => {
      if (!activeFile) return;
      updateWorkspace((current: CaseResolverWorkspace) =>
        upsertFileGraph(current, activeFile.id, nextGraph)
      );
    },
    [activeFile, updateWorkspace]
  );

  const handleUpdateActiveFileParties = useCallback(
    (patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee'>>): void => {
      if (!activeFile) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: current.files.map((file: CaseResolverFile) =>
          file.id === activeFile.id
            ? {
              ...file,
              ...(patch.addresser !== undefined ? { addresser: patch.addresser } : {}),
              ...(patch.addressee !== undefined ? { addressee: patch.addressee } : {}),
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
      }));
    },
    [activeFile, updateWorkspace]
  );

  const caseResolverPageContextValue: CaseResolverPageContextValue = {
    workspace,
    selectedFileId: selectedAssetId ? null : selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    panelCollapsed: folderPanelCollapsed,
    onPanelCollapsedChange: setFolderPanelCollapsed,
    onSelectFile: handleSelectFile,
    onSelectAsset: handleSelectAsset,
    onSelectFolder: handleSelectFolder,
    onCreateFolder: handleCreateFolder,
    onCreateFile: handleCreateFile,
    onCreateScanFile: handleCreateScanFile,
    onCreateNodeFile: handleCreateNodeFile,
    onUploadAssets: handleUploadAssets,
    onMoveFile: handleMoveFile,
    onMoveAsset: handleMoveAsset,
    onMoveFolder: handleMoveFolder,
    onRenameFile: handleRenameFile,
    onRenameAsset: handleRenameAsset,
    onRenameFolder: handleRenameFolder,
    onDeleteFolder: handleDeleteFolder,
    onToggleFolderLock: handleToggleFolderLock,
    onDeleteFile: handleDeleteFile,
    onToggleFileLock: handleToggleFileLock,
    onEditFile: handleOpenFileEditor,
    activeFile,
    selectedAsset,
    onUpdateSelectedAsset: handleUpdateSelectedAsset,
    onGraphChange: handleGraphChange,
  };

  return (
    <CaseResolverPageProvider value={caseResolverPageContextValue}>
      <div className='w-full space-y-4'>
        <div
          className={`grid gap-4 ${
            folderPanelCollapsed
              ? 'grid-cols-1'
              : isMenuCollapsed
                ? 'lg:grid-cols-[320px_minmax(0,1fr)]'
                : 'lg:grid-cols-[360px_minmax(0,1fr)]'
          }`}
        >
          {!folderPanelCollapsed ? (
            <div className='min-h-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
              <CaseResolverFolderTree />
            </div>
          ) : null}

          <div className='min-h-0 w-full'>
            {folderPanelCollapsed || canTogglePreviewPage ? (
              <div className='mb-2 flex flex-wrap items-center gap-2'>
                {folderPanelCollapsed ? (
                  <Button
                    type='button'
                    onClick={(): void => setFolderPanelCollapsed(false)}
                    className='h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
                  >
                    <FolderOpen className='mr-1 size-3.5' />
                  Show Case Tree
                    <ChevronRight className='ml-1 size-3.5 -scale-x-100' />
                  </Button>
                ) : null}
                {canTogglePreviewPage ? (
                  <Button
                    type='button'
                    onClick={(): void => setIsPreviewPageVisible((current) => !current)}
                    title={shouldShowPreviewPage && !shouldShowAssetPreview ? 'Return to editor' : 'Show preview page'}
                    aria-label={shouldShowPreviewPage && !shouldShowAssetPreview ? 'Return to editor' : 'Show preview page'}
                    className='h-8 w-8 rounded-md border border-border px-0 text-gray-200 hover:bg-muted/60'
                  >
                    {shouldShowPreviewPage && !shouldShowAssetPreview ? (
                      <EyeOff className='size-3.5' />
                    ) : (
                      <Eye className='size-3.5' />
                    )}
                  </Button>
                ) : null}
                {activeFile ? (
                  <Button
                    type='button'
                    onClick={(): void => {
                      setIsPreviewPageVisible(false);
                      handleOpenFileEditor(activeFile.id);
                    }}
                    title={activeFile.fileType === 'scanfile' ? 'Open scan editor' : 'Open document editor'}
                    aria-label={activeFile.fileType === 'scanfile' ? 'Open scan editor' : 'Open document editor'}
                    className='h-8 w-8 rounded-md border border-border px-0 text-gray-200 hover:bg-muted/60'
                  >
                    {activeFile.fileType === 'scanfile' ? (
                      <FileImage className='size-3.5' />
                    ) : (
                      <FileText className='size-3.5' />
                    )}
                  </Button>
                ) : null}
                {activeFile ? (
                  <Button
                    type='button'
                    onClick={(): void => {
                      setIsPartiesModalOpen(true);
                    }}
                    className='h-8 rounded-md border border-border px-2 text-xs text-gray-200 hover:bg-muted/60'
                  >
                    <Users className='mr-1 size-3.5' />
                  Parties
                  </Button>
                ) : null}
              </div>
            ) : null}

            {selectedAsset && isNodeFileSelected && !shouldShowPreviewPage ? (
              <div className='mb-3 space-y-3 rounded-lg border border-border/60 bg-card/35 p-4'>
                <div className='space-y-1'>
                  <div className='text-sm font-semibold text-white'>Asset Editor</div>
                  <div className='text-[11px] text-gray-400'>
                  Edit reusable node-file text. Dropping this asset as WYSIWYG Text Node will use this content.
                  </div>
                </div>

                <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Asset</span>
                    <span className='font-medium text-gray-100'>{selectedAsset.name}</span>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Kind</span>
                    <span className='uppercase text-[10px] text-gray-200'>{selectedAsset.kind}</span>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Folder</span>
                    <span className='font-mono text-[10px] text-gray-300'>
                      {selectedAsset.folder || '(root)'}
                    </span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Description</Label>
                  <Textarea
                    value={selectedAsset.description}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                      handleUpdateSelectedAsset({ description: event.target.value });
                    }}
                    className='min-h-[72px] border-border bg-card/60 text-xs text-white'
                    placeholder='Optional description to keep file context.'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Node File Text (WYSIWYG)</Label>
                  <CaseResolverRichTextEditor
                    value={selectedAsset.textContent}
                    onChange={(nextValue: string): void => {
                      handleUpdateSelectedAsset({ textContent: nextValue });
                    }}
                    placeholder='Write reusable prompt fragments in this node file...'
                  />
                </div>
              </div>
            ) : null}

            {shouldShowPreviewPage ? (
              <CaseResolverFileViewer />
            ) : activeFile ? (
              activeFile.fileType === 'scanfile' ? (
                <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-4'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='text-sm font-semibold text-white'>Scan File Workspace</div>
                      <div className='text-[11px] text-gray-400'>
                        Manage scanned image slots and OCR fragments in the editor.
                      </div>
                    </div>
                    <Button
                      type='button'
                      onClick={(): void => {
                        handleOpenFileEditor(activeFile.id);
                      }}
                      className='h-8 border border-white/20 text-xs'
                    >
                      <FileImage className='mr-1.5 size-3.5' />
                      Open Scan Editor
                    </Button>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs text-gray-400'>Combined OCR Text</Label>
                    <Textarea
                      value={activeFile.documentContent}
                      readOnly
                      className='min-h-[140px] border-border bg-card/60 text-xs text-white'
                      placeholder='No combined OCR text yet.'
                    />
                  </div>
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                    {activeFile.scanSlots.map((slot: CaseResolverScanSlot) => (
                      <div key={slot.id} className='space-y-1 rounded border border-border/60 bg-card/30 p-2'>
                        <div className='text-[11px] font-medium text-gray-200'>{slot.name}</div>
                        <div className='aspect-[4/3] overflow-hidden rounded border border-border/60 bg-card/20'>
                          {slot.filepath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={slot.filepath}
                              alt={slot.name}
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div className='flex h-full items-center justify-center px-2 text-[11px] text-gray-500'>
                              No image
                            </div>
                          )}
                        </div>
                        <div className='line-clamp-4 whitespace-pre-wrap text-[11px] text-gray-400'>
                          {slot.ocrText.trim() || 'OCR text empty.'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <CaseResolverCanvasWorkspace />
              )
            ) : (
              <CaseResolverFileViewer />
            )}
          </div>
        </div>

        <AppModal
          open={isPartiesModalOpen && Boolean(activeFile)}
          onOpenChange={(open: boolean): void => {
            setIsPartiesModalOpen(open);
          }}
          title='Case Parties'
          subtitle='Manage addresser and addressee for the active case.'
          size='lg'
        >
          {activeFile ? (
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Addresser</Label>
                <SelectSimple size='sm'
                  value={encodeFilemakerPartyReference(activeFile.addresser)}
                  onValueChange={(value: string): void => {
                    handleUpdateActiveFileParties({
                      addresser: decodeFilemakerPartyReference(value),
                    });
                  }}
                  options={filemakerPartyOptions}
                  placeholder='Select addresser'
                  triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                />
                <div className='text-[11px] text-gray-500'>
                  {resolveFilemakerPartyLabel(filemakerDatabase, activeFile.addresser) ?? 'No addresser selected.'}
                </div>
              </div>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Addressee</Label>
                <SelectSimple size='sm'
                  value={encodeFilemakerPartyReference(activeFile.addressee)}
                  onValueChange={(value: string): void => {
                    handleUpdateActiveFileParties({
                      addressee: decodeFilemakerPartyReference(value),
                    });
                  }}
                  options={filemakerPartyOptions}
                  placeholder='Select addressee'
                  triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                />
                <div className='text-[11px] text-gray-500'>
                  {resolveFilemakerPartyLabel(filemakerDatabase, activeFile.addressee) ?? 'No addressee selected.'}
                </div>
              </div>
            </div>
          ) : null}
        </AppModal>

        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open: boolean): void => {
            if (!open) {
              handleCloseFileEditor();
            }
          }}
          title={editingDocumentDraft?.fileType === 'scanfile' ? 'Edit Scan File' : 'Edit Document File'}
          header={(
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-4'>
                <Button
                  type='button'
                  onClick={handleSaveFileEditor}
                  className='min-w-[100px] border border-white/20 hover:border-white/40'
                >
                  Save
                </Button>
                <h2 className='text-2xl font-bold text-white'>
                  {editingDocumentDraft?.fileType === 'scanfile' ? 'Edit Scan File' : 'Edit Document File'}
                </h2>
              </div>
              <div className='flex items-center gap-2'>
                {editingDocumentDraft?.fileType === 'document' ? (
                  <>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handlePreviewPdf}
                      className='min-w-[120px] border border-white/20 hover:border-white/40'
                    >
                      Preview PDF
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleExportPdf}
                      className='min-w-[120px] border border-white/20 hover:border-white/40'
                    >
                      Export to PDF
                    </Button>
                  </>
                ) : null}
                <Button
                  type='button'
                  onClick={handleCloseFileEditor}
                  className='min-w-[100px] border border-white/20 hover:border-white/40'
                >
                  Close
                </Button>
              </div>
            </div>
          )}
          size='xl'
          className='md:min-w-[63rem] max-w-[66rem]'
        >
          {editingDocumentDraft ? (
            <div className='space-y-4'>
              <div className='grid gap-3 md:grid-cols-4'>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Document Name</Label>
                  <Input
                    value={editingDocumentDraft.name}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const nextName = event.target.value;
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            name: nextName,
                          }
                          : current
                      );
                    }}
                    className='h-9 border-border bg-card/60 text-sm text-white'
                    placeholder='Document name'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Folder</Label>
                  <Input
                    value={editingDocumentDraft.folder}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const nextFolder = event.target.value;
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            folder: nextFolder,
                          }
                          : current
                      );
                    }}
                    className='h-9 border-border bg-card/60 text-sm text-white'
                    placeholder='Folder (optional)'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>File Type</Label>
                  <SelectSimple size='sm'
                    value={editingDocumentDraft.fileType}
                    onValueChange={(value: string): void => {
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            fileType: value === 'scanfile' ? 'scanfile' : 'document',
                            scanSlots:
                              value === 'scanfile'
                                ? current.scanSlots
                                : [],
                          }
                          : current
                      );
                    }}
                    options={[
                      { value: 'document', label: 'Document' },
                      { value: 'scanfile', label: 'Scan File' },
                    ]}
                    placeholder='Select file type'
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Document Date</Label>
                  <Input
                    type='date'
                    value={editingDocumentDraft.documentDate}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const nextDate = event.target.value;
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            documentDate: nextDate,
                          }
                          : current
                      );
                    }}
                    className='h-9 border-border bg-card/60 text-sm text-white'
                  />
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <Label className='text-xs text-gray-400'>Document Tag</Label>
                    <Link href='/admin/case-resolver/tags' className='text-[11px] text-gray-400 hover:text-white'>
                      Manage Tags
                    </Link>
                  </div>
                  <SelectSimple size='sm'
                    value={editingDocumentDraft.tagId ?? '__none__'}
                    onValueChange={(value: string): void => {
                      const nextTagId = value === '__none__' ? null : value;
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            tagId: nextTagId,
                          }
                          : current
                      );
                    }}
                    options={[
                      { value: '__none__', label: caseResolverTags.length > 0 ? 'Select tag' : 'No tags configured' },
                      ...caseResolverTagOptions,
                    ]}
                    placeholder='Select tag'
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
                  />
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <Label className='text-xs text-gray-400'>Document Category</Label>
                    <Link href='/admin/case-resolver/categories' className='text-[11px] text-gray-400 hover:text-white'>
                      Manage Categories
                    </Link>
                  </div>
                  <SelectSimple size='sm'
                    value={editingDocumentDraft.categoryId ?? '__none__'}
                    onValueChange={(value: string): void => {
                      const nextCategoryId = value === '__none__' ? null : value;
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            categoryId: nextCategoryId,
                          }
                          : current
                      );
                    }}
                    options={[
                      { value: '__none__', label: caseResolverCategories.length > 0 ? 'Select category' : 'No categories configured' },
                      ...caseResolverCategoryOptions,
                    ]}
                    placeholder='Select category'
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
                  />
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Addresser</Label>
                  <SelectSimple size='sm'
                    value={encodeFilemakerPartyReference(editingDocumentDraft.addresser)}
                    onValueChange={(value: string): void => {
                      const nextAddresser = decodeFilemakerPartyReference(value);
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            addresser: nextAddresser,
                          }
                          : current
                      );
                    }}
                    options={filemakerPartyOptions}
                    placeholder='Select addresser'
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Addressee</Label>
                  <SelectSimple size='sm'
                    value={encodeFilemakerPartyReference(editingDocumentDraft.addressee)}
                    onValueChange={(value: string): void => {
                      const nextAddressee = decodeFilemakerPartyReference(value);
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            addressee: nextAddressee,
                          }
                          : current
                      );
                    }}
                    options={filemakerPartyOptions}
                    placeholder='Select addressee'
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
                  />
                </div>
              </div>

              {editingDocumentDraft.fileType === 'document' ? (
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Document Content (WYSIWYG)</Label>
                  <CaseResolverRichTextEditor
                    value={editingDocumentDraft.documentContent}
                    onChange={(nextValue: string): void => {
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            documentContent: nextValue,
                          }
                          : current
                      );
                    }}
                    placeholder='Write or edit this document with rich text formatting...'
                  />
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <Label className='text-xs text-gray-400'>Combined OCR Text</Label>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 border-white/20 px-2 text-xs text-gray-200 hover:border-white/40'
                        onClick={handlePopulateCombinedOcrFromSlots}
                      >
                        Populate From OCR Fragments
                      </Button>
                    </div>
                    <Textarea
                      value={editingDocumentDraft.documentContent}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                        const nextValue = event.target.value;
                        setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                          current
                            ? {
                              ...current,
                              documentContent: nextValue,
                            }
                            : current
                        );
                      }}
                      className='min-h-[150px] border-border bg-card/60 text-xs text-white'
                      placeholder='Combined OCR text from scan fragments...'
                    />
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 border-white/20 px-2 text-xs text-gray-200 hover:border-white/40'
                      onClick={handleAddScanSlotToDraft}
                    >
                      <Plus className='mr-1.5 size-3.5' />
                      Add Slot
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 border-white/20 px-2 text-xs text-gray-200 hover:border-white/40 disabled:opacity-60'
                      onClick={(): void => {
                        scanBulkUploadInputRef.current?.click();
                      }}
                      disabled={isUploadingScanDraftFiles}
                    >
                      <Upload className='mr-1.5 size-3.5' />
                      Upload Scans
                    </Button>
                    <input
                      ref={scanBulkUploadInputRef}
                      type='file'
                      accept='image/*,application/pdf'
                      multiple
                      className='hidden'
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';
                        if (files.length === 0) return;
                        void handleUploadScanFilesToDraft(files);
                      }}
                    />
                  </div>

                  {editingDocumentDraft.scanSlots.length === 0 ? (
                    <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-center text-xs text-gray-400'>
                      No scan slots yet. Add a slot or upload scans.
                    </div>
                  ) : (
                    <div className='grid gap-3 md:grid-cols-2'>
                      {editingDocumentDraft.scanSlots.map((slot: CaseResolverScanSlot) => (
                        <div key={slot.id} className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
                          <div className='flex items-center justify-between gap-2'>
                            <div className='truncate text-xs font-semibold text-gray-200'>{slot.name}</div>
                            <div className='flex items-center gap-1'>
                              <Button
                                type='button'
                                variant='outline'
                                className='h-7 border-white/20 px-2 text-[11px] text-gray-200 hover:border-white/40 disabled:opacity-60'
                                onClick={(): void => {
                                  scanSlotUploadInputRefs.current[slot.id]?.click();
                                }}
                                disabled={isUploadingScanDraftFiles}
                              >
                                <Upload className='mr-1 size-3' />
                                {uploadingScanSlotId === slot.id ? 'Uploading...' : 'Upload'}
                              </Button>
                              <Button
                                type='button'
                                variant='outline'
                                className='h-7 border-red-400/40 px-2 text-[11px] text-red-200 hover:border-red-300/60'
                                onClick={(): void => {
                                  handleRemoveScanSlotFromDraft(slot.id);
                                }}
                              >
                                <Trash2 className='mr-1 size-3' />
                                Remove
                              </Button>
                            </div>
                          </div>
                          <input
                            ref={(node: HTMLInputElement | null): void => {
                              scanSlotUploadInputRefs.current[slot.id] = node;
                            }}
                            type='file'
                            accept='image/*,application/pdf'
                            className='hidden'
                            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                              const files = Array.from(event.target.files ?? []);
                              event.target.value = '';
                              if (files.length === 0) return;
                              void handleUploadScanFilesToDraft(files, { slotId: slot.id });
                            }}
                          />
                          <div className='aspect-[4/3] overflow-hidden rounded border border-border/60 bg-card/20'>
                            {slot.filepath && (slot.mimeType ?? '').startsWith('image/') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={slot.filepath}
                                alt={slot.name}
                                className='h-full w-full object-cover'
                              />
                            ) : slot.filepath ? (
                              <div className='flex h-full items-center justify-center px-2 text-[11px] text-gray-400'>
                                File uploaded (preview unavailable)
                              </div>
                            ) : (
                              <div className='flex h-full items-center justify-center px-2 text-[11px] text-gray-500'>
                                No file uploaded
                              </div>
                            )}
                          </div>
                          <div className='text-[11px] text-gray-500'>
                            {(slot.mimeType ?? 'Unknown')} | {formatFileSize(slot.size)}
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs text-gray-400'>OCR Text</Label>
                            <Textarea
                              value={slot.ocrText}
                              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                                const nextText = event.target.value;
                                setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
                                  if (current?.fileType !== 'scanfile') return current;
                                  return {
                                    ...current,
                                    scanSlots: current.scanSlots.map((entry: CaseResolverScanSlot) =>
                                      entry.id === slot.id
                                        ? {
                                          ...entry,
                                          ocrText: nextText,
                                        }
                                        : entry
                                    ),
                                  };
                                });
                              }}
                              className='min-h-[120px] border-border bg-card/60 text-xs text-white'
                              placeholder='OCR content for this scanned file...'
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </AppModal>
      </div>
    </CaseResolverPageProvider>
  );
}
