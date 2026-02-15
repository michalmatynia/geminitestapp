'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ChatbotContextSegmentDto } from '@/shared/contracts/chatbot';
import { createCreateMutation, createListQuery } from '@/shared/lib/query-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ListQuery, MutationResult } from '@/shared/types/query-result-types';
import type { FileUploadHelpers } from '@/shared/ui';

import * as chatbotApi from '../api';

export function useChatbotContextSettingsQuery(): ListQuery<any> {
  return createListQuery({
    queryKey: QUERY_KEYS.ai.chatbot.settings.allSettings('global-context'),
    queryFn: chatbotApi.fetchSettings,
    options: {
      staleTime: 60_000,
    },
  });
}

export function useSaveChatbotContextMutation(): MutationResult<
  { key: string; value: string },
  { key: string; value: string; errorLabel: string }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation<any, { key: string; value: string; errorLabel: string }>({
    mutationFn: ({ key, value, errorLabel }) => chatbotApi.saveSetting(key, value, errorLabel),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ai.chatbot.settings.allSettings('global-context'),
        });
      },
    },
  });
}

export function useUploadChatbotContextPdfMutation(): MutationResult<
  { segments: ChatbotContextSegmentDto[] },
  { file: File; helpers?: FileUploadHelpers }
  > {
  return createCreateMutation({
    mutationFn: ({ file, helpers }) =>
      chatbotApi.uploadChatbotContextPdf(
        file,
        (loaded: number, total?: number) => helpers?.reportProgress(loaded, total)
      ),
  });
}
