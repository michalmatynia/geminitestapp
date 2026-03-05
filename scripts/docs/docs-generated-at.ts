export const DEFAULT_AI_PATHS_DOCS_GENERATED_AT = '2026-03-05T00:00:00.000Z';

export const resolveDocsGeneratedAt = (
  rawValue: string | undefined = process.env['AI_PATHS_DOCS_GENERATED_AT']
): string => {
  const raw = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!raw) return DEFAULT_AI_PATHS_DOCS_GENERATED_AT;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid AI_PATHS_DOCS_GENERATED_AT value: "${raw}".`);
  }
  return parsed.toISOString();
};
