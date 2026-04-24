import React from 'react';
import { AdminPromptEngineValidationPatternsPage } from '@/features/admin/components/AdminPromptEngineValidationPatternsPage';
import { ValidatorSettings } from '@/features/admin/components/AdminValidatorSettings';
import { ValidatorScope } from '@/features/admin/pages/validator-scope';
import { formatAdminAiEyebrow } from '@/shared/ui/admin.public';

function createPromptEnginePanel(
  props: React.ComponentProps<typeof AdminPromptEngineValidationPatternsPage>
): React.JSX.Element {
  return <AdminPromptEngineValidationPatternsPage embedded {...props} />;
}

export function renderScopePanel(scope: ValidatorScope): React.JSX.Element {
  switch (scope) {
    case 'products':
      return <ValidatorSettings />;
    case 'image-studio':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Image Studio'),
        backLinkHref: '/admin/image-studio',
        backLinkLabel: 'Back to Studio',
      });
    case 'prompt-exploder':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Image Studio Prompt Exploder'),
        initialPatternTab: 'prompt_exploder',
        initialExploderSubTab: 'prompt_exploder_rules',
        lockedPatternTab: 'prompt_exploder',
        lockedExploderSubTab: 'prompt_exploder_rules',
      });
    case 'case-resolver-plain-text':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Case Resolver Plain Text'),
        initialPatternTab: 'core',
        lockedPatternTab: 'core',
        initialScope: 'case_resolver_plain_text',
        lockedScope: 'case_resolver_plain_text',
      });
    case 'ai-paths':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('AI Paths'),
        initialPatternTab: 'core',
        lockedPatternTab: 'core',
        initialScope: 'ai_paths',
        lockedScope: 'ai_paths',
      });
    default:
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Case Resolver Prompt Exploder'),
        initialPatternTab: 'prompt_exploder',
        initialExploderSubTab: 'case_resolver_rules',
        lockedPatternTab: 'prompt_exploder',
        lockedExploderSubTab: 'case_resolver_rules',
      });
  }
}
