import type {
  DocumentationModuleIdDto,
  DocumentationEntryDto,
  DocumentationEntryKeyDto,
} from '@/shared/contracts/documentation';

export const DOCUMENTATION_MODULE_IDS = {
  imageStudio: 'image-studio',
  promptExploder: 'prompt-exploder',
  validator: 'validator',
} as const;

export type BuiltInDocumentationModuleId =
  (typeof DOCUMENTATION_MODULE_IDS)[keyof typeof DOCUMENTATION_MODULE_IDS];

export type DocumentationModuleId = DocumentationModuleIdDto;

export type DocumentationEntry = DocumentationEntryDto;

export type DocumentationEntryKey = DocumentationEntryKeyDto;
