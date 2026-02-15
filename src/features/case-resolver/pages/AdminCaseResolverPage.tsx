'use client';

import { Check, ChevronDown, Eye, EyeOff, FileImage, FileText, Link2, Plus, Trash2, Upload, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverDocumentSearchPage } from '@/features/case-resolver/components/CaseResolverDocumentSearchPage';
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
import {
  consumePromptExploderApplyPromptForCaseResolver,
  savePromptExploderDraftPromptFromCaseResolver,
} from '@/features/prompt-exploder/bridge';
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
  CaseResolverDocumentVersion,
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

const createUniqueDocumentName = (existingFiles: CaseResolverFile[], baseName: string): string => {
  const normalizedBase = baseName.trim() || 'Exploded Document';
  const existingNames = new Set(
    existingFiles.map((file: CaseResolverFile): string => file.name.trim().toLowerCase())
  );
  if (!existingNames.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }

  let index = 2;
  while (index < 10000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }

  return `${normalizedBase} ${Date.now()}`;
};

type CaseResolverTagPickerOption = {
  id: string;
  label: string;
  pathIds: string[];
  pathNames: string[];
  searchLabel: string;
};

const buildCaseResolverTagPickerOptions = (
  tags: CaseResolverTag[]
): CaseResolverTagPickerOption[] => {
  const byId = new Map<string, CaseResolverTag>(
    tags.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const cache = new Map<string, { ids: string[]; names: string[] }>();

  const resolvePath = (tagId: string, trail: Set<string>): { ids: string[]; names: string[] } => {
    const cached = cache.get(tagId);
    if (cached) return cached;
    const tag = byId.get(tagId);
    if (!tag) return { ids: [], names: [] };
    if (trail.has(tagId)) {
      const fallback = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, fallback);
      return fallback;
    }
    if (!tag.parentId || !byId.has(tag.parentId)) {
      const rootPath = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, rootPath);
      return rootPath;
    }
    const nextTrail = new Set(trail);
    nextTrail.add(tagId);
    const parentPath = resolvePath(tag.parentId, nextTrail);
    const path = {
      ids: [...parentPath.ids, tag.id],
      names: [...parentPath.names, tag.name],
    };
    cache.set(tagId, path);
    return path;
  };

  return tags
    .map((tag: CaseResolverTag): CaseResolverTagPickerOption => {
      const path = resolvePath(tag.id, new Set<string>());
      const label = path.names.join(' / ');
      return {
        id: tag.id,
        label,
        pathIds: path.ids,
        pathNames: path.names,
        searchLabel: label.toLowerCase(),
      };
    })
    .sort((left: CaseResolverTagPickerOption, right: CaseResolverTagPickerOption) =>
      left.label.localeCompare(right.label)
    );
};

const toActiveDocumentContent = ({
  activeDocumentVersion,
  originalDocumentContent,
  explodedDocumentContent,
}: {
  activeDocumentVersion: CaseResolverDocumentVersion;
  originalDocumentContent: string;
  explodedDocumentContent: string;
}): string =>
  activeDocumentVersion === 'exploded' && explodedDocumentContent.trim().length > 0
    ? explodedDocumentContent
    : originalDocumentContent;

const buildFileEditDraft = (file: CaseResolverFile): CaseResolverFileEditDraft => {
  const originalDocumentContent = file.originalDocumentContent ?? file.documentContent;
  const explodedDocumentContent = file.explodedDocumentContent ?? '';
  const requestedVersion: CaseResolverDocumentVersion = file.activeDocumentVersion === 'exploded'
    ? 'exploded'
    : 'original';
  const activeDocumentVersion: CaseResolverDocumentVersion =
    requestedVersion === 'exploded' && explodedDocumentContent.trim().length === 0
      ? 'original'
      : requestedVersion;
  return {
    id: file.id,
    fileType: file.fileType,
    name: file.name,
    folder: file.folder,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    documentDate: file.documentDate,
    originalDocumentContent,
    explodedDocumentContent,
    activeDocumentVersion,
    documentContent: toActiveDocumentContent({
      activeDocumentVersion,
      originalDocumentContent,
      explodedDocumentContent,
    }),
    scanSlots: file.scanSlots,
    addresser: file.addresser,
    addressee: file.addressee,
    tagId: file.tagId,
    categoryId: file.categoryId,
  };
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
  createdAt: string;
  updatedAt: string;
  documentDate: string;
  originalDocumentContent: string;
  explodedDocumentContent: string;
  activeDocumentVersion: CaseResolverDocumentVersion;
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

const hashString32 = (value: string, seed: number): number => {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

const buildCaseResolverDocumentHash = (id: string, createdAt: string): string => {
  const source = `${id.trim()}|${createdAt.trim()}`;
  const reversed = source.split('').reverse().join('');
  const partA = hashString32(source, 0x811c9dc5);
  const partB = hashString32(reversed, 0x9e3779b1);
  return `DOC-${partA.toString(16).padStart(8, '0')}${partB.toString(16).padStart(8, '0')}`.toUpperCase();
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

const toLocalDateTimeLabel = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) return 'Not specified';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toLocaleString();
};

const buildDocumentPdfMarkup = ({
  documentDate,
  documentHash,
  createdAt,
  updatedAt,
  addresserLabel,
  addresseeLabel,
  documentContent,
}: {
  documentDate: string;
  documentHash: string;
  createdAt: string;
  updatedAt: string;
  addresserLabel: string;
  addresseeLabel: string;
  documentContent: string;
}): string => {
  const normalizedDocumentDate = toLocalDateLabel(documentDate);
  const normalizedCreatedAt = toLocalDateTimeLabel(createdAt);
  const normalizedUpdatedAt = toLocalDateTimeLabel(updatedAt);
  const normalizedDocumentHash = documentHash.trim() || 'DOC-UNKNOWN';
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

      .document-footer {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }

      .document-footer-meta {
        text-align: right;
        color: #4b5563;
        font-size: 10px;
        line-height: 1.35;
      }

      .document-id {
        margin-top: 3px;
        font-family: "Courier New", Courier, monospace;
        letter-spacing: 0.04em;
        color: #111827;
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
          <div class="meta-label">Addresser</div>
          <div class="meta-value">${escapeHtml(normalizedAddresser)}</div>
        </article>
        <article class="meta-card">
          <div class="meta-label">Addressee</div>
          <div class="meta-value">${escapeHtml(normalizedAddressee)}</div>
        </article>
      </section>
      <section class="content">${documentContent}</section>
      <footer class="document-footer">
        <div class="document-footer-meta">
          <div>Created: ${escapeHtml(normalizedCreatedAt)}</div>
          <div>Modified: ${escapeHtml(normalizedUpdatedAt)}</div>
          <div class="document-id">${escapeHtml(normalizedDocumentHash)}</div>
        </div>
      </footer>
    </main>
  </body>
</html>`;
};

const removeLinkedDocumentFileId = (
  graph: CaseResolverGraph,
  fileId: string
): CaseResolverGraph => {
  const source = graph.documentFileLinksByNode ?? {};
  const sourceByNode = graph.documentSourceFileIdByNode ?? {};
  let changed = false;
  const nextLinks: Record<string, string[]> = {};
  const nextSourceByNode: Record<string, string> = {};

  Object.entries(source).forEach(([nodeId, links]: [string, string[]]) => {
    const filtered = links.filter((linkedFileId: string) => linkedFileId !== fileId);
    if (filtered.length !== links.length) {
      changed = true;
    }
    nextLinks[nodeId] = filtered;
  });

  Object.entries(sourceByNode).forEach(([nodeId, linkedFileId]: [string, string]) => {
    if (linkedFileId === fileId) {
      changed = true;
      return;
    }
    nextSourceByNode[nodeId] = linkedFileId;
  });

  if (!changed) {
    return graph;
  }

  return {
    ...graph,
    documentFileLinksByNode: nextLinks,
    documentSourceFileIdByNode: nextSourceByNode,
  };
};

export function AdminCaseResolverPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
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
  const caseResolverTagPickerOptions = useMemo(
    (): CaseResolverTagPickerOption[] => buildCaseResolverTagPickerOptions(caseResolverTags),
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
  const [activeMainView, setActiveMainView] = useState<'workspace' | 'search'>('workspace');
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [editingDocumentDraft, setEditingDocumentDraft] = useState<CaseResolverFileEditDraft | null>(null);
  const [isUploadingScanDraftFiles, setIsUploadingScanDraftFiles] = useState(false);
  const [uploadingScanSlotId, setUploadingScanSlotId] = useState<string | null>(null);
  const [isDocumentTagDropdownOpen, setIsDocumentTagDropdownOpen] = useState(false);
  const [documentTagSearchQuery, setDocumentTagSearchQuery] = useState('');
  const scanBulkUploadInputRef = useRef<HTMLInputElement | null>(null);
  const scanSlotUploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const documentTagDropdownRef = useRef<HTMLDivElement | null>(null);
  const documentTagSearchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedDocumentTagOption = useMemo((): CaseResolverTagPickerOption | null => {
    const tagId = editingDocumentDraft?.tagId ?? null;
    if (!tagId) return null;
    return (
      caseResolverTagPickerOptions.find(
        (option: CaseResolverTagPickerOption): boolean => option.id === tagId
      ) ?? null
    );
  }, [caseResolverTagPickerOptions, editingDocumentDraft?.tagId]);
  const filteredDocumentTagOptions = useMemo((): CaseResolverTagPickerOption[] => {
    const query = documentTagSearchQuery.trim().toLowerCase();
    if (!query) return caseResolverTagPickerOptions;
    return caseResolverTagPickerOptions.filter((option: CaseResolverTagPickerOption): boolean =>
      option.searchLabel.includes(query)
    );
  }, [caseResolverTagPickerOptions, documentTagSearchQuery]);

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

  useEffect(() => {
    if (editingDocumentDraft) return;
    setIsDocumentTagDropdownOpen(false);
    setDocumentTagSearchQuery('');
  }, [editingDocumentDraft]);

  useEffect(() => {
    if (!isDocumentTagDropdownOpen) return;
    const listener = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (documentTagDropdownRef.current?.contains(target)) return;
      setIsDocumentTagDropdownOpen(false);
      setDocumentTagSearchQuery('');
    };
    document.addEventListener('mousedown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
    };
  }, [isDocumentTagDropdownOpen]);

  useEffect(() => {
    if (!isDocumentTagDropdownOpen) return;
    const frame = window.requestAnimationFrame(() => {
      documentTagSearchInputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isDocumentTagDropdownOpen]);

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
  useEffect(() => {
    const payload = consumePromptExploderApplyPromptForCaseResolver();
    if (!payload?.prompt?.trim()) return;

    const targetFileId = payload.caseResolverContext?.fileId ?? workspace.activeFileId ?? null;
    if (!targetFileId) {
      toast('Received Prompt Exploder output, but no target document was found.', { variant: 'warning' });
      return;
    }

    const targetExists = workspace.files.some((file: CaseResolverFile): boolean => file.id === targetFileId);
    if (!targetExists) {
      toast('Received Prompt Exploder output, but the target document no longer exists.', {
        variant: 'warning',
      });
      return;
    }

    const nextExplodedContent = payload.prompt;
    const now = new Date().toISOString();
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace =>
      normalizeCaseResolverWorkspace({
        ...current,
        activeFileId: targetFileId,
        files: current.files.map((file: CaseResolverFile): CaseResolverFile => {
          if (file.id !== targetFileId) return file;
          const originalDocumentContent = file.originalDocumentContent ?? file.documentContent;
          return {
            ...file,
            originalDocumentContent,
            explodedDocumentContent: nextExplodedContent,
            activeDocumentVersion: 'exploded',
            documentContent: nextExplodedContent,
            updatedAt: now,
          };
        }),
      })
    );

    setSelectedFileId(targetFileId);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
      if (current?.id !== targetFileId) return current;
      const originalDocumentContent = current.originalDocumentContent || current.documentContent;
      return {
        ...current,
        originalDocumentContent,
        explodedDocumentContent: nextExplodedContent,
        activeDocumentVersion: 'exploded',
        documentContent: nextExplodedContent,
        updatedAt: now,
      };
    });
    toast('Exploded text returned to Case Resolver.', { variant: 'success' });
  }, [toast, workspace.activeFileId, workspace.files]);
  const isNodeFileSelected = selectedAsset?.kind === 'node_file';
  const shouldShowAssetPreview = Boolean(selectedAsset) && !isNodeFileSelected;
  const canTogglePreviewPage = isNodeFileSelected || Boolean(activeFile);
  const shouldShowPreviewPage = shouldShowAssetPreview || (canTogglePreviewPage && isPreviewPageVisible);
  const areSidePanelsCollapsed = folderPanelCollapsed && isMenuCollapsed;

  const handleToggleCaseResolverPanels = useCallback((): void => {
    const shouldCollapsePanels = !areSidePanelsCollapsed;
    setFolderPanelCollapsed(shouldCollapsePanels);
    setIsMenuCollapsed(shouldCollapsePanels);
  }, [areSidePanelsCollapsed, setIsMenuCollapsed]);

  const panelVisibilityToggleButton = typeof document !== 'undefined'
    ? createPortal(
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={handleToggleCaseResolverPanels}
        title={areSidePanelsCollapsed ? 'Show folder tree and menu' : 'Show canvas only'}
        aria-label={areSidePanelsCollapsed ? 'Show folder tree and menu' : 'Show canvas only'}
        className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
      >
        {areSidePanelsCollapsed ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </Button>,
      document.body
    )
    : null;

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

        setEditingDocumentDraft(buildFileEditDraft(target));
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

  const handleOpenFileFromSearch = useCallback(
    (fileId: string): void => {
      setActiveMainView('workspace');
      setIsPreviewPageVisible(false);
      handleSelectFile(fileId);
    },
    [handleSelectFile]
  );

  const handleEditFileFromSearch = useCallback(
    (fileId: string): void => {
      setActiveMainView('workspace');
      setIsPreviewPageVisible(false);
      handleOpenFileEditor(fileId);
    },
    [handleOpenFileEditor]
  );

  const handleCreateDocumentFromSearch = useCallback((): void => {
    setActiveMainView('workspace');
    handleCreateFile(null);
  }, [handleCreateFile]);

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
      const documentHash = buildCaseResolverDocumentHash(draft.id, draft.createdAt);
      return buildDocumentPdfMarkup({
        documentDate: draft.documentDate,
        documentHash,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
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

  const handleCopyDocumentHash = useCallback(
    (hash: string): void => {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        toast('Clipboard is not available in this browser.', { variant: 'error' });
        return;
      }
      void navigator.clipboard
        .writeText(hash)
        .then((): void => {
          toast('Document ID copied.', { variant: 'success' });
        })
        .catch((): void => {
          toast('Failed to copy document ID.', { variant: 'error' });
        });
    },
    [toast]
  );

  const handleSelectDocumentTag = useCallback((nextTagId: string | null): void => {
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
      current
        ? {
          ...current,
          tagId: nextTagId,
        }
        : current
    );
    setDocumentTagSearchQuery('');
    setIsDocumentTagDropdownOpen(false);
  }, []);

  const handleSelectDraftDocumentVersion = useCallback(
    (version: CaseResolverDocumentVersion): void => {
      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
        if (current?.fileType !== 'document') return current;
        if (version === 'exploded' && current.explodedDocumentContent.trim().length === 0) {
          return current;
        }
        return {
          ...current,
          activeDocumentVersion: version,
          documentContent: toActiveDocumentContent({
            activeDocumentVersion: version,
            originalDocumentContent: current.originalDocumentContent,
            explodedDocumentContent: current.explodedDocumentContent,
          }),
        };
      });
    },
    []
  );

  const handleUpdateDraftDocumentContent = useCallback((nextValue: string): void => {
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
      if (current?.fileType !== 'document') return current;
      if (current.activeDocumentVersion === 'exploded') {
        return {
          ...current,
          explodedDocumentContent: nextValue,
          documentContent: nextValue,
        };
      }
      return {
        ...current,
        originalDocumentContent: nextValue,
        documentContent: nextValue,
      };
    });
  }, []);

  const handleSendDraftToPromptExploder = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'document') return;
    const prompt = editingDocumentDraft.documentContent;
    if (!prompt.trim()) {
      toast('Document content is empty.', { variant: 'info' });
      return;
    }
    savePromptExploderDraftPromptFromCaseResolver(prompt, {
      fileId: editingDocumentDraft.id,
      fileName: editingDocumentDraft.name,
    });
    router.push('/admin/prompt-exploder?returnTo=/admin/case-resolver');
  }, [editingDocumentDraft, router, toast]);

  const handleCreateDocumentFromExplodedDraft = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'document') return;
    const explodedContent = editingDocumentDraft.explodedDocumentContent;
    if (!explodedContent.trim()) {
      toast('No exploded version is available yet.', { variant: 'info' });
      return;
    }

    const normalizedFolder = normalizeFolderPath(editingDocumentDraft.folder);
    const newFile = createCaseResolverFile({
      id: createId('case-file'),
      fileType: 'document',
      name: createUniqueDocumentName(workspace.files, `${editingDocumentDraft.name} (Exploded)`),
      folder: normalizedFolder,
      documentDate: editingDocumentDraft.documentDate,
      originalDocumentContent: explodedContent,
      explodedDocumentContent: '',
      activeDocumentVersion: 'original',
      documentContent: explodedContent,
      addresser: editingDocumentDraft.addresser,
      addressee: editingDocumentDraft.addressee,
      tagId: editingDocumentDraft.tagId,
      categoryId: editingDocumentDraft.categoryId,
    });

    updateWorkspace(
      (current: CaseResolverWorkspace): CaseResolverWorkspace => ({
        ...current,
        activeFileId: newFile.id,
        files: [...current.files, newFile],
        folders: normalizeFolderPaths([...current.folders, normalizedFolder]),
      }),
      { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
    );
    setSelectedFileId(newFile.id);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    setEditingDocumentDraft(buildFileEditDraft(newFile));
    toast('Created a new document from the exploded version.', { variant: 'success' });
  }, [editingDocumentDraft, toast, updateWorkspace, workspace.files]);

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
    const normalizedOriginalDocumentContent = editingDocumentDraft.originalDocumentContent;
    const normalizedExplodedDocumentContent = editingDocumentDraft.explodedDocumentContent;
    const normalizedActiveDocumentVersion: CaseResolverDocumentVersion =
      editingDocumentDraft.fileType === 'document' &&
      editingDocumentDraft.activeDocumentVersion === 'exploded' &&
      normalizedExplodedDocumentContent.trim().length > 0
        ? 'exploded'
        : 'original';
    const normalizedDocumentContent =
      editingDocumentDraft.fileType === 'document'
        ? toActiveDocumentContent({
          activeDocumentVersion: normalizedActiveDocumentVersion,
          originalDocumentContent: normalizedOriginalDocumentContent,
          explodedDocumentContent: normalizedExplodedDocumentContent,
        })
        : editingDocumentDraft.documentContent;

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
              originalDocumentContent:
                editingDocumentDraft.fileType === 'document'
                  ? normalizedOriginalDocumentContent
                  : normalizedDocumentContent,
              explodedDocumentContent:
                editingDocumentDraft.fileType === 'document'
                  ? normalizedExplodedDocumentContent
                  : '',
              activeDocumentVersion:
                editingDocumentDraft.fileType === 'document'
                  ? normalizedActiveDocumentVersion
                  : 'original',
              documentContent: normalizedDocumentContent,
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
    caseResolverTags,
    caseResolverCategories,
    onCreateDocumentFromSearch: handleCreateDocumentFromSearch,
    onOpenFileFromSearch: handleOpenFileFromSearch,
    onEditFileFromSearch: handleEditFileFromSearch,
    activeFile,
    selectedAsset,
    onUpdateSelectedAsset: handleUpdateSelectedAsset,
    onGraphChange: handleGraphChange,
  };

  return (
    <CaseResolverPageProvider value={caseResolverPageContextValue}>
      <div className='w-full space-y-4'>
        {panelVisibilityToggleButton}
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
            <div className='mb-2 flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant={activeMainView === 'workspace' ? 'default' : 'outline'}
                onClick={(): void => {
                  setActiveMainView('workspace');
                }}
                className='h-8 border border-border px-2 text-xs'
              >
                Workspace
              </Button>
              <Button
                type='button'
                variant={activeMainView === 'search' ? 'default' : 'outline'}
                onClick={(): void => {
                  setActiveMainView('search');
                  setIsPreviewPageVisible(false);
                }}
                className='h-8 border border-border px-2 text-xs'
              >
                Document Search
              </Button>
            </div>
            {activeMainView === 'workspace' && (folderPanelCollapsed || canTogglePreviewPage) ? (
              <div className='mb-2 flex flex-wrap items-center gap-2'>
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

            {activeMainView === 'search' ? (
              <CaseResolverDocumentSearchPage />
            ) : (
              <>
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
              </>
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
                      onClick={handleSendDraftToPromptExploder}
                      className='min-w-[170px] border border-white/20 hover:border-white/40'
                    >
                      <Link2 className='mr-1.5 size-3.5' />
                      Send to Prompt Exploder
                    </Button>
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
              <div className='grid gap-3 md:grid-cols-3'>
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
                  <div ref={documentTagDropdownRef} className='relative'>
                    <button
                      type='button'
                      onClick={(): void => {
                        if (caseResolverTagPickerOptions.length === 0) return;
                        if (isDocumentTagDropdownOpen) {
                          setIsDocumentTagDropdownOpen(false);
                          setDocumentTagSearchQuery('');
                          return;
                        }
                        setIsDocumentTagDropdownOpen(true);
                      }}
                      className='flex h-9 w-full items-center justify-between rounded-md border border-border bg-card/60 px-3 text-left text-xs text-white transition-colors hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                    >
                      <span className={selectedDocumentTagOption ? 'truncate text-white' : 'truncate text-gray-400'}>
                        {selectedDocumentTagOption
                          ? selectedDocumentTagOption.label
                          : caseResolverTagPickerOptions.length > 0
                            ? 'Select tag'
                            : 'No tags configured'}
                      </span>
                      <ChevronDown
                        className={`size-3.5 shrink-0 text-gray-500 transition-transform ${isDocumentTagDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isDocumentTagDropdownOpen ? (
                      <div className='absolute z-50 mt-1 w-full rounded-md border border-border bg-popover/95 p-2 shadow-lg backdrop-blur-md'>
                        <Input
                          ref={documentTagSearchInputRef}
                          size='sm'
                          value={documentTagSearchQuery}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            setDocumentTagSearchQuery(event.target.value);
                          }}
                          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                            if (event.key === 'Escape') {
                              setIsDocumentTagDropdownOpen(false);
                              setDocumentTagSearchQuery('');
                            }
                          }}
                          placeholder='Search tags...'
                          className='border-border/70 bg-card/60 text-xs text-white'
                        />
                        <div className='mt-2 max-h-56 space-y-1 overflow-y-auto'>
                          <button
                            type='button'
                            onClick={(): void => {
                              handleSelectDocumentTag(null);
                            }}
                            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${
                              editingDocumentDraft.tagId === null
                                ? 'bg-cyan-500/20 text-cyan-100'
                                : 'text-gray-200 hover:bg-muted/50'
                            }`}
                          >
                            <span>No tag</span>
                            {editingDocumentDraft.tagId === null ? <Check className='size-3.5' /> : null}
                          </button>
                          {filteredDocumentTagOptions.length === 0 ? (
                            <div className='px-2 py-1.5 text-xs text-gray-500'>No matching tags.</div>
                          ) : (
                            filteredDocumentTagOptions.map((option: CaseResolverTagPickerOption) => (
                              <button
                                key={option.id}
                                type='button'
                                onClick={(): void => {
                                  handleSelectDocumentTag(option.id);
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                  editingDocumentDraft.tagId === option.id
                                    ? 'bg-cyan-500/20 text-cyan-100'
                                    : 'text-gray-200 hover:bg-muted/50'
                                }`}
                              >
                                <span className='truncate'>{option.label}</span>
                                {editingDocumentDraft.tagId === option.id ? <Check className='size-3.5 shrink-0' /> : null}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {selectedDocumentTagOption ? (
                    <div className='flex flex-wrap items-center gap-1 rounded-md border border-border/50 bg-black/20 px-2 py-1'>
                      {selectedDocumentTagOption.pathIds.map((segmentId: string, index: number) => {
                        const segmentName = selectedDocumentTagOption.pathNames[index] ?? segmentId;
                        return (
                          <React.Fragment key={segmentId}>
                            {index > 0 ? <span className='text-[10px] text-gray-500'>/</span> : null}
                            <button
                              type='button'
                              onClick={(): void => {
                                handleSelectDocumentTag(segmentId);
                              }}
                              className='text-[11px] text-cyan-200 underline-offset-2 hover:text-cyan-100 hover:underline'
                            >
                              {segmentName}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ) : null}
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
                <div className='space-y-1 md:text-right'>
                  <Label className='text-xs text-gray-400 md:block md:text-right'>Addressee</Label>
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
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white [&>span]:text-right'
                  />
                </div>
              </div>

              {editingDocumentDraft.fileType === 'document' ? (
                <div className='space-y-2'>
                  {((): React.JSX.Element => {
                    const documentHash = buildCaseResolverDocumentHash(
                      editingDocumentDraft.id,
                      editingDocumentDraft.createdAt
                    );
                    return (
                      <>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <Label className='text-xs text-gray-400'>Document Content (WYSIWYG)</Label>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Button
                              type='button'
                              size='sm'
                              variant={editingDocumentDraft.activeDocumentVersion === 'original' ? 'default' : 'outline'}
                              className='h-8 min-w-[84px] border-white/20 px-2 text-xs'
                              onClick={(): void => {
                                handleSelectDraftDocumentVersion('original');
                              }}
                            >
                              Original
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              variant={editingDocumentDraft.activeDocumentVersion === 'exploded' ? 'default' : 'outline'}
                              className='h-8 min-w-[84px] border-white/20 px-2 text-xs disabled:opacity-50'
                              onClick={(): void => {
                                handleSelectDraftDocumentVersion('exploded');
                              }}
                              disabled={editingDocumentDraft.explodedDocumentContent.trim().length === 0}
                            >
                              Exploded
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              className='h-8 border-white/20 px-2 text-xs disabled:opacity-50'
                              onClick={handleCreateDocumentFromExplodedDraft}
                              disabled={editingDocumentDraft.explodedDocumentContent.trim().length === 0}
                            >
                              Create New Document From Exploded
                            </Button>
                          </div>
                        </div>
                        <div className='text-[11px] text-gray-500'>
                          Active version: {editingDocumentDraft.activeDocumentVersion === 'exploded' ? 'Exploded' : 'Original'}
                        </div>
                        <CaseResolverRichTextEditor
                          value={editingDocumentDraft.documentContent}
                          onChange={handleUpdateDraftDocumentContent}
                          placeholder='Write or edit this document with rich text formatting...'
                          appearance='document-preview'
                        />
                        <div className='flex justify-end'>
                          <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-right text-[11px] text-gray-400'>
                            <div>Created: {toLocalDateTimeLabel(editingDocumentDraft.createdAt)}</div>
                            <div>Modified: {toLocalDateTimeLabel(editingDocumentDraft.updatedAt)}</div>
                            <button
                              type='button'
                              className='mt-1 font-mono tracking-wide text-gray-200 hover:text-white'
                              title='Double-click to copy document ID'
                              onDoubleClick={(): void => {
                                handleCopyDocumentHash(documentHash);
                              }}
                            >
                              {documentHash}
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
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
