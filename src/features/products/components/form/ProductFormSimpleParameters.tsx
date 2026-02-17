'use client';

import { X } from 'lucide-react';
import { useMemo } from 'react';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import type {
  ProductSimpleParameter,
  ProductSimpleParameterValue,
} from '@/features/products/types';
import { Alert, Button, FormSection, Input, SelectSimple } from '@/shared/ui';

const getParameterLabel = (
  parameter: ProductSimpleParameter,
  preferredLocale?: string
): string => {
  const preferred = preferredLocale?.toLowerCase();
  if (preferred === 'pl' && parameter.name_pl) return parameter.name_pl;
  if (preferred === 'de' && parameter.name_de) return parameter.name_de;
  return parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';
};

export default function ProductFormSimpleParameters(): React.JSX.Element {
  const {
    selectedCatalogIds,
    filteredLanguages,
    simpleParameters,
    simpleParametersLoading,
    simpleParameterValues,
    addSimpleParameterValue,
    updateSimpleParameterId,
    updateSimpleParameterValue,
    removeSimpleParameterValue,
  } = useProductFormContext();

  const selectedIds = useMemo(
    () =>
      simpleParameterValues
        .map((entry: ProductSimpleParameterValue) => entry.parameterId)
        .filter(Boolean),
    [simpleParameterValues]
  );
  const primaryLanguageCode = filteredLanguages[0]?.code?.trim().toLowerCase() ?? 'en';

  if (selectedCatalogIds.length === 0) {
    return (
      <Alert variant='warning' className='mb-6'>
        <p className='text-sm'>Select a catalog to manage parameters.</p>
      </Alert>
    );
  }

  return (
    <div className='space-y-6'>
      <FormSection
        title='Parameters'
        description='Pick from predefined parameters and optionally provide a value.'
      >
        <div className='mb-2 flex justify-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addSimpleParameterValue}
            disabled={simpleParametersLoading || simpleParameters.length === 0}
          >
            Add parameter
          </Button>
        </div>

        {simpleParametersLoading ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Loading parameters...
          </div>
        ) : simpleParameters.length === 0 ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            No parameters available for the selected catalog(s).
          </div>
        ) : simpleParameterValues.length === 0 ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Add your first parameter.
          </div>
        ) : (
          <div className='space-y-3'>
            {simpleParameterValues.map(
              (entry: ProductSimpleParameterValue, index: number) => {
                const availableOptions = simpleParameters.filter(
                  (parameter: ProductSimpleParameter) =>
                    !selectedIds.includes(parameter.id) ||
                    parameter.id === entry.parameterId
                );
                return (
                  <div
                    key={`${entry.parameterId || 'new'}-${index}`}
                    className='flex flex-col gap-3 rounded-md border border-border bg-card/40 p-3 md:flex-row md:items-center'
                  >
                    <div className='w-full md:w-72'>
                      <SelectSimple
                        size='sm'
                        value={entry.parameterId}
                        onValueChange={(value: string) =>
                          updateSimpleParameterId(index, value)
                        }
                        options={availableOptions.map(
                          (parameter: ProductSimpleParameter) => ({
                            value: parameter.id,
                            label: getParameterLabel(parameter, primaryLanguageCode),
                          })
                        )}
                        placeholder='Select parameter'
                        triggerClassName='h-9 bg-gray-900 border-border/50'
                      />
                    </div>
                    <div className='flex-1'>
                      <Input
                        value={entry.value ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          updateSimpleParameterValue(index, event.target.value)
                        }
                        placeholder='Value (optional)'
                        disabled={!entry.parameterId}
                        className='h-9'
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-9 w-9 text-gray-500 hover:text-red-400'
                      onClick={() => removeSimpleParameterValue(index)}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </FormSection>
    </div>
  );
}
