// Use consolidated types
import type { Entity, Status } from '@/shared/types/core/base-types';

// Data Import/Export DTOs
export interface ImportJobDto extends Entity {
  type: string;
  status: Status;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  config: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  completedAt: string | null;
}

export interface ExportJobDto extends Entity {
  type: string;
  status: Status;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  config: Record<string, unknown>;
  fileUrl: string | null;
  error: string | null;
  completedAt: string | null;
}

export interface ImportTemplateDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: Record<string, unknown>;
  fieldMappings: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateImportJobDto {
  type: string;
  file: File;
  config?: Record<string, unknown>;
  templateId?: string;
}

export interface CreateExportJobDto {
  type: string;
  config: Record<string, unknown>;
  filters?: Record<string, unknown>;
}

export interface CreateImportTemplateDto {
  name: string;
  description?: string;
  type: string;
  config: Record<string, unknown>;
  fieldMappings: Record<string, string>;
}
