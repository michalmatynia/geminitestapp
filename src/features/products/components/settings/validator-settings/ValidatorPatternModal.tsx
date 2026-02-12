'use client';

import {
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/features/products/utils/validator-instance-behavior';
import type {
  DynamicReplacementLogicAction,
  DynamicReplacementLogicOperator,
  DynamicReplacementMathOperation,
  DynamicReplacementRoundMode,
  DynamicReplacementSourceMode,
} from '@/features/products/utils/validator-replacement-recipe';
import type {
  ProductValidationDenyBehavior,
  ProductValidationLaunchOperator,
  ProductValidationRuntimeType,
} from '@/shared/types/domain/products';
import {
  Button,
  Input,
  Label,
  MultiSelect,
  SharedModal,
  Textarea,
  UnifiedSelect,
} from '@/shared/ui';

import { PATTERN_SCOPE_OPTIONS } from './constants';
import { ToggleButton } from './ToggleButton';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

import type { PatternFormData, ReplacementMode } from './types';

export function ValidatorPatternModal(): React.JSX.Element | null {
  const {
    showModal,
    editingPattern,
    formData,
    setFormData,
    replacementFieldOptions,
    sourceFieldOptions,
    createPatternPending,
    updatePatternPending,
    closeModal,
    handleSave,
    isLocaleTarget,
    getReplacementFieldsForTarget,
    getSourceFieldOptionsForTarget,
    normalizeReplacementFields,
  } = useValidatorSettingsContext();
  if (!showModal) return null;

  return (
    <SharedModal
      open={showModal}
      onClose={closeModal}
      title={editingPattern ? 'Edit Validator Pattern' : 'Create Validator Pattern'}
      size='lg'
    >
      <div className='space-y-4'>
        <div>
          <Label className='text-xs text-gray-400'>Label</Label>
          <Input
            className='mt-2'
            value={formData.label}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setFormData((prev: PatternFormData) => ({ ...prev, label: event.target.value }))
            }
            placeholder='Double spaces'
          />
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <Label className='text-xs text-gray-400'>Target</Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={formData.target}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => {
                    const nextTarget = value as PatternFormData['target'];
                    const allowed = new Set<string>(getReplacementFieldsForTarget(nextTarget));
                    const nextSourceOptions = getSourceFieldOptionsForTarget(nextTarget);
                    const hasSourceField = nextSourceOptions.some(
                      (option: { value: string }) => option.value === prev.sourceField
                    );
                    const hasLaunchSourceField = nextSourceOptions.some(
                      (option: { value: string }) => option.value === prev.launchSourceField
                    );
                    return {
                      ...prev,
                      target: nextTarget,
                      locale: isLocaleTarget(nextTarget) ? prev.locale : '',
                      replacementFields: prev.replacementFields.filter((field: string) => allowed.has(field)),
                      sourceField: hasSourceField ? prev.sourceField : '',
                      launchSourceField: hasLaunchSourceField ? prev.launchSourceField : '',
                    };
                  })
                }
                options={[
                  { value: 'name', label: 'Name' },
                  { value: 'description', label: 'Description' },
                  { value: 'sku', label: 'SKU' },
                  { value: 'price', label: 'Price' },
                  { value: 'stock', label: 'Stock' },
                  { value: 'category', label: 'Category' },
                  { value: 'weight', label: 'Weight' },
                  { value: 'size_length', label: 'Length (sizeLength)' },
                  { value: 'size_width', label: 'Width (sizeWidth)' },
                  { value: 'length', label: 'Height (length)' },
                ]}
              />
            </div>
          </div>

          <div>
            <Label className='text-xs text-gray-400'>Locale Context</Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={isLocaleTarget(formData.target) ? formData.locale || 'any' : 'any'}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    locale: isLocaleTarget(prev.target) ? (value === 'any' ? '' : value) : '',
                  }))
                }
                disabled={!isLocaleTarget(formData.target)}
                options={[
                  { value: 'any', label: 'Any locale' },
                  { value: 'en', label: 'English (en)' },
                  { value: 'pl', label: 'Polish (pl)' },
                  { value: 'de', label: 'German (de)' },
                ]}
              />
            </div>
          </div>
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Apply In Forms</Label>
          <p className='mt-1 text-[11px] text-gray-500'>
            Controls where this validator pattern is active.
          </p>
          <div className='mt-2'>
            <MultiSelect
              options={PATTERN_SCOPE_OPTIONS}
              selected={normalizeProductValidationPatternScopes(formData.appliesToScopes)}
              onChange={(values: string[]) =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  appliesToScopes: normalizeProductValidationPatternScopes(values),
                }))
              }
              placeholder='All forms'
              searchPlaceholder='Search form scope...'
              emptyMessage='No form scopes found.'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div>
            <Label className='text-xs text-gray-400'>Severity</Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={formData.severity}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    severity: value as 'error' | 'warning',
                  }))
                }
                options={[
                  { value: 'error', label: 'Error' },
                  { value: 'warning', label: 'Warning' },
                ]}
              />
            </div>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Replacer Mode</Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={formData.replacementMode}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    replacementMode: value as ReplacementMode,
                  }))
                }
                options={[
                  { value: 'static', label: 'Static replacer' },
                  { value: 'dynamic', label: 'Dynamic replacer' },
                ]}
              />
            </div>
          </div>
          <div>
            {formData.replacementMode === 'static' ? (
              <>
                <Label className='text-xs text-gray-400'>Replacer Value</Label>
                <Input
                  className='mt-2'
                  value={formData.replacementValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      replacementValue: event.target.value,
                    }))
                  }
                  placeholder='e.g. Przypinka'
                />
              </>
            ) : (
              <>
                <Label className='text-xs text-gray-400'>Source Mode</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.sourceMode}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        sourceMode: value as DynamicReplacementSourceMode,
                      }))
                    }
                    options={[
                      { value: 'current_field', label: 'Current field' },
                      { value: 'form_field', label: 'Other form field' },
                      { value: 'latest_product_field', label: 'Latest product field' },
                    ]}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div>
            <Label className='text-xs text-gray-400'>Sequence</Label>
            <Input
              className='mt-2'
              value={formData.sequence}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  sequence: event.target.value,
                }))
              }
              placeholder='10'
            />
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Chain Mode</Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={formData.chainMode}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    chainMode: value as PatternFormData['chainMode'],
                  }))
                }
                options={[
                  { value: 'continue', label: 'Continue' },
                  { value: 'stop_on_match', label: 'Stop on match' },
                  { value: 'stop_on_replace', label: 'Stop on replace' },
                ]}
              />
            </div>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Max Executions</Label>
            <Input
              className='mt-2'
              value={formData.maxExecutions}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  maxExecutions: event.target.value,
                }))
              }
              placeholder='1'
            />
          </div>
          <div className='flex items-end'>
            <div className='flex w-full items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
              <span className='text-xs text-gray-300'>Pass Output To Next</span>
              <ToggleButton
                enabled={formData.passOutputToNext}
                onClick={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    passOutputToNext: !prev.passOutputToNext,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className='space-y-3 rounded-md border border-sky-500/25 bg-sky-500/5 p-3'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <Label className='text-xs text-sky-200'>Launch Condition</Label>
              <p className='mt-1 text-[11px] text-sky-100/70'>
                Run this pattern only when the condition is satisfied.
              </p>
            </div>
            <ToggleButton
              enabled={formData.launchEnabled}
              onClick={() =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  launchEnabled: !prev.launchEnabled,
                }))
              }
            />
          </div>

          {formData.launchEnabled && (
            <>
              <div>
                <Label className='text-xs text-gray-300'>Launch In Forms</Label>
                <p className='mt-1 text-[11px] text-gray-500'>
                  Context gate for this launch node (Draft/Create/Edit).
                </p>
                <div className='mt-2'>
                  <MultiSelect
                    options={PATTERN_SCOPE_OPTIONS}
                    selected={normalizeProductValidationPatternLaunchScopes(
                      formData.launchAppliesToScopes,
                      formData.appliesToScopes
                    )}
                    onChange={(values: string[]) =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
                          values,
                          prev.appliesToScopes
                        ),
                      }))
                    }
                    placeholder='Follow pattern scopes'
                    searchPlaceholder='Search launch scope...'
                    emptyMessage='No form scopes found.'
                  />
                </div>
              </div>

              <div>
                <Label className='text-xs text-gray-300'>Launch Scope Behavior</Label>
                <p className='mt-1 text-[11px] text-gray-500'>
                  `Gate` blocks pattern outside selected forms. `Condition Only` skips condition outside selected forms.
                </p>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.launchScopeBehavior}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        launchScopeBehavior:
                          value === 'condition_only'
                            ? 'condition_only'
                            : 'gate',
                      }))
                    }
                    options={[
                      { value: 'gate', label: 'Gate Pattern By Scope' },
                      { value: 'condition_only', label: 'Condition Only In Scope' },
                    ]}
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <div>
                  <Label className='text-xs text-gray-300'>Launch Source Mode</Label>
                  <div className='mt-2'>
                    <UnifiedSelect
                      value={formData.launchSourceMode}
                      onValueChange={(value: string): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          launchSourceMode: value as DynamicReplacementSourceMode,
                        }))
                      }
                      options={[
                        { value: 'current_field', label: 'Current field' },
                        { value: 'form_field', label: 'Other form field' },
                        { value: 'latest_product_field', label: 'Latest product field' },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <Label className='text-xs text-gray-300'>Launch Operator</Label>
                  <div className='mt-2'>
                    <UnifiedSelect
                      value={formData.launchOperator}
                      onValueChange={(value: string): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          launchOperator: value as ProductValidationLaunchOperator,
                        }))
                      }
                      options={[
                        { value: 'equals', label: 'Equals' },
                        { value: 'not_equals', label: 'Not equals' },
                        { value: 'contains', label: 'Contains' },
                        { value: 'starts_with', label: 'Starts with' },
                        { value: 'ends_with', label: 'Ends with' },
                        { value: 'regex', label: 'Regex test' },
                        { value: 'gt', label: 'Greater than' },
                        { value: 'gte', label: 'Greater than or equal' },
                        { value: 'lt', label: 'Less than' },
                        { value: 'lte', label: 'Less than or equal' },
                        { value: 'is_empty', label: 'Is empty' },
                        { value: 'is_not_empty', label: 'Is not empty' },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <Label className='text-xs text-gray-300'>Launch Value</Label>
                  <Input
                    className='mt-2 font-mono'
                    value={formData.launchValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        launchValue: event.target.value,
                      }))
                    }
                    placeholder='KEYCHA000'
                  />
                </div>
              </div>

              {(formData.launchSourceMode === 'form_field' ||
                formData.launchSourceMode === 'latest_product_field') && (
                <div>
                  <Label className='text-xs text-gray-300'>Launch Source Field</Label>
                  <div className='mt-2'>
                    <UnifiedSelect
                      value={formData.launchSourceField || '__none__'}
                      onValueChange={(value: string): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          launchSourceField: value === '__none__' ? '' : value,
                        }))
                      }
                      options={[
                        { value: '__none__', label: 'Select source field' },
                        ...sourceFieldOptions,
                      ]}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className='text-xs text-gray-300'>Launch Flags (regex only)</Label>
                <Input
                  className='mt-2 font-mono'
                  value={formData.launchFlags}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      launchFlags: event.target.value,
                    }))
                  }
                  placeholder='i'
                />
              </div>
            </>
          )}
        </div>

        <div className='space-y-3 rounded-md border border-fuchsia-500/25 bg-fuchsia-500/5 p-3'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <Label className='text-xs text-fuchsia-200'>Runtime Validator</Label>
              <p className='mt-1 text-[11px] text-fuchsia-100/70'>
                Execute DB or AI runtime checks before showing validation advice.
              </p>
            </div>
            <ToggleButton
              enabled={formData.runtimeEnabled}
              onClick={() =>
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
          </div>

          {formData.runtimeEnabled ? (
            <div className='space-y-3'>
              <div>
                <Label className='text-xs text-gray-300'>Runtime Type</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.runtimeType}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        runtimeType: value as ProductValidationRuntimeType,
                      }))
                    }
                    options={[
                      { value: 'database_query', label: 'Database Query / Action' },
                      { value: 'ai_prompt', label: 'AI Prompt Segment' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Label className='text-xs text-gray-300'>Runtime Config (JSON)</Label>
                <Textarea
                  className='mt-2 min-h-[160px] font-mono text-[11px]'
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
                      : '{\n  "operation": "query",\n  "payload": {\n    "provider": "auto",\n    "collection": "products",\n    "single": false,\n    "limit": 1,\n    "query": { "sku": "[sku]" }\n  },\n  "resultPath": "count",\n  "operator": "gt",\n  "operand": 0,\n  "replacementPath": "items[0].price"\n}'
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        {formData.replacementMode === 'dynamic' && (
          <div className='space-y-4 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3'>
            {(formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') && (
              <div>
                <Label className='text-xs text-gray-300'>Source Field</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.sourceField || '__none__'}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        sourceField: value === '__none__' ? '' : value,
                      }))
                    }
                    options={[
                      { value: '__none__', label: 'Select source field' },
                      ...sourceFieldOptions,
                    ]}
                  />
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div>
                <Label className='text-xs text-gray-300'>Source Extract Regex (optional)</Label>
                <Input
                  className='mt-2 font-mono'
                  value={formData.sourceRegex}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      sourceRegex: event.target.value,
                    }))
                  }
                  placeholder='(\\d+)$'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-300'>Source Flags</Label>
                <Input
                  className='mt-2 font-mono'
                  value={formData.sourceFlags}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      sourceFlags: event.target.value,
                    }))
                  }
                  placeholder='i'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-300'>Capture Group Index</Label>
                <Input
                  className='mt-2'
                  value={formData.sourceMatchGroup}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      sourceMatchGroup: event.target.value,
                    }))
                  }
                  placeholder='1'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div>
                <Label className='text-xs text-gray-300'>Math Operation</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.mathOperation}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        mathOperation: value as DynamicReplacementMathOperation,
                      }))
                    }
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'add', label: 'Add' },
                      { value: 'subtract', label: 'Subtract' },
                      { value: 'multiply', label: 'Multiply' },
                      { value: 'divide', label: 'Divide' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Label className='text-xs text-gray-300'>Math Operand</Label>
                <Input
                  className='mt-2'
                  value={formData.mathOperand}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      mathOperand: event.target.value,
                    }))
                  }
                  placeholder='1'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-300'>Round Mode</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.roundMode}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        roundMode: value as DynamicReplacementRoundMode,
                      }))
                    }
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'round', label: 'Round' },
                      { value: 'floor', label: 'Floor' },
                      { value: 'ceil', label: 'Ceil' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div>
              <div>
                <Label className='text-xs text-gray-300'>Logic Operator</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.logicOperator}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        logicOperator: value as DynamicReplacementLogicOperator,
                      }))
                    }
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'equals', label: 'Equals' },
                      { value: 'not_equals', label: 'Not equals' },
                      { value: 'contains', label: 'Contains' },
                      { value: 'starts_with', label: 'Starts with' },
                      { value: 'ends_with', label: 'Ends with' },
                      { value: 'regex', label: 'Regex test' },
                      { value: 'gt', label: 'Greater than' },
                      { value: 'gte', label: 'Greater than or equal' },
                      { value: 'lt', label: 'Less than' },
                      { value: 'lte', label: 'Less than or equal' },
                      { value: 'is_empty', label: 'Is empty' },
                      { value: 'is_not_empty', label: 'Is not empty' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {formData.logicOperator !== 'none' && (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div>
                  <Label className='text-xs text-gray-300'>
                    Logic Operand
                  </Label>
                  <Input
                    className='mt-2 font-mono'
                    value={formData.logicOperand}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        logicOperand: event.target.value,
                      }))
                    }
                    placeholder='Value to compare against'
                  />
                </div>
                <div>
                  <Label className='text-xs text-gray-300'>Logic Flags (regex only)</Label>
                  <Input
                    className='mt-2 font-mono'
                    value={formData.logicFlags}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        logicFlags: event.target.value,
                      }))
                    }
                    placeholder='i'
                  />
                </div>
              </div>
            )}

            {formData.logicOperator !== 'none' && (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='space-y-3 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3'>
                  <Label className='text-xs text-gray-200'>When condition is TRUE</Label>
                  <UnifiedSelect
                    value={formData.logicWhenTrueAction}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        logicWhenTrueAction: value as DynamicReplacementLogicAction,
                      }))
                    }
                    options={[
                      { value: 'keep', label: 'Keep current value' },
                      { value: 'set_value', label: 'Set custom value' },
                      { value: 'clear', label: 'Clear value' },
                      { value: 'abort', label: 'Abort replacement' },
                    ]}
                  />
                  {formData.logicWhenTrueAction === 'set_value' && (
                    <Input
                      className='font-mono'
                      value={formData.logicWhenTrueValue}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          logicWhenTrueValue: event.target.value,
                        }))
                      }
                      placeholder='Replacement value when TRUE'
                    />
                  )}
                </div>

                <div className='space-y-3 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3'>
                  <Label className='text-xs text-gray-200'>When condition is FALSE</Label>
                  <UnifiedSelect
                    value={formData.logicWhenFalseAction}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        logicWhenFalseAction: value as DynamicReplacementLogicAction,
                      }))
                    }
                    options={[
                      { value: 'keep', label: 'Keep current value' },
                      { value: 'set_value', label: 'Set custom value' },
                      { value: 'clear', label: 'Clear value' },
                      { value: 'abort', label: 'Abort replacement' },
                    ]}
                  />
                  {formData.logicWhenFalseAction === 'set_value' && (
                    <Input
                      className='font-mono'
                      value={formData.logicWhenFalseValue}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          logicWhenFalseValue: event.target.value,
                        }))
                      }
                      placeholder='Replacement value when FALSE'
                    />
                  )}
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <Label className='text-xs text-gray-300'>Result Assembly</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.resultAssembly}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        resultAssembly: value as PatternFormData['resultAssembly'],
                      }))
                    }
                    options={[
                      { value: 'segment_only', label: 'Use transformed segment' },
                      { value: 'source_replace_match', label: 'Inject into source value' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Label className='text-xs text-gray-300'>Apply To Target</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.targetApply}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        targetApply: value as PatternFormData['targetApply'],
                      }))
                    }
                    options={[
                      { value: 'replace_matched_segment', label: 'Replace matched segment' },
                      { value: 'replace_whole_field', label: 'Replace whole field' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <Label className='text-xs text-gray-300'>Pad Length (optional)</Label>
                <Input
                  className='mt-2'
                  value={formData.padLength}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      padLength: event.target.value,
                    }))
                  }
                  placeholder='3'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-300'>Pad Character</Label>
                <Input
                  className='mt-2'
                  value={formData.padChar}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      padChar: event.target.value,
                    }))
                  }
                  placeholder='0'
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <Label className='text-xs text-gray-400'>Replacer Fields</Label>
          <p className='mt-1 text-[11px] text-gray-500'>
            Leave empty to apply replacement globally on all matching fields.
          </p>
          <div className='mt-2'>
            <MultiSelect
              options={replacementFieldOptions}
              selected={formData.replacementFields}
              onChange={(values: string[]) =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  replacementFields: normalizeReplacementFields(values),
                }))
              }
              placeholder='All matching fields (global)'
              searchPlaceholder='Search fields...'
              emptyMessage='No fields found.'
            />
          </div>
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Replacement Applies In Forms</Label>
          <p className='mt-1 text-[11px] text-gray-500'>
            Controls where replacement proposals/auto-apply are allowed.
          </p>
          <div className='mt-2'>
            <MultiSelect
              options={PATTERN_SCOPE_OPTIONS}
              selected={normalizeProductValidationPatternReplacementScopes(
                formData.replacementAppliesToScopes,
                formData.appliesToScopes
              )}
              onChange={(values: string[]) =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
                    values,
                    prev.appliesToScopes
                  ),
                }))
              }
              placeholder='Follow pattern scopes'
              searchPlaceholder='Search replacement scope...'
              emptyMessage='No form scopes found.'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px_170px]'>
          <div>
            <Label className='text-xs text-gray-400'>Regex</Label>
            <Input
              className='mt-2 font-mono'
              value={formData.regex}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({ ...prev, regex: event.target.value }))
              }
              placeholder='\\s{2,}|\\*{2,}'
            />
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Flags</Label>
            <Input
              className='mt-2 font-mono'
              value={formData.flags}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({ ...prev, flags: event.target.value }))
              }
              placeholder='gim'
            />
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Validation Debounce (ms)</Label>
            <Input
              className='mt-2'
              type='number'
              min={0}
              max={30000}
              value={formData.validationDebounceMs}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  validationDebounceMs: event.target.value,
                }))
              }
              placeholder='0'
            />
          </div>
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Message</Label>
          <Textarea
            className='mt-2 min-h-[90px]'
            value={formData.message}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              setFormData((prev: PatternFormData) => ({ ...prev, message: event.target.value }))
            }
            placeholder='Remove duplicate spaces from product name.'
          />
        </div>

        <div>
          <Label className='text-xs text-gray-400'>After Replace Is Accepted</Label>
          <div className='mt-2'>
            <UnifiedSelect
              value={formData.postAcceptBehavior}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  postAcceptBehavior:
                    value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate',
                }))
              }
              options={[
                { value: 'revalidate', label: 'Revalidate Continuously' },
                { value: 'stop_after_accept', label: 'Stop After First Accept' },
              ]}
            />
          </div>
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Deny Policy Override</Label>
          <p className='mt-1 text-[11px] text-gray-500'>
            Override form-level deny policy for this pattern only.
          </p>
          <div className='mt-2'>
            <UnifiedSelect
              value={formData.denyBehaviorOverride}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  denyBehaviorOverride:
                    value === 'ask_again' || value === 'mute_session'
                      ? (value as ProductValidationDenyBehavior)
                      : 'inherit',
                }))
              }
              options={[
                { value: 'inherit', label: 'Inherit Form Policy' },
                { value: 'mute_session', label: 'Stop For This Session' },
                { value: 'ask_again', label: 'Ask Again Next Validation' },
              ]}
            />
          </div>
        </div>

        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <span className='text-xs text-gray-300'>Pattern enabled</span>
          <ToggleButton
            enabled={formData.enabled}
            onClick={() =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                enabled: !prev.enabled,
              }))
            }
          />
        </div>

        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <span className='text-xs text-gray-300'>Replacer enabled</span>
          <ToggleButton
            enabled={formData.replacementEnabled}
            onClick={() =>
              setFormData((prev: PatternFormData) => {
                const nextReplacementEnabled = !prev.replacementEnabled;
                return {
                  ...prev,
                  replacementEnabled: nextReplacementEnabled,
                  replacementAutoApply: nextReplacementEnabled ? prev.replacementAutoApply : false,
                };
              })
            }
          />
        </div>

        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <div>
            <span className='text-xs text-gray-300'>Auto-apply replacer</span>
            <p className='text-[11px] text-gray-500'>
              OFF keeps it as a proposal only.
            </p>
          </div>
          <ToggleButton
            enabled={formData.replacementAutoApply}
            disabled={!formData.replacementEnabled}
            onClick={() =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                replacementAutoApply: !prev.replacementAutoApply,
              }))
            }
          />
        </div>

        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <div>
            <span className='text-xs text-gray-300'>Skip same-value proposals</span>
            <p className='text-[11px] text-gray-500'>
              Hide replacement proposals when replacement equals current value.
            </p>
          </div>
          <ToggleButton
            enabled={formData.skipNoopReplacementProposal}
            disabled={!formData.replacementEnabled}
            onClick={() =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                skipNoopReplacementProposal: !prev.skipNoopReplacementProposal,
              }))
            }
          />
        </div>

        <div className='flex items-center justify-end gap-3 pt-2'>
          <Button
            type='button'
            className='rounded-md border border-border px-3 py-2 text-sm text-gray-300 hover:bg-muted/50'
            onClick={closeModal}
          >
            Cancel
          </Button>
          <Button
            type='button'
            className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
            onClick={() => {
              void handleSave();
            }}
            disabled={createPatternPending || updatePatternPending}
          >
            {createPatternPending || updatePatternPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </SharedModal>
  );
}
