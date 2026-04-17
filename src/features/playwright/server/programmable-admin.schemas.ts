import { z } from 'zod';

export const promotePlaywrightProgrammableBrowserOwnershipSchema = z
  .object({
    name: z.string().trim().min(1),
    playwrightListingScript: z.string().trim().nullable().optional(),
    playwrightImportScript: z.string().trim().nullable().optional(),
    playwrightImportBaseUrl: z.string().trim().nullable().optional(),
    playwrightListingActionId: z.string().trim().nullable().optional(),
    playwrightImportActionId: z.string().trim().nullable().optional(),
    playwrightImportCaptureRoutesJson: z.string().trim().nullable().optional(),
    playwrightFieldMapperJson: z.string().trim().nullable().optional(),
    playwrightImportAutomationFlowJson: z.string().trim().nullable().optional(),
    proxyPassword: z.string().trim().nullable().optional(),
  })
  .strict();

export type PromotePlaywrightProgrammableBrowserOwnershipInput = z.infer<
  typeof promotePlaywrightProgrammableBrowserOwnershipSchema
>;

export const playwrightProgrammableExecutionModeSchema = z.enum(['dry_run', 'commit']);

export const playwrightProgrammableTestPayloadSchema = z.object({
  connectionId: z.string().trim().min(1),
  executionMode: playwrightProgrammableExecutionModeSchema.default('dry_run'),
  scriptType: z.enum(['listing', 'import']),
  sampleInput: z.record(z.string(), z.unknown()).optional(),
});

export type PlaywrightProgrammableExecutionMode = z.infer<
  typeof playwrightProgrammableExecutionModeSchema
>;

export type PlaywrightProgrammableTestPayload = z.input<
  typeof playwrightProgrammableTestPayloadSchema
>;
