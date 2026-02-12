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
  Input,
  MultiSelect,
  FormModal,
  Textarea,
  UnifiedSelect,
  StatusToggle,
  FormField,
  FormSection,
} from '@/shared/ui';

import { PATTERN_SCOPE_OPTIONS } from './constants';
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
    <FormModal
      open={showModal}
      onClose={closeModal}
      title={editingPattern ? 'Edit Validator Pattern' : 'Create Validator Pattern'}
      onSave={(): void => { void handleSave(); }}
      isSaving={createPatternPending || updatePatternPending}
      size='lg'
    >
      <div className='space-y-4'>
        <FormField label='Label'>
          <Input
            className='h-9'
            value={formData.label}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setFormData((prev: PatternFormData) => ({ ...prev, label: event.target.value }))
            }
            placeholder='Double spaces'
          />
        </FormField>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField label='Target'>
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
          </FormField>

          <FormField label='Locale Context'>
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
          </FormField>
        </div>

        <FormField
          label='Apply In Forms'
          description='Controls where this validator pattern is active.'
        >
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
        </FormField>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <FormField label='Severity'>
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
          </FormField>
          <FormField label='Replacer Mode'>
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
          </FormField>
          <div>
            {formData.replacementMode === 'static' ? (
              <FormField label='Replacer Value'>
                <Input
                  className='h-9'
                  value={formData.replacementValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      replacementValue: event.target.value,
                    }))
                  }
                  placeholder='e.g. Przypinka'
                />
              </FormField>
            ) : (
              <FormField label='Source Mode'>
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
              </FormField>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <FormField label='Sequence'>
            <Input
              className='h-9'
              value={formData.sequence}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  sequence: event.target.value,
                }))
              }
              placeholder='10'
            />
          </FormField>
          <FormField label='Chain Mode'>
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
          </FormField>
          <FormField label='Max Executions'>
            <Input
              className='h-9'
              value={formData.maxExecutions}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  maxExecutions: event.target.value,
                }))
              }
              placeholder='1'
            />
          </FormField>
          <FormField label='Pass Output'>
            <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2 h-9'>
              <span className='text-[10px] text-gray-400 uppercase font-semibold'>To Next</span>
              <StatusToggle
                enabled={formData.passOutputToNext}
                onToggle={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    passOutputToNext: !prev.passOutputToNext,
                  }))
                }
              />
            </div>
          </FormField>
        </div>

        <FormSection
          title='Launch Condition'
          description='Run this pattern only when the condition is satisfied.'
          variant='subtle'
          className='border border-sky-500/25 bg-sky-500/5 p-3 space-y-4'
          actions={(
            <StatusToggle
              enabled={formData.launchEnabled}
              onToggle={() =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  launchEnabled: !prev.launchEnabled,
                }))
              }
            />
          )}
        >
          {formData.launchEnabled && (
            <div className='mt-4 space-y-4'>
              <FormField
                label='Launch In Forms'
                description='Context gate for this launch node (Draft/Create/Edit).'
              >
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
              </FormField>

              <FormField
                label='Launch Scope Behavior'
                description='`Gate` blocks pattern outside selected forms. `Condition Only` skips condition outside selected forms.'
              >
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
              </FormField>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <FormField label='Launch Source Mode'>
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
                </FormField>
                <FormField label='Launch Operator'>
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
                </FormField>
                <FormField label='Launch Value'>
                  <Input
                    className='h-9 font-mono'
                    value={formData.launchValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        launchValue: event.target.value,
                      }))
                    }
                    placeholder='KEYCHA000'
                  />
                </FormField>
              </div>

              {(formData.launchSourceMode === 'form_field' ||
                formData.launchSourceMode === 'latest_product_field') && (
                <FormField label='Launch Source Field'>
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
                </FormField>
              )}

              <FormField label='Launch Flags (regex only)'>
                <Input
                  className='h-9 font-mono'
                  value={formData.launchFlags}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      launchFlags: event.target.value,
                    }))
                  }
                  placeholder='i'
                />
              </FormField>
            </div>
          )}
        </FormSection>

        <FormSection
          title='Runtime Validator'
          description='Execute DB or AI runtime checks before showing validation advice.'
          variant='subtle'
          className='border border-fuchsia-500/25 bg-fuchsia-500/5 p-3 space-y-4'
          actions={(
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
          )}
        >
          {formData.runtimeEnabled && (
            <div className='mt-4 space-y-4'>
              <FormField label='Runtime Type'>
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
              </FormField>
              <FormField label='Runtime Config (JSON)'>
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
                      : '{\n  "operation": "query",\n  "payload": {\n    "provider": "auto",\n    "collection": "products",\n    "single": false,\n    "limit": 1,\n    "query": { "sku": "[sku]" }\n  },\n  "resultPath": "count",\n  "operator": "gt",\n  "operand": 0,\n  "replacementPath": "items[0].price"\n}'
                  }
                />
              </FormField>
            </div>
          )}
        </FormSection>

        {formData.replacementMode === 'dynamic' && (
          <FormSection title='Dynamic Replacer Config' variant='subtle' className='border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-4'>
            <div className='space-y-4 mt-4'>
              {(formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') && (
                <FormField label='Source Field'>
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
                </FormField>
              )}

              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <FormField label='Extract Regex'>
                  <Input
                    className='h-9 font-mono'
                    value={formData.sourceRegex}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        sourceRegex: event.target.value,
                      }))
                    }
                    placeholder='(\\d+)$'
                  />
                </FormField>
                <FormField label='Source Flags'>
                  <Input
                    className='h-9 font-mono'
                    value={formData.sourceFlags}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        sourceFlags: event.target.value,
                      }))
                    }
                    placeholder='i'
                  />
                </FormField>
                <FormField label='Group Index'>
                  <Input
                    className='h-9'
                    value={formData.sourceMatchGroup}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        sourceMatchGroup: event.target.value,
                      }))
                    }
                    placeholder='1'
                  />
                </FormField>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <FormField label='Math Operation'>
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
                </FormField>
                <FormField label='Math Operand'>
                  <Input
                    className='h-9'
                    value={formData.mathOperand}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        mathOperand: event.target.value,
                      }))
                    }
                    placeholder='1'
                  />
                </FormField>
                <FormField label='Round Mode'>
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
                </FormField>
              </div>

              <FormField label='Logic Operator'>
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
              </FormField>

              {formData.logicOperator !== 'none' && (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <FormField label='Logic Operand'>
                    <Input
                      className='h-9 font-mono'
                      value={formData.logicOperand}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          logicOperand: event.target.value,
                        }))
                      }
                      placeholder='Value to compare against'
                    />
                  </FormField>
                  <FormField label='Logic Flags (regex only)'>
                    <Input
                      className='h-9 font-mono'
                      value={formData.logicFlags}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          logicFlags: event.target.value,
                        }))
                      }
                      placeholder='i'
                    />
                  </FormField>
                </div>
              )}

              {formData.logicOperator !== 'none' && (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <FormSection title='When condition is TRUE' variant='subtle' className='p-3 space-y-3'>
                    <div className='mt-2 space-y-3'>
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
                          className='h-9 font-mono'
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
                  </FormSection>

                  <FormSection title='When condition is FALSE' variant='subtle' className='p-3 space-y-3'>
                    <div className='mt-2 space-y-3'>
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
                          className='h-9 font-mono'
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
                  </FormSection>
                </div>
              )}

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <FormField label='Result Assembly'>
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
                </FormField>
                <FormField label='Apply To Target'>
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
                </FormField>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <FormField label='Pad Length (optional)'>
                  <Input
                    className='h-9'
                    value={formData.padLength}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        padLength: event.target.value,
                      }))
                    }
                    placeholder='3'
                  />
                </FormField>
                <FormField label='Pad Character'>
                  <Input
                    className='h-9'
                    value={formData.padChar}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        padChar: event.target.value,
                      }))
                    }
                    placeholder='0'
                  />
                </FormField>
              </div>
            </div>
          </FormSection>
        )}

        <FormField
          label='Replacer Fields'
          description='Leave empty to apply replacement globally on all matching fields.'
        >
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
        </FormField>

        <FormField
          label='Replacement Applies In Forms'
          description='Controls where replacement proposals/auto-apply are allowed.'
        >
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
        </FormField>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px_170px]'>
          <FormField label='Regex'>
            <Input
              className='h-9 font-mono'
              value={formData.regex}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({ ...prev, regex: event.target.value }))
              }
              placeholder='\\s{2,}|\\*{2,}'
            />
          </FormField>
          <FormField label='Flags'>
            <Input
              className='h-9 font-mono'
              value={formData.flags}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({ ...prev, flags: event.target.value }))
              }
              placeholder='gim'
            />
          </FormField>
          <FormField label='Debounce (ms)'>
            <Input
              className='h-9'
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
          </FormField>
        </div>

        <FormField label='Message'>
          <Textarea
            className='min-h-[90px]'
            value={formData.message}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              setFormData((prev: PatternFormData) => ({ ...prev, message: event.target.value }))
            }
            placeholder='Remove duplicate spaces from product name.'
          />
        </FormField>

        <FormField label='After Replace Is Accepted'>
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
        </FormField>

        <FormField
          label='Deny Policy Override'
          description='Override form-level deny policy for this pattern only.'
        >
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
        </FormField>

        <div className='space-y-2'>
          <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
            <span className='text-xs text-gray-300'>Pattern enabled</span>
            <StatusToggle
              enabled={formData.enabled}
              onToggle={() =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  enabled: !prev.enabled,
                }))
              }
            />
          </div>

          <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
            <span className='text-xs text-gray-300'>Replacer enabled</span>
            <StatusToggle
              enabled={formData.replacementEnabled}
              onToggle={() =>
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
            <StatusToggle
              enabled={formData.replacementAutoApply}
              disabled={!formData.replacementEnabled}
              onToggle={() =>
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
            <StatusToggle
              enabled={formData.skipNoopReplacementProposal}
              disabled={!formData.replacementEnabled}
              onToggle={() =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  skipNoopReplacementProposal: !prev.skipNoopReplacementProposal,
                }))
              }
            />
          </div>
        </div>
      </div>
    </FormModal>
  );
}
