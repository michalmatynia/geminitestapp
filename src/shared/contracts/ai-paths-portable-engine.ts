import { z } from 'zod';

import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const portablePathJsonSchemaKindQuerySchema = z.object({
  kind: optionalTrimmedQueryString(),
});

export type PortablePathJsonSchemaKindQuery = z.infer<
  typeof portablePathJsonSchemaKindQuerySchema
>;

export const portablePathTrendSnapshotsQuerySchema = z.object({
  limit: optionalTrimmedQueryString(),
  trigger: optionalTrimmedQueryString(),
  from: optionalTrimmedQueryString(),
  to: optionalTrimmedQueryString(),
  cursor: optionalTrimmedQueryString(),
});

export type PortablePathTrendSnapshotsQuery = z.infer<
  typeof portablePathTrendSnapshotsQuerySchema
>;
