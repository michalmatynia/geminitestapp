'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { AdminImageStudioValidationPatternsPage } from '@/features/ai/image-studio';
import { ValidatorSettings } from '@/features/products/components/settings/ValidatorSettings';
import { ClientOnly, SectionHeader, Tabs, TabsContent, TabsList, TabsTrigger, FormSection } from '@/shared/ui';

type ValidatorScope = 'products' | 'image-studio';

const parseValidatorScope = (value: string | null): ValidatorScope =>
  value === 'image-studio' ? 'image-studio' : 'products';

export function AdminGlobalValidatorPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const activeScope = useMemo<ValidatorScope>(
    () => parseValidatorScope(searchParams.get('scope')),
    [searchParams]
  );

  const handleScopeChange = (value: string): void => {
    const nextScope = parseValidatorScope(value);
    if (nextScope === activeScope) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('scope', nextScope);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <SectionHeader
        eyebrow='AI · Global Validator'
        title='Validation Pattern Lists'
        description='Choose which pattern list you want to manage.'
      />

      <ClientOnly
        fallback={
          <FormSection variant='subtle' className='p-4'>
            <p className='text-sm text-gray-400'>Loading validator scopes...</p>
          </FormSection>
        }
      >
        <Tabs value={activeScope} onValueChange={handleScopeChange} className='space-y-4'>
          <TabsList>
            <TabsTrigger value='products'>Product Patterns</TabsTrigger>
            <TabsTrigger value='image-studio'>Image Studio Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value='products' className='space-y-4'>
            <FormSection variant='subtle' className='p-4'>
              <p className='text-sm text-gray-300'>
                Product patterns validate and normalize product Name/Description fields.
              </p>
            </FormSection>
            <ValidatorSettings />
          </TabsContent>

          <TabsContent value='image-studio' className='space-y-4'>
            <FormSection variant='subtle' className='p-4'>
              <p className='text-sm text-gray-300'>
                Image Studio patterns control prompt validation rules used in AI image workflows.
              </p>
            </FormSection>
            <AdminImageStudioValidationPatternsPage embedded />
          </TabsContent>
        </Tabs>
      </ClientOnly>
    </div>
  );
}
