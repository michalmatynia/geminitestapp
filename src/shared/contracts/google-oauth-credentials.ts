import { z } from 'zod';

export const googleOAuthCredentialSourceSchema = z.enum([
  'environment',
  'local_database',
  'none',
]);

export type GoogleOAuthCredentialSource = z.infer<typeof googleOAuthCredentialSourceSchema>;

export const googleOAuthCredentialsStatusSchema = z.object({
  configured: z.boolean(),
  source: googleOAuthCredentialSourceSchema,
  environmentConfigured: z.boolean(),
  localConfigured: z.boolean(),
  localClientIdConfigured: z.boolean(),
  localClientSecretConfigured: z.boolean(),
  localClientIdPreview: z.string().nullable(),
});

export type GoogleOAuthCredentialsStatus = z.infer<typeof googleOAuthCredentialsStatusSchema>;

export const updateGoogleOAuthCredentialsSchema = z
  .object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    clearClientId: z.boolean().optional(),
    clearClientSecret: z.boolean().optional(),
  })
  .strict();

export type UpdateGoogleOAuthCredentialsInput = z.infer<
  typeof updateGoogleOAuthCredentialsSchema
>;
