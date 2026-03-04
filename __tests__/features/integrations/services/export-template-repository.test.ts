import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import {
  createExportTemplate,
  getExportTemplate,
  listExportTemplates,
  updateExportTemplate,
  deleteExportTemplate,
  setExportActiveTemplateId,
  getExportActiveTemplateId,
} from '@/features/integrations/services/export-template-repository';
import prisma from '@/shared/lib/db/prisma';

let canAccessPrismaSettingsTable = true;

describe('ExportTemplateRepository', () => {
  const shouldSkipPrismaSettingsTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canAccessPrismaSettingsTable;

  beforeAll(async () => {
    if (!process.env['DATABASE_URL']) {
      canAccessPrismaSettingsTable = false;
      return;
    }

    try {
      await prisma.setting.findUnique({
        where: { key: '__vitest_export_template_probe__' },
        select: { key: true },
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canAccessPrismaSettingsTable = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and list export templates', async () => {
    if (shouldSkipPrismaSettingsTests()) return;

    const beforeTemplates = await listExportTemplates();
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const template = await createExportTemplate({
      name: `Standard Template ${marker}`,
      description: 'My description',
      mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
    });

    expect(template.id).toBeDefined();
    expect(template.name).toContain('Standard Template');

    const templatesAfter = await listExportTemplates();
    expect(templatesAfter.length).toBe(beforeTemplates.length + 1);
    expect(templatesAfter.some((item) => item.id === template.id)).toBe(true);
  });

  it('should filter out forbidden basehost mappings', async () => {
    if (shouldSkipPrismaSettingsTests()) return;

    const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const created = await createExportTemplate({
      name: `Template with Basehost ${marker}`,
      mappings: [
        { sourceKey: 'sku', targetField: 'sku' },
        { sourceKey: 'images_basehost_all', targetField: 'images' }, // Forbidden
      ],
    });

    const template = await getExportTemplate(created.id);
    expect(template).toBeDefined();
    expect(template?.mappings.length).toBe(1);
    expect(template?.mappings[0]!.sourceKey).toBe('sku');
  });

  it('should update an existing template', async () => {
    if (shouldSkipPrismaSettingsTests()) return;

    const template = await createExportTemplate({ name: 'Old Name' });

    const updated = await updateExportTemplate(template.id, { name: 'New Name' });
    expect(updated?.name).toBe('New Name');

    const retrieved = await getExportTemplate(template.id);
    expect(retrieved?.name).toBe('New Name');
  });

  it('should delete a template', async () => {
    if (shouldSkipPrismaSettingsTests()) return;

    const template = await createExportTemplate({ name: 'To Delete' });

    const result = await deleteExportTemplate(template.id);
    expect(result).toBe(true);

    const templates = await listExportTemplates();
    expect(templates.some((item) => item.id === template.id)).toBe(false);
  });

  it('should get and set active template id', async () => {
    if (shouldSkipPrismaSettingsTests()) return;

    const template = await createExportTemplate({ name: 'Active One' });

    await setExportActiveTemplateId(template.id);
    const activeId = await getExportActiveTemplateId();

    expect(activeId).toBe(template.id);
  });

  it('rejects unsupported parameter source mappings on create', async () => {
    if (shouldSkipPrismaSettingsTests()) return;

    await expect(
      createExportTemplate({
        name: 'Legacy source mapping',
        mappings: [
          {
            sourceKey: 'parameter:param-material',
            targetField: 'text_fields.features.Material',
          },
        ],
      })
    ).rejects.toThrow(/unsupported parameter source mappings/i);
  });

  it('rejects unsupported parameter source mappings on update', async () => {
    if (shouldSkipPrismaSettingsTests()) return;

    const template = await createExportTemplate({ name: 'Update validation' });

    await expect(
      updateExportTemplate(template.id, {
        mappings: [
          {
            sourceKey: 'parameter:param-material',
            targetField: 'text_fields.features.Material',
          },
        ],
      })
    ).rejects.toThrow(/unsupported parameter source mappings/i);
  });
});
