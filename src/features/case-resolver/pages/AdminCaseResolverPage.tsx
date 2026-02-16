'use client';

import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverFolderTree } from '@/features/case-resolver/components/CaseResolverFolderTree';
import { CaseResolverRelationsWorkspace } from '@/features/case-resolver/components/CaseResolverRelationsWorkspace';
import {
  CaseResolverPageProvider,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import {
  convertHtmlToMarkdown,
  DocumentWysiwygEditor,
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  MarkdownSplitEditor,
  MarkdownToolbar,
  toStorageDocumentValue,
} from '@/features/document-editor';
import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
} from '@/features/filemaker/settings';
import { savePromptExploderDraftPromptFromCaseResolver } from '@/features/prompt-exploder/bridge';
import { AppModal, Button, Input, Label, MultiSelect, SelectSimple, useToast } from '@/shared/ui';
import { sanitizeHtml } from '@/shared/utils';

import { useCaseResolverState } from '../hooks/useCaseResolverState';
import {
  normalizeFolderPath,
  normalizeFolderPaths,
  renameFolderPath,
} from '../settings';
import { isPathWithinFolder } from '../utils/caseResolverUtils';

import type {
  CaseResolverCategory,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
} from '../types';

const ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR =
  process.env['NEXT_PUBLIC_CASE_RESOLVER_MULTIFORMAT_EDITOR'] !== 'false';

const buildPathLabelMap = <T extends { id: string; name: string; parentId: string | null }>(
  items: T[]
): Map<string, string> => {
  const byId = new Map<string, T>(items.map((item: T): [string, T] => [item.id, item]));
  const cache = new Map<string, string>();

  const resolveLabel = (id: string, visited: Set<string>): string => {
    const cached = cache.get(id);
    if (cached) return cached;
    const item = byId.get(id);
    if (!item) return '';
    if (visited.has(id)) {
      cache.set(id, item.name);
      return item.name;
    }
    if (!item.parentId || !byId.has(item.parentId)) {
      cache.set(id, item.name);
      return item.name;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(id);
    const parentLabel = resolveLabel(item.parentId, nextVisited);
    const label = `${parentLabel} / ${item.name}`;
    cache.set(id, label);
    return label;
  };

  items.forEach((item: T): void => {
    resolveLabel(item.id, new Set<string>());
  });

  return cache;
};

export function AdminCaseResolverPage(): React.JSX.Element {
  const state = useCaseResolverState();
  const router = useRouter();
  const { toast } = useToast();
  const [workspaceView, setWorkspaceView] = React.useState<'document' | 'relations'>('document');
  const {
    workspace,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    setSelectedFolderPath,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    setActiveMainView,
    editingDocumentDraft,
    setEditingDocumentDraft,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    filemakerDatabase,
    requestedFileId,
    shouldOpenEditorFromQuery,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    updateWorkspace,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
  } = state;

  React.useEffect(() => {
    if (!activeFile && workspaceView === 'document') {
      setWorkspaceView('relations');
    }
  }, [activeFile, workspaceView]);

  const openEditorFromQueryHandledRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!shouldOpenEditorFromQuery || !requestedFileId) {
      openEditorFromQueryHandledRef.current = null;
      return;
    }
    if (openEditorFromQueryHandledRef.current === requestedFileId) return;
    if (editingDocumentDraft?.id === requestedFileId) {
      openEditorFromQueryHandledRef.current = requestedFileId;
      return;
    }
    const fileExists = workspace.files.some((file) => file.id === requestedFileId);
    if (!fileExists) return;
    handleOpenFileEditor(requestedFileId);
    openEditorFromQueryHandledRef.current = requestedFileId;
  }, [
    editingDocumentDraft?.id,
    handleOpenFileEditor,
    requestedFileId,
    shouldOpenEditorFromQuery,
    workspace.files,
  ]);

  const [editorShowPreview, setEditorShowPreview] = React.useState(true);
  const [editorTextColor, setEditorTextColor] = React.useState('#e5e7eb');
  const [editorFontFamily, setEditorFontFamily] = React.useState('inherit');
  const [editorWidth, setEditorWidth] = React.useState<number | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = React.useState(false);
  const [isMigratingEditorMode, setIsMigratingEditorMode] = React.useState(false);
  const [editorContentRevisionSeed, setEditorContentRevisionSeed] = React.useState(0);
  const editorSplitRef = React.useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const initialDraftFingerprintRef = React.useRef<string | null>(null);

  const buildDraftFingerprint = useCallback((input: typeof editingDocumentDraft): string => {
    if (!input) return '';
    return JSON.stringify({
      id: input.id,
      name: input.name,
      activeDocumentVersion: input.activeDocumentVersion,
      editorType: input.editorType,
      documentContent: input.documentContent,
      documentContentMarkdown: input.documentContentMarkdown,
      documentContentHtml: input.documentContentHtml,
      documentDate: input.documentDate,
      addresser: input.addresser,
      addressee: input.addressee,
      referenceCaseIds: input.referenceCaseIds,
      tagId: input.tagId,
      caseIdentifierId: input.caseIdentifierId,
      categoryId: input.categoryId,
    });
  }, []);

  React.useEffect(() => {
    if (!editingDocumentDraft) {
      initialDraftFingerprintRef.current = null;
      return;
    }
    initialDraftFingerprintRef.current = buildDraftFingerprint(editingDocumentDraft);
    setEditorTextColor('#e5e7eb');
    setEditorFontFamily('inherit');
    setEditorWidth(null);
    setEditorShowPreview(editingDocumentDraft.editorType !== 'wysiwyg');
    setEditorContentRevisionSeed((value) => value + 1);
  }, [buildDraftFingerprint, editingDocumentDraft?.id]);

  const isEditorDraftDirty = React.useMemo(() => {
    if (!editingDocumentDraft) return false;
    if (!initialDraftFingerprintRef.current) return false;
    return buildDraftFingerprint(editingDocumentDraft) !== initialDraftFingerprintRef.current;
  }, [buildDraftFingerprint, editingDocumentDraft]);

  const caseTagPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverTags),
    [caseResolverTags]
  );
  const caseIdentifierPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers),
    [caseResolverIdentifiers]
  );
  const caseCategoryPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverCategories),
    [caseResolverCategories]
  );
  const caseTagOptions = React.useMemo(
    () => [
      { value: '__none__', label: caseResolverTags.length > 0 ? 'No tag' : 'No tags' },
      ...caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) ?? tag.name,
      })),
    ],
    [caseResolverTags, caseTagPathById]
  );
  const caseIdentifierOptions = React.useMemo(
    () => [
      {
        value: '__none__',
        label: caseResolverIdentifiers.length > 0 ? 'No case identifier' : 'No case identifiers',
      },
      ...caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) ?? identifier.name,
      })),
    ],
    [caseIdentifierPathById, caseResolverIdentifiers]
  );
  const caseCategoryOptions = React.useMemo(
    () => [
      { value: '__none__', label: caseResolverCategories.length > 0 ? 'No category' : 'No categories' },
      ...caseResolverCategories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) ?? category.name,
      })),
    ],
    [caseCategoryPathById, caseResolverCategories]
  );
  const caseReferenceOptions = React.useMemo(
    () =>
      workspace.files
        .map((file) => ({
          value: file.id,
          label: file.folder ? `${file.name} (${file.folder})` : file.name,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [workspace.files]
  );
  const parentCaseOptions = React.useMemo(
    () => [{ value: '__none__', label: 'No parent (root case)' }, ...caseReferenceOptions],
    [caseReferenceOptions]
  );
  const partyOptions = React.useMemo(
    () => buildFilemakerPartyOptions(filemakerDatabase),
    [filemakerDatabase]
  );

  const updateEditingDocumentDraft = useCallback(
    (patch: Partial<CaseResolverFileEditDraft>): void => {
      setEditingDocumentDraft((current) => (current ? { ...current, ...patch } : current));
    },
    [setEditingDocumentDraft]
  );

  const handleOpenPromptExploderForDraft = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const promptSource = (
      editingDocumentDraft.documentContentMarkdown ||
      editingDocumentDraft.documentContent
    ).trim();
    if (!promptSource) {
      toast('Add document content before opening Prompt Exploder.', { variant: 'warning' });
      return;
    }

    savePromptExploderDraftPromptFromCaseResolver(promptSource, {
      fileId: editingDocumentDraft.id,
      fileName: editingDocumentDraft.name.trim() || editingDocumentDraft.id,
    });
    const returnTo = `/admin/case-resolver?openEditor=1&fileId=${encodeURIComponent(
      editingDocumentDraft.id
    )}`;
    router.push(`/admin/prompt-exploder?returnTo=${encodeURIComponent(returnTo)}`);
  }, [editingDocumentDraft, router, toast]);

  const applyDraftCanonicalContent = useCallback(
    (input: {
      mode: 'markdown' | 'wysiwyg' | 'code';
      value: string;
      markdown?: string | undefined;
      html?: string | undefined;
      warnings?: string[] | undefined;
    }): void => {
      setEditingDocumentDraft((current) => {
        if (!current) return current;
        const canonical = deriveDocumentContentSync({
          mode: input.mode,
          value: input.value,
          previousMarkdown: input.markdown ?? current.documentContentMarkdown,
          previousHtml: input.html ?? current.documentContentHtml,
        });
        const mergedWarnings = input.warnings
          ? Array.from(new Set([...canonical.warnings, ...input.warnings]))
          : canonical.warnings;
        const nextStoredContent = toStorageDocumentValue(canonical);
        const now = new Date().toISOString();
        return {
          ...current,
          editorType: canonical.mode,
          documentContentFormatVersion: 1,
          documentContent: nextStoredContent,
          documentContentMarkdown: canonical.markdown,
          documentContentHtml: canonical.html,
          documentContentPlainText: canonical.plainText,
          documentConversionWarnings: mergedWarnings,
          lastContentConversionAt: now,
        };
      });
      setEditorContentRevisionSeed((value) => value + 1);
    },
    [setEditingDocumentDraft]
  );

  const handleUpdateDraftDocumentContent = useCallback((next: string) => {
    if (!editingDocumentDraft) return;
    if (editingDocumentDraft.editorType === 'wysiwyg') {
      applyDraftCanonicalContent({
        mode: 'wysiwyg',
        value: next,
        html: next,
        markdown: editingDocumentDraft.documentContentMarkdown,
      });
      return;
    }
    applyDraftCanonicalContent({
      mode: editingDocumentDraft.editorType,
      value: next,
      markdown: next,
      html: editingDocumentDraft.documentContentHtml,
    });
  }, [applyDraftCanonicalContent, editingDocumentDraft]);

  const handleSwitchEditorMode = useCallback(async (nextMode: 'markdown' | 'wysiwyg' | 'code'): Promise<void> => {
    if (!editingDocumentDraft) return;
    if (nextMode === editingDocumentDraft.editorType) return;

    setIsMigratingEditorMode(true);
    try {
      if (nextMode === 'wysiwyg') {
        const sourceMarkdown =
          editingDocumentDraft.documentContentMarkdown || editingDocumentDraft.documentContent;
        applyDraftCanonicalContent({
          mode: 'wysiwyg',
          value: ensureHtmlForPreview(sourceMarkdown, 'markdown'),
          markdown: sourceMarkdown,
        });
        return;
      }

      const sourceHtml =
        editingDocumentDraft.documentContentHtml ||
        ensureHtmlForPreview(editingDocumentDraft.documentContent, 'markdown');
      const markdownConversion = await convertHtmlToMarkdown(sourceHtml);
      if (markdownConversion.warnings.length > 0 && typeof window !== 'undefined') {
        const proceed = window.confirm(
          `${markdownConversion.warnings[0]}\n\nContinue mode switch anyway?`
        );
        if (!proceed) return;
      }

      applyDraftCanonicalContent({
        mode: nextMode,
        value: markdownConversion.markdown,
        markdown: markdownConversion.markdown,
        html: sourceHtml,
        warnings: markdownConversion.warnings,
      });
    } finally {
      setIsMigratingEditorMode(false);
    }
  }, [applyDraftCanonicalContent, editingDocumentDraft]);

  const applyWrap = useCallback((prefix: string, suffix: string, placeholder: string): void => {
    const textarea = editorTextareaRef.current;
    if (!textarea || !editingDocumentDraft) return;
    const source = editingDocumentDraft.documentContentMarkdown || editingDocumentDraft.documentContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = source.slice(start, end) || placeholder;
    const nextValue = source.slice(0, start) + prefix + selected + suffix + source.slice(end);
    handleUpdateDraftDocumentContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [editingDocumentDraft, handleUpdateDraftDocumentContent]);

  const insertAtCursor = useCallback((value: string): void => {
    const textarea = editorTextareaRef.current;
    if (!textarea || !editingDocumentDraft) return;
    const source = editingDocumentDraft.documentContentMarkdown || editingDocumentDraft.documentContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = source.slice(0, start) + value + source.slice(end);
    handleUpdateDraftDocumentContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [editingDocumentDraft, handleUpdateDraftDocumentContent]);

  const applyLinePrefix = useCallback((prefix: string): void => {
    const textarea = editorTextareaRef.current;
    if (!textarea || !editingDocumentDraft) return;
    const source = editingDocumentDraft.documentContentMarkdown || editingDocumentDraft.documentContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const blockStart = source.lastIndexOf('\n', start - 1) + 1;
    const blockEndIndex = source.indexOf('\n', end);
    const blockEnd = blockEndIndex === -1 ? source.length : blockEndIndex;
    const block = source.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().length ? `${prefix}${line}` : line))
      .join('\n');
    const nextValue = source.slice(0, blockStart) + updated + source.slice(blockEnd);
    handleUpdateDraftDocumentContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  }, [editingDocumentDraft, handleUpdateDraftDocumentContent]);

  const applyBulletList = useCallback((): void => {
    const textarea = editorTextareaRef.current;
    if (!textarea || !editingDocumentDraft) return;
    const source = editingDocumentDraft.documentContentMarkdown || editingDocumentDraft.documentContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const blockStart = source.lastIndexOf('\n', start - 1) + 1;
    const blockEndIndex = source.indexOf('\n', end);
    const blockEnd = blockEndIndex === -1 ? source.length : blockEndIndex;
    const block = source.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().startsWith('- ') ? line : `- ${line}`))
      .join('\n');
    const nextValue = source.slice(0, blockStart) + updated + source.slice(blockEnd);
    handleUpdateDraftDocumentContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  }, [editingDocumentDraft, handleUpdateDraftDocumentContent]);

  const applyChecklist = useCallback((): void => {
    const textarea = editorTextareaRef.current;
    if (!textarea || !editingDocumentDraft) return;
    const source = editingDocumentDraft.documentContentMarkdown || editingDocumentDraft.documentContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const blockStart = source.lastIndexOf('\n', start - 1) + 1;
    const blockEndIndex = source.indexOf('\n', end);
    const blockEnd = blockEndIndex === -1 ? source.length : blockEndIndex;
    const block = source.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().startsWith('- [') ? line : `- [ ] ${line}`))
      .join('\n');
    const nextValue = source.slice(0, blockStart) + updated + source.slice(blockEnd);
    handleUpdateDraftDocumentContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  }, [editingDocumentDraft, handleUpdateDraftDocumentContent]);

  const applySpanStyle = useCallback((colorValue: string, fontValue: string): void => {
    const textarea = editorTextareaRef.current;
    if (!textarea || !editingDocumentDraft) return;
    const source = editingDocumentDraft.documentContentMarkdown || editingDocumentDraft.documentContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = source.slice(start, end);
    const styleParts: string[] = [];
    if (colorValue) styleParts.push(`color: ${colorValue}`);
    if (fontValue && fontValue !== 'inherit') styleParts.push(`font-family: ${fontValue}`);
    const styleAttribute = styleParts.length > 0 ? ` style="${styleParts.join('; ')}"` : '';
    const openingTag = `<span${styleAttribute}>`;
    const closingTag = '</span>';
    const wrapped = `${openingTag}${selected}${closingTag}`;
    const nextValue = source.slice(0, start) + wrapped + source.slice(end);
    handleUpdateDraftDocumentContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor = selected.length > 0 ? start + wrapped.length : start + openingTag.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [editingDocumentDraft, handleUpdateDraftDocumentContent]);

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      const normalizedSourceFolder = normalizeFolderPath(folderPath);
      if (!normalizedSourceFolder) return;
      const normalizedTargetFolder = normalizeFolderPath(targetFolder);
      const sourceFolderName = normalizedSourceFolder.includes('/')
        ? normalizedSourceFolder.slice(normalizedSourceFolder.lastIndexOf('/') + 1)
        : normalizedSourceFolder;
      const nextRootFolder = normalizeFolderPath(
        normalizedTargetFolder ? `${normalizedTargetFolder}/${sourceFolderName}` : sourceFolderName
      );
      if (!nextRootFolder || nextRootFolder === normalizedSourceFolder) {
        return;
      }

      updateWorkspace(
        (current) => {
          const now = new Date().toISOString();
          const renamePath = (value: string): string =>
            renameFolderPath(value, normalizedSourceFolder, nextRootFolder);

          const movedFolders = current.folders.map((folder: string): string => renamePath(folder));
          const movedFolderTimestamps = Object.fromEntries(
            Object.entries(current.folderTimestamps ?? {}).map(([path, timestamps]) => [
              renamePath(path),
              timestamps,
            ])
          );
          const movedFiles = current.files.map((file) => {
            const nextFolder = renamePath(file.folder);
            if (nextFolder === file.folder) return file;
            return {
              ...file,
              folder: nextFolder,
              updatedAt: now,
            };
          });
          const movedAssets = current.assets.map((asset) => {
            const nextFolder = renamePath(asset.folder);
            if (nextFolder === asset.folder) return asset;
            return {
              ...asset,
              folder: nextFolder,
              updatedAt: now,
            };
          });

          return {
            ...current,
            folders: normalizeFolderPaths(movedFolders),
            folderTimestamps: movedFolderTimestamps,
            files: movedFiles,
            assets: movedAssets,
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );

      setSelectedFolderPath((current) => {
        if (!current || !isPathWithinFolder(current, normalizedSourceFolder)) {
          return current;
        }
        return renameFolderPath(current, normalizedSourceFolder, nextRootFolder);
      });
    },
    [setSelectedFolderPath, updateWorkspace]
  );

  const handleGraphChange = useCallback(
    (nextGraph: CaseResolverGraph): void => {
      updateWorkspace((current) => {
        if (!current.activeFileId) return current;
        const now = new Date().toISOString();
        let changed = false;
        const nextFiles = current.files.map((file) => {
          if (file.id !== current.activeFileId) return file;
          changed = true;
          return {
            ...file,
            graph: nextGraph,
            updatedAt: now,
          };
        });
        if (!changed) return current;
        return {
          ...current,
          files: nextFiles,
        };
      });
    },
    [updateWorkspace]
  );

  const handleRelationGraphChange = useCallback(
    (nextGraph: CaseResolverRelationGraph): void => {
      updateWorkspace((current) => ({
        ...current,
        relationGraph: nextGraph,
      }));
    },
    [updateWorkspace]
  );

  // Main Render
  return (
    <CaseResolverPageProvider value={{
      workspace,
      selectedFileId,
      selectedAssetId,
      selectedFolderPath,
      activeFile,
      selectedAsset,
      panelCollapsed: folderPanelCollapsed,
      onPanelCollapsedChange: setFolderPanelCollapsed,
      onSelectFile: handleSelectFile,
      onSelectAsset: handleSelectAsset,
      onSelectFolder: handleSelectFolder,
      onCreateFile: handleCreateFile,
      onCreateFolder: handleCreateFolder,
      onDeleteFolder: handleDeleteFolder,
      onCreateScanFile: () => { handleCreateFile(null); }, // Simplified
      onCreateNodeFile: () => { handleCreateFile(null); }, // Simplified
      onUploadAssets: async () => [], // Simplified
      onMoveFile: async () => {},
      onMoveAsset: async () => {},
      onMoveFolder: handleMoveFolder,
      onRenameFile: async () => {},
      onRenameAsset: async () => {},
      onRenameFolder: async () => {},
      onToggleFolderLock: () => {},
      onDeleteFile: () => {},
      onToggleFileLock: () => {},
      onEditFile: handleOpenFileEditor,
      caseResolverTags,
      caseResolverIdentifiers,
      caseResolverCategories,
      onCreateDocumentFromSearch: () => { setActiveMainView('workspace'); handleCreateFile(null); },
      onOpenFileFromSearch: (id) => { setActiveMainView('workspace'); handleSelectFile(id); },
      onEditFileFromSearch: (id) => { setActiveMainView('workspace'); handleOpenFileEditor(id); },
      onUpdateSelectedAsset: () => {},
      onGraphChange: handleGraphChange,
      onRelationGraphChange: handleRelationGraphChange,
    }}>
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        <div className='flex flex-1 overflow-hidden'>
          {!folderPanelCollapsed && (
            <div className='w-80 flex-shrink-0 border-r border-border bg-card/20'>
              <CaseResolverFolderTree />
            </div>
          )}
          
          <div className='flex flex-1 flex-col overflow-hidden p-6'>
            <div className='mb-6 flex items-center justify-between'>
              <div>
                <h1 className='text-2xl font-bold text-white'>Case Resolver</h1>
                <p className='text-sm text-gray-400'>Manage complex document sets and canvas workspaces.</p>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant={workspaceView === 'document' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setWorkspaceView('document')}
                  disabled={!activeFile}
                >
                  Document Canvas
                </Button>
                <Button
                  variant={workspaceView === 'relations' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setWorkspaceView('relations')}
                >
                  Relations Canvas
                </Button>
                <Button
                  variant='default'
                  size='sm'
                  onClick={() => {
                    if (!activeFile) return;
                    handleOpenFileEditor(activeFile.id);
                  }}
                  disabled={!activeFile}
                >
                  Parties & References
                </Button>
              </div>
            </div>

            {workspaceView === 'relations' ? (
              <CaseResolverRelationsWorkspace />
            ) : activeFile ? (
              activeFile.fileType === 'scanfile' ? (
                <div className='rounded-lg border border-border p-6 bg-card/10'>
                  <h2 className='text-xl font-semibold mb-4'>Scan Workspace: {activeFile.name}</h2>
                  <Button onClick={() => handleOpenFileEditor(activeFile.id)}>Open Scan Editor</Button>
                </div>
              ) : (
                <CaseResolverCanvasWorkspace />
              )
            ) : (
              <div className='flex flex-1 items-center justify-center rounded-lg border border-dashed border-border'>
                <div className='text-center'>
                  <FileText className='mx-auto mb-4 size-12 text-gray-600' />
                  <h3 className='text-lg font-medium text-gray-300'>No case selected</h3>
                  <p className='text-sm text-gray-500'>Select a file from the tree to begin.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All Modals */}
        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open) => { if (!open) handleSaveFileEditor(); }}
          title={editingDocumentDraft?.fileType === 'scanfile' ? 'Edit Scan' : 'Edit Document'}
          size='xl'
        >
          {editingDocumentDraft && (
            <div className='space-y-4'>
              <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='font-mono text-[11px] text-gray-400'>
                    File ID: {editingDocumentDraft.id}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    Folder: {editingDocumentDraft.folder || '(root)'}
                  </div>
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Name</Label>
                  <Input
                    value={editingDocumentDraft.name}
                    onChange={(event) => {
                      updateEditingDocumentDraft({ name: event.target.value });
                    }}
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Document Date</Label>
                  <Input
                    type='date'
                    value={editingDocumentDraft.documentDate}
                    onChange={(event) => {
                      updateEditingDocumentDraft({ documentDate: event.target.value });
                    }}
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Parent Case</Label>
                  <SelectSimple
                    size='sm'
                    value={editingDocumentDraft.parentCaseId ?? '__none__'}
                    onValueChange={(value: string): void => {
                      updateEditingDocumentDraft({
                        parentCaseId: value === '__none__' ? null : value,
                      });
                    }}
                    options={parentCaseOptions.filter(
                      (option) => option.value === '__none__' || option.value !== editingDocumentDraft.id
                    )}
                    placeholder='Parent case'
                    triggerClassName='h-9'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Tag</Label>
                  <SelectSimple
                    size='sm'
                    value={editingDocumentDraft.tagId ?? '__none__'}
                    onValueChange={(value: string): void => {
                      updateEditingDocumentDraft({
                        tagId: value === '__none__' ? null : value,
                      });
                    }}
                    options={caseTagOptions}
                    placeholder='Select tag'
                    triggerClassName='h-9'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Case Identifier</Label>
                  <SelectSimple
                    size='sm'
                    value={editingDocumentDraft.caseIdentifierId ?? '__none__'}
                    onValueChange={(value: string): void => {
                      updateEditingDocumentDraft({
                        caseIdentifierId: value === '__none__' ? null : value,
                      });
                    }}
                    options={caseIdentifierOptions}
                    placeholder='Select case identifier'
                    triggerClassName='h-9'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Category</Label>
                  <SelectSimple
                    size='sm'
                    value={editingDocumentDraft.categoryId ?? '__none__'}
                    onValueChange={(value: string): void => {
                      updateEditingDocumentDraft({
                        categoryId: value === '__none__' ? null : value,
                      });
                    }}
                    options={caseCategoryOptions}
                    placeholder='Select category'
                    triggerClassName='h-9'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Addresser</Label>
                  <SelectSimple
                    size='sm'
                    value={encodeFilemakerPartyReference(editingDocumentDraft.addresser)}
                    onValueChange={(value: string): void => {
                      updateEditingDocumentDraft({
                        addresser: decodeFilemakerPartyReference(value),
                      });
                    }}
                    options={partyOptions}
                    placeholder='Select addresser'
                    triggerClassName='h-9'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Addressee</Label>
                  <SelectSimple
                    size='sm'
                    value={encodeFilemakerPartyReference(editingDocumentDraft.addressee)}
                    onValueChange={(value: string): void => {
                      updateEditingDocumentDraft({
                        addressee: decodeFilemakerPartyReference(value),
                      });
                    }}
                    options={partyOptions}
                    placeholder='Select addressee'
                    triggerClassName='h-9'
                  />
                </div>

                <div className='md:col-span-2'>
                  <Label className='mb-2 block text-xs text-gray-400'>Reference Cases</Label>
                  <MultiSelect
                    options={caseReferenceOptions.filter(
                      (option) => option.value !== editingDocumentDraft.id
                    )}
                    selected={editingDocumentDraft.referenceCaseIds.filter(
                      (referenceId: string) => referenceId !== editingDocumentDraft.id
                    )}
                    onChange={(values: string[]): void => {
                      updateEditingDocumentDraft({
                        referenceCaseIds: values.filter(
                          (referenceId: string) => referenceId !== editingDocumentDraft.id
                        ),
                      });
                    }}
                    placeholder='Select reference cases'
                    searchPlaceholder='Search cases...'
                    emptyMessage='No cases available.'
                    className='w-full'
                  />
                </div>
              </div>

              <div className='flex items-center justify-between gap-2 rounded border border-border/60 bg-card/30 px-3 py-2 text-xs'>
                <span className='text-gray-400'>
                  Revision {editingDocumentDraft.baseDocumentContentVersion}
                  {isEditorDraftDirty ? ' · unsaved changes' : ' · saved'}
                </span>
                {editingDocumentDraft.documentConversionWarnings.length > 0 ? (
                  <span className='text-amber-300'>
                    {editingDocumentDraft.documentConversionWarnings[0]}
                  </span>
                ) : null}
              </div>

              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  className='h-8'
                  onClick={handleOpenPromptExploderForDraft}
                >
                  Prompt Exploder: Extract + Reassemble
                </Button>
              </div>

              {ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR ? (
                <>
                  <MarkdownToolbar
                    mode={editingDocumentDraft.editorType}
                    onModeChange={(mode): void => {
                      void handleSwitchEditorMode(mode);
                    }}
                    isMigrating={isMigratingEditorMode}
                    onMigrateToWysiwyg={(): void => {
                      void handleSwitchEditorMode('wysiwyg');
                    }}
                    onMigrateToMarkdown={(): void => {
                      void handleSwitchEditorMode('markdown');
                    }}
                    showPreview={editorShowPreview}
                    onTogglePreview={(): void => {
                      setEditorShowPreview((value) => !value);
                    }}
                    textColor={editorTextColor}
                    onTextColorChange={setEditorTextColor}
                    fontFamily={editorFontFamily}
                    onFontFamilyChange={setEditorFontFamily}
                    onApplyWrap={applyWrap}
                    onApplyLinePrefix={applyLinePrefix}
                    onInsertAtCursor={insertAtCursor}
                    onApplyBulletList={applyBulletList}
                    onApplyChecklist={applyChecklist}
                    onApplySpanStyle={applySpanStyle}
                  />

                  {editingDocumentDraft.editorType === 'wysiwyg' ? (
                    <DocumentWysiwygEditor
                      key={`case-resolver-wysiwyg-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentHtml}
                      onChange={handleUpdateDraftDocumentContent}
                      allowFontFamily
                      allowTextAlign
                      surfaceClassName='min-h-[300px]'
                      editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                    />
                  ) : (
                    <MarkdownSplitEditor
                      key={`case-resolver-markdown-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentMarkdown}
                      onChange={handleUpdateDraftDocumentContent}
                      showPreview={editorShowPreview}
                      renderPreviewHtml={(value: string): string => ensureHtmlForPreview(value, 'markdown')}
                      sanitizePreviewHtml={sanitizeHtml}
                      textareaRef={editorTextareaRef}
                      splitRef={editorSplitRef}
                      editorWidth={editorWidth}
                      onEditorWidthChange={setEditorWidth}
                      isDraggingSplitter={isDraggingSplitter}
                      onDraggingSplitterChange={setIsDraggingSplitter}
                      placeholder='Enter document content'
                      textareaClassName='w-full min-h-[300px] rounded-lg border px-4 py-2 font-mono'
                    />
                  )}
                </>
              ) : (
                <DocumentWysiwygEditor
                  key={`case-resolver-wysiwyg-fallback-${editorContentRevisionSeed}`}
                  value={editingDocumentDraft.documentContentHtml}
                  onChange={handleUpdateDraftDocumentContent}
                  allowFontFamily
                  allowTextAlign
                  surfaceClassName='min-h-[300px]'
                  editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                />
              )}

              <div className='flex justify-end gap-2'>
                <Button variant='outline' onClick={handleDiscardFileEditorDraft}>Discard</Button>
                <Button onClick={handleSaveFileEditor} disabled={isMigratingEditorMode}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </AppModal>
      </div>
    </CaseResolverPageProvider>
  );
}
