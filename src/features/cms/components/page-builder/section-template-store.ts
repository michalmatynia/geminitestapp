import type { SectionInstance } from "../../types/page-builder";

export const SECTION_TEMPLATE_SETTINGS_KEY = "cms_section_templates.v1";

export type SectionTemplateRecord = {
  id: string;
  name: string;
  description?: string | undefined;
  category: string;
  sectionType: string;
  createdAt: string;
  section: SectionInstance;
};

export function normalizeSectionTemplates(input: unknown): SectionTemplateRecord[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown, index: number): SectionTemplateRecord | null => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Partial<SectionTemplateRecord>;
      const section = record.section;
      if (!section || typeof section !== "object" || typeof section.type !== "string") return null;
      return {
        id: typeof record.id === "string" && record.id.length > 0 ? record.id : `section-template-${index + 1}`,
        name: typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : `Section template ${index + 1}`,
        description: typeof record.description === "string" ? record.description : "",
        category: typeof record.category === "string" && record.category.trim().length > 0 ? record.category.trim() : "Saved sections",
        sectionType: typeof record.sectionType === "string" && record.sectionType.length > 0 ? record.sectionType : section.type,
        createdAt: typeof record.createdAt === "string" && record.createdAt.length > 0 ? record.createdAt : new Date().toISOString(),
        section,
      };
    })
    .filter((record: SectionTemplateRecord | null): record is SectionTemplateRecord => Boolean(record));
}

export function cloneSectionTemplateSection(section: SectionInstance): SectionInstance {
  return structuredClone(section);
}
