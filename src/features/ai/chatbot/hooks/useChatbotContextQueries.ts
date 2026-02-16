'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ChatbotContextSegmentDto } from '@/shared/contracts/chatbot';
import { createCreateMutationV2, createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ListQuery, MutationResult } from '@/shared/types/query-result-types';
import type { FileUploadHelpers } from '@/shared/ui';

import * as chatbotApi from '../api';

import type { SettingRecord } from '../types';

export function useChatbotContextSettingsQuery(): ListQuery<SettingRecord> {
  const queryKey = QUERY_KEYS.ai.chatbot.settings.allSettings('global-context');
  return createListQueryV2({
    queryKey,
    queryFn: chatbotApi.fetchSettings,
    staleTime: 60_000,
    meta: {
      source: 'chatbot.hooks.useChatbotContextSettingsQuery',
      operation: 'list',
      resource: 'chatbot.context.settings',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'context', 'settings'],
    },
  });
}

export function useSaveChatbotContextMutation(): MutationResult<
  SettingRecord,
  { key: string; value: string; errorLabel: string }
  > {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.ai.chatbot.mutation('save-context');
  return createUpdateMutationV2<SettingRecord, { key: string; value: string; errorLabel: string }>({
    mutationFn: ({ key, value, errorLabel }) => chatbotApi.saveSetting(key, value, errorLabel),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useSaveChatbotContextMutation',
      operation: 'update',
      resource: 'chatbot.context.settings',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'context', 'settings', 'save'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ai.chatbot.settings.allSettings('global-context'),
      });
    },
  });
}

export function useUploadChatbotContextPdfMutation(): MutationResult<
  { segments: ChatbotContextSegmentDto[] },
  { file: File; helpers?: FileUploadHelpers }
  > {
  const mutationKey = QUERY_KEYS.ai.chatbot.mutation('upload-context-pdf');
  return createCreateMutationV2({
    mutationFn: ({ file, helpers }) =>
      chatbotApi.uploadChatbotContextPdf(
        file,
        (loaded: number, total?: number) => helpers?.reportProgress(loaded, total)
      ),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useUploadChatbotContextPdfMutation',
      operation: 'upload',
      resource: 'chatbot.context.pdf',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'context', 'upload', 'pdf'],
    },
  });
}
