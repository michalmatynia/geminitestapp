import type { AiTriggerButtonDto } from '../../dtos/ai-trigger-buttons';

export type {
  AiTriggerButtonLocation,
  AiTriggerButtonMode,
  AiTriggerButtonDisplay
} from '../../dtos/ai-trigger-buttons';

/**
 * @deprecated Use AiTriggerButtonDto from @/shared/dtos instead
 */
export type AiTriggerButtonRecord = AiTriggerButtonDto;
