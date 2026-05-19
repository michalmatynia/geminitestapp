'use client';

import type {
  ChatbotContextItem as ContextItem,
  ChatbotContextDraft as ContextDraft,
} from '@/shared/contracts/chatbot';
import type { FileUploadHelpers } from '@/shared/contracts/ui/base';

import {
  useChatbotContextData,
  useChatbotContextFilters,
  useChatbotContextModals,
  useChatbotContextPersistence,
} from './useChatbotContextState.helpers';
import { useChatbotContextItemActions } from './useChatbotContextState.actions';

export type { ContextItem, ContextDraft };

/**
 * Custom hook providing the aggregate state and interaction handlers for the chatbot context UI.
 * Orchestrates data fetching, filtering, modal state, and persistence operations.
 */
export type ChatbotContextState = {
  contexts: ContextItem[];
  activeIds: string[];
  tagQuery: string;
  setTagQuery: (value: string) => void;
  tagFilters: string[];
  setTagFilters: React.Dispatch<React.SetStateAction<string[]>>;
  uniqueTags: string[];
  filteredContexts: ContextItem[];
  isModalOpen: boolean;
  modalDraft: ContextDraft | null;
  setModalDraft: React.Dispatch<React.SetStateAction<ContextDraft | null>>;
  tagDraft: string;
  setTagDraft: (value: string) => void;
  loading: boolean;
  saving: boolean;
  uploading: boolean;
  openCreateModal: () => void;
  openEditModal: (item: ContextItem) => void;
  closeModal: () => void;
  handleDeleteContext: (id: string) => void;
  handleSaveDraft: () => void;
  handlePdfUpload: (file: File, helpers?: FileUploadHelpers) => Promise<void>;
  handleSaveContexts: () => Promise<void>;
  toggleActive: (id: string, active: boolean) => void;
};

export function useChatbotContextState(): ChatbotContextState {
  const { contexts, setContexts, activeIds, setActiveIds, contextSettingsQuery, hasInitializedData } =
    useChatbotContextData();
  const { tagQuery, setTagQuery, tagFilters, setTagFilters, uniqueTags, filteredContexts } =
    useChatbotContextFilters(contexts);
  const {
    isModalOpen,
    modalDraft,
    setModalDraft,
    tagDraft,
    setTagDraft,
    closeModal,
    openCreateModal,
    openEditModal,
  } = useChatbotContextModals(activeIds);

  const { handleSaveContexts, saveMutation } = useChatbotContextPersistence({ contexts, activeIds });
  const { handleDeleteContext, handleSaveDraft, handlePdfUpload, toggleActive, uploadPdfMutation } =
    useChatbotContextItemActions({ setContexts, setActiveIds, modalDraft, closeModal });

  return {
    contexts, activeIds, tagQuery, setTagQuery, tagFilters, setTagFilters, uniqueTags, filteredContexts,
    isModalOpen, modalDraft, setModalDraft, tagDraft, setTagDraft,
    loading: contextSettingsQuery.isLoading && !hasInitializedData.current,
    saving: saveMutation.isPending, uploading: uploadPdfMutation.isPending,
    openCreateModal, openEditModal, closeModal, handleDeleteContext, handleSaveDraft,
    handlePdfUpload, handleSaveContexts, toggleActive,
  };
}
