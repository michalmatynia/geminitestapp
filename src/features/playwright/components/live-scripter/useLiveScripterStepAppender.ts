'use client';

import { useCallback } from 'react';

import type {
  PlaywrightStepInputBinding,
  PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

const SELECTOR_STEP_TYPES = new Set<PlaywrightStepType>([
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'hover',
  'wait_for_selector',
  'assert_text',
  'assert_visible',
  'scroll',
  'upload_file',
]);

const trimmedOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildSelectorBinding = (
  input: AppendLiveScripterStepInput,
  selector: string
): PlaywrightStepInputBinding => {
  if (
    input.selectorBindingMode === 'selectorRegistry' &&
    typeof input.selectorKey === 'string' &&
    input.selectorKey.trim().length > 0
  ) {
    return {
      mode: 'selectorRegistry',
      selectorNamespace: input.selectorNamespace ?? null,
      selectorKey: input.selectorKey.trim(),
      selectorProfile: trimmedOrNull(input.selectorProfile),
      fallbackSelector: selector,
    };
  }

  return {
    mode: 'literal',
    value: selector,
  };
};

export type AppendLiveScripterStepInput = {
  name: string;
  description?: string | null;
  type: PlaywrightStepType;
  selector?: string | null;
  selectorBindingMode: 'literal' | 'selectorRegistry';
  selectorNamespace?: string | null;
  selectorKey?: string | null;
  selectorProfile?: string | null;
  value?: string | null;
  url?: string | null;
  key?: string | null;
  timeout?: number | null;
  script?: string | null;
  websiteId?: string | null;
  flowId?: string | null;
  tags?: string[];
};

export function useLiveScripterStepAppender(): (
  input: AppendLiveScripterStepInput
) => void {
  const { appendDraftStep } = usePlaywrightStepSequencer();

  return useCallback(
    (input: AppendLiveScripterStepInput): void => {
      const selector = trimmedOrNull(input.selector);
      const inputBindings: Record<string, PlaywrightStepInputBinding> = {};

      if (SELECTOR_STEP_TYPES.has(input.type) && selector !== null) {
        inputBindings['selector'] = buildSelectorBinding(input, selector);
      }

      appendDraftStep({
        name: input.name.trim(),
        description: trimmedOrNull(input.description),
        type: input.type,
        selector,
        value: trimmedOrNull(input.value),
        url: trimmedOrNull(input.url),
        key: trimmedOrNull(input.key),
        timeout: input.timeout ?? null,
        script: trimmedOrNull(input.script),
        inputBindings,
        websiteId: input.websiteId ?? null,
        flowId: input.flowId ?? null,
        tags: input.tags ?? [],
        sortOrder: 0,
      });
    },
    [appendDraftStep]
  );
}
