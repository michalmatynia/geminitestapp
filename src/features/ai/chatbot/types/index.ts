export type { SettingRecord } from '@/shared/types/core/base-types';
export type { ChatbotSessionListItem } from './api';

// Re-export DTOs as types for backward compatibility
export type {
  ChatbotMemoryItemDto as ChatbotMemoryItem,
  ChatbotContextSegmentDto as ChatbotContextSegment,
  ChatMessageDto as ChatbotMessageDto,
  CreateChatSessionDto,
  SendMessageDto,
  UpdateChatbotSettingsDto,
  ChatbotSettingsDto,
} from '@/shared/dtos';
