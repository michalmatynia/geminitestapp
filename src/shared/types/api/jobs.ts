import type { Entity, Status } from '../core/base-types';

export type ProductAiJobType =
  | "description_generation"
  | "translation"
  | "graph_model"
  | "db_sync"
  | "base64_all"
  | "base_images_sync_all";

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

// Updated to use consolidated Status type
export interface ProductAiJob extends Entity {
  productId: string;
  status: Status;
  type: string;
  payload: unknown;
  result: ProductAiJobResult | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  product?: {
    name_en: string | null;
    sku: string | null;
  };
}