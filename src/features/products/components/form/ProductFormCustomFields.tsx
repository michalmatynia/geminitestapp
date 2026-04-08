'use client';

import { useMemo } from 'react';

import { useProductFormCustomFields } from '@/features/products/context/ProductFormCustomFieldContext';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import { Alert } from '@/shared/ui/alert';
import { CompactEmptyState } from '@/shared/ui/empty-state';
import { FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { insetPanelVariants } from '@/shared/ui/InsetPanel';
import { LoadingState } from '@/shared/ui/LoadingState';
import { ToggleRow } from '@/shared/ui/toggle-row';

const getTextFieldValue = (entry: ProductCustomFieldValue | undefined): string =>
  typeof entry?.textValue === 'string' ? entry.textValue : '';

const getSelectedOptionIds = (entry: ProductCustomFieldValue | undefined): string[] =>
  Array.isArray(entry?.selectedOptionIds) ? entry.selectedOptionIds : [];

export default function ProductFormCustomFields(): React.JSX.Element {
  const {
    customFields,
    customFieldsLoading,
    customFieldValues,
    setTextValue,
    toggleSelectedOption,
  } = useProductFormCustomFields();

  const customFieldValueById = useMemo(() => {
    const map = new Map<string, ProductCustomFieldValue>();
    customFieldValues.forEach((entry: ProductCustomFieldValue) => {
      map.set(entry.fieldId, entry);
    });
    return map;
  }, [customFieldValues]);

  return (
    <div className='space-y-6'>
      <FormSection
        title='Custom Fields'
        description='Fill reusable product-specific text fields and checkbox sets.'
      >
        {customFieldsLoading ? (
          <LoadingState message='Loading custom fields...' className='border border-dashed py-8' />
        ) : customFields.length === 0 ? (
          <CompactEmptyState
            title='No custom fields'
            description='Create custom fields in Product Settings to use them in the editor.'
            className='bg-card/20 py-8'
          />
        ) : (
          <div className='space-y-3'>
            {customFields.map((customField: ProductCustomFieldDefinition) => {
              const value = customFieldValueById.get(customField.id);
              const selectedOptionIds = new Set<string>(getSelectedOptionIds(value));

              return (
                <div
                  key={customField.id}
                  className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} flex flex-col gap-3 border-border`}
                >
                  <div>
                    <h3 className='text-sm font-medium text-foreground'>{customField.name}</h3>
                    <p className='text-xs text-muted-foreground'>
                      {customField.type === 'checkbox_set'
                        ? 'Checkbox set'
                        : 'Single text input'}
                    </p>
                  </div>

                  {customField.type === 'checkbox_set' ? (
                    customField.options.length === 0 ? (
                      <Alert variant='warning' className='py-2'>
                        <p className='text-xs'>
                          This checkbox set has no options configured yet. Add them in Product
                          Settings.
                        </p>
                      </Alert>
                    ) : (
                      <div className='space-y-2'>
                        {customField.options.map((option) => (
                          <ToggleRow
                            key={option.id}
                            label={option.label}
                            checked={selectedOptionIds.has(option.id)}
                            onCheckedChange={(checked: boolean): void =>
                              toggleSelectedOption(customField.id, option.id, checked)
                            }
                            className='border-none bg-transparent p-0 hover:bg-transparent'
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <Input
                      value={getTextFieldValue(value)}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setTextValue(customField.id, event.target.value)
                      }
                      aria-label={customField.name}
                      placeholder={customField.name}
                      className='h-9'
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}
