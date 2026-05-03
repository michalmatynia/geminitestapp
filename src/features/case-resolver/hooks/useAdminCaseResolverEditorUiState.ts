'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { CaseResolverFileEditDraft } from '@/shared/contracts/case-resolver/file';
import type { EditorDetailsTab, WorkspaceView } from '@/shared/contracts/case-resolver/base';

type AdminCaseResolverEditorUiState = {
  workspaceView: WorkspaceView;
  setWorkspaceView: Dispatch<SetStateAction<WorkspaceView>>;
  editorWidth: number | null;
  setEditorWidth: Dispatch<SetStateAction<number | null>>;
  editorDetailsTab: EditorDetailsTab;
  setEditorDetailsTab: Dispatch<SetStateAction<EditorDetailsTab>>;
  isDraggingSplitter: boolean;
  setIsDraggingSplitter: Dispatch<SetStateAction<boolean>>;
  editorContentRevisionSeed: number;
  setEditorContentRevisionSeed: Dispatch<SetStateAction<number>>;
  editorSplitRef: MutableRefObject<HTMLDivElement | null>;
  editorTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  scanDraftUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  isScanDraftDropActive: boolean;
  setIsScanDraftDropActive: Dispatch<SetStateAction<boolean>>;
  preserveWorkspaceView: (view: WorkspaceView) => void;
};

export function useAdminCaseResolverEditorUiState({
  editingDocumentDraft,
}: {
  editingDocumentDraft: CaseResolverFileEditDraft | null;
}): AdminCaseResolverEditorUiState {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('document');
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [editorDetailsTab, setEditorDetailsTab] = useState<EditorDetailsTab>('document');
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [editorContentRevisionSeed, setEditorContentRevisionSeed] = useState(0);
  const editorSplitRef = useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preserveWorkspaceViewFrameRef = useRef<number | null>(null);
  const scanDraftUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanDraftDropActive, setIsScanDraftDropActive] = useState(false);

  useEffect(() => {
    if (!editingDocumentDraft) return;
    setEditorWidth(null);
    setEditorDetailsTab('document');
    setEditorContentRevisionSeed((value) => value + 1);
  }, [editingDocumentDraft?.id]);

  useEffect(() => {
    return (): void => {
      if (preserveWorkspaceViewFrameRef.current === null) return;
      window.cancelAnimationFrame(preserveWorkspaceViewFrameRef.current);
      preserveWorkspaceViewFrameRef.current = null;
    };
  }, []);

  const preserveWorkspaceView = useCallback((view: WorkspaceView): void => {
    if (preserveWorkspaceViewFrameRef.current !== null) {
      window.cancelAnimationFrame(preserveWorkspaceViewFrameRef.current);
    }
    preserveWorkspaceViewFrameRef.current = window.requestAnimationFrame((): void => {
      preserveWorkspaceViewFrameRef.current = null;
      setWorkspaceView((current: WorkspaceView) => (current === view ? current : view));
    });
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
