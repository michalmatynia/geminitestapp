import type { ProductAiJobDto } from '../../dtos/jobs';

export type ProductAiJobType =
  | 'description_generation'
  | 'translation'
  | 'graph_model'
  | 'db_sync'
  | 'db_backup'
  | 'base64_all'
  | 'base_images_sync_all'
  | 'description'
  | 'tags'
  | 'categories'
  | 'parameters';

export type ProductAiJobResult = {
  visionModel?: string;
  generationModel?: string;
  visionOutputEnabled?: boolean;
  generationOutputEnabled?: boolean;
  analysisInitial?: string;
  analysis?: string;
  analysisFinal?: string;
  descriptionInitial?: string;
  description?: string;
  descriptionFinal?: string;
  translationModel?: string;
  sourceLanguage?: string;
  targetLanguages?: string[];
  translations?: Record<string, { name?: string; description?: string }>;
  [key: string]: unknown;
};

/**
 * AI job record for a product.
 * Inherits standard fields from ProductAiJobDto.
 */
export interface ProductAiJob extends Omit<ProductAiJobDto, 'createdAt' | 'updatedAt' | 'result'> {
  id: string;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  result: ProductAiJobResult | null;
  payload: unknown;
  errorMessage?: string | null;
  finishedAt?: string | null;
  product?: {
    name_en: string | null;
    sku: string | null;
  };
}
