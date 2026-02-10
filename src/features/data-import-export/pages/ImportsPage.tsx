'use client';
import { Trash2 } from 'lucide-react';
import React from 'react';

import {
  PRODUCT_FIELDS,
  EXPORT_PARAMETER_KEYS,
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
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Label,
  SectionHeader,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
    exportTemplateMappings,
    setExportTemplateMappings,
    exportImagesAsBase64,
    setExportImagesAsBase64,
  } = useImportExport();

  const isImportTemplateScope = templateScope === 'import';
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const currentTemplates = isImportTemplateScope ? importTemplates : exportTemplates;
  const currentActiveTemplateId = isImportTemplateScope ? importActiveTemplateId : exportActiveTemplateId;
  const currentTemplateMappings = isImportTemplateScope ? importTemplateMappings : exportTemplateMappings;
  const exportSourceFieldOptions = React.useMemo(
    (): string[] => [...EXPORT_PARAMETER_KEYS].sort((a: string, b: string): number => a.localeCompare(b)),
    []
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

  if (checkingIntegration) return <SectionPanel className='p-6'>Checking integration...</SectionPanel>;
  if (!isBaseConnected) return <SectionPanel className='p-6'>Base.com integration required.</SectionPanel>;

  return (
    <SectionPanel className='p-6'>
      <SectionHeader title='Product Import/Export' description='Import products from Base.com or export your products to Base.com' className='mb-6' />
      <Tabs defaultValue='imports'>
        <TabsList className='bg-card/70'>
          <TabsTrigger value='imports'>Imports</TabsTrigger>
          <TabsTrigger value='exports'>Exports</TabsTrigger>
          <TabsTrigger value='templates'>Templates</TabsTrigger>
        </TabsList>

        <TabsContent value='imports' className='mt-6 space-y-6'>
          <ImportTab />
        </TabsContent>

        <TabsContent value='exports' className='mt-6 space-y-6'>
          <ExportTab />
        </TabsContent>

        <TabsContent value='templates' className='mt-6 space-y-6'>
          <div className='bg-gray-900 p-4 border border-border rounded-md'>
            <div className='flex justify-between items-start gap-4 mb-4'>
              <Tabs value={templateScope} onValueChange={(v: string): void => setTemplateScope(v as 'import' | 'export')}>
                <TabsList>
                  <TabsTrigger value='import'>Import</TabsTrigger>
                  <TabsTrigger value='export'>Export</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className='flex gap-2'>
                <Button variant='secondary' onClick={handleNewTemplate}>New</Button>
                <Button
                  variant='secondary'
                  onClick={() => { void handleDuplicateTemplate(); }}
                  disabled={!currentActiveTemplateId || savingImportTemplate || savingExportTemplate}
                >
                  Duplicate
                </Button>
                <Button onClick={() => { void handleSaveTemplate(); }} disabled={savingImportTemplate || savingExportTemplate}>Save</Button>
                <Button
                  variant='destructive'
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={!currentActiveTemplateId}
                >
                  Delete
                </Button>
              </div>
            </div>
            <div className='grid md:grid-cols-[220px_1fr] gap-4'>
              <div className='bg-card/60 p-2 border border-border rounded-md max-h-64 overflow-auto'>
                {currentTemplates.map((t: Template) => (
                  <Button key={t.id} variant='ghost' className={`w-full justify-start text-xs mb-1 ${currentActiveTemplateId === t.id ? 'bg-emerald-500/20' : ''}`} onClick={() => applyTemplate(t, templateScope)}>
                    {t.name}
                  </Button>
                ))}
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1'>
                    <Label>Name</Label>
                    <Input value={isImportTemplateScope ? importTemplateName : exportTemplateName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => isImportTemplateScope ? setImportTemplateName(e.target.value) : setExportTemplateName(e.target.value)} />
                  </div>
                  <div className='space-y-1'>
                    <Label>Description</Label>
                    <Input value={isImportTemplateScope ? importTemplateDescription : exportTemplateDescription} onChange={(e: React.ChangeEvent<HTMLInputElement>) => isImportTemplateScope ? setImportTemplateDescription(e.target.value) : setExportTemplateDescription(e.target.value)} />
                  </div>
                </div>
                {templateScope === 'export' && (
                  <div className='flex items-center gap-2'>
                    <Checkbox id='exportImagesAsBase64' checked={exportImagesAsBase64} onCheckedChange={(v: boolean | 'indeterminate') => setExportImagesAsBase64(Boolean(v))} />
                    <Label htmlFor='exportImagesAsBase64'>Export images as Base64</Label>
                  </div>
                )}
                <div className='space-y-2'>
                  {currentTemplateMappings.map((m: TemplateMapping, i: number) => (
                    <div key={i} className='flex gap-2 items-center'>
                      <Input
                        value={m.sourceKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMapping(i, { sourceKey: e.target.value })}
                        placeholder={templateScope === 'export' ? 'Source (e.g. category_id)' : 'Source'}
                        list={templateScope === 'export' ? 'export-source-field-options' : undefined}
                        className='flex-1'
                      />
                      <div className='flex-1'>
                        <Select
                          value={m.targetField}
                          onValueChange={(v: string): void => updateMapping(i, { targetField: v })}
                        >
                          <SelectTrigger className='bg-gray-900 border border-border p-2 rounded text-sm h-10 text-white'>
                            <SelectValue placeholder='Target Field' />
                          </SelectTrigger>
                          <SelectContent className='bg-gray-900 border-border text-white'>
                            <SelectItem value='__none__'>Target Field</SelectItem>
                            {PRODUCT_FIELDS.map((f: { value: string; label: string }) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant='ghost' size='icon' onClick={() => removeMappingRow(i)}><Trash2 className='size-4' /></Button>
                    </div>
                  ))}
                  <Button variant='secondary' onClick={addMappingRow}>Add Row</Button>
                </div>
                {templateScope === 'export' && (
                  <>
                    <datalist id='export-source-field-options'>
                      {exportSourceFieldOptions.map((field: string) => (
                        <option key={field} value={field} />
                      ))}
                    </datalist>
                    <p className='text-xs text-gray-500'>
                      For category mapping use: source <code>category_id</code> and target <code>categoryId</code>.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title='Delete template'
        description='Are you sure you want to delete this template? This action cannot be undone.'
        confirmText='Delete'
        variant='destructive'
        loading={savingImportTemplate || savingExportTemplate}
        onConfirm={() => {
          void handleDeleteTemplate().finally(() => setDeleteDialogOpen(false));
        }}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </SectionPanel>
  );
}

export default function ImportsPage(): React.JSX.Element {
  return (
    <ImportExportProvider>
      <ImportsPageContent />
    </ImportExportProvider>
  );
}
