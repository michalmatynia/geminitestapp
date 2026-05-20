'use client';

import dynamic from 'next/dynamic';
import type { JSX } from 'react';

import type { ProductTriggerButtonBarProps } from '@/features/products/lib/product-integrations-adapter-loader';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { SelectSimple } from '@/shared/ui/select-simple';

export type ProductNameLocale = 'name_en' | 'name_pl' | 'name_de';

export interface ProductListSelectorsAndTriggersProps {
  catalogFilter: string;
  catalogFilterOptions: Array<LabeledOptionDto<string>>;
  currencyCode: string;
  currencySelectOptions: Array<LabeledOptionDto<string>>;
  languageOptions: Array<LabeledOptionDto<ProductNameLocale>>;
  nameLocale: ProductNameLocale;
  setCatalogFilter: (value: string) => void;
  setCurrencyCode: (value: string) => void;
  setNameLocale: (value: ProductNameLocale) => void;
  showTriggerRunFeedback: boolean;
  triggerButtonsReady: boolean;
}

const renderDynamicFallback = (): null => null;

const TriggerButtonBar = dynamic<ProductTriggerButtonBarProps>(
  () =>
    import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').then(
      (mod) => mod.TriggerButtonBar
    ),
  {
    ssr: false,
    loading: renderDynamicFallback,
  }
);

const isProductNameLocale = (value: string): value is ProductNameLocale =>
  value === 'name_en' || value === 'name_pl' || value === 'name_de';

function ProductNameLocaleSelector({
  languageOptions,
  nameLocale,
  setNameLocale,
}: Pick<
  ProductListSelectorsAndTriggersProps,
  'languageOptions' | 'nameLocale' | 'setNameLocale'
>): JSX.Element {
  return (
    <SelectSimple
      size='sm'
      value={nameLocale}
      onValueChange={(value: string) => {
        if (isProductNameLocale(value)) setNameLocale(value);
      }}
      options={languageOptions}
      placeholder='Language'
      className='w-full shrink-0 sm:w-40'
      triggerClassName='h-8 w-full text-xs'
      ariaLabel='Select product name language'
      title='Language'
    />
  );
}

function ProductCurrencySelector({
  currencyCode,
  currencySelectOptions,
  setCurrencyCode,
}: Pick<
  ProductListSelectorsAndTriggersProps,
  'currencyCode' | 'currencySelectOptions' | 'setCurrencyCode'
>): JSX.Element {
  return (
    <SelectSimple
      size='sm'
      value={currencyCode}
      onValueChange={setCurrencyCode}
      options={currencySelectOptions}
      placeholder='Currency'
      className='w-full shrink-0 sm:w-28'
      triggerClassName='h-8 w-full text-xs'
      ariaLabel='Select currency'
      title='Currency'
    />
  );
}

function ProductCatalogSelector({
  catalogFilter,
  catalogFilterOptions,
  setCatalogFilter,
}: Pick<
  ProductListSelectorsAndTriggersProps,
  'catalogFilter' | 'catalogFilterOptions' | 'setCatalogFilter'
>): JSX.Element {
  return (
    <SelectSimple
      size='sm'
      value={catalogFilter}
      onValueChange={setCatalogFilter}
      options={catalogFilterOptions}
      placeholder='Catalog'
      className='w-full shrink-0 sm:w-48'
      triggerClassName='h-8 w-full text-xs'
      ariaLabel='Filter by catalog'
      title='Catalog'
    />
  );
}

function ProductTriggerButtons({
  showTriggerRunFeedback,
  triggerButtonsReady,
}: Pick<
  ProductListSelectorsAndTriggersProps,
  'showTriggerRunFeedback' | 'triggerButtonsReady'
>): JSX.Element | null {
  if (triggerButtonsReady === false) return null;

  return (
    <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap'>
      <TriggerButtonBar
        location='product_list'
        entityType='product'
        showRunFeedback={showTriggerRunFeedback}
        className='w-full flex-nowrap sm:w-auto'
      />
    </div>
  );
}

export function ProductListSelectorsAndTriggers(
  props: ProductListSelectorsAndTriggersProps
): JSX.Element {
  return (
    <>
      <ProductNameLocaleSelector
        languageOptions={props.languageOptions}
        nameLocale={props.nameLocale}
        setNameLocale={props.setNameLocale}
      />
      <ProductCurrencySelector
        currencyCode={props.currencyCode}
        currencySelectOptions={props.currencySelectOptions}
        setCurrencyCode={props.setCurrencyCode}
      />
      <ProductCatalogSelector
        catalogFilter={props.catalogFilter}
        catalogFilterOptions={props.catalogFilterOptions}
        setCatalogFilter={props.setCatalogFilter}
      />
      <ProductTriggerButtons
        showTriggerRunFeedback={props.showTriggerRunFeedback}
        triggerButtonsReady={props.triggerButtonsReady}
      />
    </>
  );
}
