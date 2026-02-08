'use client';

import { X } from 'lucide-react';
import { useMemo } from 'react';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import type { ProductParameter, ProductParameterValue } from '@/features/products/types';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, FormSection } from '@/shared/ui';


const getParameterLabel = (
  parameter: { name_en: string; name_pl?: string | null; name_de?: string | null },
  preferredLocale?: string
): string => {
  const preferred = preferredLocale?.toLowerCase();
  if (preferred === 'pl' && parameter.name_pl) return parameter.name_pl;
  if (preferred === 'de' && parameter.name_de) return parameter.name_de;
  return parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';
};

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

  if (selectedCatalogIds.length === 0) {
    return (
      <FormSection variant='subtle-compact' className='border-amber-500/40 bg-amber-500/10 text-amber-100'>
        <p className='text-sm'>Select a catalog to manage product parameters.</p>
      </FormSection>
    );
  }

  return (
    <div className='space-y-6'>
      <FormSection 
        title='Parameters' 
        description='Choose parameters and provide values for this product.'
      >
        <div className='flex justify-end mb-2'>
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
              return (
                <div
                  key={`${entry.parameterId || 'new'}-${index}`}
                  className='flex flex-col gap-3 rounded-md border border-border bg-card/40 p-3 md:flex-row md:items-center'
                >
                  <div className='w-full md:w-64'>
                    <Select
                      value={entry.parameterId}
                      onValueChange={(value: string) => updateParameterId(index, value)}
                    >
                      <SelectTrigger className='h-9 bg-gray-900 border-border/50'>
                        <SelectValue placeholder='Select parameter' />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOptions.map((param: ProductParameter) => (
                          <SelectItem key={param.id} value={param.id}>
                            {getParameterLabel(param, preferredLocale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex-1'>
                    <Input
                      value={entry.value}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateParameterValue(index, event.target.value)
                      }
                      placeholder='Value'
                      disabled={!entry.parameterId}
                      className='h-9'
                    />
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
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}