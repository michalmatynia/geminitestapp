import type { PathConfig } from '@/shared/contracts/ai-paths';

import { normalizeText, toRecord } from './utils';

export const hasParameterInferencePromptStructure = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'prompt') return false;
    const prompt = toRecord(toRecord(node.config)?.['prompt']);
    const template = normalizeText(prompt?.['template']);
    return template.includes('{{title}}') && template.includes('{{content_en}}');
  });
