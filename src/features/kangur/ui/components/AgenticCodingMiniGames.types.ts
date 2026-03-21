import type { IdLabelOptionDto } from '@/shared/contracts/base';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type SequenceGameConfig = {
  mode: 'sequence';
  title: string;
  prompt: string;
  steps: string[];
  success: string;
  accent: KangurAccent;
  svgLabel: string;
};

export type SortGameBin = IdLabelOptionDto<string>;

export type SortGameItem = {
  id: string;
  label: string;
  binId: string;
};

export type SortGameConfig = {
  mode: 'sort';
  title: string;
  prompt: string;
  bins: SortGameBin[];
  items: SortGameItem[];
  success: string;
  accent: KangurAccent;
  svgLabel: string;
};

export type DrawCheckpoint = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type DrawGameConfig = {
  mode: 'draw';
  title: string;
  prompt: string;
  success: string;
  accent: KangurAccent;
  svgLabel: string;
  guide: 'loop' | 'line';
  checkpoints: DrawCheckpoint[];
};

export type TrimGameToken = {
  id: string;
  text: string;
  keep: boolean;
};

export type TrimGameConfig = {
  mode: 'trim';
  title: string;
  prompt: string;
  success: string;
  accent: KangurAccent;
  svgLabel: string;
  tokens: TrimGameToken[];
};

export type AgenticCodingGameConfig =
  | SequenceGameConfig
  | SortGameConfig
  | DrawGameConfig
  | TrimGameConfig;

export type AgenticCodingGameId =
  | 'foundations'
  | 'fit'
  | 'surfaces'
  | 'operating_model'
  | 'prompting'
  | 'responses'
  | 'agents_md'
  | 'approvals'
  | 'safety'
  | 'config_layers'
  | 'rules'
  | 'web_citations'
  | 'tooling'
  | 'response_contract'
  | 'delegation'
  | 'models'
  | 'cli_ide'
  | 'app_workflows'
  | 'skills'
  | 'mcp_integrations'
  | 'automations'
  | 'state_scale'
  | 'review'
  | 'long_horizon'
  | 'dos_donts'
  | 'non_engineers'
  | 'prompt_patterns'
  | 'rollout';
