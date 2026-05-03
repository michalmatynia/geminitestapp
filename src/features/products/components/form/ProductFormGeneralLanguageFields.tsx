'use client';

import React from 'react';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import { Alert } from '@/shared/ui/alert';
import { FormSection } from '@/shared/ui/form-section';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn } from '@/shared/utils/ui-utils';

import { hasNonEmptyStringValue } from './ProductFormGeneral.helpers';
import type {
  ProductFormGeneralDisplayValues,
  ProductFormLanguage,
} from './ProductFormGeneral.types';
import { StructuredProductNameField } from './StructuredProductNameField';
import { ValidatedField } from './ValidatedField';

type ProductFormGeneralLanguageFieldsProps = {
  hasCatalogs: boolean;
  languagesReady: boolean;
  filteredLanguages: ProductFormLanguage[];
  displayValues: ProductFormGeneralDisplayValues;
  resolvedActiveNameTab: string;
  resolvedActiveDescriptionTab: string;
  setActiveNameTab: (value: string) => void;
  setActiveDescriptionTab: (value: string) => void;
};

const resolveTabValueClass = (fieldValue: unknown): string =>
  hasNonEmptyStringValue(fieldValue)
    ? 'text-foreground data-[state=inactive]:text-foreground font-medium'
    : 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90';

const ProductFormCatalogWarning = (): React.JSX.Element => (
  <Alert variant='warning' className='mb-6' data-testid='product-form-no-catalog-warning'>
    <p className='text-sm'>
      Select a catalog to edit product titles and descriptions. Language fields are based on
      catalog settings.
    </p>
  </Alert>
);

const ProductFormLanguageSkeleton = (): React.JSX.Element => (
  <div className='space-y-4'>
    <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
      <Skeleton className='h-4 w-40 bg-slate-500/20' />
    </div>
    <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
      <div className='mb-3 flex gap-2'>
        <Skeleton className='h-7 w-24 bg-slate-500/20' />
        <Skeleton className='h-7 w-24 bg-slate-500/20' />
        <Skeleton className='h-7 w-24 bg-slate-500/20' />
      </div>
      <Skeleton className='h-10 w-full bg-slate-500/20' />
    </div>
    <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
      <div className='mb-3 flex gap-2'>
        <Skeleton className='h-7 w-28 bg-slate-500/20' />
        <Skeleton className='h-7 w-28 bg-slate-500/20' />
        <Skeleton className='h-7 w-28 bg-slate-500/20' />
      </div>
      <Skeleton className='h-24 w-full bg-slate-500/20' />
    </div>
  </div>
);

const ProductNameField = ({ language }: { language: ProductFormLanguage }): React.JSX.Element => {
  const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
  if (fieldName === 'name_en') return <StructuredProductNameField />;
  if (fieldName === 'name_pl') {
    return (
      <StructuredProductNameField
        fieldName='name_pl'
        config={{
          locale: 'pl',
          label: `${language.name} Name`,
          placeholder: 'Scout Regiment | 4 cm | Metal | Przypinka Anime | Attack On Titan',
        }}
      />
    );
  }
  return (
    <ValidatedField
      name={fieldName}
      label={`${language.name} Name`}
      placeholder={`Enter product name in ${language.name}`}
    />
  );
};

const ProductLanguageTabs = ({
  filteredLanguages,
  displayValues,
  fieldPrefix,
}: {
  filteredLanguages: ProductFormLanguage[];
  displayValues: ProductFormGeneralDisplayValues;
  fieldPrefix: 'name' | 'description';
}): React.JSX.Element => (
  <TabsList className='mb-4' aria-label={`Product ${fieldPrefix} language tabs`}>
    {filteredLanguages.map((language) => {
      const fieldName = `${fieldPrefix}_${language.code.toLowerCase()}`;
      return (
        <TabsTrigger
          key={language.code}
          value={language.code.toLowerCase()}
          className={cn(resolveTabValueClass(displayValues[fieldName]))}
        >
          {language.name}
        </TabsTrigger>
      );
    })}
  </TabsList>
);

const ProductNameTabs = ({
  props,
}: {
  props: ProductFormGeneralLanguageFieldsProps;
}): React.JSX.Element => (
  <Tabs value={props.resolvedActiveNameTab} onValueChange={props.setActiveNameTab} className='w-full'>
    <ProductLanguageTabs
      filteredLanguages={props.filteredLanguages}
      displayValues={props.displayValues}
      fieldPrefix='name'
    />
    {props.filteredLanguages.map((language) => (
      <TabsContent key={language.code} value={language.code.toLowerCase()}>
        <ProductNameField language={language} />
      </TabsContent>
    ))}
  </Tabs>
);

const ProductDescriptionTabs = ({
  props,
}: {
  props: ProductFormGeneralLanguageFieldsProps;
}): React.JSX.Element => (
  <Tabs
    value={props.resolvedActiveDescriptionTab}
    onValueChange={props.setActiveDescriptionTab}
    className='w-full mt-4'
  >
    <ProductLanguageTabs
      filteredLanguages={props.filteredLanguages}
      displayValues={props.displayValues}
      fieldPrefix='description'
    />
    {props.filteredLanguages.map((language) => {
      const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
      return (
        <TabsContent key={language.code} value={language.code.toLowerCase()}>
          <ValidatedField
            name={fieldName}
            label={`${language.name} Description`}
            placeholder={`Enter product description in ${language.name}`}
            type='textarea'
            rows={4}
          />
        </TabsContent>
      );
    })}
  </Tabs>
);

export function ProductFormGeneralLanguageFields(
  props: ProductFormGeneralLanguageFieldsProps
): React.JSX.Element | null {
  if (props.hasCatalogs === false) return <ProductFormCatalogWarning />;
  if (props.languagesReady === false) return <ProductFormLanguageSkeleton />;
  return (
    <FormSection>
      <ProductNameTabs props={props} />
      <ProductDescriptionTabs props={props} />
    </FormSection>
  );
}
