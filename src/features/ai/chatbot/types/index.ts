// Re-export DTOs as types for backward compatibility
export type {
  ChatbotSessionDto as ChatbotSessionListItem,
  ChatbotMemoryItemDto as ChatbotMemoryItem,
  ChatbotContextSegmentDto as ChatbotContextSegment,
  ChatbotSettingsDto as SettingRecord,
  ChatbotMessageDto,
  CreateChatSessionDto,
  SendMessageDto,
  UpdateChatbotSettingsDto
} from "@/shared/dtos";
