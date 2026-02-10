import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { 
  createExportTemplate, 
  getExportTemplate, 
  listExportTemplates, 
  updateExportTemplate, 
  deleteExportTemplate,
  setExportActiveTemplateId,
  getExportActiveTemplateId
} from '@/features/integrations/services/export-template-repository';
import prisma from '@/shared/lib/db/prisma';

describe('ExportTemplateRepository', () => {
  beforeEach(async () => {
    if (!process.env['DATABASE_URL']) return;

    // Cleanup settings related to export templates
    await prisma.setting.deleteMany({
      where: {
        key: {
          in: [
            'base_export_templates',
            'base_export_active_template_id',
            'base_export_default_inventory_id',
            'base_export_default_connection_id',
            'base_export_stock_fallback_enabled',
            'base_export_image_retry_presets'
          ]
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and list export templates', async () => {
    if (!process.env['DATABASE_URL']) return;

    const template = await createExportTemplate({
      name: 'Standard Template',
      description: 'My description',
      mappings: [{ sourceKey: 'sku', targetField: 'sku' }]
    });

    expect(template.id).toBeDefined();
    expect(template.name).toBe('Standard Template');

    const templates = await listExportTemplates();
    expect(templates.length).toBe(1);
    expect(templates[0]!.id).toBe(template.id);
  });

  it('should filter out forbidden basehost mappings', async () => {
    if (!process.env['DATABASE_URL']) return;

    await createExportTemplate({
      name: 'Template with Basehost',
      mappings: [
        { sourceKey: 'sku', targetField: 'sku' },
        { sourceKey: 'images_basehost_all', targetField: 'images' } // Forbidden
      ]
    });

    const templates = await listExportTemplates();
    expect(templates[0]!.mappings.length).toBe(1);
    expect(templates[0]!.mappings[0]!.sourceKey).toBe('sku');
  });

  it('should update an existing template', async () => {
    if (!process.env['DATABASE_URL']) return;

    const template = await createExportTemplate({ name: 'Old Name' });
    
    const updated = await updateExportTemplate(template.id, { name: 'New Name' });
    expect(updated?.name).toBe('New Name');

    const retrieved = await getExportTemplate(template.id);
    expect(retrieved?.name).toBe('New Name');
  });

  it('should delete a template', async () => {
    if (!process.env['DATABASE_URL']) return;

    const template = await createExportTemplate({ name: 'To Delete' });
    
    const result = await deleteExportTemplate(template.id);
    expect(result).toBe(true);

    const templates = await listExportTemplates();
    expect(templates.length).toBe(0);
  });

  it('should get and set active template id', async () => {
    if (!process.env['DATABASE_URL']) return;

    const template = await createExportTemplate({ name: 'Active One' });
    
    await setExportActiveTemplateId(template.id);
    const activeId = await getExportActiveTemplateId();
    
    expect(activeId).toBe(template.id);
  });
});