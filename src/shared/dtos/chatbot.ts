import { DtoBase } from '../types/base';

// Chatbot DTOs
export interface ChatbotSessionDto extends DtoBase {
  userId: string | null;
  title: string;
  messageCount: number;
}

export interface ChatbotMessageDto {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ChatbotMemoryItemDto extends DtoBase {
  key: string;
  value: string;
  type: string;
}

export interface ChatbotContextSegmentDto {
  id: string;
  content: string;
  type: string;
  priority: number;
  createdAt: string;
}

export interface ChatbotSettingsDto {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableMemory: boolean;
  enableContext: boolean;
}

export interface CreateChatSessionDto {
  title?: string;
  userId?: string;
}

export interface SendMessageDto {
  sessionId: string;
  content: string;
  role?: 'user' | 'system';
}

export interface UpdateChatbotSettingsDto {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  enableMemory?: boolean;
  enableContext?: boolean;
}
