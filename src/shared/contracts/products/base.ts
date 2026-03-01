export const PRODUCT_SIMPLE_PARAMETER_ID_PREFIX = 'sp:';
export const PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY = 'product_studio_default_project_id';

/**
 * Product AI Job DTOs
 */
export interface ProductAiJobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  result?: unknown;
  errorMessage?: string;
  progress?: number;
}
