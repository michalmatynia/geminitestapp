import type { LabeledOptionDto } from '@/shared/contracts/base';
import { AGENT_PERSONA_MOOD_PRESETS } from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';

export type AgentPersonaMoodEditorProps = {
  moods?: AgentPersonaMood[] | null;
  originalMoods?: AgentPersonaMood[] | null;
  personaId?: string | null;
  onChange: (updates: {
    moods: AgentPersonaMood[];
    defaultMoodId: AgentPersonaMoodId;
  }) => void;
};

export const DEFAULT_IMPORT_MIME = 'image/png';

export const IMPORT_MIME_OPTIONS = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/gif', label: 'GIF' },
  { value: 'image/svg+xml', label: 'SVG' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const MOOD_ORDER = new Map<AgentPersonaMoodId, number>(
  AGENT_PERSONA_MOOD_PRESETS.map((preset, index) => [preset.id, index])
);

export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export const sortMoods = (moods: AgentPersonaMood[]): AgentPersonaMood[] =>
  [...moods].sort(
    (left, right) =>
      (MOOD_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (MOOD_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );
