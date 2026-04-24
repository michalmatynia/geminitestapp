import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

export const STARTER_TRANSLATION_EN_PL_PATH_ID = 'path_96708d';

export const isTranslationEnPlTriggerButton = (button: AiTriggerButtonRecord): boolean => {
  if ((button.pathId?.trim() ?? '') === STARTER_TRANSLATION_EN_PL_PATH_ID) {
    return true;
  }

  const labels = [button.name, button.display.label]
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
    .filter((v): v is string => v !== '');
  return labels.some(
    (label) => label.includes('translate en->pl') || label.includes('translation en->pl')
  );
};
