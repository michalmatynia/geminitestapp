import {
  createBrainProviderCredentialFingerprint,
  type BrainProviderCredentialResolution,
} from '@/shared/lib/ai-brain/provider-credentials';
import { quotaExceededError, type AppError } from '@/shared/errors/app-error';

const OPENAI_HARD_LIMIT_REGEX = /billing hard limit has been reached/i;
const OPENAI_LIMITS_URL = 'https://platform.openai.com/settings/organization/limits';
const OPENAI_BILLING_URL = 'https://platform.openai.com/settings/organization/billing/overview';
const AI_BRAIN_ROUTING_URL = '/admin/brain?tab=routing';
const AI_BRAIN_PROVIDERS_URL = '/admin/brain?tab=providers';

const CREDENTIAL_SOURCE_LABELS: Record<BrainProviderCredentialResolution['source'], string> = {
  assignment: 'Image Studio route API key override',
  brain: 'AI Brain OpenAI provider key',
  env: 'OPENAI_API_KEY server environment variable',
  missing: 'missing OpenAI credential',
};

const extractBillingErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
};

export const isOpenAiBillingHardLimitError = (error: unknown): boolean =>
  OPENAI_HARD_LIMIT_REGEX.test(extractBillingErrorMessage(error));

const resolveCredentialSourceLabel = (
  credential: BrainProviderCredentialResolution
): string => CREDENTIAL_SOURCE_LABELS[credential.source];

const resolveCredentialFingerprint = (
  credential: BrainProviderCredentialResolution
): string | null => createBrainProviderCredentialFingerprint(credential.apiKey);

export const buildOpenAiBillingHardLimitMessage = (
  credential: BrainProviderCredentialResolution
): string => {
  const sourceLabel = resolveCredentialSourceLabel(credential);
  const fingerprint = resolveCredentialFingerprint(credential);
  const fingerprintText =
    fingerprint === null ? '' : `with credential fingerprint ${fingerprint} `;
  return [
    `OpenAI rejected Image Studio generation because the API key source (${sourceLabel}) ${fingerprintText}has reached a billing hard limit.`,
    'Check the OpenAI project and organization for that exact key, including project Limits, organization Usage limits, billing/payment status, and whether you are viewing the same org/project as the key.',
    `OpenAI limits: ${OPENAI_LIMITS_URL}. OpenAI billing: ${OPENAI_BILLING_URL}.`,
    `AI Brain route/provider keys: ${AI_BRAIN_ROUTING_URL}, ${AI_BRAIN_PROVIDERS_URL}.`,
  ].join(' ');
};

export const normalizeOpenAiBillingHardLimitError = (
  error: unknown,
  credential: BrainProviderCredentialResolution
): AppError | null => {
  if (!isOpenAiBillingHardLimitError(error)) return null;
  return quotaExceededError(buildOpenAiBillingHardLimitMessage(credential), {
    provider: 'openai',
    reason: 'billing_hard_limit',
    credentialSource: credential.source,
    credentialSourceKey: credential.sourceKey ?? null,
    credentialFingerprint: resolveCredentialFingerprint(credential),
    openAiLimitsUrl: OPENAI_LIMITS_URL,
    openAiBillingUrl: OPENAI_BILLING_URL,
    aiBrainRoutingUrl: AI_BRAIN_ROUTING_URL,
    aiBrainProvidersUrl: AI_BRAIN_PROVIDERS_URL,
  }).withCause(error);
};
