import React from 'react';
import { FormSection, FormField, Input, SelectSimple } from '@/shared/ui/primitives.public';
import { DraftPlaceholderTextInput } from '../DraftPlaceholderTextInput';
import { DraftStructuredProductNameInput } from '../DraftStructuredProductNameInput';
import { useDraftCreatorBasicInfo, useDraftCreatorProductData } from '../hooks/useDraftCreatorForm';
import { PRODUCT_IDENTIFIER_OPTIONS } from '../constants'; // Assuming we move it

export function DraftCreatorProductDefaultsSection(): React.JSX.Element {
  const { draftKind } = useDraftCreatorBasicInfo();
  const {
    sku, setSku, identifierType, setIdentifierType, ean, setEan, gtin, setGtin, asin, setAsin,
    stock, setStock, weight, setWeight, sizeLength, setSizeLength, sizeWidth, setSizeWidth,
    length, setLength, nameEn, setNameEn, namePl, setNamePl, nameDe, setNameDe,
    descEn, setDescEn, descPl, setDescPl, descDe, setDescDe,
  } = useDraftCreatorProductData();
  const placeholderDropdownEnabled = draftKind === 'scrape_template';

  return (
    <FormSection title='Default Product Values' className='p-4'>
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField label='SKU' id='sku'>
            <DraftPlaceholderTextInput
              id='sku'
              value={sku}
              onValueChange={setSku}
              placeholder='Product SKU'
              ariaLabel='Product SKU'
              title='Product SKU'
              placeholderDropdownEnabled={placeholderDropdownEnabled}
            />
          </FormField>
          <FormField label='Product Identifier'>
            <div className='flex gap-2'>
              <SelectSimple
                size='sm'
                options={PRODUCT_IDENTIFIER_OPTIONS}
                value={identifierType}
                onValueChange={(value: string): void => setIdentifierType(value as 'ean' | 'gtin' | 'asin')}
                placeholder='Select type'
                className='w-[100px]'
                ariaLabel='Select type'
                title='Select type'
              />
              {identifierType === 'ean' && (
                <Input id='ean' value={ean} onChange={(e) => setEan(e.target.value)} placeholder='Enter EAN' />
              )}
              {identifierType === 'gtin' && (
                <Input id='gtin' value={gtin} onChange={(e) => setGtin(e.target.value)} placeholder='Enter GTIN' />
              )}
              {identifierType === 'asin' && (
                <Input id='asin' value={asin} onChange={(e) => setAsin(e.target.value)} placeholder='Enter ASIN' />
              )}
            </div>
          </FormField>
        </div>
        {/* ... Dimensions and Names ... */}
      </div>
    </FormSection>
  );
}
