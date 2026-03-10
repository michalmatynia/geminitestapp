import { cmsSectionInstanceSchema } from '@/shared/contracts/cms';

import type { SectionInstance } from '../../types/page-builder';

export const GRID_TEMPLATE_SETTINGS_KEY = 'cms_grid_templates.v2';

export type GridTemplateRecord = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  section: SectionInstance;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRequiredString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isValidIsoDate = (value: string): boolean => Number.isFinite(Date.parse(value));

export function normalizeGridTemplates(input: unknown): GridTemplateRecord[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry: unknown): GridTemplateRecord[] => {
    if (!isRecord(entry)) return [];

    const id = normalizeRequiredString(entry['id']);
    const name = normalizeRequiredString(entry['name']);
    const createdAt = normalizeRequiredString(entry['createdAt']);
    if (!id || !name || !createdAt || !isValidIsoDate(createdAt)) return [];

    const parsedSection = cmsSectionInstanceSchema.safeParse(entry['section']);
    if (!parsedSection.success) return [];
    if (parsedSection.data.type !== 'Grid') return [];

    const description = normalizeRequiredString(entry['description']) ?? '';

    return [
      {
        id,
        name,
        description,
        createdAt,
        section: parsedSection.data,
      },
    ];
  });
}

export function cloneGridTemplateSection(section: SectionInstance): SectionInstance {
  return structuredClone(section);
}
