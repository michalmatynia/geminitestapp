'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  const pathname = usePathname();
  const router = useRouter();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const patternLists = useMemo(
    () => parseValidatorPatternLists(rawPatternLists),
    [rawPatternLists]
  );

  const activeListId = useMemo((): string => {
    const listParam = searchParams.get('list');
    if (listParam && patternLists.some((list) => list.id === listParam)) {
      return listParam;
    }

    const legacyScope = parseValidatorScope(searchParams.get('scope'));
    const matchedList = patternLists.find((list) => list.scope === legacyScope);
    return matchedList?.id ?? patternLists[0]?.id ?? 'products';
  }, [patternLists, searchParams]);

  const activeList = useMemo(
    () =>
      patternLists.find((list) => list.id === activeListId) ??
      patternLists[0] ??
      null,
    [activeListId, patternLists]
  );

  const handleScopeChange = (value: string): void => {
    if (value === activeListId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('list', value);
    params.delete('scope');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
        eyebrow='AI · Global Validator'
        title='Validation Pattern Lists'
        description='Choose which pattern list you want to manage.'
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
        <Tabs
          value={activeList?.id ?? ''}
          onValueChange={handleScopeChange}
          className='space-y-4'
        >
          <TabsList>
            {patternLists.map((list) => (
              <TabsTrigger key={list.id} value={list.id}>
                {list.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {patternLists.map((list) => (
            <TabsContent key={list.id} value={list.id} className='space-y-4'>
              {renderScopePanel(list.scope, list.description)}
            </TabsContent>
          ))}
        </Tabs>
      </ClientOnly>
    </div>
  );
}
