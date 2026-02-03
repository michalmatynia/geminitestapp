import { DtoBase } from '../types/base';

// Drafter DTOs
export interface DraftDto extends DtoBase {
  title: string;
  content: Record<string, unknown>;
  type: string;
  status: 'draft' | 'published' | 'archived';
  authorId: string;
  publishedAt: string | null;
}

export interface CreateDraftDto {
  title: string;
  content: Record<string, unknown>;
  type: string;
  status?: 'draft' | 'published';
}

export interface UpdateDraftDto {
  title?: string;
  content?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'archived';
}

export interface PublishDraftDto {
  id: string;
  publishedAt?: string;
}
