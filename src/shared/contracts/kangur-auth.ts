import { z } from 'zod';

import type { KangurUser } from '@kangur/platform';

const nonEmptyTrimmedStringSchema = z.string().trim().min(1);
const kangurParentEmailSchema = z.string().trim().email();
const kangurParentCallbackUrlSchema = nonEmptyTrimmedStringSchema.optional();
const retryAfterMsSchema = z.number().finite().int().positive();
const kangurCaptchaTokenSchema = z.string().trim().min(1);

export const kangurAuthModeSchema = z.enum(['sign-in', 'create-account']);
export type KangurAuthMode = z.infer<typeof kangurAuthModeSchema>;

export type KangurAuthError = {
  type: 'unknown' | 'auth_required' | 'user_not_registered';
  message: string;
};

export type KangurAuthContextValue = {
  user: KangurUser | null;
  isAuthenticated: boolean;
  hasResolvedAuth: boolean;
  canAccessParentAssignments: boolean;
  isLoadingAuth: boolean;
  isLoggingOut?: boolean;
  isLoadingPublicSettings: boolean;
  authError: KangurAuthError | null;
  appPublicSettings: null;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: (options?: { authMode?: KangurAuthMode }) => void;
  checkAppState: (options?: {
    timeoutMs?: number | null;
    useBootstrapCache?: boolean;
  }) => Promise<KangurUser | null>;
  selectLearner: (learnerId: string) => Promise<void>;
};

export type KangurAuthStateContextValue = Pick<
  KangurAuthContextValue,
  | 'user'
  | 'isAuthenticated'
  | 'hasResolvedAuth'
  | 'canAccessParentAssignments'
  | 'isLoadingAuth'
  | 'isLoadingPublicSettings'
  | 'authError'
  | 'appPublicSettings'
>;

export type KangurAuthActionsContextValue = Pick<
  KangurAuthContextValue,
  'logout' | 'navigateToLogin' | 'checkAppState' | 'selectLearner'
>;

export type KangurAuthBootstrapSnapshot = {
  cachedUser: KangurUser | null | undefined;
  hasResolvedAuth: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  user: KangurUser | null;
};

export type KangurAuthRuntimeSetters = {
  authRequestVersionRef: { current: number };
  setAuthError: (value: KangurAuthError | null) => void;
  setHasResolvedAuth: (value: boolean) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoadingAuth: (value: boolean) => void;
  setUser: (value: KangurUser | null) => void;
};

export const kangurParentAccountCreateSchema = z.object({
  email: kangurParentEmailSchema,
  password: z.string().min(1),
  callbackUrl: kangurParentCallbackUrlSchema,
  captchaToken: kangurCaptchaTokenSchema.optional(),
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

export const parseKangurAuthMode = (
  value: string | null | undefined,
  fallback: KangurAuthMode = 'sign-in'
): KangurAuthMode => (value?.trim().toLowerCase() === 'create-account' ? 'create-account' : fallback);

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
