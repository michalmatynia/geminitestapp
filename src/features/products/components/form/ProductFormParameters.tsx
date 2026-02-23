'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import type { LanguageDto as Language } from '@/shared/contracts/internationalization';
import type { ProductParameter, ProductParameterValue } from '@/shared/contracts/products';
import {
  Alert,
  Button,
  FormSection,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  SelectSimple,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  ToggleRow,
  EmptyState,
  LoadingState,
} from '@/shared/ui';

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
  'checklist',
]);

type CatalogLanguageOption = {
  code: string;
  label: string;
};

const normalizeLanguageCode = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const getParameterLanguageValue = (
  entry: ProductParameterValue,
  languageCode: string,
  primaryLanguageCode: string
): string => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  if (!normalizedLanguageCode) return '';
  const valuesByLanguage =
    entry.valuesByLanguage &&
    typeof entry.valuesByLanguage === 'object' &&
    !Array.isArray(entry.valuesByLanguage)
      ? entry.valuesByLanguage
      : null;
  const localizedValue = valuesByLanguage?.[normalizedLanguageCode];
  if (typeof localizedValue === 'string') return localizedValue;
  if (normalizedLanguageCode !== primaryLanguageCode) return '';
  return typeof entry.value === 'string' ? entry.value : '';
};

const parseChecklistValues = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(/[,;\n]/)
    .map((entry: string) => entry.trim())
    .filter((entry: string) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const formatChecklistValues = (values: string[]): string => values.join(', ');

export default function ProductFormParameters(): React.JSX.Element {
  const {
    parameters,
    parametersLoading,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValue,
    updateParameterValueByLanguage,
    removeParameterValue,
  } = useProductFormParameters();

  const {
    selectedCatalogIds,
    filteredLanguages,
  } = useProductFormMetadata();

  const catalogLanguages = useMemo((): CatalogLanguageOption[] => {
    const byCode = new Map<string, CatalogLanguageOption>();
    filteredLanguages.forEach((language: Language) => {
      const code = normalizeLanguageCode(language.code);
      if (!code || byCode.has(code)) return;
      const label =
        (typeof language.name === 'string' && language.name.trim()) ||
        (typeof language.nativeName === 'string' && language.nativeName.trim()) ||
        code.toUpperCase();
      byCode.set(code, {
        code,
        label,
      });
    });
    if (byCode.size === 0) {
      byCode.set('default', { code: 'default', label: 'Default' });
    }
    return Array.from(byCode.values());
  }, [filteredLanguages]);
  const primaryLanguageCode = catalogLanguages[0]?.code ?? 'default';
  const languageTabValues = useMemo(
    () => catalogLanguages.map((language: CatalogLanguageOption) => language.code),
    [catalogLanguages]
  );
  const firstLanguageTab = languageTabValues[0] ?? 'default';
  const [activeParameterLanguageTab, setActiveParameterLanguageTab] = useState<string>(firstLanguageTab);
  useEffect(() => {
    setActiveParameterLanguageTab((prev: string) =>
      prev && languageTabValues.includes(prev) ? prev : firstLanguageTab
    );
  }, [firstLanguageTab, languageTabValues]);
  const resolvedActiveParameterLanguageTab =
    activeParameterLanguageTab && languageTabValues.includes(activeParameterLanguageTab)
      ? activeParameterLanguageTab
      : firstLanguageTab;
  const activeParameterLanguage =
    catalogLanguages.find((language: CatalogLanguageOption) => language.code === resolvedActiveParameterLanguageTab) ??
    catalogLanguages[0] ??
    { code: 'default', label: 'Default' };
  const preferredLocale = primaryLanguageCode;
  const selectedIds = useMemo(
    () => parameterValues.map((entry: ProductParameterValue) => entry.parameterId).filter(Boolean),
    [parameterValues]
  );
  const hasParameterValueByLanguage = useMemo((): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    languageTabValues.forEach((languageCode: string) => {
      result[languageCode] = parameterValues.some((entry: ProductParameterValue): boolean =>
        getParameterLanguageValue(entry, languageCode, primaryLanguageCode).trim().length > 0
      );
    });
    return result;
  }, [languageTabValues, parameterValues, primaryLanguageCode]);
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
        description='Choose parameters and provide values for this product.'
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
          <LoadingState message='Loading parameters...' className='py-8 border border-dashed' />
        ) : parameters.length === 0 ? (
          <EmptyState
            title='No parameters'
            description='No parameters available for the selected catalog(s).'
            variant='compact'
            className='bg-card/20 py-8'
          />
        ) : parameterValues.length === 0 ? (
          <EmptyState
            title='No values'
            description='Add your first parameter to start building values.'
            variant='compact'
            className='bg-card/20 py-8'
          />
        ) : (
          <div className='space-y-3'>
            <Tabs
              value={resolvedActiveParameterLanguageTab}
              onValueChange={setActiveParameterLanguageTab}
              className='w-full'
            >
              <TabsList className='mb-1'>
                {catalogLanguages.map((language: CatalogLanguageOption) => (
                  <TabsTrigger
                    key={language.code}
                    value={language.code}
                    className={
                      !hasParameterValueByLanguage[language.code]
                        ? 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90'
                        : 'text-foreground data-[state=inactive]:text-foreground font-medium'
                    }
                  >
                    {language.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
              const getLanguageValue = (languageCode: string): string => {
                return getParameterLanguageValue(entry, languageCode, primaryLanguageCode);
              };
              const handleLanguageValueChange = (
                languageCode: string,
                nextValue: string
              ): void => {
                updateParameterValueByLanguage(index, languageCode, nextValue);
                if (normalizeLanguageCode(languageCode) === primaryLanguageCode) {
                  updateParameterValue(index, nextValue);
                }
              };
              const currentChecklistValues = parseChecklistValues(
                getLanguageValue(activeParameterLanguage.code)
              );
              const optionLookup = new Map<string, string>();
              normalizedOptionLabels.forEach((label: string) => {
                optionLookup.set(label.trim().toLowerCase(), label);
              });
              const checklistValues = currentChecklistValues.map(
                (value: string): string =>
                  optionLookup.get(value.trim().toLowerCase()) ?? value
              );
              const checklistValueKeys = new Set<string>(
                checklistValues.map((value: string) => value.trim().toLowerCase())
              );
              const checklistOptions = [...normalizedOptionLabels];
              checklistValues.forEach((value: string) => {
                const key = value.trim().toLowerCase();
                const alreadyIncluded = checklistOptions.some(
                  (option: string) => option.trim().toLowerCase() === key
                );
                if (!alreadyIncluded) {
                  checklistOptions.push(value);
                }
              });

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
                    <div className='flex-1 space-y-3'>
                      <div key={`${index}-${activeParameterLanguage.code}`} className='space-y-1'>
                        <Label className='text-[11px] font-medium uppercase tracking-wider text-gray-400'>
                          {activeParameterLanguage.label}
                        </Label>
                        {selectorType === 'textarea' ? (
                          <Textarea
                            value={getLanguageValue(activeParameterLanguage.code)}
                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                              handleLanguageValueChange(activeParameterLanguage.code, event.target.value)
                            }
                            placeholder={`Value (${activeParameterLanguage.label})`}
                            disabled={!entry.parameterId}
                            className='min-h-[84px] bg-gray-900'
                          />
                        ) : selectorType === 'radio' ? (
                          <div className='rounded-md border border-border/50 bg-gray-900/50 p-3'>
                            <RadioGroup
                              value={getLanguageValue(activeParameterLanguage.code)}
                              onValueChange={(value: string): void =>
                                handleLanguageValueChange(activeParameterLanguage.code, value)
                              }
                              className='gap-2'
                              disabled={!entry.parameterId}
                            >
                              {normalizedOptionLabels.map((optionLabel: string) => {
                                const radioId = `product-param-${index}-${activeParameterLanguage.code}-${optionLabel}`;
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
                        ) : selectorType === 'checkbox' ? (
                          <ToggleRow
                            label={normalizedOptionLabels[0] ?? 'Enabled'}
                            checked={((): boolean => {
                              const currentValue = getLanguageValue(activeParameterLanguage.code).trim().toLowerCase();
                              const optionValue =
                                normalizedOptionLabels[0]?.trim().toLowerCase() ?? '';
                              return (
                                currentValue === 'true' ||
                                currentValue === '1' ||
                                currentValue === 'yes' ||
                                currentValue === 'on' ||
                                (optionValue ? currentValue === optionValue : false)
                              );
                            })()}
                            onCheckedChange={(checked: boolean): void =>
                              handleLanguageValueChange(
                                activeParameterLanguage.code,
                                checked
                                  ? normalizedOptionLabels[0] ?? 'true'
                                  : ''
                              )
                            }
                            disabled={!entry.parameterId}
                            className='bg-gray-900/50'
                          />
                        ) : selectorType === 'checklist' ? (
                          <div className='rounded-md border border-border/50 bg-gray-900/50 p-3'>
                            <div className='space-y-2'>
                              {checklistOptions.map((optionLabel: string) => {
                                const optionKey = optionLabel.trim().toLowerCase();
                                return (
                                  <ToggleRow
                                    key={optionLabel}
                                    label={optionLabel}
                                    checked={checklistValueKeys.has(optionKey)}
                                    onCheckedChange={(checked: boolean): void => {
                                      const nextValues = checked
                                        ? [...checklistValues, optionLabel]
                                        : checklistValues.filter(
                                          (value: string) =>
                                            value.trim().toLowerCase() !== optionKey
                                        );
                                      handleLanguageValueChange(
                                        activeParameterLanguage.code,
                                        formatChecklistValues(
                                          Array.from(
                                            new Map<string, string>(
                                              nextValues.map((value: string) => [
                                                value.trim().toLowerCase(),
                                                value,
                                              ])
                                            ).values()
                                          )
                                        )
                                      );
                                    }}
                                    disabled={!entry.parameterId}
                                    className='border-none bg-transparent p-0 hover:bg-transparent'
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : selectorType === 'select' || selectorType === 'dropdown' ? (
                          <SelectSimple
                            size='sm'
                            value={getLanguageValue(activeParameterLanguage.code)}
                            onValueChange={(value: string): void =>
                              handleLanguageValueChange(activeParameterLanguage.code, value)
                            }
                            options={normalizedOptionLabels.map((label: string) => ({
                              value: label,
                              label,
                            }))}
                            placeholder={`Select value (${activeParameterLanguage.label})`}
                            triggerClassName='h-9 bg-gray-900 border-border/50'
                            disabled={!entry.parameterId}
                          />
                        ) : (
                          <Input
                            value={getLanguageValue(activeParameterLanguage.code)}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              handleLanguageValueChange(activeParameterLanguage.code, event.target.value)
                            }
                            placeholder={`Value (${activeParameterLanguage.label})`}
                            disabled={!entry.parameterId}
                            className='h-9'
                          />
                        )}
                      </div>
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
                        This parameter has no option labels configured yet. Add labels in Product Settings.
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
