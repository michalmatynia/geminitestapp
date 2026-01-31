import type { SectionInstance } from "../../types/page-builder";

export const GRID_TEMPLATE_SETTINGS_KEY = "cms_grid_templates.v1";

export type GridTemplateRecord = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  section: SectionInstance;
};

export function normalizeGridTemplates(input: unknown): GridTemplateRecord[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown, index: number): GridTemplateRecord | null => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Partial<GridTemplateRecord>;
      const section = record.section;
      if (!section || typeof section !== "object" || section.type !== "Grid") return null;
      return {
        id: typeof record.id === "string" && record.id.length > 0 ? record.id : `grid-template-${index + 1}`,
        name: typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : `Grid template ${index + 1}`,
        description: typeof record.description === "string" ? record.description : "",
        createdAt: typeof record.createdAt === "string" && record.createdAt.length > 0 ? record.createdAt : new Date().toISOString(),
        section,
      };
    })
    .filter((record: GridTemplateRecord | null): record is GridTemplateRecord => Boolean(record));
}

export function cloneGridTemplateSection(section: SectionInstance): SectionInstance {
  return structuredClone(section);
}
