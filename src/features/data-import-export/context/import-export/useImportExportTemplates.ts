'use client';

import { useCallback, useState } from 'react';
import type { Template, TemplateMapping } from '@/shared/contracts/data-import-export';
import { 
  defaultBaseImportParameterImportSettings, 
  normalizeBaseImportParameterImportSettings,
  type BaseImportParameterImportSettings 
} from '@/shared/contracts/integrations';
import { useTemplateMutation } from '@/features/data-import-export/hooks/useImportQueries';
import type { useToast } from '@/shared/ui';

export function useImportExportTemplates({
  toast,
  importTemplates,
  exportTemplates,
  setTemplateScope,
}: {
  toast: ReturnType<typeof useToast>['toast'];
  importTemplates: Template[];
  exportTemplates: Template[];
  setTemplateScope: (scope: 'import' | 'export') => void;
}) {
  const [importActiveTemplateId, setImportActiveTemplateId] = useState('');
  const [exportActiveTemplateId, setExportActiveTemplateId] = useState('');
  const [importTemplateName, setImportTemplateName] = useState('');
  const [exportTemplateName, setExportTemplateName] = useState('');
  const [importTemplateDescription, setImportTemplateDescription] = useState('');
  const [exportTemplateDescription, setExportTemplateDescription] = useState('');
  const [importTemplateMappings, setImportTemplateMappings] = useState<TemplateMapping[]>([{ sourceKey: '', targetField: '' }]);
  const [importTemplateParameterImport, setImportTemplateParameterImport] =
    useState<BaseImportParameterImportSettings>(
      defaultBaseImportParameterImportSettings
    );
  const [exportTemplateMappings, setExportTemplateMappings] = useState<TemplateMapping[]>([{ sourceKey: '', targetField: '' }]);
  const [exportImagesAsBase64, setExportImagesAsBase64] = useState(false);

  const applyTemplate = useCallback((template: Template, scope: 'import' | 'export'): void => {
    const nextMappings = template.mappings?.length ? template.mappings : [{ sourceKey: '', targetField: '' }];
    if (scope === 'import') {
      setImportActiveTemplateId(template.id);
      setImportTemplateName(template.name);
      setImportTemplateDescription(template.description ?? '');
      setImportTemplateMappings(nextMappings);
      setImportTemplateParameterImport(
        normalizeBaseImportParameterImportSettings(template.parameterImport)
      );
    } else {
      setExportActiveTemplateId(template.id);
      setExportTemplateName(template.name);
      setExportTemplateDescription(template.description ?? '');
      setExportTemplateMappings(nextMappings);
      setExportImagesAsBase64(template.exportImagesAsBase64 ?? false);
    }
  }, []);

  const saveImportTemplateMutation = useTemplateMutation('import', importActiveTemplateId);
  const saveExportTemplateMutation = useTemplateMutation('export', exportActiveTemplateId);
  const createImportTemplateMutation = useTemplateMutation('import');
  const createExportTemplateMutation = useTemplateMutation('export');

  const handleNewTemplate = (templateScope: 'import' | 'export'): void => {
    if (templateScope === 'import') {
      setImportActiveTemplateId('');
      setImportTemplateName('');
      setImportTemplateDescription('');
      setImportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      setImportTemplateParameterImport(
        defaultBaseImportParameterImportSettings
      );
    } else {
      setExportActiveTemplateId('');
      setExportTemplateName('');
      setExportTemplateDescription('');
      setExportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      setExportImagesAsBase64(false);
    }
  };

  const handleDuplicateTemplate = async (templateScope: 'import' | 'export'): Promise<void> => {
    const isImport = templateScope === 'import';
    const activeId = isImport ? importActiveTemplateId : exportActiveTemplateId;
    if (!activeId) {
      toast('Select a template to duplicate.', { variant: 'error' });
      return;
    }

    const sourceTemplate = (isImport ? importTemplates : exportTemplates).find(
      (template: Template) => template.id === activeId,
    );
    if (!sourceTemplate) {
      toast('Selected template is missing.', { variant: 'error' });
      return;
    }

    const cleanMappings = (sourceTemplate.mappings ?? [])
      .map((mapping: TemplateMapping) => ({
        sourceKey: mapping.sourceKey?.trim() ?? '',
        targetField: mapping.targetField?.trim() ?? '',
      }))
      .filter((mapping: TemplateMapping) => mapping.sourceKey && mapping.targetField);

    const mutation = isImport ? createImportTemplateMutation : createExportTemplateMutation;
    const duplicatedName = `${(sourceTemplate.name || 'Template').trim()} Copy`;

    try {
      const duplicated = (await mutation.mutateAsync({
        data: {
          name: duplicatedName,
          description: sourceTemplate.description?.trim() || undefined,
          mappings: cleanMappings,
          ...(isImport
            ? {
              parameterImport: normalizeBaseImportParameterImportSettings(
                sourceTemplate.parameterImport
              ),
            }
            : {
              exportImagesAsBase64:
                  sourceTemplate.exportImagesAsBase64 ?? false,
            }),
        },
      })) as Template;
      applyTemplate(duplicated, isImport ? 'import' : 'export');
      toast('Template duplicated.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Template duplicate failed';
      toast(message, { variant: 'error' });
    }
  };

  const handleCreateExportFromImportTemplate = async (): Promise<void> => {
    const activeImportTemplateId = importActiveTemplateId.trim();
    if (!activeImportTemplateId) {
      toast('Select an import template first.', { variant: 'error' });
      return;
    }

    const sourceTemplate = importTemplates.find(
      (template: Template) => template.id === activeImportTemplateId
    );
    if (!sourceTemplate) {
      toast('Selected import template is missing.', { variant: 'error' });
      return;
    }

    const cleanMappings = (sourceTemplate.mappings ?? [])
      .map((mapping: TemplateMapping) => ({
        sourceKey: mapping.sourceKey?.trim() ?? '',
        targetField: mapping.targetField?.trim() ?? '',
      }))
      .filter(
        (mapping: TemplateMapping) => mapping.sourceKey && mapping.targetField
      );

    const baseName = (sourceTemplate.name || 'Template').trim();
    const exportTemplateNameCandidate = baseName.toLowerCase().includes('export')
      ? baseName
      : `${baseName} Export`;

    try {
      const created = (await createExportTemplateMutation.mutateAsync({
        data: {
          name: exportTemplateNameCandidate,
          description: sourceTemplate.description?.trim() || undefined,
          mappings: cleanMappings,
          exportImagesAsBase64: false,
        },
      })) as Template;
      setTemplateScope('export');
      applyTemplate(created, 'export');
      toast('Export template created from import template.', {
        variant: 'success',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create export template from import template';
      toast(message, { variant: 'error' });
    }
  };

  const handleSaveTemplate = async (templateScope: 'import' | 'export'): Promise<void> => {
    const isImport = templateScope === 'import';
    const name = isImport ? importTemplateName : exportTemplateName;
    const desc = isImport ? importTemplateDescription : exportTemplateDescription;
    const mappings = isImport ? importTemplateMappings : exportTemplateMappings;
    const activeTemplateId = (
      isImport ? importActiveTemplateId : exportActiveTemplateId
    ).trim();
    
    if (!name.trim()) {
      toast('Template name is required.', { variant: 'error' });
      return;
    }

    const cleanedMappings = mappings
      .map((m: TemplateMapping) => ({ sourceKey: m.sourceKey.trim(), targetField: m.targetField.trim() }))
      .filter((m: TemplateMapping) => m.sourceKey && m.targetField);

    const mutation = isImport
      ? (activeTemplateId ? saveImportTemplateMutation : createImportTemplateMutation)
      : (activeTemplateId ? saveExportTemplateMutation : createExportTemplateMutation);

    try {
      const res = (await mutation.mutateAsync({
        data: {
          name: name.trim(),
          description: desc.trim() || undefined,
          mappings: cleanedMappings,
          ...(isImport
            ? {
              parameterImport: normalizeBaseImportParameterImportSettings(
                importTemplateParameterImport
              ),
            }
            : { exportImagesAsBase64 }),
        }
      })) as Template;
      applyTemplate(res, isImport ? 'import' : 'export');
      toast('Template saved.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Template save failed';
      toast(message, { variant: 'error' });
    }
  };

  const handleDeleteTemplate = async (templateScope: 'import' | 'export'): Promise<void> => {
    const isImport = templateScope === 'import';
    const activeId = isImport ? importActiveTemplateId : exportActiveTemplateId;
    if (!activeId) return;
    
    const mutation = isImport ? saveImportTemplateMutation : saveExportTemplateMutation;
    try {
      await mutation.mutateAsync({ isDelete: true });
      handleNewTemplate(templateScope);
      toast('Template deleted.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Template delete failed';
      toast(message, { variant: 'error' });
    }
  };

  return {
    importActiveTemplateId, setImportActiveTemplateId,
    exportActiveTemplateId, setExportActiveTemplateId,
    importTemplateName, setImportTemplateName,
    exportTemplateName, setExportTemplateName,
    importTemplateDescription, setImportTemplateDescription,
    exportTemplateDescription, setExportTemplateDescription,
    importTemplateMappings, setImportTemplateMappings,
    importTemplateParameterImport, setImportTemplateParameterImport,
    exportTemplateMappings, setExportTemplateMappings,
    exportImagesAsBase64, setExportImagesAsBase64,
    applyTemplate,
    saveImportTemplateMutation,
    saveExportTemplateMutation,
    createImportTemplateMutation,
    createExportTemplateMutation,
    handleNewTemplate,
    handleDuplicateTemplate,
    handleCreateExportFromImportTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
  };
}
