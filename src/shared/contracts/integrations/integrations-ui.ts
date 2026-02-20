export const integrationDefinitions = [
  { name: 'Tradera', slug: 'tradera' },
  { name: 'Tradera API', slug: 'tradera-api' },
  { name: 'Allegro', slug: 'allegro' },
  { name: 'Baselinker', slug: 'baselinker' },
] as const;

export type Integration = {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string | null;
};
