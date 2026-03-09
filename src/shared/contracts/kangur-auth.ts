import { z } from 'zod';

const nonEmptyTrimmedStringSchema = z.string().trim().min(1);
const kangurParentEmailSchema = z.string().trim().email();
const kangurParentCallbackUrlSchema = nonEmptyTrimmedStringSchema.optional();
const retryAfterMsSchema = z.number().finite().int().positive();

export const kangurParentAccountCreateSchema = z.object({
  email: kangurParentEmailSchema,
  password: z.string().min(1),
  callbackUrl: kangurParentCallbackUrlSchema,
});
export type KangurParentAccountCreate = z.infer<typeof kangurParentAccountCreateSchema>;

export const kangurParentAccountResendSchema = z.object({
  email: kangurParentEmailSchema,
  callbackUrl: kangurParentCallbackUrlSchema,
});
export type KangurParentAccountResend = z.infer<typeof kangurParentAccountResendSchema>;

export const kangurParentEmailVerifySchema = z.object({
  token: nonEmptyTrimmedStringSchema,
});
export type KangurParentEmailVerify = z.infer<typeof kangurParentEmailVerifySchema>;

export const kangurParentVerificationDebugSchema = z.object({
  verificationUrl: nonEmptyTrimmedStringSchema.optional(),
});
export type KangurParentVerificationDebug = z.infer<typeof kangurParentVerificationDebugSchema>;

export const kangurParentAccountActionResponseSchema = z.object({
  ok: z.literal(true),
  email: kangurParentEmailSchema,
  created: z.boolean(),
  emailVerified: z.boolean(),
  hasPassword: z.boolean(),
  retryAfterMs: retryAfterMsSchema,
  message: nonEmptyTrimmedStringSchema,
  debug: kangurParentVerificationDebugSchema.nullable().optional(),
});
export type KangurParentAccountActionResponse = z.infer<
  typeof kangurParentAccountActionResponseSchema
>;

export const kangurParentEmailVerifyResponseSchema = z.object({
  ok: z.literal(true),
  email: kangurParentEmailSchema,
  callbackUrl: nonEmptyTrimmedStringSchema.nullable().optional(),
  emailVerified: z.boolean(),
  message: nonEmptyTrimmedStringSchema,
});
export type KangurParentEmailVerifyResponse = z.infer<typeof kangurParentEmailVerifyResponseSchema>;

export const parseKangurParentAccountActionResponse = (
  value: unknown
): KangurParentAccountActionResponse | null => {
  const parsed = kangurParentAccountActionResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const parseKangurParentEmailVerifyResponse = (
  value: unknown
): KangurParentEmailVerifyResponse | null => {
  const parsed = kangurParentEmailVerifyResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
