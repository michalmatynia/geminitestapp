'use client';

import { useCallback } from 'react';

import type {
  ChatbotContextItem as ContextItem,
  ChatbotContextDraft as ContextDraft,
} from '@/shared/contracts/chatbot';
import type { FileUploadHelpers } from '@/shared/contracts/ui/base';
import { useToast } from '@/shared/ui/primitives.public';

import {
  useUploadChatbotContextPdfMutation,
} from './useChatbotContextQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function useChatbotPdfUpload({
  setContexts,
  setActiveIds,
}: {
  setContexts: React.Dispatch<React.SetStateAction<ContextItem[]>>;
  setActiveIds: React.Dispatch<React.SetStateAction<string[]>>;
}): {
  handlePdfUpload: (file: File, helpers?: FileUploadHelpers) => Promise<void>;
  uploadPdfMutation: ReturnType<typeof useUploadChatbotContextPdfMutation>;
} {
  const { toast } = useToast();
  const uploadPdfMutation = useUploadChatbotContextPdfMutation();

  const handlePdfUpload = useCallback(async (file: File, helpers?: FileUploadHelpers): Promise<void> => {
    try {
      const data = await uploadPdfMutation.mutateAsync({
        file,
        ...(helpers !== undefined && { helpers }),
      });
      if (data.segments.length === 0) {
        toast('No text found in PDF.', { variant: 'info' });
        return;
      }
      const now = new Date().toISOString();
      const nextItems: ContextItem[] = data.segments.map((segment) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: segment.title,
        content: segment.content,
        tags: ['pdf'],
        source: 'pdf',
        createdAt: now,
      }));
      setContexts((prev) => [...prev, ...nextItems]);
      setActiveIds((prev) => [...prev, ...nextItems.map((item) => item.id)]);
      toast('PDF added to context list', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to parse PDF.', { variant: 'error' });
    }
  }, [uploadPdfMutation, toast, setContexts, setActiveIds]);

  return { handlePdfUpload, uploadPdfMutation };
}

export function useChatbotContextItemActions({
  setContexts,
  setActiveIds,
  modalDraft,
  closeModal,
}: {
  setContexts: React.Dispatch<React.SetStateAction<ContextItem[]>>;
  setActiveIds: React.Dispatch<React.SetStateAction<string[]>>;
  modalDraft: ContextDraft | null;
  closeModal: () => void;
}): {
  handleDeleteContext: (id: string) => void;
  handleSaveDraft: () => void;
  handlePdfUpload: (file: File, helpers?: FileUploadHelpers) => Promise<void>;
  toggleActive: (id: string, active: boolean) => void;
  uploadPdfMutation: ReturnType<typeof useUploadChatbotContextPdfMutation>;
} {
  const { handlePdfUpload, uploadPdfMutation } = useChatbotPdfUpload({ setContexts, setActiveIds });

  const handleDeleteContext = useCallback(
    (id: string): void => {
      setContexts((prev) => prev.filter((item) => item.id !== id));
      setActiveIds((prev) => prev.filter((item) => item !== id));
      if (modalDraft?.id === id) closeModal();
    },
    [modalDraft?.id, closeModal, setContexts, setActiveIds]
  );

  const handleSaveDraft = useCallback((): void => {
    if (modalDraft === null) return;
    const nextItem: ContextItem = {
      id: modalDraft.id,
      title: modalDraft.title,
      content: modalDraft.content,
      source: modalDraft.source,
      createdAt: modalDraft.createdAt,
      tags: modalDraft.tags,
    };

    setContexts((prev) => {
      const exists = prev.some((item) => item.id === modalDraft.id);
      return exists
        ? prev.map((item) => (item.id === modalDraft.id ? nextItem : item))
        : [...prev, nextItem];
    });
    setActiveIds((prev) => {
      const without = prev.filter((item) => item !== modalDraft.id);
      return modalDraft.active ? [...without, modalDraft.id] : without;
    });
    closeModal();
  }, [modalDraft, closeModal, setContexts, setActiveIds]);

  const toggleActive = useCallback(
    (id: string, active: boolean): void => {
      setActiveIds((prev) => (active ? [...prev, id] : prev.filter((item) => item !== id)));
    },
    [setActiveIds]
  );

  return { handleDeleteContext, handleSaveDraft, handlePdfUpload, toggleActive, uploadPdfMutation };
}
