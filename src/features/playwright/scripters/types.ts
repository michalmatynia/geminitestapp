import type { z } from 'zod';

import type {
  fieldBindingSchema,
  fieldMapSchema,
  scripterDefinitionSchema,
  scripterExtractionStepSchema,
  transformRefSchema,
} from './schema';

export type TransformRef = z.infer<typeof transformRefSchema>;
export type FieldBinding = z.infer<typeof fieldBindingSchema>;
export type FieldMap = z.infer<typeof fieldMapSchema>;
export type ScripterExtractionStep = z.infer<typeof scripterExtractionStepSchema>;
export type ScripterDefinition = z.infer<typeof scripterDefinitionSchema>;

export type FieldMapTargetField =
  | 'title'
  | 'description'
  | 'price'
  | 'currency'
  | 'images'
  | 'sku'
  | 'ean'
  | 'brand'
  | 'category'
  | 'sourceUrl'
  | 'externalId';

export type MappedScripterRecord = {
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  images: string[];
  sku: string | null;
  ean: string | null;
  brand: string | null;
  category: string | null;
  sourceUrl: string | null;
  externalId: string | null;
  raw: Record<string, unknown>;
};

export type FieldMapIssueSeverity = 'error' | 'warning';

export type FieldMapIssue = {
  field: FieldMapTargetField;
  severity: FieldMapIssueSeverity;
  message: string;
  path?: string;
  transform?: string;
};

export type FieldMapEvaluation = {
  record: MappedScripterRecord;
  issues: FieldMapIssue[];
};
