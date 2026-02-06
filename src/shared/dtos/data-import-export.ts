// Use consolidated types
import type { Status } from '@/shared/types/core/base-types';

import { DtoBase, NamedDto } from '../types/base';

// Data Import/Export DTOs
export interface ImportJobDto extends DtoBase {
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

export interface ExportJobDto extends DtoBase {
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

export interface ImportTemplateDto extends NamedDto {
  type: string;
  config: Record<string, unknown>;
  fieldMappings: Record<string, string>;
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
