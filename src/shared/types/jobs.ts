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

export type ProductAiJob = {
  id: string;
  productId: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  type: string;
  payload: unknown;
  result: ProductAiJobResult | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  product?: {
    name_en: string | null;
    sku: string | null;
  };
};
