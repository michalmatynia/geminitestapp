import { z } from 'zod';

export const dbQueryProviderSchema = z.enum(['auto', 'mongodb']);

export const dbQueryConfigSchema = z.object({
  provider: dbQueryProviderSchema,
  collection: z.string(),
  mode: z.enum(['preset', 'custom']),
  preset: z.enum(['by_id', 'by_productId', 'by_entityId', 'by_field']),
  field: z.string(),
  idType: z.enum(['string', 'objectId']),
  queryTemplate: z.string(),
  limit: z.number(),
  sort: z.string(),
  sortPresetId: z.string().optional(),
  projection: z.string(),
  projectionPresetId: z.string().optional(),
  single: z.boolean(),
});

export type DbQueryConfigDto = z.infer<typeof dbQueryConfigSchema>;
export type DbQueryConfig = DbQueryConfigDto;

const dbSchemaProviderSchema = z
  .union([
    z.enum(['auto', 'mongodb']),
    z.literal('all').transform(() => 'auto' as const),
  ])
  .optional();

export const dbSchemaSourceModeSchema = z.enum([
  'schema',
  'live_context',
  'schema_and_live_context',
]);
export type DbSchemaSourceModeDto = z.infer<typeof dbSchemaSourceModeSchema>;
export type DbSchemaSourceMode = DbSchemaSourceModeDto;

export const dbSchemaContextTransformSchema = z.enum([
  'none',
  'product_categories_leaf_only',
]);
export type DbSchemaContextTransformDto = z.infer<typeof dbSchemaContextTransformSchema>;
export type DbSchemaContextTransform = DbSchemaContextTransformDto;

export const dbSchemaConfigSchema = z.object({
  provider: dbSchemaProviderSchema,
  mode: z.enum(['all', 'selected']),
  collections: z.array(z.string()),
  sourceMode: dbSchemaSourceModeSchema.optional(),
  contextCollections: z.array(z.string()).optional(),
  contextQuery: z.string().optional(),
  contextLimit: z.number().int().min(1).max(100).optional(),
  contextTransform: dbSchemaContextTransformSchema.optional(),
  includeFields: z.boolean(),
  includeRelations: z.boolean(),
  formatAs: z.enum(['json', 'text']),
});

export type DbSchemaConfigDto = z.infer<typeof dbSchemaConfigSchema>;
export type DbSchemaConfig = DbSchemaConfigDto;

const dbSchemaSnapshotSourceSchema = z.object({
  provider: z.literal('mongodb'),
  collections: z.array(
    z.object({
      name: z.string(),
      fields: z.array(z.object({ name: z.string(), type: z.string() })),
      relations: z.array(z.string()).optional(),
    })
  ),
});

export const dbSchemaSnapshotSchema = z.object({
  provider: z.enum(['mongodb', 'multi']),
  collections: z.array(
    z.object({
      name: z.string(),
      fields: z.array(z.object({ name: z.string(), type: z.string() })),
      relations: z.array(z.string()).optional(),
      provider: z.literal('mongodb').optional(),
    })
  ),
  sources: z
    .object({
      mongodb: dbSchemaSnapshotSourceSchema.optional(),
    })
    .optional(),
  syncedAt: z.string().optional(),
});

export type DbSchemaSnapshotDto = z.infer<typeof dbSchemaSnapshotSchema>;
export type DbSchemaSnapshot = DbSchemaSnapshotDto;

export const databaseWriteZeroAffectedPolicySchema = z.enum(['fail', 'warn']);
export type DatabaseWriteZeroAffectedPolicyDto = z.infer<
  typeof databaseWriteZeroAffectedPolicySchema
>;
export type DatabaseWriteZeroAffectedPolicy = DatabaseWriteZeroAffectedPolicyDto;

export const databaseWriteOutcomePolicySchema = z.object({
  onZeroAffected: databaseWriteZeroAffectedPolicySchema.optional(),
});
export type DatabaseWriteOutcomePolicyDto = z.infer<typeof databaseWriteOutcomePolicySchema>;
export type DatabaseWriteOutcomePolicy = DatabaseWriteOutcomePolicyDto;

export const databaseWriteOutcomeSchema = z
  .object({
    status: z.enum(['success', 'warning', 'failed']),
    code: z.string().optional(),
    message: z.string().optional(),
    policyOnZeroAffected: databaseWriteZeroAffectedPolicySchema.optional(),
    zeroAffected: z.boolean().optional(),
    operation: z.string().optional(),
    action: z.string().optional(),
    affectedCount: z.number().nullable().optional(),
    matchedCount: z.number().nullable().optional(),
    modifiedCount: z.number().nullable().optional(),
    deletedCount: z.number().nullable().optional(),
    insertedCount: z.number().nullable().optional(),
  })
  .passthrough();
export type DatabaseWriteOutcomeDto = z.infer<typeof databaseWriteOutcomeSchema>;
export type DatabaseWriteOutcome = DatabaseWriteOutcomeDto;

export const databaseGuardrailMetaSchema = z
  .object({
    code: z.string(),
    severity: z.enum(['warning', 'error']),
    message: z.string(),
    templates: z.array(z.string()).optional(),
    missingTokens: z.array(z.string()).optional(),
    emptyTokens: z.array(z.string()).optional(),
    missingRoots: z.array(z.string()).optional(),
    emptyRoots: z.array(z.string()).optional(),
    unparseableTokens: z.array(z.string()).optional(),
    unparseableRoots: z.array(z.string()).optional(),
    parseDiagnostics: z
      .array(
        z.object({
          port: z.string().optional(),
          token: z.string(),
          rawType: z.string(),
          parseState: z.enum(['not_json_like', 'parsed', 'repaired', 'unparseable']),
          repairApplied: z.boolean(),
          parseError: z.string().optional(),
          truncationDetected: z.boolean().optional(),
          repairSteps: z.array(z.string()).optional(),
        })
      )
      .optional(),
  })
  .passthrough();
export type DatabaseGuardrailMetaDto = z.infer<typeof databaseGuardrailMetaSchema>;
export type DatabaseGuardrailMeta = DatabaseGuardrailMetaDto;

export const databaseConfigSchema = z.object({
  operation: z.enum(['query', 'update', 'insert', 'delete', 'action', 'distinct']),
  entityType: z.string().optional(),
  idField: z.string().optional(),
  mode: z.enum(['replace', 'append']).optional(),
  updateStrategy: z.enum(['one', 'many']).optional(),
  updatePayloadMode: z.enum(['mapping', 'custom']).optional(),
  useMongoActions: z.boolean().optional(),
  actionCategory: z.enum(['create', 'read', 'update', 'delete', 'aggregate']).optional(),
  action: z
    .enum([
      'insertOne',
      'insertMany',
      'find',
      'findOne',
      'countDocuments',
      'distinct',
      'aggregate',
      'updateOne',
      'updateMany',
      'replaceOne',
      'findOneAndUpdate',
      'deleteOne',
      'deleteMany',
      'findOneAndDelete',
    ])
    .optional(),
  distinctField: z.string().optional(),
  updateTemplate: z.string().optional(),
  mappings: z
    .array(
      z.object({
        targetPath: z.string(),
        sourcePort: z.string(),
        sourcePath: z.string().optional(),
      })
    )
    .optional(),
  query: dbQueryConfigSchema.optional(),
  writeSource: z.string().optional(),
  writeSourcePath: z.string().optional(),
  dryRun: z.boolean().optional(),
  presetId: z.string().optional(),
  skipEmpty: z.boolean().optional(),
  trimStrings: z.boolean().optional(),
  aiPrompt: z.string().optional(),
  writeOutcomePolicy: databaseWriteOutcomePolicySchema.optional(),
  validationRuleIds: z.array(z.string()).optional(),
  parameterInferenceGuard: z
    .object({
      enabled: z.boolean().optional(),
      targetPath: z.string().optional(),
      definitionsPort: z.string().optional(),
      definitionsPath: z.string().optional(),
      languageCode: z.string().optional(),
      enforceOptionLabels: z.boolean().optional(),
      allowUnknownParameterIds: z.boolean().optional(),
    })
    .optional(),
  schemaSnapshot: dbSchemaSnapshotSchema.optional(),
});

export type DatabaseConfigDto = z.infer<typeof databaseConfigSchema>;
export type DatabaseConfig = DatabaseConfigDto;

export type DatabaseActionCategory = NonNullable<DatabaseConfigDto['actionCategory']>;
export type DatabaseAction = NonNullable<DatabaseConfigDto['action']>;
export type UpdaterMapping = NonNullable<DatabaseConfigDto['mappings']>[number];
export type DatabaseOperation = DatabaseConfigDto['operation'];
