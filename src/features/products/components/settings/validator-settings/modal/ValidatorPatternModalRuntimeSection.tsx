'use client';

import React from 'react';

import type { PatternFormData, ProductValidationRuntimeType } from '@/shared/contracts/products';
import { Textarea, SelectSimple, StatusToggle, FormField, FormSection } from '@/shared/ui';

import { RUNTIME_TYPE_OPTIONS } from '../validator-pattern-modal-options';
import { ValidatorDocTooltip } from '../ValidatorDocsTooltips';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

export function ValidatorPatternModalRuntimeSection(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <FormSection
      title='Runtime Validator'
      description='Execute DB or AI runtime checks before showing validation advice.'
      variant='subtle'
      className='border border-fuchsia-500/25 bg-fuchsia-500/5 p-3 space-y-4'
      actions={
        <ValidatorDocTooltip docId='validator.modal.runtime.toggle'>
          <StatusToggle
            enabled={formData.runtimeEnabled}
            onToggle={() =>
              setFormData((prev: PatternFormData) => {
                const nextEnabled = !prev.runtimeEnabled;
                return {
                  ...prev,
                  runtimeEnabled: nextEnabled,
                  runtimeType:
                    nextEnabled && prev.runtimeType === 'none'
                      ? 'database_query'
                      : prev.runtimeType,
                };
              })
            }
          />
        </ValidatorDocTooltip>
      }
    >
      {formData.runtimeEnabled && (
        <div className='mt-4 space-y-4'>
          <FormField label='Runtime Type'>
            <SelectSimple
              size='sm'
              value={formData.runtimeType}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  runtimeType: value as ProductValidationRuntimeType,
                }))
              }
              options={RUNTIME_TYPE_OPTIONS}
             ariaLabel='Runtime Type' title='Runtime Type'/>
          </FormField>
          <FormField label='Runtime Config (JSON)'>
            <ValidatorDocTooltip docId='validator.modal.runtime.config'>
              <Textarea
                className='min-h-[160px] font-mono text-[11px]'
                value={formData.runtimeConfig}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    runtimeConfig: event.target.value,
                  }))
                }
                placeholder={
                  formData.runtimeType === 'ai_prompt'
                    ? '{\n  "systemPrompt": "You validate product data.",\n  "promptTemplate": "Check [fieldName]: [fieldValue]. Return JSON: {\\"match\\":boolean,\\"message\\":string,\\"replacementValue\\":string|null}",\n  "model": "gpt-4o-mini"\n}'
                    : '{\n  "operation": "query",\n  "payload": {\n    "provider": "auto",\n    "collection": "products",\n    "single": false,\n    "limit": 1,\n    "filter": { "sku": "[sku]" }\n  },\n  "resultPath": "count",\n  "operator": "gt",\n  "operand": 0,\n  "replacementPaths": ["items[0].price"]\n}'
                }
               aria-label={formData.runtimeType === 'ai_prompt'
                    ? '{\n  "systemPrompt": "You validate product data.",\n  "promptTemplate": "Check [fieldName]: [fieldValue]. Return JSON: {\\"match\\":boolean,\\"message\\":string,\\"replacementValue\\":string|null}",\n  "model": "gpt-4o-mini"\n}'
                    : '{\n  "operation": "query",\n  "payload": {\n    "provider": "auto",\n    "collection": "products",\n    "single": false,\n    "limit": 1,\n    "filter": { "sku": "[sku]" }\n  },\n  "resultPath": "count",\n  "operator": "gt",\n  "operand": 0,\n  "replacementPaths": ["items[0].price"]\n}'} title={formData.runtimeType === 'ai_prompt'
                    ? '{\n  "systemPrompt": "You validate product data.",\n  "promptTemplate": "Check [fieldName]: [fieldValue]. Return JSON: {\\"match\\":boolean,\\"message\\":string,\\"replacementValue\\":string|null}",\n  "model": "gpt-4o-mini"\n}'
                    : '{\n  "operation": "query",\n  "payload": {\n    "provider": "auto",\n    "collection": "products",\n    "single": false,\n    "limit": 1,\n    "filter": { "sku": "[sku]" }\n  },\n  "resultPath": "count",\n  "operator": "gt",\n  "operand": 0,\n  "replacementPaths": ["items[0].price"]\n}'}/>
            </ValidatorDocTooltip>
          </FormField>
        </div>
      )}
    </FormSection>
  );
}
