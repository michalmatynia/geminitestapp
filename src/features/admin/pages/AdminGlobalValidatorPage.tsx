'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { AdminImageStudioValidationPatternsPage } from '@/features/ai/image-studio';
import { ValidatorSettings } from '@/features/products/components/settings/ValidatorSettings';
import { AdminPromptEngineValidationPatternsPage } from '@/features/prompt-engine';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  Button,
  ClientOnly,
  FormSection,
  SectionHeader,
} from '@/shared/ui';

import {
  parseValidatorPatternLists,
  parseValidatorScope,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  type ValidatorScope,
} from './validator-scope';

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

    const legacyScope = parseValidatorScope(searchParams.get('scope'));
    const matchedList = patternLists.find((list) => list.scope === legacyScope);
    return matchedList ?? patternLists[0] ?? null;
  }, [patternLists, searchParams]);

  const renderScopePanel = (
    scope: ValidatorScope,
    description: string
  ): React.JSX.Element => {
    const resolvedDescription = description.trim() || VALIDATOR_SCOPE_DESCRIPTIONS[scope];

    if (scope === 'products') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>
              {resolvedDescription}
            </p>
          </FormSection>
          <ValidatorSettings />
        </>
      );
    }

    if (scope === 'image-studio') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>
              {resolvedDescription}
            </p>
          </FormSection>
          <AdminImageStudioValidationPatternsPage embedded />
        </>
      );
    }

    if (scope === 'prompt-exploder') {
      return (
        <>
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-300'>
              {resolvedDescription}
            </p>
          </FormSection>
          <AdminPromptEngineValidationPatternsPage
            embedded
            eyebrow='AI · Image Studio Prompt Exploder'
            initialPatternTab='prompt_exploder'
            initialExploderSubTab='prompt_exploder_rules'
            lockedPatternTab='prompt_exploder'
            lockedExploderSubTab='prompt_exploder_rules'
          />
        </>
      );
    }

    return (
      <>
        <FormSection variant='subtle' className='p-4'>
          <p className='text-sm text-gray-300'>
            {resolvedDescription}
          </p>
        </FormSection>
        <AdminPromptEngineValidationPatternsPage
          embedded
          eyebrow='AI · Case Resolver Prompt Exploder'
          initialPatternTab='prompt_exploder'
          initialExploderSubTab='case_resolver_rules'
          lockedPatternTab='prompt_exploder'
          lockedExploderSubTab='case_resolver_rules'
        />
      </>
    );
  };

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <SectionHeader
        title='Validation Pattern Lists'
        subtitle={(
          <nav aria-label='Breadcrumb' className='flex flex-wrap items-center gap-1 text-xs text-gray-400'>
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
        )}
        actions={(
          <Button type='button' variant='outline' size='xs' asChild>
            <Link href='/admin/validator/lists'>Manage Lists</Link>
          </Button>
        )}
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
