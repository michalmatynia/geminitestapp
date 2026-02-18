'use client';
import { Trash2, Download, Upload, ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  PRODUCT_FIELDS,
  EXPORT_PARAMETER_KEYS,
  PRODUCT_PARAMETER_TARGET_PATTERN,
  PRODUCT_PARAMETER_TARGET_PREFIX,
} from '@/features/data-import-export/components/imports/constants';
import { ExportTab } from '@/features/data-import-export/components/imports/ExportTab';
import { ImportTab } from '@/features/data-import-export/components/imports/ImportTab';
import {
  ImportExportProvider,
  useImportExport,
} from '@/features/data-import-export/context/ImportExportContext';
import type {
  Template,
  TemplateMapping,
} from '@/features/data-import-export/types/imports';
import { useParameters as useProductParameters } from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductParameter } from '@/features/products/types';
import {
  Button,
  Checkbox,
  ConfirmModal,
  Input,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Label,
  SectionHeader,
} from '@/shared/ui';

function ImportsPageContent(): React.JSX.Element {
  const {
    checkingIntegration,
    isBaseConnected,
    templateScope,
    setTemplateScope,
    handleNewTemplate,
    handleDuplicateTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    savingImportTemplate,
    savingExportTemplate,
    importActiveTemplateId,
    exportActiveTemplateId,
    importTemplates,
    exportTemplates,
    applyTemplate,
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
    importSourceFields,
    importSourceFieldValues,
    loadingImportSourceFields,
  } = useImportExport();

  const customParameterTargetsQuery = useProductParameters(catalogId || null);
  const customParameterTargetFields = React.useMemo(
    (): Array<{ value: string; label: string }> => {
      const parameters = customParameterTargetsQuery.data ?? [];
      const seen = new Set<string>();
      return parameters
        .map((parameter: ProductParameter): { value: string; label: string } | null => {
          const parameterId = parameter.id.trim();
          if (!parameterId || seen.has(parameterId)) return null;
          seen.add(parameterId);
          const label =
            parameter.name_en?.trim() ||
            parameter.name_pl?.trim() ||
            parameter.name_de?.trim() ||
            parameterId;
          return {
            value: `${PRODUCT_PARAMETER_TARGET_PREFIX}${parameterId}`,
            label: `Parameter: ${label}`,
          };
        })
        .filter(
          (entry): entry is { value: string; label: string } => entry !== null
        );
    },
    [customParameterTargetsQuery.data]
  );
  const templateTargetFieldOptions = React.useMemo(
    (): Array<{ value: string; label: string }> => [
      ...PRODUCT_FIELDS,
      ...customParameterTargetFields,
    ],
    [customParameterTargetFields]
  );

  const isImportTemplateScope = templateScope === 'import';
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const currentTemplates = isImportTemplateScope ? importTemplates : exportTemplates;
  const currentActiveTemplateId = isImportTemplateScope ? importActiveTemplateId : exportActiveTemplateId;
  const currentTemplateMappings = isImportTemplateScope ? importTemplateMappings : exportTemplateMappings;
  const exportSourceFieldOptions = React.useMemo(
    (): string[] => [...EXPORT_PARAMETER_KEYS].sort((a: string, b: string): number => a.localeCompare(b)),
    []
  );
  const importSourceFieldOptions = React.useMemo(
    (): string[] =>
      [...importSourceFields].sort(
        (a: string, b: string): number => a.localeCompare(b)
      ),
    [importSourceFields]
  );

  const updateMapping = (index: number, patch: Partial<TemplateMapping>): void => {
    const setMappings = templateScope === 'import' ? setImportTemplateMappings : setExportTemplateMappings;
    setMappings((prev: TemplateMapping[]) => prev.map((m: TemplateMapping, i: number) => i === index ? { ...m, ...patch } : m));
  };

  const addMappingRow = (): void => {
    const setMappings = templateScope === 'import' ? setImportTemplateMappings : setExportTemplateMappings;
    setMappings((prev: TemplateMapping[]) => [...prev, { sourceKey: '', targetField: '' }]);
  };

  const removeMappingRow = (index: number): void => {
    const setMappings = templateScope === 'import' ? setImportTemplateMappings : setExportTemplateMappings;
    setMappings((prev: TemplateMapping[]) => prev.length === 1 ? [{ sourceKey: '', targetField: '' }] : prev.filter((_: TemplateMapping, i: number) => i !== index));
  };

  if (checkingIntegration) {
    return (
      <div className='w-full py-10 container mx-auto'>
        <div className='rounded-lg border border-border/60 bg-card/40 p-12 text-center text-sm text-gray-400'>
          <div className='inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4' />
          <p>Checking Base.com integration status...</p>
        </div>
      </div>
    );
  }
  if (!isBaseConnected) {
    return (
      <div className='w-full py-10 container mx-auto'>
        <div className='rounded-lg border border-amber-500/40 bg-amber-500/10 p-8 text-sm text-amber-300 shadow-lg shadow-amber-900/10'>
          <h3 className='text-lg font-bold mb-2'>Base.com integration required</h3>
          <p>Please configure your Base.com API connection in the Integrations settings before using import/export tools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-10 space-y-6'>
      <SectionHeader
        title='Product Import/Export'
        subtitle={(
          <nav aria-label='Breadcrumb' className='flex flex-wrap items-center gap-1 text-xs text-gray-400'>
            <Link href='/admin' className='hover:text-gray-200 transition-colors'>
              Admin
            </Link>
            <span>/</span>
            <Link href='/admin/integrations' className='hover:text-gray-200 transition-colors'>
              Integrations
            </Link>
            <span>/</span>
            <span className='text-gray-300'>Imports</span>
          </nav>
        )}
      />
      
      <Tabs defaultValue='imports' className='w-full'>
        <TabsList className='bg-muted/40 p-1'>
          <TabsTrigger value='imports' className='gap-2'>
            <Download className='size-3.5' />
            Imports
          </TabsTrigger>
          <TabsTrigger value='exports' className='gap-2'>
            <Upload className='size-3.5' />
            Exports
          </TabsTrigger>
          <TabsTrigger value='templates' className='gap-2'>
            <ClipboardList className='size-3.5' />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value='imports' className='mt-6 outline-none'>
          <ImportTab />
        </TabsContent>

        <TabsContent value='exports' className='mt-6 outline-none'>
          <ExportTab />
        </TabsContent>

        <TabsContent value='templates' className='mt-6 outline-none'>
          <div className='bg-card/40 p-6 border border-border/60 rounded-xl'>
            <div className='flex flex-wrap justify-between items-start gap-4 mb-6'>
              <Tabs value={templateScope} onValueChange={(v: string): void => setTemplateScope(v as 'import' | 'export')}>
                <TabsList className='bg-muted/60'>
                  <TabsTrigger value='import'>Import</TabsTrigger>
                  <TabsTrigger value='export'>Export</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' onClick={handleNewTemplate}>New</Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => { void handleDuplicateTemplate(); }}
                  disabled={!currentActiveTemplateId || savingImportTemplate || savingExportTemplate}
                >
                  Duplicate
                </Button>
                <Button size='sm' onClick={() => { void handleSaveTemplate(); }} disabled={savingImportTemplate || savingExportTemplate}>
                  {savingImportTemplate || savingExportTemplate ? 'Saving...' : 'Save Template'}
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={!currentActiveTemplateId}
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </div>
            </div>
            
            <div className='grid md:grid-cols-[240px_1fr] gap-6'>
              <div className='bg-black/20 p-2 border border-border/40 rounded-lg max-h-[500px] overflow-y-auto space-y-1'>
                <div className='px-2 py-1.5 text-[10px] uppercase font-bold text-gray-500'>Saved Templates</div>
                {currentTemplates.length === 0 ? (
                  <p className='px-2 py-4 text-xs text-gray-600 italic'>No templates found.</p>
                ) : (
                  currentTemplates.map((t: Template) => (
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
              </div>
              
              <div className='space-y-6'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs text-gray-400'>Template Name</Label>
                    <Input 
                      value={isImportTemplateScope ? importTemplateName : exportTemplateName} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => isImportTemplateScope ? setImportTemplateName(e.target.value) : setExportTemplateName(e.target.value)}
                      placeholder='e.g. Default Producer Import'
                      className='h-9'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs text-gray-400'>Description</Label>
                    <Input 
                      value={isImportTemplateScope ? importTemplateDescription : exportTemplateDescription} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => isImportTemplateScope ? setImportTemplateDescription(e.target.value) : setExportTemplateDescription(e.target.value)}
                      placeholder='Optional notes...'
                      className='h-9'
                    />
                  </div>
                </div>

                {templateScope === 'export' && (
                  <label className='flex items-center gap-2 cursor-pointer w-fit group'>
                    <Checkbox 
                      id='exportImagesAsBase64' 
                      checked={exportImagesAsBase64} 
                      onCheckedChange={(v: boolean | 'indeterminate') => setExportImagesAsBase64(Boolean(v))} 
                    />
                    <span className='text-sm text-gray-300 group-hover:text-white transition-colors'>Export images as Base64 data strings</span>
                  </label>
                )}

                {templateScope === 'import' && (
                  <div className='rounded-md border border-border/50 bg-gray-950/30 p-4 space-y-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <p className='text-sm font-medium text-gray-200'>Parameter Import</p>
                        <p className='text-xs text-gray-500'>
                          Import dynamic Base.com parameters with multilingual values.
                        </p>
                      </div>
                      <label className='flex items-center gap-2 cursor-pointer'>
                        <Checkbox
                          checked={importTemplateParameterImport.enabled}
                          onCheckedChange={(value: boolean | 'indeterminate'): void =>
                            setImportTemplateParameterImport((prev) => ({
                              ...prev,
                              enabled: Boolean(value),
                            }))
                          }
                        />
                        <span className='text-xs text-gray-300'>Enabled</span>
                      </label>
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
                                value === 'default_only'
                                  ? 'default_only'
                                  : 'catalog_languages',
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
                              matchBy:
                                value === 'name_only'
                                  ? 'name_only'
                                  : 'base_id_then_name',
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
                        />
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-4 pt-1'>
                      <label className='flex items-center gap-2 cursor-pointer'>
                        <Checkbox
                          checked={importTemplateParameterImport.createMissingParameters}
                          onCheckedChange={(value: boolean | 'indeterminate'): void =>
                            setImportTemplateParameterImport((prev) => ({
                              ...prev,
                              createMissingParameters: Boolean(value),
                            }))
                          }
                        />
                        <span className='text-xs text-gray-300'>Create missing parameters</span>
                      </label>
                      <label className='flex items-center gap-2 cursor-pointer'>
                        <Checkbox
                          checked={importTemplateParameterImport.overwriteExistingValues}
                          onCheckedChange={(value: boolean | 'indeterminate'): void =>
                            setImportTemplateParameterImport((prev) => ({
                              ...prev,
                              overwriteExistingValues: Boolean(value),
                            }))
                          }
                        />
                        <span className='text-xs text-gray-300'>Overwrite existing values</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className='space-y-3'>
                  <Label className='text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1'>Field Mappings</Label>
                  <div className='space-y-2'>
                    {currentTemplateMappings.map((m: TemplateMapping, i: number) => (
                      <div key={i} className='flex gap-2 items-center'>
                        {templateScope === 'export' ? (
                          <Input
                            value={m.sourceKey}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMapping(i, { sourceKey: e.target.value })}
                            placeholder='Source (e.g. category_id)'
                            list='export-source-field-options'
                            className='flex-1 h-9'
                          />
                        ) : (
                          <div className='flex-1'>
                            <SelectSimple 
                              size='sm'
                              value={m.sourceKey || '__none__'}
                              onValueChange={(value: string): void =>
                                updateMapping(i, {
                                  sourceKey:
                                    value === '__none__'
                                      ? ''
                                      : value,
                                })
                              }
                              options={[
                                { value: '__none__', label: 'Source Field' },
                                ...(m.sourceKey &&
                                !importSourceFieldOptions.includes(m.sourceKey)
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
                              triggerClassName='w-full h-9 bg-gray-950/40'
                              placeholder='Select source field'
                            />
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
                            triggerClassName='w-full h-9 bg-gray-950/40'
                            placeholder='Target Field'
                          />
                        </div>
                        <Button 
                          variant='ghost' 
                          size='icon' 
                          className='h-9 w-9 text-gray-500 hover:text-red-400'
                          onClick={() => removeMappingRow(i)}
                        >
                          <Trash2 className='size-4' />
                        </Button>
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
                        {exportSourceFieldOptions.map((field: string) => (
                          <option key={field} value={field} />
                        ))}
                      </datalist>
                      <p className='text-xs text-gray-500 italic'>
                        Tip: For category mapping use source <code>category_id</code> and target <code>categoryId</code>.
                        {' '}For parameters use target <code>{PRODUCT_PARAMETER_TARGET_PATTERN}</code>.
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
                        ? customParameterTargetsQuery.isLoading
                          ? ' Loading parameter targets...'
                          : ` Parameter targets: ${customParameterTargetFields.length}.`
                        : ' Select a catalog in Imports tab to load parameter targets.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}

export default function ImportsPage(): React.JSX.Element {
  return (
    <ImportExportProvider>
      <ImportsPageContent />
    </ImportExportProvider>
  );
}
