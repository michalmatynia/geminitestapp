'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { ProductFormData } from '@/features/products/types';
import { Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, UnifiedSelect, FormSection, FormField } from '@/shared/ui';
import { cn } from '@/shared/utils';

export default function ProductFormGeneral(): React.JSX.Element {
  const {
    filteredLanguages,
    errors,
  } = useProductFormContext();

  const { register, getValues, watch } = useFormContext<ProductFormData>();

  const [identifierType, setIdentifierType] = useState<'ean' | 'gtin' | 'asin'>((): 'ean' | 'gtin' | 'asin' => {
    const vals = getValues();
    if (vals.asin) return 'asin';
    if (vals.gtin) return 'gtin';
    return 'ean';
  });
  const allValues = watch();
  const hasCatalogs = (filteredLanguages ?? []).length > 0;
  const languagesReady = (filteredLanguages ?? []).length > 0;

  return (
    <div className='space-y-6'>
      {!hasCatalogs && (
        <FormSection variant='subtle-compact' className='border-amber-500/40 bg-amber-500/10 text-amber-100'>
          <p className='text-sm'>Select a catalog to edit product titles and descriptions. Language fields are based on catalog settings.</p>
        </FormSection>
      )}

      {hasCatalogs && !languagesReady && (
        <div className='space-y-4'>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='h-4 w-40 animate-pulse rounded bg-slate-500/20' />
          </div>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='mb-3 flex gap-2'>
              <div className='h-7 w-24 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-24 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-24 animate-pulse rounded bg-slate-500/20' />
            </div>
            <div className='h-10 w-full animate-pulse rounded bg-slate-500/20' />
          </div>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='mb-3 flex gap-2'>
              <div className='h-7 w-28 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-28 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-28 animate-pulse rounded bg-slate-500/20' />
            </div>
            <div className='h-24 w-full animate-pulse rounded bg-slate-500/20' />
          </div>
        </div>
      )}

      {hasCatalogs && languagesReady && (
        <FormSection>
          <Tabs defaultValue={filteredLanguages[0] ? `${filteredLanguages[0].name.toLowerCase()}-name` : 'english-name'} className='w-full'>
            <TabsList className='mb-4'>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
                return (
                  <TabsTrigger
                    key={language.code}
                    value={`${language.name.toLowerCase()}-name`}
                    className={cn(
                      !fieldValue?.trim()
                        ? 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90'
                        : 'text-foreground data-[state=inactive]:text-foreground font-medium'
                    )}
                  >
                    {language.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {filteredLanguages.map((language: { name: string; code: string }) => {
              const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
              const error = errors[fieldName]?.message;
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-name`}>
                  <FormField label={`${language.name} Name`} error={error} id={fieldName}>
                    <Input
                      id={fieldName}
                      {...register(fieldName)}
                      placeholder={`Enter product name in ${language.name}`}
                    />
                  </FormField>
                </TabsContent>
              );
            })}
          </Tabs>

          <Tabs defaultValue={filteredLanguages[0] ? `${filteredLanguages[0].name.toLowerCase()}-description` : 'english-description'} className='w-full mt-4'>
            <TabsList className='mb-4'>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
                return (
                  <TabsTrigger
                    key={language.code}
                    value={`${language.name.toLowerCase()}-description`}
                    className={cn(
                      !fieldValue?.trim()
                        ? 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90'
                        : 'text-foreground data-[state=inactive]:text-foreground font-medium'
                    )}
                  >
                    {language.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {filteredLanguages.map((language: { name: string; code: string }) => {
              const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
              const error = errors[fieldName]?.message;
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-description`}>
                  <FormField label={`${language.name} Description`} error={error} id={fieldName}>
                    <Textarea
                      id={fieldName}
                      {...register(fieldName)}
                      placeholder={`Enter product description in ${language.name}`}
                      rows={4}
                    />
                  </FormField>
                </TabsContent>
              );
            })}
          </Tabs>
        </FormSection>
      )}

      <FormSection title='Identifiers' gridClassName='md:grid-cols-2'>
        <FormField label='SKU' required error={errors.sku?.message} id='sku'>
          <Input
            id='sku'
            {...register('sku')}
            placeholder='Unique stock keeping unit'
          />
        </FormField>
        
        <FormField label='Product Identifier' description='EAN, GTIN or ASIN code.'>
          <div className='flex gap-2'>
            <UnifiedSelect
              value={identifierType}
              onValueChange={(value: string): void =>
                setIdentifierType(value as 'ean' | 'gtin' | 'asin')
              }
              options={[
                { value: 'ean', label: 'EAN' },
                { value: 'gtin', label: 'GTIN' },
                { value: 'asin', label: 'ASIN' },
              ]}
              className='w-[100px]'
            />
            <Input
              id={identifierType}
              {...register(identifierType)}
              placeholder={`Enter ${identifierType.toUpperCase()}`}
            />
          </div>
        </FormField>
      </FormSection>

      <FormSection title='Dimensions & Weight' gridClassName='grid-cols-2 md:grid-cols-4'>
        <FormField label='Weight (kg)' error={errors.weight?.message} id='weight'>
          <div className='relative'>
            <Input
              id='weight'
              type='number'
              step='0.01'
              className='pr-8'
              {...register('weight', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              KG
            </span>
          </div>
        </FormField>

        <FormField label='Length (cm)' error={errors.sizeLength?.message} id='sizeLength'>
          <div className='relative'>
            <Input
              id='sizeLength'
              type='number'
              step='0.1'
              className='pr-8'
              {...register('sizeLength', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              CM
            </span>
          </div>
        </FormField>

        <FormField label='Width (cm)' error={errors.sizeWidth?.message} id='sizeWidth'>
          <div className='relative'>
            <Input
              id='sizeWidth'
              type='number'
              step='0.1'
              className='pr-8'
              {...register('sizeWidth', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              CM
            </span>
          </div>
        </FormField>

        <FormField label='Height (cm)' error={errors.length?.message} id='length'>
          <div className='relative'>
            <Input
              id='length'
              type='number'
              step='0.1'
              className='pr-8'
              {...register('length', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              CM
            </span>
          </div>
        </FormField>
      </FormSection>
    </div>
  );
}
