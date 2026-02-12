import { DtoBase, CreateDto, UpdateDto } from '../types/base';

// Drafter DTOs
export interface DraftDto extends DtoBase {
  title: string;
  content: Record<string, unknown>;
  type: string;
  status: 'draft' | 'published' | 'archived';
  authorId: string;
  publishedAt: string | null;
}

export type CreateDraftDto = CreateDto<DraftDto>;
export type UpdateDraftDto = UpdateDto<DraftDto>;

export interface PublishDraftDto {
  id: string;
  publishedAt?: string;
}
