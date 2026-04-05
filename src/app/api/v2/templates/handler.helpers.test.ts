import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportExportTemplateCreateInput } from '@/shared/contracts/integrations/import-export';

const {
  listExportTemplatesMock,
  createExportTemplateMock,
  updateExportTemplateMock,
  deleteExportTemplateMock,
  listImportTemplatesMock,
  createImportTemplateMock,
  updateImportTemplateMock,
  deleteImportTemplateMock,
} = vi.hoisted(() => ({
  listExportTemplatesMock: vi.fn(),
  createExportTemplateMock: vi.fn(),
  updateExportTemplateMock: vi.fn(),
  deleteExportTemplateMock: vi.fn(),
  listImportTemplatesMock: vi.fn(),
  createImportTemplateMock: vi.fn(),
  updateImportTemplateMock: vi.fn(),
  deleteImportTemplateMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  listExportTemplates: (...args: unknown[]) => listExportTemplatesMock(...args),
  createExportTemplate: (...args: unknown[]) => createExportTemplateMock(...args),
  updateExportTemplate: (...args: unknown[]) => updateExportTemplateMock(...args),
  deleteExportTemplate: (...args: unknown[]) => deleteExportTemplateMock(...args),
  listImportTemplates: (...args: unknown[]) => listImportTemplatesMock(...args),
  createImportTemplate: (...args: unknown[]) => createImportTemplateMock(...args),
  updateImportTemplate: (...args: unknown[]) => updateImportTemplateMock(...args),
  deleteImportTemplate: (...args: unknown[]) => deleteImportTemplateMock(...args),
}));

import {
  buildDeleteTemplateResponse,
  buildTemplateNotFoundError,
  resolveTemplateOperations,
} from './handler.helpers';

const exportTemplateInput: ImportExportTemplateCreateInput = {
  name: 'Export Template',
  description: undefined,
  mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
  exportImagesAsBase64: true,
};

const importTemplateInput: ImportExportTemplateCreateInput = {
  name: 'Import Template',
  description: 'Imported items',
  mappings: [{ sourceKey: 'name', targetField: 'title' }],
  parameterImport: {
    enabled: true,
    mode: 'mapped',
  },
};

describe('v2 templates handler helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes export operations through the export service payload shape', async () => {
    createExportTemplateMock.mockResolvedValue({ id: 'exp-1' });
    updateExportTemplateMock.mockResolvedValue({ id: 'exp-1' });
    deleteExportTemplateMock.mockResolvedValue(true);
    listExportTemplatesMock.mockResolvedValue([{ id: 'exp-1' }]);

    const operations = resolveTemplateOperations('export');

    await expect(operations.list()).resolves.toEqual([{ id: 'exp-1' }]);
    await expect(operations.create(exportTemplateInput)).resolves.toEqual({ id: 'exp-1' });
    await expect(operations.update('exp-1', exportTemplateInput)).resolves.toEqual({ id: 'exp-1' });
    await expect(operations.remove('exp-1')).resolves.toBe(true);

    expect(createExportTemplateMock).toHaveBeenCalledWith({
      name: 'Export Template',
      description: null,
      mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
      exportImagesAsBase64: true,
    });
    expect(updateExportTemplateMock).toHaveBeenCalledWith('exp-1', {
      name: 'Export Template',
      description: null,
      mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
      exportImagesAsBase64: true,
    });
    expect(deleteExportTemplateMock).toHaveBeenCalledWith('exp-1');
  });

  it('routes import operations through the import service payload shape', async () => {
    createImportTemplateMock.mockResolvedValue({ id: 'imp-1' });
    updateImportTemplateMock.mockResolvedValue({ id: 'imp-1' });
    deleteImportTemplateMock.mockResolvedValue(true);
    listImportTemplatesMock.mockResolvedValue([{ id: 'imp-1' }]);

    const operations = resolveTemplateOperations('import');

    await expect(operations.list()).resolves.toEqual([{ id: 'imp-1' }]);
    await expect(operations.create(importTemplateInput)).resolves.toEqual({ id: 'imp-1' });
    await expect(operations.update('imp-1', importTemplateInput)).resolves.toEqual({ id: 'imp-1' });
    await expect(operations.remove('imp-1')).resolves.toBe(true);

    expect(createImportTemplateMock).toHaveBeenCalledWith({
      name: 'Import Template',
      description: 'Imported items',
      mappings: [{ sourceKey: 'name', targetField: 'title' }],
      parameterImport: { enabled: true, mode: 'mapped' },
    });
    expect(updateImportTemplateMock).toHaveBeenCalledWith('imp-1', {
      name: 'Import Template',
      description: 'Imported items',
      mappings: [{ sourceKey: 'name', targetField: 'title' }],
      parameterImport: { enabled: true, mode: 'mapped' },
    });
    expect(deleteImportTemplateMock).toHaveBeenCalledWith('imp-1');
  });

  it('rejects unsupported template types', () => {
    expect(() => resolveTemplateOperations('unknown')).toThrow('Invalid template type: unknown');
  });

  it('builds the shared not-found and delete responses', async () => {
    const error = buildTemplateNotFoundError('import', 'imp-missing');

    expect(error.message).toBe('Import template not found: imp-missing');
    const response = buildDeleteTemplateResponse();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
