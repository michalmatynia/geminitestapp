import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { CustomCssAiConfig } from '@/shared/contracts/cms';

export type InspectorAiContextPreviewTab = 'page' | 'element';

export interface InspectorAiContextValue {
  cssAiLoading: boolean;
  cssAiError: string | null;
  cssAiOutput: string;
  cssAiAppend: boolean;
  setCssAiAppend: (value: boolean) => void;
  cssAiAutoApply: boolean;
  setCssAiAutoApply: (value: boolean) => void;
  generateCss: () => Promise<void>;
  cancelCss: () => void;
  contentAiPrompt: string;
  setContentAiPrompt: (value: string) => void;
  contentAiLoading: boolean;
  contentAiError: string | null;
  contentAiOutput: string;
  generateContent: () => Promise<void>;
  cancelContent: () => void;
  applyContent: () => void;
  contextPreviewOpen: boolean;
  setContextPreviewOpen: (value: boolean) => void;
  contextPreviewTab: InspectorAiContextPreviewTab;
  setContextPreviewTab: (value: InspectorAiContextPreviewTab) => void;
  contextPreviewFull: boolean;
  setContextPreviewFull: (value: boolean) => void;
  contextPreviewNonce: number;
  setContextPreviewNonce: Dispatch<SetStateAction<number>>;
  pageContextPreview: string;
  elementContextPreview: string;
  copyContext: (text: string) => Promise<void>;
  brainAiProvider: 'model' | 'agent';
  brainAiModelId: string;
  brainAiAgentId: string;
  customCssValue: string;
  customCssAiConfig: CustomCssAiConfig;
  updateCustomCssAiConfig: (patch: Partial<CustomCssAiConfig>) => void;
  applyCss: (mode: 'append' | 'replace') => void;
  contentAiAllowedKeys: string[];
  contentAiPlaceholder: string;
}

export type InspectorAiStateContextValue = Omit<
  InspectorAiContextValue,
  | 'setCssAiAppend'
  | 'setCssAiAutoApply'
  | 'generateCss'
  | 'cancelCss'
  | 'setContentAiPrompt'
  | 'generateContent'
  | 'cancelContent'
  | 'applyContent'
  | 'setContextPreviewOpen'
  | 'setContextPreviewTab'
  | 'setContextPreviewFull'
  | 'setContextPreviewNonce'
  | 'copyContext'
  | 'updateCustomCssAiConfig'
  | 'applyCss'
>;

export type InspectorAiActionsContextValue = Pick<
  InspectorAiContextValue,
  | 'setCssAiAppend'
  | 'setCssAiAutoApply'
  | 'generateCss'
  | 'cancelCss'
  | 'setContentAiPrompt'
  | 'generateContent'
  | 'cancelContent'
  | 'applyContent'
  | 'setContextPreviewOpen'
  | 'setContextPreviewTab'
  | 'setContextPreviewFull'
  | 'setContextPreviewNonce'
  | 'copyContext'
  | 'updateCustomCssAiConfig'
  | 'applyCss'
>;

export interface InspectorAiProviderProps {
  children: ReactNode;
  customCssValue: string;
  customCssAiConfig: CustomCssAiConfig;
  onUpdateCss: (css: string) => void;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  onUpdateCustomCssAiConfig: (patch: Partial<CustomCssAiConfig>) => void;
  contentAiAllowedKeys?: string[];
}
