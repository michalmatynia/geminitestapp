import {
  DOCUMENTATION_MODULE_IDS as SHARED_DOCUMENTATION_MODULE_IDS,
  type DocumentationModuleId as SharedDocumentationModuleId,
} from '@/shared/contracts/documentation';

export const DOCUMENTATION_MODULE_IDS = SHARED_DOCUMENTATION_MODULE_IDS;

export type DocumentationModuleId = SharedDocumentationModuleId;

export type DocumentationEntry = {
  id: string;
  moduleId: DocumentationModuleId;
  title: string;
  summary: string;
  section?: string;
  aliases: string[];
  docPath?: string;
  tags?: string[];
};

export type DocumentationEntryKey = `${DocumentationModuleId}:${string}`;
