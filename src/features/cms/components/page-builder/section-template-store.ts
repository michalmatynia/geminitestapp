import type { SectionInstance } from '../../types/page-builder';
import { cmsSectionInstanceSchema } from '@/shared/contracts/cms';

export const SECTION_TEMPLATE_SETTINGS_KEY = 'cms_section_templates.v2';

export type SectionTemplateRecord = {
  id: string;
  name: string;
  description?: string | undefined;
  category: string;
  sectionType: string;
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

export function normalizeSectionTemplates(input: unknown): SectionTemplateRecord[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry: unknown): SectionTemplateRecord[] => {
    if (!isRecord(entry)) return [];

    const id = normalizeRequiredString(entry['id']);
    const name = normalizeRequiredString(entry['name']);
    const category = normalizeRequiredString(entry['category']);
    const sectionType = normalizeRequiredString(entry['sectionType']);
    const createdAt = normalizeRequiredString(entry['createdAt']);
    if (!id || !name || !category || !sectionType || !createdAt || !isValidIsoDate(createdAt)) {
      return [];
    }

    const parsedSection = cmsSectionInstanceSchema.safeParse(entry['section']);
    if (!parsedSection.success) return [];
    if (parsedSection.data.type !== sectionType) return [];

    const description = normalizeRequiredString(entry['description']) ?? '';

    return [
      {
        id,
        name,
        description,
        category,
        sectionType,
        createdAt,
        section: parsedSection.data,
      },
    ];
  });
}

export function cloneSectionTemplateSection(section: SectionInstance): SectionInstance {
  return structuredClone(section);
}
