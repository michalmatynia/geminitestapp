'use client';

import type { ChatbotContextUploadResponse } from '@/shared/contracts/chatbot';
import type { SettingRecord } from '@/shared/contracts/settings';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import {
  createCreateMutationV2,
  createListQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { FileUploadHelpers } from '@/shared/contracts/ui';

import * as chatbotApi from '../api';

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
      domain: 'chatbot',
      queryKey,
      tags: ['chatbot', 'context', 'settings'],
      description: 'Loads chatbot context settings.'},
  });
}

export function useSaveChatbotContextMutation(): MutationResult<
  SettingRecord,
  { key: string; value: string; errorLabel: string }
  > {
  const mutationKey = QUERY_KEYS.ai.chatbot.mutation('save-context');
  return createUpdateMutationV2<SettingRecord, { key: string; value: string; errorLabel: string }>({
    mutationFn: ({ key, value, errorLabel }) => chatbotApi.saveSetting(key, value, errorLabel),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useSaveChatbotContextMutation',
      operation: 'update',
      resource: 'chatbot.context.settings',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'context', 'settings', 'save'],
      description: 'Updates chatbot context settings.'},
    invalidateKeys: [QUERY_KEYS.ai.chatbot.settings.allSettings('global-context')],
  });
}

export function useUploadChatbotContextPdfMutation(): MutationResult<
  ChatbotContextUploadResponse,
  { file: File; helpers?: FileUploadHelpers }
  > {
  const mutationKey = QUERY_KEYS.ai.chatbot.mutation('upload-context-pdf');
  return createCreateMutationV2({
    mutationFn: ({ file, helpers }) =>
      chatbotApi.uploadChatbotContextPdf(file, (loaded: number, total?: number) =>
        helpers?.reportProgress(loaded, total)
      ),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useUploadChatbotContextPdfMutation',
      operation: 'create',
      resource: 'chatbot.context.pdf',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'context', 'upload', 'pdf'],
      description: 'Creates chatbot context pdf.'},
  });
}
