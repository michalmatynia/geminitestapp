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
  ProductValidationLaunchOperator,
  ProductValidationRuntimeType,
} from '@/shared/contracts/products';
import type { PatternFormData, ReplacementMode } from '@/shared/contracts/products';
import {
  Input,
  MultiSelect,
  FormModal,
  Textarea,
  SelectSimple,
  StatusToggle,
  FormField,
  FormSection,
} from '@/shared/ui';

import { PATTERN_SCOPE_OPTIONS } from './constants';
import {
  CHAIN_MODE_OPTIONS,
  DENY_BEHAVIOR_OVERRIDE_OPTIONS,
  LAUNCH_OPERATOR_OPTIONS,
  LAUNCH_SCOPE_BEHAVIOR_OPTIONS,
  LOCALE_OPTIONS,
  LOGIC_ACTION_OPTIONS,
  LOGIC_OPERATOR_OPTIONS,
  MATH_OPERATION_OPTIONS,
  POST_ACCEPT_BEHAVIOR_OPTIONS,
  REPLACEMENT_MODE_OPTIONS,
  RESULT_ASSEMBLY_OPTIONS,
  ROUND_MODE_OPTIONS,
  RUNTIME_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  SOURCE_FIELD_PLACEHOLDER_OPTION,
  SOURCE_MODE_OPTIONS,
  TARGET_APPLY_OPTIONS,
  TARGET_OPTIONS,
} from './validator-pattern-modal-options';
import { ValidatorDocTooltip } from './ValidatorDocsTooltips';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';


/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorpatternmodal
 */
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
            <ValidatorDocTooltip docId='validator.modal.target'>
              <SelectSimple size='sm'
                value={formData.target}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => {
                    const nextTarget = value as PatternFormData['target'];
                    const allowed = new Set<string>(getReplacementFieldsForTarget(nextTarget).map(f => f.value));
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
                options={TARGET_OPTIONS}
              />
            </ValidatorDocTooltip>
          </FormField>

          <FormField label='Locale Context'>
            <SelectSimple size='sm'
              value={isLocaleTarget(formData.target) ? formData.locale || 'any' : 'any'}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  locale: isLocaleTarget(prev.target) ? (value === 'any' ? '' : value) : '',
                }))
              }
              disabled={!isLocaleTarget(formData.target)}
              options={LOCALE_OPTIONS}
            />
          </FormField>
        </div>

        <FormField
          label='Apply In Forms'
          description='Controls where this validator pattern is active.'
        >
          <ValidatorDocTooltip docId='validator.modal.applyScopes'>
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
          </ValidatorDocTooltip>
        </FormField>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <FormField label='Severity'>
            <SelectSimple size='sm'
              value={formData.severity}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  severity: value as 'error' | 'warning',
                }))
              }
              options={SEVERITY_OPTIONS}
            />
          </FormField>
          <FormField label='Replacer Mode'>
            <SelectSimple size='sm'
              value={formData.replacementMode}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  replacementMode: value as ReplacementMode,
                }))
              }
              options={REPLACEMENT_MODE_OPTIONS}
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
                <SelectSimple size='sm'
                  value={formData.sourceMode}
                  onValueChange={(value: string): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      sourceMode: value as DynamicReplacementSourceMode,
                    }))
                  }
                  options={SOURCE_MODE_OPTIONS}
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
            <SelectSimple size='sm'
              value={formData.chainMode}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  chainMode: value as PatternFormData['chainMode'],
                }))
              }
              options={CHAIN_MODE_OPTIONS}
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
            <ValidatorDocTooltip docId='validator.modal.launch.toggle'>
              <StatusToggle
                enabled={formData.launchEnabled}
                onToggle={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    launchEnabled: !prev.launchEnabled,
                  }))
                }
              />
            </ValidatorDocTooltip>
          )}
        >
          {formData.launchEnabled && (
            <div className='mt-4 space-y-4'>
              <FormField
                label='Launch In Forms'
                description='Context gate for this launch node (Draft/Create/Edit).'
              >
                <ValidatorDocTooltip docId='validator.modal.launch.config'>
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
                </ValidatorDocTooltip>
              </FormField>

              <FormField
                label='Launch Scope Behavior'
                description='`Gate` blocks pattern outside selected forms. `Condition Only` skips condition outside selected forms.'
              >
                <SelectSimple size='sm'
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
                  options={LAUNCH_SCOPE_BEHAVIOR_OPTIONS}
                />
              </FormField>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <FormField label='Launch Source Mode'>
                  <SelectSimple size='sm'
                    value={formData.launchSourceMode}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        launchSourceMode: value as DynamicReplacementSourceMode,
                      }))
                    }
                    options={SOURCE_MODE_OPTIONS}
                  />
                </FormField>
                <FormField label='Launch Operator'>
                  <SelectSimple size='sm'
                    value={formData.launchOperator}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        launchOperator: value as ProductValidationLaunchOperator,
                      }))
                    }
                    options={LAUNCH_OPERATOR_OPTIONS}
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
                  <SelectSimple size='sm'
                    value={formData.launchSourceField || '__none__'}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        launchSourceField: value === '__none__' ? '' : value,
                      }))
                    }
                    options={[
                      SOURCE_FIELD_PLACEHOLDER_OPTION,
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
          )}
        >
          {formData.runtimeEnabled && (
            <div className='mt-4 space-y-4'>
              <FormField label='Runtime Type'>
                <SelectSimple size='sm'
                  value={formData.runtimeType}
                  onValueChange={(value: string): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      runtimeType: value as ProductValidationRuntimeType,
                    }))
                  }
                  options={RUNTIME_TYPE_OPTIONS}
                />
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
                        : '{\n  "operation": "query",\n  "payload": {\n    "provider": "auto",\n    "collection": "products",\n    "single": false,\n    "limit": 1,\n    "query": { "sku": "[sku]" }\n  },\n  "resultPath": "count",\n  "operator": "gt",\n  "operand": 0,\n  "replacementPath": "items[0].price"\n}'
                    }
                  />
                </ValidatorDocTooltip>
              </FormField>
            </div>
          )}
        </FormSection>

        {formData.replacementMode === 'dynamic' && (
          <FormSection title='Dynamic Replacer Config' variant='subtle' className='border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-4'>
            <div className='space-y-4 mt-4'>
              {(formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') && (
                <FormField label='Source Field'>
                  <SelectSimple size='sm'
                    value={formData.sourceField || '__none__'}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        sourceField: value === '__none__' ? '' : value,
                      }))
                    }
                    options={[
                      SOURCE_FIELD_PLACEHOLDER_OPTION,
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
                  <SelectSimple size='sm'
                    value={formData.mathOperation}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        mathOperation: value as DynamicReplacementMathOperation,
                      }))
                    }
                    options={MATH_OPERATION_OPTIONS}
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
                  <SelectSimple size='sm'
                    value={formData.roundMode}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        roundMode: value as DynamicReplacementRoundMode,
                      }))
                    }
                    options={ROUND_MODE_OPTIONS}
                  />
                </FormField>
              </div>

              <FormField label='Logic Operator'>
                <SelectSimple size='sm'
                  value={formData.logicOperator}
                  onValueChange={(value: string): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      logicOperator: value as DynamicReplacementLogicOperator,
                    }))
                  }
                  options={LOGIC_OPERATOR_OPTIONS}
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
                      <SelectSimple size='sm'
                        value={formData.logicWhenTrueAction}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            logicWhenTrueAction: value as DynamicReplacementLogicAction,
                          }))
                        }
                        options={LOGIC_ACTION_OPTIONS}
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
                      <SelectSimple size='sm'
                        value={formData.logicWhenFalseAction}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            logicWhenFalseAction: value as DynamicReplacementLogicAction,
                          }))
                        }
                        options={LOGIC_ACTION_OPTIONS}
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
                  <SelectSimple size='sm'
                    value={formData.resultAssembly}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        resultAssembly: value as PatternFormData['resultAssembly'],
                      }))
                    }
                    options={RESULT_ASSEMBLY_OPTIONS}
                  />
                </FormField>
                <FormField label='Apply To Target'>
                  <SelectSimple size='sm'
                    value={formData.targetApply}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        targetApply: value as PatternFormData['targetApply'],
                      }))
                    }
                    options={TARGET_APPLY_OPTIONS}
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
          <ValidatorDocTooltip docId='validator.modal.replacement.toggle'>
            <MultiSelect
              options={replacementFieldOptions}
              selected={formData.replacementFields}
              onChange={(values: string[]) =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  replacementFields: normalizeReplacementFields(values, prev.target),
                }))
              }
              placeholder='All matching fields (global)'
              searchPlaceholder='Search fields...'
              emptyMessage='No fields found.'
            />
          </ValidatorDocTooltip>
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
            <ValidatorDocTooltip docId='validator.modal.regex'>
              <Input
                className='h-9 font-mono'
                value={formData.regex}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({ ...prev, regex: event.target.value }))
                }
                placeholder='\\s{2,}|\\*{2,}'
              />
            </ValidatorDocTooltip>
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
          <SelectSimple size='sm'
            value={formData.postAcceptBehavior}
            onValueChange={(value: string): void =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                postAcceptBehavior:
                  value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate',
              }))
            }
            options={POST_ACCEPT_BEHAVIOR_OPTIONS}
          />
        </FormField>

        <FormField
          label='Deny Policy Override'
          description='Override form-level deny policy for this pattern only.'
        >
          <SelectSimple size='sm'
            value={formData.denyBehaviorOverride}
            onValueChange={(value: string): void =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                denyBehaviorOverride:
                  value === 'ask_again' || value === 'mute_session'
                    ? (value)
                    : 'inherit',
              }))
            }
            options={DENY_BEHAVIOR_OVERRIDE_OPTIONS}
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
            <ValidatorDocTooltip docId='validator.modal.replacement.toggle'>
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
            </ValidatorDocTooltip>
          </div>

          <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
            <div>
              <span className='text-xs text-gray-300'>Auto-apply replacer</span>
              <p className='text-[11px] text-gray-500'>
                OFF keeps it as a proposal only.
              </p>
            </div>
            <ValidatorDocTooltip docId='validator.modal.replacement.autoApply'>
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
            </ValidatorDocTooltip>
          </div>

          <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
            <div>
              <span className='text-xs text-gray-300'>Skip same-value proposals</span>
              <p className='text-[11px] text-gray-500'>
                Hide replacement proposals when replacement equals current value.
              </p>
            </div>
            <ValidatorDocTooltip docId='validator.modal.replacement.skipNoop'>
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
            </ValidatorDocTooltip>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
