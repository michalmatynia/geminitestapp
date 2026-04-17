import { z } from 'zod';

export const programmableConnectionMutationSchema = z
  .object({
    name: z.string().trim().min(1),
    username: z.string().trim().optional(),
    password: z.string().trim().optional(),
    playwrightListingScript: z.string().trim().nullable().optional(),
    playwrightImportScript: z.string().trim().nullable().optional(),
    playwrightImportBaseUrl: z.string().trim().nullable().optional(),
    playwrightListingActionId: z.string().trim().nullable().optional(),
    playwrightImportActionId: z.string().trim().nullable().optional(),
    playwrightImportCaptureRoutesJson: z.string().trim().nullable().optional(),
    playwrightFieldMapperJson: z.string().trim().nullable().optional(),
    playwrightImportAutomationFlowJson: z.string().trim().nullable().optional(),
    resetPlaywrightOverrides: z.boolean().optional(),
  })
  .strict();

export type PlaywrightProgrammableConnectionMutationInput = z.infer<
  typeof programmableConnectionMutationSchema
>;
