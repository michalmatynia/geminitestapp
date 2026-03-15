'use client';

import { Trash2, Plus } from 'lucide-react';
import React from 'react';

import {
  PRODUCT_FIELDS,
  EXPORT_PARAMETER_KEYS,
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
  useProductParameters,
  useProductSimpleParameters,
} from '@/features/data-import-export/hooks/useImportQueries';
import type { TemplateMapping } from '@/shared/contracts/integrations';
import { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX } from '@/shared/contracts/products';
import {
  Button,
  Checkbox,
  ConfirmModal,
  Input,
  SelectSimple,
  Tabs,
  TabsList,
  TabsTrigger,
  Label,
  Card,
  Hint,
} from '@/shared/ui';

import {
  parseParameterTarget,
  toParameterTargetValue,
  getParameterDisplayName,
} from './imports-page-utils';

export function TemplatesTabContent(): React.JSX.Element {
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
  const exportImagesAsBase64Id = 'export-images-as-base64';
  const parameterImportEnabledId = 'import-template-parameter-import-enabled';
  const createMissingParametersId = 'import-template-create-missing-parameters';
  const overwriteExistingValuesId = 'import-template-overwrite-existing-values';

  const customParameterTargetsQuery = useProductParameters(catalogId || null);
  const simpleParameterTargetsQuery = useProductSimpleParameters(catalogId || null);
  const customParameterTargetFields = React.useMemo((): Array<{ value: string; label: string }> => {
    const parameters = customParameterTargetsQuery.data ?? [];
    const seen = new Set<string>();
    return parameters
      .map((parameter): { value: string; label: string } | null => {
        const parameterId = parameter.id.trim();
        if (!parameterId || seen.has(parameterId)) return null;
        seen.add(parameterId);
        return {
          value: `${PRODUCT_PARAMETER_TARGET_PREFIX}${parameterId}`,
          label: `Parameter: ${getParameterDisplayName(parameter)}`,
        };
      })
      .filter((entry): entry is { value: string; label: string } => entry !== null);
  }, [customParameterTargetsQuery.data]);
  const simpleParameterTargetFields = React.useMemo((): Array<{ value: string; label: string }> => {
    const parameters = simpleParameterTargetsQuery.data ?? [];
    const seen = new Set<string>();
    return parameters
      .map((parameter): { value: string; label: string } | null => {
        const parameterId = parameter.id.trim();
        if (!parameterId || seen.has(parameterId)) return null;
        seen.add(parameterId);
        return {
          value: `${PRODUCT_PARAMETER_TARGET_PREFIX}${PRODUCT_SIMPLE_PARAMETER_ID_PREFIX}${parameterId}`,
          label: `Simple parameter: ${getParameterDisplayName(parameter)}`,
        };
      })
      .filter((entry): entry is { value: string; label: string } => entry !== null);
  }, [simpleParameterTargetsQuery.data]);
  const templateTargetFieldOptions = React.useMemo((): Array<{ value: string; label: string }> => {
    const seen = new Set<string>();
    return [
      ...PRODUCT_FIELDS,
      ...customParameterTargetFields,
      ...simpleParameterTargetFields,
    ].filter((entry): boolean => {
      const normalizedValue = entry.value.trim().toLowerCase();
      if (!normalizedValue || seen.has(normalizedValue)) return false;
      seen.add(normalizedValue);
      return true;
    });
  }, [customParameterTargetFields, simpleParameterTargetFields]);

  const isImportTemplateScope = templateScope === 'import';
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const currentTemplates = isImportTemplateScope ? importTemplates : exportTemplates;
  const currentActiveTemplateId = isImportTemplateScope
    ? importActiveTemplateId
    : exportActiveTemplateId;
  const currentTemplateMappings = isImportTemplateScope
    ? importTemplateMappings
    : exportTemplateMappings;
  const importSourceFieldOptions = React.useMemo(
    (): string[] =>
      [...importSourceFields].sort((a: string, b: string): number => a.localeCompare(b)),
    [importSourceFields]
  );
  const parameterSourceLabelByValue = React.useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    templateTargetFieldOptions.forEach((field: { value: string; label: string }) => {
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
  const exportSourceFieldOptions = React.useMemo((): Array<{ value: string; label: string }> => {
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
          .filter((entry: { value: string; label: string }) =>
            entry.value.trim().toLowerCase().startsWith(PRODUCT_PARAMETER_TARGET_PREFIX)
          )
          .map((entry: { value: string; label: string }) => entry.value.trim().toLowerCase())
      ),
    [templateTargetFieldOptions]
  );

  const updateMapping = (index: number, patch: Partial<TemplateMapping>): void => {
    if (templateScope === 'import') {
      setImportTemplateMappings((prev: TemplateMapping[]) =>
        prev.map((m: TemplateMapping, i: number) => (i === index ? { ...m, ...patch } : m))
      );
    } else {
      setExportTemplateMappings((prev: TemplateMapping[]) =>
        prev.map((m: TemplateMapping, i: number) => (i === index ? { ...m, ...patch } : m))
      );
    }
  };

  const addMappingRow = (): void => {
    if (templateScope === 'import') {
      setImportTemplateMappings((prev: TemplateMapping[]) => [
        ...prev,
        { sourceKey: '', targetField: '' },
      ]);
    } else {
      setExportTemplateMappings((prev: TemplateMapping[]) => [
        ...prev,
        { sourceKey: '', targetField: '' },
      ]);
    }
  };

  const removeMappingRow = (index: number): void => {
    if (templateScope === 'import') {
      setImportTemplateMappings((prev: TemplateMapping[]) =>
        prev.length === 1
          ? [{ sourceKey: '', targetField: '' }]
          : prev.filter((_: TemplateMapping, i: number) => i !== index)
      );
    } else {
      setExportTemplateMappings((prev: TemplateMapping[]) =>
        prev.length === 1
          ? [{ sourceKey: '', targetField: '' }]
          : prev.filter((_: TemplateMapping, i: number) => i !== index)
      );
    }
  };

  return (
    <Card variant='subtle' padding='lg'>
      <div className='flex flex-wrap justify-between items-start gap-4 mb-6'>
        <Tabs
          value={templateScope}
          onValueChange={(v: string): void => setTemplateScope(v as 'import' | 'export')}
        >
          <TabsList className='bg-muted/60' aria-label='Template scope tabs'>
            <TabsTrigger value='import'>Import</TabsTrigger>
            <TabsTrigger value='export'>Export</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={handleNewTemplate}>
            New
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void handleDuplicateTemplate();
            }}
            disabled={!currentActiveTemplateId || savingImportTemplate || savingExportTemplate}
          >
            Duplicate
          </Button>
          {templateScope === 'import' && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void handleCreateExportFromImportTemplate();
              }}
              disabled={!importActiveTemplateId || savingImportTemplate || savingExportTemplate}
            >
              Create Export Copy
            </Button>
          )}
          <Button
            size='sm'
            onClick={() => {
              void handleSaveTemplate();
            }}
            disabled={savingImportTemplate || savingExportTemplate}
          >
            {savingImportTemplate || savingExportTemplate ? 'Saving...' : 'Save Template'}
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

      <div className='grid md:grid-cols-[240px_1fr] gap-6'>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='bg-black/20 border-border/40 max-h-[500px] overflow-y-auto space-y-1'
        >
          <Hint size='xxs' uppercase className='px-2 py-1.5 font-bold text-gray-500'>
            Saved Templates
          </Hint>
          {currentTemplates.length === 0 ? (
            <p className='px-2 py-4 text-xs text-gray-600 italic'>No templates found.</p>
          ) : (
            currentTemplates.map((t) => (
              <Button
                key={t.id}
                variant='ghost'
                size='sm'
                className={`w-full justify-start text-xs font-medium ${currentActiveTemplateId === t.id ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary' : 'text-gray-400'}`}
                onClick={() => applyTemplate(t, templateScope)}
              >
                {t.name}
              </Button>
            ))
          )}
        </Card>

        <div className='space-y-6'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label className='text-xs text-gray-400'>Template Name</Label>
              <Input
                value={isImportTemplateScope ? importTemplateName : exportTemplateName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  isImportTemplateScope
                    ? setImportTemplateName(e.target.value)
                    : setExportTemplateName(e.target.value)
                }
                placeholder='e.g. Default Producer Import'
                className='h-9'
               aria-label='e.g. Default Producer Import' title='e.g. Default Producer Import'/>
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs text-gray-400'>Description</Label>
              <Input
                value={
                  isImportTemplateScope ? importTemplateDescription : exportTemplateDescription
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  isImportTemplateScope
                    ? setImportTemplateDescription(e.target.value)
                    : setExportTemplateDescription(e.target.value)
                }
                placeholder='Optional notes...'
                className='h-9'
               aria-label='Optional notes...' title='Optional notes...'/>
            </div>
          </div>

          {templateScope === 'export' && (
            <div className='group flex w-fit items-center gap-2'>
              <Checkbox
                id={exportImagesAsBase64Id}
                checked={exportImagesAsBase64}
                onCheckedChange={(v: boolean | 'indeterminate') =>
                  setExportImagesAsBase64(Boolean(v))
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

          {templateScope === 'import' && (
            <Card
              variant='subtle-compact'
              padding='md'
              className='border-border/50 bg-gray-950/30 space-y-3'
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

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
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
                    options={[
                      {
                        value: 'catalog_languages',
                        label: 'All catalog languages',
                      },
                      {
                        value: 'default_only',
                        label: 'Default catalog language',
                      },
                    ]}
                    triggerClassName='w-full h-8 bg-gray-900 border-border text-xs'
                   ariaLabel='Select option' title='Select option'/>
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
                    options={[
                      {
                        value: 'base_id_then_name',
                        label: 'Base ID, then name',
                      },
                      {
                        value: 'name_only',
                        label: 'Name only',
                      },
                    ]}
                    triggerClassName='w-full h-8 bg-gray-900 border-border text-xs'
                   ariaLabel='Select option' title='Select option'/>
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
            <Hint size='xs' uppercase className='font-bold text-gray-500 block mb-1'>
              Field Mappings
            </Hint>
            <div className='space-y-2'>
              {currentTemplateMappings.map((m, i) => (
                <div key={i} className='space-y-1'>
                  <div className='flex gap-2 items-center'>
                    {templateScope === 'export' ? (
                      <Input
                        value={m.sourceKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateMapping(i, { sourceKey: e.target.value })
                        }
                        placeholder='Source (e.g. category_id or custom_color)'
                        list='export-source-field-options'
                        className='flex-1 h-9'
                       aria-label='Source (e.g. category_id or custom_color)' title='Source (e.g. category_id or custom_color)'/>
                    ) : (
                      <div className='flex-1'>
                        <SelectSimple
                          size='sm'
                          value={m.sourceKey || '__none__'}
                          onValueChange={(value: string): void =>
                            updateMapping(i, {
                              sourceKey: value === '__none__' ? '' : value,
                            })
                          }
                          options={[
                            { value: '__none__', label: 'Source Field' },
                            ...(m.sourceKey && !importSourceFieldOptions.includes(m.sourceKey)
                              ? [
                                {
                                  value: m.sourceKey,
                                  label: `${m.sourceKey} (custom)`,
                                },
                              ]
                              : []),
                            ...importSourceFieldOptions.map((field: string) => ({
                              value: field,
                              label: importSourceFieldValues[field]
                                ? `${field} (${importSourceFieldValues[field].slice(0, 60)})`
                                : field,
                            })),
                          ]}
                          triggerClassName='w-full h-9 bg-card/40'
                          placeholder='Select source field'
                         ariaLabel='Select source field' title='Select source field'/>
                      </div>
                    )}
                    <div className='flex-1'>
                      <SelectSimple
                        size='sm'
                        value={m.targetField || '__none__'}
                        onValueChange={(v: string): void =>
                          updateMapping(i, {
                            targetField: v === '__none__' ? '' : v,
                          })
                        }
                        options={[
                          { value: '__none__', label: 'Target Field' },
                          ...(m.targetField &&
                          !templateTargetFieldOptions.some(
                            (option) => option.value === m.targetField
                          )
                            ? [
                              {
                                value: m.targetField,
                                label: `${m.targetField} (custom)`,
                              },
                            ]
                            : []),
                          ...templateTargetFieldOptions,
                        ]}
                        triggerClassName='w-full h-9 bg-card/40'
                        placeholder='Target Field'
                       ariaLabel='Target Field' title='Target Field'/>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-9 w-9 text-gray-500 hover:text-red-400'
                      onClick={() => removeMappingRow(i)}
                      aria-label='Remove mapping row'
                      title='Remove mapping row'
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                  {templateScope === 'export'
                    ? (() => {
                      const sourceValue = m.sourceKey.trim();
                      const sourceUsesParameterPrefix = sourceValue
                        .toLowerCase()
                        .startsWith(PRODUCT_PARAMETER_TARGET_PREFIX);
                      const targetValue = m.targetField.trim();
                      const hasParameterPrefix = targetValue
                        .toLowerCase()
                        .startsWith(PRODUCT_PARAMETER_TARGET_PREFIX);
                      if (!hasParameterPrefix && !sourceUsesParameterPrefix) {
                        return null;
                      }

                      if (sourceUsesParameterPrefix) {
                        const parsedSourceParameter = parseParameterTarget(sourceValue);
                        if (parsedSourceParameter) {
                          return (
                            <p className='text-[11px] text-red-300'>
                                Legacy source format <code>{PRODUCT_PARAMETER_TARGET_PATTERN}</code>{' '}
                                is not supported for export. Use canonical Base source fields (for
                                example <code>text_fields.features.Materiał</code> or{' '}
                              <code>text_fields.features|de.Materiał</code>).
                            </p>
                          );
                        }
                      }

                      if (!hasParameterPrefix) return null;

                      const parsedParameterTarget = parseParameterTarget(targetValue);
                      if (!parsedParameterTarget) {
                        return (
                          <p className='text-[11px] text-amber-300'>
                              Invalid parameter target format. Use{' '}
                            <code>{PRODUCT_PARAMETER_TARGET_PATTERN}</code> or{' '}
                            <code>{PRODUCT_PARAMETER_TARGET_TRANSLATED_PATTERN}</code>.
                          </p>
                        );
                      }

                      const normalizedTargetValue = toParameterTargetValue(
                        parsedParameterTarget.parameterId
                      );
                      if (validParameterTargetValues.has(normalizedTargetValue)) {
                        return null;
                      }

                      return (
                        <p className='text-[11px] text-amber-300'>
                          {catalogId
                            ? 'Parameter target is not in current catalog parameter list. Verify the parameter ID.'
                            : 'Select a catalog in Imports tab to validate parameter targets.'}
                        </p>
                      );
                    })()
                    : null}
                </div>
              ))}
            </div>
            <Button variant='outline' size='sm' className='h-8' onClick={addMappingRow}>
              <Plus className='size-3.5 mr-1.5' />
              Add Field Row
            </Button>
          </div>

          <div className='pt-2'>
            {templateScope === 'export' && (
              <>
                <datalist id='export-source-field-options'>
                  {exportSourceFieldOptions.map((option) => {
                    return (
                      <option key={option.value} value={option.value} label={option.label}>
                        {option.label}
                      </option>
                    );
                  })}
                </datalist>
                <p className='text-xs text-gray-500 italic'>
                  Tip: For category mapping use source <code>category_id</code> and target{' '}
                  <code>categoryId</code>. For parameters set Base field key in <code>Source</code>{' '}
                  and use target <code>{PRODUCT_PARAMETER_TARGET_PATTERN}</code> or{' '}
                  <code>{PRODUCT_PARAMETER_TARGET_TRANSLATED_PATTERN}</code>. Available source keys:{' '}
                  {exportSourceFieldOptions.length}.
                </p>
              </>
            )}
            {templateScope === 'import' && (
              <p className='text-xs text-gray-500 italic'>
                {loadingImportSourceFields
                  ? 'Loading source fields from selected inventory...'
                  : importSourceFieldOptions.length > 0
                    ? `Loaded ${importSourceFieldOptions.length} source fields from the selected inventory schema.`
                    : 'No source fields loaded yet. Go to Imports tab, select connection + inventory to load schema.'}
                {catalogId
                  ? customParameterTargetsQuery.isLoading || simpleParameterTargetsQuery.isLoading
                    ? ' Loading parameter targets...'
                    : ` Parameter targets: ${customParameterTargetFields.length + simpleParameterTargetFields.length} (${customParameterTargetFields.length} custom, ${simpleParameterTargetFields.length} simple).`
                  : ' Select a catalog in Imports tab to load parameter targets.'}
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title='Delete Template'
        message={`Are you sure you want to permanently delete this ${templateScope} template? This action cannot be undone.`}
        confirmText='Delete Template'
        isDangerous={true}
        loading={savingImportTemplate || savingExportTemplate}
        onConfirm={() => {
          return handleDeleteTemplate().finally(() => setDeleteDialogOpen(false));
        }}
      />
    </Card>
  );
}
