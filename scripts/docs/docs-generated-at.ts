export const getDefaultAiPathsDocsGeneratedAt = (): string => new Date().toISOString();

export const resolveDocsGeneratedAt = (
  rawValue: string | undefined = process.env['AI_PATHS_DOCS_GENERATED_AT']
): string => {
  const raw = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!raw) return getDefaultAiPathsDocsGeneratedAt();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid AI_PATHS_DOCS_GENERATED_AT value: "${raw}".`);
  }
  return parsed.toISOString();
};
