export type { SettingRecord } from "@/shared/types/core/base-types";

// Re-export DTOs as types for backward compatibility
export type {
  ChatbotSessionDto as ChatbotSessionListItem,
  ChatbotMemoryItemDto as ChatbotMemoryItem,
  ChatbotContextSegmentDto as ChatbotContextSegment,
  ChatbotMessageDto,
  CreateChatSessionDto,
  SendMessageDto,
  UpdateChatbotSettingsDto,
  ChatbotSettingsDto,
} from "@/shared/dtos";
