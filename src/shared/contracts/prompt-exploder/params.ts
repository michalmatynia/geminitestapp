import { type ParamSpec, type ParamSpecKind } from '../prompt-engine';
import { type PromptExploderParamUiControl } from './document';

/**
 * Prompt Exploder Runtime Param DTOs
 */

export type PromptExploderParamUiRecommendation = {
  baseKind: ParamSpecKind;
  recommended: Exclude<PromptExploderParamUiControl, 'auto'>;
  options: PromptExploderParamUiControl[];
  confidence: number;
  reason: string | null;
  canSlider: boolean;
};

export type PromptExploderParamEntry = {
  path: string;
  value: unknown;
  spec: ParamSpec | null;
  selector: PromptExploderParamUiControl;
  resolvedSelector: Exclude<PromptExploderParamUiControl, 'auto'>;
  selectorOptions: PromptExploderParamUiControl[];
  recommendation: PromptExploderParamUiRecommendation;
  comment: string;
  description: string;
};

export type PromptExploderParamEntriesState = {
  entries: PromptExploderParamEntry[];
  paramUiControls: Record<string, PromptExploderParamUiControl>;
  paramComments: Record<string, string>;
  paramDescriptions: Record<string, string>;
};
