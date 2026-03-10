import type { PathConfig } from '@/shared/contracts/ai-paths';

import {
  getStarterWorkflowRegistry,
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '../starter-workflows';

import type { AiPathTemplateRegistryEntry } from '../starter-workflows';

export type AiPathTemplate = Pick<
  AiPathTemplateRegistryEntry,
  'templateId' | 'name' | 'description'
>;

export const PATH_TEMPLATES: AiPathTemplate[] = getStarterWorkflowRegistry().map((entry) => ({
  templateId: entry.templateId,
  name: entry.name,
  description: entry.description,
}));

export const buildPathConfigFromTemplate = (id: string, template: AiPathTemplate): PathConfig => {
  const entry = getStarterWorkflowTemplateById(template.templateId);
  if (!entry) {
    throw new Error(`Unknown AI Path template: ${template.templateId}`);
  }
  return materializeStarterWorkflowPathConfig(entry, {
    pathId: id,
    seededDefault: false,
  });
};
