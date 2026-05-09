import 'server-only';

import { badRequestError } from '@/shared/errors/app-error';
import { readBrainProviderCredential } from '@/shared/lib/ai-brain/provider-credentials';

import { resolveProductStudioBrainModel } from './product-studio-service.settings';

const AI_BRAIN_ROUTING_SETTINGS_HREF = '/admin/brain?tab=routing';
const AI_BRAIN_PROVIDER_SETTINGS_HREF = '/admin/brain?tab=providers';

type ProductStudioGenerationConfigurationIssue =
  | 'missing_image_studio_model'
  | 'missing_openai_api_key';

const hasIssue = (
  issues: readonly ProductStudioGenerationConfigurationIssue[],
  issue: ProductStudioGenerationConfigurationIssue
): boolean => issues.includes(issue);

const buildProductStudioConfigurationLinks = (
  issues: readonly ProductStudioGenerationConfigurationIssue[]
): string[] => {
  const links = new Set<string>();
  if (
    hasIssue(issues, 'missing_image_studio_model') ||
    hasIssue(issues, 'missing_openai_api_key')
  ) {
    links.add(AI_BRAIN_ROUTING_SETTINGS_HREF);
  }
  if (hasIssue(issues, 'missing_openai_api_key')) {
    links.add(AI_BRAIN_PROVIDER_SETTINGS_HREF);
  }
  return [...links];
};

const buildProductStudioConfigurationMessage = (
  issues: readonly ProductStudioGenerationConfigurationIssue[]
): string => {
  const missingModel = hasIssue(issues, 'missing_image_studio_model');
  const missingOpenAiKey = hasIssue(issues, 'missing_openai_api_key');

  if (missingModel && missingOpenAiKey) {
    return (
      'Image Studio generation is missing required configuration: image generation model and OpenAI API key. ' +
      `Set the Image Studio Image Generation model in ${AI_BRAIN_ROUTING_SETTINGS_HREF} and add the OpenAI key in ${AI_BRAIN_PROVIDER_SETTINGS_HREF}.`
    );
  }

  if (missingModel) {
    return (
      'Image Studio generation model is not configured. ' +
      `Set Image Studio Image Generation in ${AI_BRAIN_ROUTING_SETTINGS_HREF}.`
    );
  }

  return (
    'OpenAI API key is not configured. ' +
    `Add it on the Image Studio Image Generation route in ${AI_BRAIN_ROUTING_SETTINGS_HREF}, ` +
    `add it in ${AI_BRAIN_PROVIDER_SETTINGS_HREF}, or set OPENAI_API_KEY in the server environment.`
  );
};

const resolveMissingConfigurationIssues = async (): Promise<
  ProductStudioGenerationConfigurationIssue[]
> => {
  const brainModel = await resolveProductStudioBrainModel();
  const issues: ProductStudioGenerationConfigurationIssue[] = [];

  if (brainModel.modelId.trim().length === 0) {
    issues.push('missing_image_studio_model');
  }

  if (brainModel.apiKeyOverrideConfigured) {
    return issues;
  }

  const openAiCredential = await readBrainProviderCredential('openai');
  if (openAiCredential.apiKey === null) {
    issues.push('missing_openai_api_key');
  }

  return issues;
};

export const assertProductStudioGenerationConfigurationReady = async (): Promise<void> => {
  const issues = await resolveMissingConfigurationIssues();
  if (issues.length === 0) return;

  throw badRequestError(buildProductStudioConfigurationMessage(issues), {
    reasons: issues,
    settingsLinks: buildProductStudioConfigurationLinks(issues),
  });
};
