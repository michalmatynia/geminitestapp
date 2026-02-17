'use client';

import { X } from 'lucide-react';
import { useMemo } from 'react';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import type { ProductParameter, ProductParameterValue } from '@/features/products/types';
import { Button, Input, FormSection, SelectSimple, Alert, Textarea, RadioGroup, RadioGroupItem, Label } from '@/shared/ui';

const getParameterLabel = (
  parameter: { name_en: string; name_pl?: string | null; name_de?: string | null },
  preferredLocale?: string
): string => {
  const preferred = preferredLocale?.toLowerCase();
  if (preferred === 'pl' && parameter.name_pl) return parameter.name_pl;
  if (preferred === 'de' && parameter.name_de) return parameter.name_de;
  return parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';
};

const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<ProductParameter['selectorType']>([
  'radio',
  'select',
  'dropdown',
]);

export default function ProductFormParameters(): React.JSX.Element {
  const {
    parameters,
    parametersLoading,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValue,
    removeParameterValue,
    selectedCatalogIds,
    filteredLanguages,
  } = useProductFormContext();

  const preferredLocale = filteredLanguages[0]?.code ?? 'en';
  const selectedIds = useMemo(
    () => parameterValues.map((entry: ProductParameterValue) => entry.parameterId).filter(Boolean),
    [parameterValues]
  );
  const parameterById = useMemo(() => {
    const map = new Map<string, ProductParameter>();
    parameters.forEach((parameter: ProductParameter) => {
      map.set(parameter.id, parameter);
    });
    return map;
  }, [parameters]);

  if (selectedCatalogIds.length === 0) {
    return (
      <Alert variant='warning' className='mb-6'>
        <p className='text-sm'>Select a catalog to manage product parameters.</p>
      </Alert>
    );
  }

  return (
    <div className='space-y-6'>
      <FormSection
        title='Parameters'
        description='Choose custom fields and provide values for this product.'
      >
        <div className='mb-2 flex justify-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addParameterValue}
            disabled={parametersLoading || parameters.length === 0}
          >
            Add parameter
          </Button>
        </div>

        {parametersLoading ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Loading parameters...
          </div>
        ) : parameters.length === 0 ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            No parameters available for the selected catalog(s).
          </div>
        ) : parameterValues.length === 0 ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Add your first parameter to start building values.
          </div>
        ) : (
          <div className='space-y-3'>
            {parameterValues.map((entry: ProductParameterValue, index: number) => {
              const availableOptions = parameters.filter(
                (param: ProductParameter) =>
                  !selectedIds.includes(param.id) || param.id === entry.parameterId
              );
              const selectedParameter = entry.parameterId
                ? parameterById.get(entry.parameterId) ?? null
                : null;
              const selectorType = selectedParameter?.selectorType ?? 'text';
              const optionLabels = Array.isArray(selectedParameter?.optionLabels)
                ? selectedParameter.optionLabels
                : [];
              const needsOptions = SELECTOR_TYPES_REQUIRING_OPTIONS.has(selectorType);
              const normalizedOptionLabels = Array.from(
                new Set(
                  optionLabels
                    .map((value: string) => value.trim())
                    .filter((value: string) => value.length > 0)
                )
              );

              if (
                entry.value &&
                needsOptions &&
                !normalizedOptionLabels.includes(entry.value)
              ) {
                normalizedOptionLabels.unshift(entry.value);
              }

              return (
                <div
                  key={`${entry.parameterId || 'new'}-${index}`}
                  className='flex flex-col gap-3 rounded-md border border-border bg-card/40 p-3'
                >
                  <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                    <div className='w-full md:w-64'>
                      <SelectSimple size='sm'
                        value={entry.parameterId}
                        onValueChange={(value: string) => updateParameterId(index, value)}
                        options={availableOptions.map((param: ProductParameter) => ({
                          value: param.id,
                          label: getParameterLabel(param, preferredLocale),
                        }))}
                        placeholder='Select parameter'
                        triggerClassName='h-9 bg-gray-900 border-border/50'
                      />
                    </div>
                    <div className='flex-1'>
                      {selectorType === 'textarea' ? (
                        <Textarea
                          value={entry.value}
                          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                            updateParameterValue(index, event.target.value)
                          }
                          placeholder='Value'
                          disabled={!entry.parameterId}
                          className='min-h-[84px] bg-gray-900'
                        />
                      ) : selectorType === 'radio' ? (
                        <div className='rounded-md border border-border/50 bg-gray-900/50 p-3'>
                          <RadioGroup
                            value={entry.value}
                            onValueChange={(value: string): void =>
                              updateParameterValue(index, value)
                            }
                            className='gap-2'
                            disabled={!entry.parameterId}
                          >
                            {normalizedOptionLabels.map((optionLabel: string) => {
                              const radioId = `product-param-${index}-${optionLabel}`;
                              return (
                                <div key={optionLabel} className='flex items-center gap-2'>
                                  <RadioGroupItem
                                    value={optionLabel}
                                    id={radioId}
                                  />
                                  <Label htmlFor={radioId} className='text-sm text-gray-200'>
                                    {optionLabel}
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </div>
                      ) : selectorType === 'select' || selectorType === 'dropdown' ? (
                        <SelectSimple
                          size='sm'
                          value={entry.value}
                          onValueChange={(value: string): void =>
                            updateParameterValue(index, value)
                          }
                          options={normalizedOptionLabels.map((label: string) => ({
                            value: label,
                            label,
                          }))}
                          placeholder='Select value'
                          triggerClassName='h-9 bg-gray-900 border-border/50'
                          disabled={!entry.parameterId}
                        />
                      ) : (
                        <Input
                          value={entry.value}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            updateParameterValue(index, event.target.value)
                          }
                          placeholder='Value'
                          disabled={!entry.parameterId}
                          className='h-9'
                        />
                      )}
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-9 w-9 text-gray-500 hover:text-red-400'
                      onClick={() => removeParameterValue(index)}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                  {needsOptions && normalizedOptionLabels.length === 0 && entry.parameterId ? (
                    <Alert variant='warning' className='py-2'>
                      <p className='text-xs'>
                        This custom field has no option labels configured yet. Add labels in Product Settings.
                      </p>
                    </Alert>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}
