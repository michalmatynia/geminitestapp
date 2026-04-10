'use client';

import { Plus, Trash2 } from 'lucide-react';
import React from 'react';

import {
  buildProductCustomFieldTargetOptions,
  EXPORT_PARAMETER_KEYS,
  PRODUCT_FIELDS,
  PRODUCT_PARAMETER_TARGET_PATTERN,
  PRODUCT_PARAMETER_TARGET_PREFIX,
  PRODUCT_PARAMETER_TARGET_TRANSLATED_PATTERN,
} from '@/features/data-import-export/components/imports/constants';
import {
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import {
  useProductCustomFields,
  useProductParameters,
  useProductSimpleParameters,
} from '@/features/data-import-export/hooks/useImportQueries';
import {
  BASE_MARKETPLACE_CHECKBOX_OPTIONS,
  normalizeBaseMarketplaceCheckboxKey,
} from '@/shared/lib/integrations/base-marketplace-checkboxes';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ImportTemplateParameterImport } from '@/shared/contracts/integrations';
import type { TemplateMapping } from '@/shared/contracts/integrations/import-export';
import { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX } from '@/shared/contracts/products/base';
import { SelectSimple, Hint } from '@/shared/ui/forms-and-actions.public';
import {
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/primitives.public';
import { ConfirmModal } from '@/shared/ui/templates.public';

import {
  getParameterDisplayName,
  parseParameterTarget,
  toParameterTargetValue,
} from './imports-page-utils';

type ParameterImportLanguageScope = NonNullable<ImportTemplateParameterImport['languageScope']>;
type ParameterImportMatchBy = NonNullable<ImportTemplateParameterImport['matchBy']>;
type TemplateScope = 'import' | 'export';

const PARAMETER_IMPORT_LANGUAGE_SCOPE_OPTIONS = [
  {
    value: 'catalog_languages',
    label: 'All catalog languages',
  },
  {
    value: 'default_only',
    label: 'Default catalog language',
  },
] as const satisfies ReadonlyArray<LabeledOptionDto<ParameterImportLanguageScope>>;

const PARAMETER_IMPORT_MATCH_BY_OPTIONS = [
  {
    value: 'base_id_then_name',
    label: 'Base ID, then name',
  },
  {
    value: 'name_only',
    label: 'Name only',
  },
] as const satisfies ReadonlyArray<LabeledOptionDto<ParameterImportMatchBy>>;

const SOURCE_FIELD_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Source Field',
};

const TARGET_FIELD_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Target Field',
};

const getCanonicalMarketplaceImportSourceField = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lastSegment = trimmed.split('.').at(-1)?.trim() ?? trimmed;
  const normalizedLastSegment = normalizeBaseMarketplaceCheckboxKey(lastSegment);
  if (!normalizedLastSegment) return null;

  const matchedOption = BASE_MARKETPLACE_CHECKBOX_OPTIONS.find((option) =>
    option.aliases.some((alias) => {
      const normalizedAlias = normalizeBaseMarketplaceCheckboxKey(alias);
      return (
        normalizedAlias === normalizedLastSegment ||
        normalizeBaseMarketplaceCheckboxKey(`${alias} Yes`) === normalizedLastSegment
      );
    })
  );
  return matchedOption?.label ?? null;
};

type TemplatesTabContentProps = {
  scope?: TemplateScope;
};

export function TemplatesTabContent({
  scope,
}: TemplatesTabContentProps = {}): React.JSX.Element {
  const {
    importTemplates,
    exportTemplates,
    importSourceFields,
    importSourceFieldValues,
    loadingImportSourceFields,
  } = useImportExportData();
  const {
    templateScope,
    setTemplateScope,
    importActiveTemplateId,
    exportActiveTemplateId,
    importTemplateName,
    setImportTemplateName,
    exportTemplateName,
    setExportTemplateName,
    importTemplateDescription,
    setImportTemplateDescription,
    exportTemplateDescription,
    setExportTemplateDescription,
    importTemplateMappings,
    setImportTemplateMappings,
    importTemplateParameterImport,
    setImportTemplateParameterImport,
    exportTemplateMappings,
    setExportTemplateMappings,
    exportImagesAsBase64,
    setExportImagesAsBase64,
    catalogId,
  } = useImportExportState();
  const {
    handleNewTemplate,
    handleDuplicateTemplate,
    handleCreateExportFromImportTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    savingImportTemplate,
    savingExportTemplate,
    applyTemplate,
  } = useImportExportActions();
  const effectiveTemplateScope = scope ?? templateScope;
  const isScopedTemplateView = scope !== undefined;
  const isImportTemplateScope = effectiveTemplateScope === 'import';
  const templateSaving = isImportTemplateScope ? savingImportTemplate : savingExportTemplate;
  const currentTemplates = isImportTemplateScope ? importTemplates : exportTemplates;
  const currentActiveTemplateId = isImportTemplateScope
    ? importActiveTemplateId
    : exportActiveTemplateId;
  const currentTemplateMappings = isImportTemplateScope
    ? importTemplateMappings
    : exportTemplateMappings;
  const currentTemplateName = isImportTemplateScope ? importTemplateName : exportTemplateName;
  const currentTemplateDescription = isImportTemplateScope
    ? importTemplateDescription
    : exportTemplateDescription;
  const exportImagesAsBase64Id = 'export-images-as-base64';
  const parameterImportEnabledId = 'import-template-parameter-import-enabled';
  const createMissingParametersId = 'import-template-create-missing-parameters';
  const overwriteExistingValuesId = 'import-template-overwrite-existing-values';

  React.useEffect(() => {
    if (!scope || templateScope === scope) return;
    setTemplateScope(scope);
  }, [scope, setTemplateScope, templateScope]);

  const customParameterTargetsQuery = useProductParameters(catalogId || null);
  const simpleParameterTargetsQuery = useProductSimpleParameters(catalogId || null);
  const customFieldTargetsQuery = useProductCustomFields();
  const customParameterTargetFields = React.useMemo((): Array<LabeledOptionDto<string>> => {
    const parameters = customParameterTargetsQuery.data ?? [];
    const seen = new Set<string>();
    return parameters
      .map((parameter): LabeledOptionDto<string> | null => {
        const parameterId = parameter.id.trim();
        if (!parameterId || seen.has(parameterId)) return null;
        seen.add(parameterId);
        return {
          value: `${PRODUCT_PARAMETER_TARGET_PREFIX}${parameterId}`,
          label: `Parameter: ${getParameterDisplayName(parameter)}`,
        };
      })
      .filter((entry): entry is LabeledOptionDto<string> => entry !== null);
  }, [customParameterTargetsQuery.data]);
  const simpleParameterTargetFields = React.useMemo((): Array<LabeledOptionDto<string>> => {
    const parameters = simpleParameterTargetsQuery.data ?? [];
    const seen = new Set<string>();
    return parameters
      .map((parameter): LabeledOptionDto<string> | null => {
        const parameterId = parameter.id.trim();
        if (!parameterId || seen.has(parameterId)) return null;
        seen.add(parameterId);
        return {
          value: `${PRODUCT_PARAMETER_TARGET_PREFIX}${PRODUCT_SIMPLE_PARAMETER_ID_PREFIX}${parameterId}`,
          label: `Simple parameter: ${getParameterDisplayName(parameter)}`,
        };
      })
      .filter((entry): entry is LabeledOptionDto<string> => entry !== null);
  }, [simpleParameterTargetsQuery.data]);
  const customFieldTargetFields = React.useMemo(
    (): Array<LabeledOptionDto<string>> =>
      buildProductCustomFieldTargetOptions(customFieldTargetsQuery.data ?? []),
    [customFieldTargetsQuery.data]
  );
  const templateTargetFieldOptions = React.useMemo((): Array<LabeledOptionDto<string>> => {
    const seen = new Set<string>();
    return [
      ...PRODUCT_FIELDS,
      ...customParameterTargetFields,
      ...simpleParameterTargetFields,
      ...(isImportTemplateScope ? customFieldTargetFields : []),
    ].filter((entry): boolean => {
      const normalizedValue = entry.value.trim().toLowerCase();
      if (!normalizedValue || seen.has(normalizedValue)) return false;
      seen.add(normalizedValue);
      return true;
    });
  }, [
    customFieldTargetFields,
    customParameterTargetFields,
    isImportTemplateScope,
    simpleParameterTargetFields,
  ]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const normalizedImportSourceState = React.useMemo(() => {
    const seen = new Set<string>();
    const fields: string[] = [];
    const values: Record<string, string> = {};

    [...importSourceFields]
      .sort((a: string, b: string): number => a.localeCompare(b))
      .forEach((field: string) => {
        const canonicalField = getCanonicalMarketplaceImportSourceField(field) ?? field;
        if (seen.has(canonicalField)) {
          return;
        }
        seen.add(canonicalField);
        fields.push(canonicalField);
        const canonicalValue = importSourceFieldValues[canonicalField];
        const rawValue = importSourceFieldValues[field];
        if (canonicalValue) {
          values[canonicalField] = canonicalValue;
        } else if (rawValue) {
          values[canonicalField] = rawValue;
        }
      });

    return { fields, values };
  }, [importSourceFieldValues, importSourceFields]);
  const importSourceFieldOptions = normalizedImportSourceState.fields;
  const normalizedImportSourceFieldValues = normalizedImportSourceState.values;
  const buildImportSourceFieldOptions = React.useCallback(
    (mapping: TemplateMapping): Array<LabeledOptionDto<string>> => {
      const customOption: Array<LabeledOptionDto<string>> =
        mapping.sourceKey && !importSourceFieldOptions.includes(mapping.sourceKey)
          ? [
              {
                value: mapping.sourceKey,
                label: `${mapping.sourceKey} (custom)`,
              },
            ]
          : [];

      const mappedOptions = importSourceFieldOptions.map((field: string) => ({
        value: field,
        label: normalizedImportSourceFieldValues[field]
          ? `${field} (${normalizedImportSourceFieldValues[field].slice(0, 60)})`
          : field,
      }));

      return [SOURCE_FIELD_PLACEHOLDER_OPTION, ...customOption, ...mappedOptions];
    },
    [importSourceFieldOptions, normalizedImportSourceFieldValues]
  );
  const buildTemplateTargetFieldOptions = React.useCallback(
    (mapping: TemplateMapping): Array<LabeledOptionDto<string>> => {
      const customOption: Array<LabeledOptionDto<string>> =
        mapping.targetField &&
        !templateTargetFieldOptions.some((option) => option.value === mapping.targetField)
          ? [
              {
                value: mapping.targetField,
                label: `${mapping.targetField} (custom)`,
              },
            ]
          : [];

      return [TARGET_FIELD_PLACEHOLDER_OPTION, ...customOption, ...templateTargetFieldOptions];
    },
    [templateTargetFieldOptions]
  );
  const parameterSourceLabelByValue = React.useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    templateTargetFieldOptions.forEach((field: LabeledOptionDto<string>) => {
      const normalizedValue = field.value.trim().toLowerCase();
      if (!normalizedValue.startsWith(PRODUCT_PARAMETER_TARGET_PREFIX)) {
        return;
      }
      map.set(normalizedValue, field.label);
    });
    return map;
  }, [templateTargetFieldOptions]);
  const getExportSourceFieldLabel = React.useCallback(
    (sourceKey: string): string => {
      const normalizedSourceKey = sourceKey.trim();
      if (!normalizedSourceKey) return sourceKey;

      const parsedParameterTarget = parseParameterTarget(normalizedSourceKey);
      if (parsedParameterTarget) {
        const normalizedParameterValue = toParameterTargetValue(parsedParameterTarget.parameterId);
        const knownParameterLabel = parameterSourceLabelByValue.get(normalizedParameterValue);
        const languageSuffix = parsedParameterTarget.languageCode
          ? ` (${parsedParameterTarget.languageCode.toUpperCase()})`
          : '';
        if (knownParameterLabel) {
          return `${knownParameterLabel}${languageSuffix}`;
        }
        return `Parameter: ${parsedParameterTarget.parameterId}${languageSuffix}`;
      }

      return normalizedSourceKey;
    },
    [parameterSourceLabelByValue]
  );
  const exportSourceFieldOptions = React.useMemo((): Array<LabeledOptionDto<string>> => {
    const allKeys = new Set<string>(EXPORT_PARAMETER_KEYS);
    importSourceFieldOptions.forEach((key: string) => {
      allKeys.add(key);
    });

    return Array.from(allKeys)
      .map((value: string) => ({
        value,
        label: getExportSourceFieldLabel(value),
      }))
      .sort((a, b): number => a.label.localeCompare(b.label) || a.value.localeCompare(b.value));
  }, [getExportSourceFieldLabel, importSourceFieldOptions]);
  const validParameterTargetValues = React.useMemo(
    (): Set<string> =>
      new Set(
        templateTargetFieldOptions
          .filter((entry: LabeledOptionDto<string>) =>
            entry.value.trim().toLowerCase().startsWith(PRODUCT_PARAMETER_TARGET_PREFIX)
          )
          .map((entry: LabeledOptionDto<string>) => entry.value.trim().toLowerCase())
      ),
    [templateTargetFieldOptions]
  );

  const updateMapping = (index: number, patch: Partial<TemplateMapping>): void => {
    if (isImportTemplateScope) {
      setImportTemplateMappings((prev: TemplateMapping[]) =>
        prev.map((mapping: TemplateMapping, mappingIndex: number) =>
          mappingIndex === index ? { ...mapping, ...patch } : mapping
        )
      );
      return;
    }

    setExportTemplateMappings((prev: TemplateMapping[]) =>
      prev.map((mapping: TemplateMapping, mappingIndex: number) =>
        mappingIndex === index ? { ...mapping, ...patch } : mapping
      )
    );
  };

  const addMappingRow = (): void => {
    if (isImportTemplateScope) {
      setImportTemplateMappings((prev: TemplateMapping[]) => [
        ...prev,
        { sourceKey: '', targetField: '' },
      ]);
      return;
    }

    setExportTemplateMappings((prev: TemplateMapping[]) => [
      ...prev,
      { sourceKey: '', targetField: '' },
    ]);
  };

  const removeMappingRow = (index: number): void => {
    if (isImportTemplateScope) {
      setImportTemplateMappings((prev: TemplateMapping[]) =>
        prev.length === 1
          ? [{ sourceKey: '', targetField: '' }]
          : prev.filter((_: TemplateMapping, mappingIndex: number) => mappingIndex !== index)
      );
      return;
    }

    setExportTemplateMappings((prev: TemplateMapping[]) =>
      prev.length === 1
        ? [{ sourceKey: '', targetField: '' }]
        : prev.filter((_: TemplateMapping, mappingIndex: number) => mappingIndex !== index)
    );
  };

  return (
    <Card variant='subtle' padding='lg'>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        {isScopedTemplateView ? (
          <div />
        ) : (
          <Tabs
            value={effectiveTemplateScope}
            onValueChange={(value: string): void => setTemplateScope(value as TemplateScope)}
          >
            <TabsList className='bg-muted/60' aria-label='Template scope tabs'>
              <TabsTrigger value='import'>Import</TabsTrigger>
              <TabsTrigger value='export'>Export</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleNewTemplate(effectiveTemplateScope)}
          >
            New
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void handleDuplicateTemplate(effectiveTemplateScope);
            }}
            disabled={!currentActiveTemplateId || templateSaving}
          >
            Duplicate
          </Button>
          {!isScopedTemplateView && isImportTemplateScope && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void handleCreateExportFromImportTemplate();
              }}
              disabled={!importActiveTemplateId || templateSaving || savingExportTemplate}
            >
              Create Export Copy
            </Button>
          )}
          <Button
            size='sm'
            onClick={() => {
              void handleSaveTemplate(effectiveTemplateScope);
            }}
            disabled={templateSaving}
          >
            {templateSaving ? 'Saving...' : 'Save Template'}
          </Button>
          <Button
            variant='destructive'
            size='sm'
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!currentActiveTemplateId}
            aria-label='Delete template'
            title='Delete template'
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-[240px_1fr]'>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='max-h-[500px] space-y-1 overflow-y-auto border-border/40 bg-black/20'
        >
          <Hint size='xxs' uppercase className='px-2 py-1.5 font-bold text-gray-500'>
            Saved Templates
          </Hint>
          {currentTemplates.length === 0 ? (
            <p className='px-2 py-4 text-xs italic text-gray-600'>No templates found.</p>
          ) : (
            currentTemplates.map((template) => (
              <Button
                key={template.id}
                variant='ghost'
                size='sm'
                className={`w-full justify-start text-xs font-medium ${currentActiveTemplateId === template.id ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary' : 'text-gray-400'}`}
                onClick={() => applyTemplate(template, effectiveTemplateScope)}
              >
                {template.name}
              </Button>
            ))
          )}
        </Card>

        <div className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label className='text-xs text-gray-400'>Template Name</Label>
              <Input
                value={currentTemplateName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  isImportTemplateScope
                    ? setImportTemplateName(event.target.value)
                    : setExportTemplateName(event.target.value)
                }
                placeholder='e.g. Default Producer Import'
                className='h-9'
                aria-label='e.g. Default Producer Import'
                title='e.g. Default Producer Import'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs text-gray-400'>Description</Label>
              <Input
                value={currentTemplateDescription}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  isImportTemplateScope
                    ? setImportTemplateDescription(event.target.value)
                    : setExportTemplateDescription(event.target.value)
                }
                placeholder='Optional notes...'
                className='h-9'
                aria-label='Optional notes...'
                title='Optional notes...'
              />
            </div>
          </div>

          {!isImportTemplateScope && (
            <div className='group flex w-fit items-center gap-2'>
              <Checkbox
                id={exportImagesAsBase64Id}
                checked={exportImagesAsBase64}
                onCheckedChange={(value: boolean | 'indeterminate') =>
                  setExportImagesAsBase64(Boolean(value))
                }
              />
              <Label
                htmlFor={exportImagesAsBase64Id}
                className='cursor-pointer text-sm text-gray-300 transition-colors group-hover:text-white'
              >
                Export images as Base64 data strings
              </Label>
            </div>
          )}

          {isImportTemplateScope && (
            <Card
              variant='subtle-compact'
              padding='md'
              className='space-y-3 border-border/50 bg-gray-950/30'
            >
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='text-sm font-medium text-gray-200'>Parameter Import</p>
                  <p className='text-xs text-gray-500'>
                    Import dynamic Base.com parameters with multilingual values.
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id={parameterImportEnabledId}
                    checked={importTemplateParameterImport.enabled}
                    onCheckedChange={(value: boolean | 'indeterminate'): void =>
                      setImportTemplateParameterImport((prev) => ({
                        ...prev,
                        enabled: Boolean(value),
                      }))
                    }
                  />
                  <Label
                    htmlFor={parameterImportEnabledId}
                    className='cursor-pointer text-xs text-gray-300'
                  >
                    Enabled
                  </Label>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Language scope</Label>
                  <SelectSimple
                    size='sm'
                    value={importTemplateParameterImport.languageScope}
                    onValueChange={(value: string): void =>
                      setImportTemplateParameterImport((prev) => ({
                        ...prev,
                        languageScope:
                          value === 'default_only' ? 'default_only' : 'catalog_languages',
                      }))
                    }
                    options={PARAMETER_IMPORT_LANGUAGE_SCOPE_OPTIONS}
                    triggerClassName='w-full h-8 border-border bg-gray-900 text-xs'
                    ariaLabel='Select option'
                    title='Select option'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Matching</Label>
                  <SelectSimple
                    size='sm'
                    value={importTemplateParameterImport.matchBy}
                    onValueChange={(value: string): void =>
                      setImportTemplateParameterImport((prev) => ({
                        ...prev,
                        matchBy: value === 'name_only' ? 'name_only' : 'base_id_then_name',
                      }))
                    }
                    options={PARAMETER_IMPORT_MATCH_BY_OPTIONS}
                    triggerClassName='w-full h-8 border-border bg-gray-900 text-xs'
                    ariaLabel='Select option'
                    title='Select option'
                  />
                </div>
              </div>

              <div className='flex flex-wrap gap-4 pt-1'>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id={createMissingParametersId}
                    checked={importTemplateParameterImport.createMissingParameters}
                    onCheckedChange={(value: boolean | 'indeterminate'): void =>
                      setImportTemplateParameterImport((prev) => ({
                        ...prev,
                        createMissingParameters: Boolean(value),
                      }))
                    }
                  />
                  <Label
                    htmlFor={createMissingParametersId}
                    className='cursor-pointer text-xs text-gray-300'
                  >
                    Create missing parameters
                  </Label>
                </div>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id={overwriteExistingValuesId}
                    checked={importTemplateParameterImport.overwriteExistingValues}
                    onCheckedChange={(value: boolean | 'indeterminate'): void =>
                      setImportTemplateParameterImport((prev) => ({
                        ...prev,
                        overwriteExistingValues: Boolean(value),
                      }))
                    }
                  />
                  <Label
                    htmlFor={overwriteExistingValuesId}
                    className='cursor-pointer text-xs text-gray-300'
                  >
                    Overwrite existing values
                  </Label>
                </div>
              </div>
            </Card>
          )}

          <div className='space-y-3'>
            <Hint size='xs' uppercase className='mb-1 block font-bold text-gray-500'>
              Field Mappings
            </Hint>
            <div className='space-y-2'>
              {currentTemplateMappings.map((mapping, index) => (
                <div key={index} className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    {isImportTemplateScope ? (
                      <div className='flex-1'>
                        <SelectSimple
                          size='sm'
                          value={mapping.sourceKey || '__none__'}
                          onValueChange={(value: string): void =>
                            updateMapping(index, {
                              sourceKey: value === '__none__' ? '' : value,
                            })
                          }
                          options={buildImportSourceFieldOptions(mapping)}
                          triggerClassName='w-full h-9 bg-card/40'
                          placeholder='Select source field'
                          ariaLabel='Select source field'
                          title='Select source field'
                        />
                      </div>
                    ) : (
                      <Input
                        value={mapping.sourceKey}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          updateMapping(index, { sourceKey: event.target.value })
                        }
                        placeholder='Source (e.g. category_id or custom_color)'
                        list='export-source-field-options'
                        className='h-9 flex-1'
                        aria-label='Source (e.g. category_id or custom_color)'
                        title='Source (e.g. category_id or custom_color)'
                      />
                    )}
                    <div className='flex-1'>
                      <SelectSimple
                        size='sm'
                        value={mapping.targetField || '__none__'}
                        onValueChange={(value: string): void =>
                          updateMapping(index, {
                            targetField: value === '__none__' ? '' : value,
                          })
                        }
                        options={buildTemplateTargetFieldOptions(mapping)}
                        triggerClassName='w-full h-9 bg-card/40'
                        placeholder='Target Field'
                        ariaLabel='Target Field'
                        title='Target Field'
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-9 w-9 shrink-0'
                      onClick={() => removeMappingRow(index)}
                      aria-label={`Remove mapping ${index + 1}`}
                      title={`Remove mapping ${index + 1}`}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                  {!isImportTemplateScope && (
                    <p className='px-1 text-[11px] text-gray-500'>
                      Use canonical export fields. Parameter targets must match{' '}
                      <code className='rounded bg-black/20 px-1 py-0.5 text-[10px]'>
                        {PRODUCT_PARAMETER_TARGET_PATTERN}
                      </code>{' '}
                      or{' '}
                      <code className='rounded bg-black/20 px-1 py-0.5 text-[10px]'>
                        {PRODUCT_PARAMETER_TARGET_TRANSLATED_PATTERN}
                      </code>
                      .
                    </p>
                  )}
                  {isImportTemplateScope && loadingImportSourceFields && index === 0 && (
                    <p className='px-1 text-[11px] text-gray-500'>Loading source fields...</p>
                  )}
                  {isImportTemplateScope &&
                    mapping.targetField &&
                    mapping.targetField.trim().toLowerCase().startsWith(
                      PRODUCT_PARAMETER_TARGET_PREFIX
                    ) &&
                    !validParameterTargetValues.has(mapping.targetField.trim().toLowerCase()) && (
                      <p className='px-1 text-[11px] text-amber-400'>
                        This parameter target is not available in the selected catalog.
                      </p>
                    )}
                </div>
              ))}
            </div>

            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={addMappingRow}
              className='gap-2'
            >
              <Plus className='size-3.5' />
              Add Mapping
            </Button>
          </div>
        </div>
      </div>

      {!isImportTemplateScope && (
        <datalist id='export-source-field-options'>
          {exportSourceFieldOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      )}

      <ConfirmModal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title='Delete Template'
        message='This will permanently remove the selected template.'
        confirmText='Delete'
        isDangerous
        onConfirm={async (): Promise<void> => {
          await handleDeleteTemplate(effectiveTemplateScope);
        }}
      />
    </Card>
  );
}
