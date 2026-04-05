import { NextResponse } from 'next/server';

import {
  createExportTemplate,
  deleteExportTemplate,
  listExportTemplates,
  createImportTemplate,
  deleteImportTemplate,
  listImportTemplates,
  updateExportTemplate,
  updateImportTemplate,
} from '@/features/integrations/server';
import type { ImportExportTemplateCreateInput } from '@/shared/contracts/integrations/import-export';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export type TemplateType = 'export' | 'import';

type TemplateOperations = {
  type: TemplateType;
  list: () => Promise<unknown>;
  create: (data: ImportExportTemplateCreateInput) => Promise<unknown>;
  update: (id: string, data: ImportExportTemplateCreateInput) => Promise<unknown>;
  remove: (id: string) => Promise<boolean>;
};

const buildExportTemplateInput = (data: ImportExportTemplateCreateInput) => ({
  name: data.name,
  description: data.description ?? null,
  mappings: data.mappings,
  ...(data.exportImagesAsBase64 !== undefined && {
    exportImagesAsBase64: data.exportImagesAsBase64,
  }),
});

const buildImportTemplateInput = (data: ImportExportTemplateCreateInput) => ({
  name: data.name,
  description: data.description ?? null,
  mappings: data.mappings,
  ...(data.parameterImport ? { parameterImport: data.parameterImport } : {}),
});

const templateOperationsByType: Record<TemplateType, TemplateOperations> = {
  export: {
    type: 'export',
    list: listExportTemplates,
    create: (data) => createExportTemplate(buildExportTemplateInput(data)),
    update: (id, data) => updateExportTemplate(id, buildExportTemplateInput(data)),
    remove: deleteExportTemplate,
  },
  import: {
    type: 'import',
    list: listImportTemplates,
    create: (data) => createImportTemplate(buildImportTemplateInput(data)),
    update: (id, data) => updateImportTemplate(id, buildImportTemplateInput(data)),
    remove: deleteImportTemplate,
  },
};

export const resolveTemplateOperations = (type: string): TemplateOperations => {
  if (type === 'export' || type === 'import') {
    return templateOperationsByType[type];
  }

  throw badRequestError(`Invalid template type: ${type}`);
};

export const buildTemplateNotFoundError = (type: TemplateType, id: string) =>
  notFoundError(`${type === 'export' ? 'Export' : 'Import'} template not found: ${id}`, {
    templateId: id,
  });

export const buildDeleteTemplateResponse = (): Response => NextResponse.json({ success: true });
