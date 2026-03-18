'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  type ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import { AdminPromptEngineValidationPatternsPage } from '@/features/admin/components/AdminPromptEngineValidationPatternsPage';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { formatAdminAiEyebrow } from '@/shared/ui';
import {
  ValidatorDocsTooltipsProvider,
  ValidatorSettings,
} from '@/features/admin/components/AdminValidatorSettings';
import { Button, ClientOnly, FormSection, SectionHeader } from '@/shared/ui';


export function AdminGlobalValidatorPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const patternLists = useMemo(
    () => parseValidatorPatternLists(rawPatternLists),
    [rawPatternLists]
  );

  const activeList = useMemo(() => {
    const listParam = searchParams.get('list');
    if (listParam) {
      const matchedById = patternLists.find((list) => list.id === listParam);
      if (matchedById) return matchedById;
    }
    return patternLists[0] ?? null;
  }, [patternLists, searchParams]);

  const renderScopePanel = (scope: ValidatorScope, description: string): React.JSX.Element => {
    const resolvedDescription = description.trim() || VALIDATOR_SCOPE_DESCRIPTIONS[scope];

    if (scope === 'products') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>{resolvedDescription}</p>
          </FormSection>
          <ValidatorDocsTooltipsProvider>
            <ValidatorSettings />
          </ValidatorDocsTooltipsProvider>
        </>
      );
    }

    if (scope === 'image-studio') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>{resolvedDescription}</p>
          </FormSection>
          <AdminPromptEngineValidationPatternsPage
            embedded
            eyebrow={formatAdminAiEyebrow('Image Studio')}
            backLinkHref='/admin/image-studio'
            backLinkLabel='Back to Studio'
          />
        </>
      );
    }

    if (scope === 'prompt-exploder') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>{resolvedDescription}</p>
          </FormSection>
          <AdminPromptEngineValidationPatternsPage
            embedded
            eyebrow={formatAdminAiEyebrow('Image Studio Prompt Exploder')}
            initialPatternTab='prompt_exploder'
            initialExploderSubTab='prompt_exploder_rules'
            lockedPatternTab='prompt_exploder'
            lockedExploderSubTab='prompt_exploder_rules'
          />
        </>
      );
    }

    if (scope === 'case-resolver-plain-text') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>{resolvedDescription}</p>
          </FormSection>
          <AdminPromptEngineValidationPatternsPage
            embedded
            eyebrow={formatAdminAiEyebrow('Case Resolver Plain Text')}
            initialPatternTab='core'
            lockedPatternTab='core'
            initialScope='case_resolver_plain_text'
            lockedScope='case_resolver_plain_text'
          />
        </>
      );
    }

    if (scope === 'ai-paths') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>{resolvedDescription}</p>
          </FormSection>
          <AdminPromptEngineValidationPatternsPage
            embedded
            eyebrow={formatAdminAiEyebrow('AI Paths')}
            initialPatternTab='core'
            lockedPatternTab='core'
            initialScope='ai_paths'
            lockedScope='ai_paths'
          />
        </>
      );
    }

    return (
      <>
        <FormSection variant='subtle' className='p-4'>
          <p className='text-sm text-gray-300'>{resolvedDescription}</p>
        </FormSection>
        <AdminPromptEngineValidationPatternsPage
          embedded
          eyebrow={formatAdminAiEyebrow('Case Resolver Prompt Exploder')}
          initialPatternTab='prompt_exploder'
          initialExploderSubTab='case_resolver_rules'
          lockedPatternTab='prompt_exploder'
          lockedExploderSubTab='case_resolver_rules'
        />
      </>
    );
  };

  return (
    <div className='page-section space-y-6'>
      <SectionHeader
        title='Validation Pattern Lists'
        subtitle={
          <nav
            aria-label='Breadcrumb'
            className='flex flex-wrap items-center gap-1 text-xs text-gray-400'
          >
            <Link href='/admin' className='hover:text-gray-200 transition-colors'>
              Admin
            </Link>
            <span>/</span>
            <Link href='/admin/validator' className='hover:text-gray-200 transition-colors'>
              Global Validator
            </Link>
            <span>/</span>
            <span className='text-gray-300'>Validation Pattern Lists</span>
          </nav>
        }
        actions={
          <Button type='button' variant='outline' size='xs' asChild>
            <Link href='/admin/validator/lists'>Manage Lists</Link>
          </Button>
        }
      />

      <ClientOnly
        fallback={
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-400'>Loading validator scopes...</p>
          </FormSection>
        }
      >
        {activeList ? (
          <div className='space-y-4'>
            {renderScopePanel(activeList.scope, activeList.description)}
          </div>
        ) : (
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-400'>
              No validation pattern lists available. Create one in Manage Lists.
            </p>
          </FormSection>
        )}
      </ClientOnly>
    </div>
  );
}

export default AdminGlobalValidatorPage;
