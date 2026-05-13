import type { LabeledOptionDto } from '@/shared/contracts/base';
import { AGENT_PERSONA_MOOD_PRESETS } from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { PersonaMemorySourceType } from '@/shared/contracts/persona-memory';

export const PERSONA_MEMORY_SOURCE_OPTIONS: Array<LabeledOptionDto<PersonaMemorySourceType | 'all'>> = [
  { value: 'all', label: 'All sources' },
  { value: 'chat_message', label: 'Chat messages' },
  { value: 'chat_session', label: 'Chat sessions' },
  { value: 'agent_memory', label: 'Agent memory' },
  { value: 'manual', label: 'Manual' },
  { value: 'system', label: 'System' },
];

export const PERSONA_MEMORY_MOOD_OPTIONS: Array<LabeledOptionDto<AgentPersonaMoodId | 'all'>> = [
  { value: 'all', label: 'All moods' },
  ...AGENT_PERSONA_MOOD_PRESETS.map((preset) => ({
    value: preset.id,
    label: preset.label,
  })),
];
