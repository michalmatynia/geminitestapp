import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

import {
  buildDocumentPdfMarkup,
  createCaseResolverHistorySnapshotEntry,
  createId,
} from '@/features/case-resolver/utils/caseResolverUtils';
import {
  deriveDocumentContentSync,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
  type DocumentContentCanonical,
} from '@/features/document-editor';
import type {
  CaseResolverDocumentHistoryEntry,
  CaseResolverPartyReference,
  CaseResolverPdfExportRequest,
} from '@/shared/contracts/case-resolver';
import type { FilemakerDatabase } from '@/shared/contracts/filemaker';
import { savePromptExploderDraftPromptFromCaseResolver } from '@/shared/lib/prompt-exploder/bridge';
import { useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
  buildCaseResolverDraftComparableFingerprint,
} from './useCaseResolverState.helpers';
import { logCaseResolverWorkspaceEvent } from '../workspace-persistence';

import type { CaseResolverFileEditDraft } from '../types';


const sanitizeDocumentExportBaseName = (value: string): string => {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Document'
  );
};

const buildPartyAddressBlock = (
  filemakerDatabase: FilemakerDatabase,
  reference: CaseResolverPartyReference | null | undefined
): string => {
  if (!reference) return '';
  const lines: string[] = [];
  if (reference.kind === 'person') {
    const person = filemakerDatabase.persons.find((p) => p.id === reference.id);
    if (!person) return '';
    const name = `${person.firstName} ${person.lastName}`.trim();
    if (name) lines.push(name);
    const streetLine = `${person.street} ${person.streetNumber}`.trim();
    if (streetLine) lines.push(streetLine);
    const cityLine = `${person.postalCode} ${person.city}`.trim();
    if (cityLine) lines.push(cityLine);
    if (person.country.trim()) lines.push(person.country.trim());
  } else if (reference.kind === 'organization') {
    const org = filemakerDatabase.organizations.find((o) => o.id === reference.id);
    if (!org) return '';
    if (org.name.trim()) lines.push(org.name.trim());
    const streetLine = `${org.street} ${org.streetNumber}`.trim();
    if (streetLine) lines.push(streetLine);
    const cityLine = `${org.postalCode} ${org.city}`.trim();
    if (cityLine) lines.push(cityLine);
    if (org.country.trim()) lines.push(org.country.trim());
  }
  return lines.join('\n');
};

const buildDraftPdfPreviewMarkup = (
  draft: CaseResolverFileEditDraft,
  filemakerDatabase: FilemakerDatabase
): string => {
  return buildDocumentPdfMarkup({
    documentDate: draft.documentDate?.isoDate ?? '',
    documentPlace: draft.documentCity ?? null,
    addresserLabel: buildPartyAddressBlock(filemakerDatabase, draft.addresser),
    addresseeLabel: buildPartyAddressBlock(filemakerDatabase, draft.addressee),
    documentContent: draft.documentContentHtml ?? draft.documentContent ?? '',
  });
};

const normalizeSemanticallyEmptyCanonicalContent = (
  canonical: DocumentContentCanonical
): DocumentContentCanonical => {
  if (canonical.plainText.trim().length > 0) return canonical;
  if (
    canonical.html.length === 0 &&
    canonical.markdown.length === 0 &&
    canonical.plainText.length === 0
  ) {
    return canonical;
  }
  return {
    ...canonical,
    html: '',
    markdown: '',
    plainText: '',
  };
};

export const applyCaseResolverWysiwygDraftContentChange = ({
  current,
  nextHtml,
}: {
  current: CaseResolverFileEditDraft;
  nextHtml: string;
}): CaseResolverFileEditDraft => {
  const canonical = normalizeSemanticallyEmptyCanonicalContent(
    deriveDocumentContentSync({
      mode: 'wysiwyg',
      value: nextHtml,
      previousMarkdown: current.documentContentMarkdown ?? '',
      previousHtml: current.documentContentHtml ?? '',
    })
  );
  const nextWarnings = canonical.warnings;
  const nextStoredContent = toStorageDocumentValue(canonical);
  const now = new Date().toISOString();
  const nextDraft: CaseResolverFileEditDraft = {
    ...current,
    editorType: 'wysiwyg',
    documentContentFormatVersion: 1,
    documentContent: nextStoredContent,
    documentContentMarkdown: canonical.markdown,
    documentContentHtml: canonical.html,
    documentContentPlainText: canonical.plainText,
    documentConversionWarnings: nextWarnings,
    lastContentConversionAt: now,
  };
  const currentFingerprint = buildCaseResolverDraftComparableFingerprint(current);
  const nextFingerprint = buildCaseResolverDraftComparableFingerprint(nextDraft);
  if (currentFingerprint === nextFingerprint) {
    if (nextHtml !== (current.documentContentHtml ?? '')) {
      logCaseResolverWorkspaceEvent({
        source: 'case_view_document_editor',
        action: 'document_editor_onchange_semantic_noop',
        message: `file_id=${current.id}`,
      });
    }
    return current;
  }
  return nextDraft;
};

export const applyCaseResolverScanDraftContentChange = ({
  current,
  nextMarkdown,
}: {
  current: CaseResolverFileEditDraft;
  nextMarkdown: string;
}): CaseResolverFileEditDraft => {
  const canonical = normalizeSemanticallyEmptyCanonicalContent(
    deriveDocumentContentSync({
      mode: 'markdown',
      value: nextMarkdown,
      previousMarkdown: current.documentContentMarkdown ?? '',
      previousHtml: current.documentContentHtml ?? '',
    })
  );
  const nextWarnings = canonical.warnings;
  const nextStoredContent = toStorageDocumentValue(canonical);
  const now = new Date().toISOString();
  const nextDraft: CaseResolverFileEditDraft = {
    ...current,
    editorType: 'markdown',
    documentContentFormatVersion: 1,
    documentContent: nextStoredContent,
    documentContentMarkdown: canonical.markdown,
    documentContentHtml: canonical.html,
    documentContentPlainText: canonical.plainText,
    documentConversionWarnings: nextWarnings,
    lastContentConversionAt: now,
  };
  const currentFingerprint = buildCaseResolverDraftComparableFingerprint(current);
  const nextFingerprint = buildCaseResolverDraftComparableFingerprint(nextDraft);
  if (currentFingerprint === nextFingerprint) {
    if (nextMarkdown !== (current.documentContentMarkdown ?? '')) {
      logCaseResolverWorkspaceEvent({
        source: 'case_view_scan_editor',
        action: 'scan_editor_onchange_semantic_noop',
        message: `file_id=${current.id}`,
      });
    }
    return current;
  }
  return nextDraft;
};

export function useAdminCaseResolverDocumentActions({
  editingDocumentDraft,
  setEditingDocumentDraft,
  filemakerDatabase,
  router,
  setEditorContentRevisionSeed,
  handleRunScanFileOcr,
  scanDraftUploadInputRef,
  isUploadingScanDraftFiles,
  handleUploadScanFiles,
}: {
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  filemakerDatabase: FilemakerDatabase;
  router: ReturnType<typeof useRouter>;
  setEditorContentRevisionSeed: React.Dispatch<React.SetStateAction<number>>;
  handleRunScanFileOcr: (id: string) => Promise<void>;
  scanDraftUploadInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isUploadingScanDraftFiles: boolean;
  handleUploadScanFiles: (id: string, files: File[]) => Promise<void>;
}) {
  const { toast } = useToast();
  const printInFlightRef = useRef(false);

  const handleOpenPromptExploderForDraft = useCallback((): void => {
    if (!editingDocumentDraft) return;
    if (editingDocumentDraft.isLocked) {
      toast('Document is locked. Unlock it in Case Resolver before opening Prompt Exploder.', {
        variant: 'warning',
      });
      return;
    }
    const promptExploderSessionId = createId('case-prompt-session');
    const promptSource = (() => {
      const sourceHtml =
        typeof editingDocumentDraft.documentContentHtml === 'string' &&
        editingDocumentDraft.documentContentHtml.trim().length > 0
          ? editingDocumentDraft.documentContentHtml
          : ensureSafeDocumentHtml(editingDocumentDraft.documentContent ?? '');
      const canonical = deriveDocumentContentSync({
        mode: 'wysiwyg',
        value: sourceHtml,
        previousMarkdown: editingDocumentDraft.documentContentMarkdown ?? '',
        previousHtml: editingDocumentDraft.documentContentHtml ?? '',
      });
      return (
        canonical.plainText ||
        editingDocumentDraft.documentContentPlainText ||
        editingDocumentDraft.documentContent ||
        editingDocumentDraft.documentContentMarkdown ||
        ''
      ).trim();
    })();
    if (!promptSource) {
      toast('Add document content before opening Prompt Exploder.', { variant: 'warning' });
      return;
    }

    savePromptExploderDraftPromptFromCaseResolver(promptSource, {
      fileId: editingDocumentDraft.id,
      fileName: editingDocumentDraft.name?.trim() || editingDocumentDraft.id,
      sessionId: promptExploderSessionId,
      documentVersionAtStart: editingDocumentDraft.documentContentVersion,
    });
    const returnTo = `/admin/case-resolver?openEditor=1&fileId=${encodeURIComponent(
      editingDocumentDraft.id
    )}&promptExploderSessionId=${encodeURIComponent(promptExploderSessionId)}`;
    router.push(`/admin/prompt-exploder?returnTo=${encodeURIComponent(returnTo)}`);
  }, [editingDocumentDraft, router, toast]);

  const handleCopyDraftFileId = useCallback(async (): Promise<void> => {
    if (!editingDocumentDraft) return;
    try {
      await navigator.clipboard.writeText(editingDocumentDraft.id);
      toast('File ID copied to clipboard.', { variant: 'success' });
    } catch (_error: unknown) {
      toast('Failed to copy file ID.', { variant: 'error' });
    }
  }, [editingDocumentDraft, toast]);

  const handlePreviewDraftPdf = useCallback((): void => {
    if (!editingDocumentDraft) return;
    try {
      const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft, filemakerDatabase);
      if (typeof window === 'undefined') return;
      const previewBlob = new Blob([markup], { type: 'text/html;charset=utf-8' });
      const previewUrl = URL.createObjectURL(previewBlob);
      const previewWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
      if (!previewWindow) {
        URL.revokeObjectURL(previewUrl);
        throw new Error('Preview popup was blocked by the browser.');
      }
      window.setTimeout((): void => {
        URL.revokeObjectURL(previewUrl);
      }, 120_000);
    } catch (_error: unknown) {
      toast(_error instanceof Error ? _error.message : 'Failed to generate PDF preview.', {
        variant: 'error',
      });
    }
  }, [editingDocumentDraft, filemakerDatabase, toast]);

  const printDocumentMarkup = useCallback(
    (markup: string): void => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      if (printInFlightRef.current) return;
      printInFlightRef.current = true;
      const frame = document.createElement('iframe');
      let hasTriggeredPrint = false;
      const releasePrintLockTimeout = window.setTimeout((): void => {
        printInFlightRef.current = false;
      }, 10_000);
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';

      const cleanup = (): void => {
        window.setTimeout((): void => {
          window.clearTimeout(releasePrintLockTimeout);
          printInFlightRef.current = false;
          if (frame.parentNode) {
            frame.parentNode.removeChild(frame);
          }
        }, 300);
      };

      frame.onload = (): void => {
        if (hasTriggeredPrint) return;
        hasTriggeredPrint = true;
        window.setTimeout((): void => {
          const frameWindow = frame.contentWindow;
          if (!frameWindow) {
            toast('Failed to open the print dialog.', { variant: 'error' });
            cleanup();
            return;
          }
          try {
            frameWindow.focus();
            frameWindow.print();
          } catch (_error: unknown) {
            toast('Failed to open the print dialog.', { variant: 'error' });
          }
          cleanup();
        }, 120);
      };

      frame.srcdoc = markup;
      document.body.appendChild(frame);
    },
    [toast]
  );

  const handlePrintDraftDocument = useCallback((): void => {
    if (!editingDocumentDraft) return;
    try {
      const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft, filemakerDatabase);
      printDocumentMarkup(markup);
    } catch (_error: unknown) {
      toast(_error instanceof Error ? _error.message : 'Failed to generate printable document.', {
        variant: 'error',
      });
    }
  }, [editingDocumentDraft, filemakerDatabase, printDocumentMarkup, toast]);

  const handleExportDraftPdf = useCallback(async (): Promise<void> => {
    if (!editingDocumentDraft) return;
    try {
      const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft, filemakerDatabase);
      const documentBaseName = sanitizeDocumentExportBaseName(
        editingDocumentDraft.name || 'Case Resolver Document'
      );
      const payload: CaseResolverPdfExportRequest = {
        html: markup,
        filename: `${documentBaseName}.pdf`,
      };
      const response = await fetch('/api/case-resolver/documents/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let message = `Failed to export PDF (${response.status}).`;
        try {
          const payload = (await response.json()) as {
            error?: { message?: string };
            message?: string;
          };
          message = payload.error?.message ?? payload.message ?? message;
        } catch (_error: unknown) {
          // keep fallback message
        }
        throw new Error(message);
      }
      const pdfBlob = await response.blob();
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${documentBaseName}.pdf`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout((): void => {
        URL.revokeObjectURL(downloadUrl);
      }, 500);
      toast('PDF exported.', { variant: 'success' });
    } catch (_error: unknown) {
      toast(_error instanceof Error ? _error.message : 'Failed to export PDF.', {
        variant: 'error',
      });
    }
  }, [editingDocumentDraft, filemakerDatabase, toast]);

  const handleTriggerScanDraftUpload = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    if (editingDocumentDraft.isLocked) return;
    if (isUploadingScanDraftFiles) return;
    scanDraftUploadInputRef.current?.click();
  }, [editingDocumentDraft, isUploadingScanDraftFiles, scanDraftUploadInputRef]);

  const uploadScanDraftFiles = useCallback(
    (files: File[]): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (editingDocumentDraft.isLocked) {
        toast('Document is locked. Unlock it before uploading files.', { variant: 'warning' });
        return;
      }
      if (files.length === 0) return;
      void handleUploadScanFiles(editingDocumentDraft.id, files).catch((_error: unknown) => {
        toast(_error instanceof Error ? _error.message : 'Failed to upload scan images.', {
          variant: 'error',
        });
      });
    },
    [editingDocumentDraft, handleUploadScanFiles, toast]
  );

  const handleDeleteScanDraftSlot = useCallback(
    (slotId: string): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (editingDocumentDraft.isLocked) return;
      const nextSlots = (editingDocumentDraft.scanSlots ?? []).filter((s) => s.id !== slotId);
      setEditingDocumentDraft((current) => (current ? { ...current, scanSlots: nextSlots } : null));
    },
    [editingDocumentDraft, setEditingDocumentDraft]
  );

  const handleRunScanDraftOcr = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    if (editingDocumentDraft.isLocked) return;
    void handleRunScanFileOcr(editingDocumentDraft.id).catch((_error: unknown) => {
      toast(_error instanceof Error ? _error.message : 'Failed to run OCR.', { variant: 'error' });
    });
  }, [editingDocumentDraft, handleRunScanFileOcr, toast]);

  const handleUseHistoryEntry = useCallback(
    (entry: CaseResolverDocumentHistoryEntry): void => {
      if (!editingDocumentDraft || editingDocumentDraft.isLocked) return;
      const now = new Date().toISOString();
      const currentSnapshot = createCaseResolverHistorySnapshotEntry({
        savedAt: now,
        documentContentVersion: editingDocumentDraft.documentContentVersion ?? 1,
        activeDocumentVersion: editingDocumentDraft.activeDocumentVersion ?? 'original',
        editorType: editingDocumentDraft.editorType,
        documentContent: editingDocumentDraft.documentContent,
        documentContentMarkdown: editingDocumentDraft.documentContentMarkdown,
        documentContentHtml: editingDocumentDraft.documentContentHtml,
        documentContentPlainText: editingDocumentDraft.documentContentPlainText,
      });
      const nextHistory = [currentSnapshot, ...(editingDocumentDraft.documentHistory ?? [])]
        .filter((e): e is CaseResolverDocumentHistoryEntry => e !== null)
        .slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);

      setEditingDocumentDraft((current) =>
        current
          ? {
            ...current,
            activeDocumentVersion: entry.activeDocumentVersion,
            editorType: entry.editorType,
            documentContent: entry.documentContent,
            documentContentMarkdown: entry.documentContentMarkdown,
            documentContentHtml: entry.documentContentHtml,
            documentContentPlainText: entry.documentContentPlainText,
            documentHistory: nextHistory,
          }
          : null
      );

      setEditorContentRevisionSeed((v) => v + 1);
      toast('History entry loaded.', { variant: 'info' });
    },
    [editingDocumentDraft, setEditingDocumentDraft, setEditorContentRevisionSeed, toast]
  );

  const handleUpdateDraftDocumentContent = useCallback(
    (next: string): void => {
      setEditingDocumentDraft((current) => {
        if (!current) return current;
        if (current.isLocked) return current;
        if (current.fileType === 'scanfile') {
          return applyCaseResolverScanDraftContentChange({
            current,
            nextMarkdown: next,
          });
        }
        return applyCaseResolverWysiwygDraftContentChange({
          current,
          nextHtml: next,
        });
      });
    },
    [setEditingDocumentDraft]
  );

  const applyDraftCanonicalContent = useCallback(
    (input: {
      value: string;
      markdown?: string | undefined;
      html?: string | undefined;
      warnings?: string[] | undefined;
    }): void => {
      setEditingDocumentDraft((current) => {
        if (!current) return current;
        if (current.isLocked) return current;
        const resolvedMode: 'markdown' | 'wysiwyg' =
          current.fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
        const canonical: DocumentContentCanonical = deriveDocumentContentSync({
          mode: resolvedMode,
          value: resolvedMode === 'markdown' ? (input.markdown ?? input.value) : input.value,
          previousMarkdown: input.markdown ?? current.documentContentMarkdown,
          previousHtml: input.html ?? current.documentContentHtml,
        });
        const mergedWarnings = input.warnings
          ? Array.from(new Set([...canonical.warnings, ...input.warnings]))
          : canonical.warnings;
        const nextStoredContent = toStorageDocumentValue(canonical);
        const hasMeaningfulDraftChange =
          current.editorType !== canonical.mode ||
          current.documentContentFormatVersion !== 1 ||
          current.documentContent !== nextStoredContent ||
          current.documentContentMarkdown !== canonical.markdown ||
          current.documentContentHtml !== canonical.html ||
          current.documentContentPlainText !== canonical.plainText ||
          JSON.stringify(current.documentConversionWarnings) !== JSON.stringify(mergedWarnings);
        if (!hasMeaningfulDraftChange) {
          return current;
        }
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
    },
    [setEditingDocumentDraft]
  );

  return {
    handleOpenPromptExploderForDraft,
    handleCopyDraftFileId,
    handlePreviewDraftPdf,
    handlePrintDraftDocument,
    handleExportDraftPdf,
    handleTriggerScanDraftUpload,
    uploadScanDraftFiles,
    handleDeleteScanDraftSlot,
    handleRunScanDraftOcr,
    handleUseHistoryEntry,
    handleUpdateDraftDocumentContent,
    applyDraftCanonicalContent,
    printDocumentMarkup,
  };
}
