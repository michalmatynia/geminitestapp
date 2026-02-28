import { useCallback, useEffect, useRef, useState } from 'react';
import { type EditorDetailsTab, type WorkspaceView } from '../types';
import type { CaseResolverFileEditDraft } from '@/shared/contracts/case-resolver';

export function useAdminCaseResolverEditorUiState({
  editingDocumentDraft,
}: {
  editingDocumentDraft: CaseResolverFileEditDraft | null;
}) {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('document');
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [editorDetailsTab, setEditorDetailsTab] = useState<EditorDetailsTab>('document');
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [editorContentRevisionSeed, setEditorContentRevisionSeed] = useState(0);
  const editorSplitRef = useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scanDraftUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanDraftDropActive, setIsScanDraftDropActive] = useState(false);

  useEffect(() => {
    if (!editingDocumentDraft) return;
    setEditorWidth(null);
    setEditorDetailsTab('document');
    setEditorContentRevisionSeed((value) => value + 1);
  }, [editingDocumentDraft?.id]);

  const preserveWorkspaceView = useCallback((view: WorkspaceView): void => {
    window.setTimeout((): void => {
      setWorkspaceView((current) => (current === view ? current : view));
    }, 0);
  }, []);

  return {
    workspaceView,
    setWorkspaceView,
    editorWidth,
    setEditorWidth,
    editorDetailsTab,
    setEditorDetailsTab,
    isDraggingSplitter,
    setIsDraggingSplitter,
    editorContentRevisionSeed,
    setEditorContentRevisionSeed,
    editorSplitRef,
    editorTextareaRef,
    scanDraftUploadInputRef,
    isScanDraftDropActive,
    setIsScanDraftDropActive,
    preserveWorkspaceView,
  };
}
