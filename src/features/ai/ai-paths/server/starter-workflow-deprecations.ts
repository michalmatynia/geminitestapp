import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

export const DEPRECATED_STARTER_WORKFLOW_PATH_IDS = new Set<string>([
  'path_base_export_blwo_v1',
  'path_72l57d',
]);

export const DEPRECATED_STARTER_WORKFLOW_TRIGGER_BUTTON_IDS = new Set<string>([
  '5f36f340-3d89-4f6f-a08f-2387f380b90b',
  'f5af953f-632d-4704-adec-cc7e58aa68c6',
]);

export const isDeprecatedStarterWorkflowPathId = (
  pathId: string | null | undefined
): boolean => typeof pathId === 'string' && DEPRECATED_STARTER_WORKFLOW_PATH_IDS.has(pathId.trim());

export const isDeprecatedStarterWorkflowTriggerButton = (
  button: Pick<AiTriggerButtonRecord, 'id' | 'pathId'> | null | undefined
): boolean => {
  if (!button) return false;
  const buttonId = typeof button.id === 'string' ? button.id.trim() : '';
  return (
    DEPRECATED_STARTER_WORKFLOW_TRIGGER_BUTTON_IDS.has(buttonId) ||
    isDeprecatedStarterWorkflowPathId(button.pathId)
  );
};
