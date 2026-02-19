import type {
  DocumentationModuleIdDto,
  DocumentationEntryDto,
  DocumentationEntryKeyDto,
} from '@/shared/contracts/documentation';

export const DOCUMENTATION_MODULE_IDS = {
  aiPaths: 'ai-paths',
  cms: 'cms',
  dataImportExport: 'data-import-export',
  imageStudio: 'image-studio',
  observability: 'observability',
  products: 'products',
  promptEngine: 'prompt-engine',
  promptExploder: 'prompt-exploder',
  validator: 'validator',
  vectorDrawing: 'vector-drawing',
} as const;

export type BuiltInDocumentationModuleId =
  (typeof DOCUMENTATION_MODULE_IDS)[keyof typeof DOCUMENTATION_MODULE_IDS];

export type DocumentationModuleId = DocumentationModuleIdDto;

export type DocumentationEntry = DocumentationEntryDto;

export type DocumentationEntryKey = DocumentationEntryKeyDto;
