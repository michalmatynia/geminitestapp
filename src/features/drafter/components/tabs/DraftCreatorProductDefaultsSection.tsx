import type React from 'react';

import { FormField, FormSection, Input, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { PRODUCT_IDENTIFIER_OPTIONS } from '../../constants';
import {
  type DraftCreatorProductData,
  useDraftCreatorBasicInfo,
  useDraftCreatorProductData,
} from '../DraftCreatorFormContext';
import { DraftPlaceholderTextInput } from '../DraftPlaceholderTextInput';
import { DraftStructuredProductNameInput } from '../DraftStructuredProductNameInput';
import { SupplierFields } from './DraftCreatorProductSupplierFields';

type ProductIdentifierType = DraftCreatorProductData['identifierType'];

type ProductDataFieldsProps = {
  productData: DraftCreatorProductData;
  placeholderDropdownEnabled: boolean;
};

type PlaceholderTextFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  placeholder: string;
  placeholderDropdownEnabled: boolean;
  multiline?: boolean;
};

const isProductIdentifierType = (value: string): value is ProductIdentifierType =>
  value === 'ean' || value === 'gtin' || value === 'asin';

function PlaceholderTextField(props: PlaceholderTextFieldProps): React.JSX.Element {
  return (
    <FormField label={props.label} id={props.id}>
      <DraftPlaceholderTextInput
        id={props.id}
        value={props.value}
        onValueChange={props.onValueChange}
        placeholder={props.placeholder}
        ariaLabel={props.placeholder}
        title={props.placeholder}
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
        multiline={props.multiline}
        rows={props.multiline === true ? 3 : undefined}
      />
    </FormField>
  );
}

function ProductIdentifierField(props: {
  productData: DraftCreatorProductData;
}): React.JSX.Element {
  const updateIdentifierType = (value: string): void => {
    if (isProductIdentifierType(value)) props.productData.setIdentifierType(value);
  };

  return (
    <FormField label='Product Identifier'>
      <div className='flex gap-2'>
        <SelectSimple
          size='sm'
          options={PRODUCT_IDENTIFIER_OPTIONS}
          value={props.productData.identifierType}
          onValueChange={updateIdentifierType}
          placeholder='Select type'
          className='w-[100px]'
          ariaLabel='Select type'
          title='Select type'
        />
        <IdentifierValueInput productData={props.productData} />
      </div>
    </FormField>
  );
}

function IdentifierValueInput(props: {
  productData: DraftCreatorProductData;
}): React.JSX.Element {
  const { identifierType, ean, setEan, gtin, setGtin, asin, setAsin } = props.productData;

  if (identifierType === 'gtin') {
    return (
      <Input
        id='gtin'
        value={gtin}
        onChange={(event): void => setGtin(event.target.value)}
        placeholder='Enter GTIN'
      />
    );
  }

  if (identifierType === 'asin') {
    return (
      <Input
        id='asin'
        value={asin}
        onChange={(event): void => setAsin(event.target.value)}
        placeholder='Enter ASIN'
      />
    );
  }

  return (
    <Input
      id='ean'
      value={ean}
      onChange={(event): void => setEan(event.target.value)}
      placeholder='Enter EAN'
    />
  );
}

function ProductIdentityFields(props: ProductDataFieldsProps): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <PlaceholderTextField
        id='sku'
        label='SKU'
        value={props.productData.sku}
        onValueChange={props.productData.setSku}
        placeholder='Product SKU'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <ProductIdentifierField productData={props.productData} />
    </div>
  );
}

function StockAndLengthFields(props: ProductDataFieldsProps): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
      <FormField label='Stock' id='stock'>
        <Input
          id='stock'
          type='number'
          min='0'
          step='1'
          value={props.productData.stock}
          onChange={(event): void => props.productData.setStock(event.target.value)}
          placeholder='0'
          aria-label='Stock'
          title='Stock'
        />
      </FormField>
      <PlaceholderTextField
        id='length'
        label='Length'
        value={props.productData.length}
        onValueChange={props.productData.setLength}
        placeholder='Length'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
    </div>
  );
}

function PricingAndSizeFields(props: ProductDataFieldsProps): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
      <PlaceholderTextField
        id='price'
        label='Price'
        value={props.productData.price}
        onValueChange={props.productData.setPrice}
        placeholder='Product price'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <PlaceholderTextField
        id='weight'
        label='Weight'
        value={props.productData.weight}
        onValueChange={props.productData.setWeight}
        placeholder='Weight'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <PlaceholderTextField
        id='sizeLength'
        label='Size Length'
        value={props.productData.sizeLength}
        onValueChange={props.productData.setSizeLength}
        placeholder='Size length'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <PlaceholderTextField
        id='sizeWidth'
        label='Size Width'
        value={props.productData.sizeWidth}
        onValueChange={props.productData.setSizeWidth}
        placeholder='Size width'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
    </div>
  );
}

function LocalizedNameFields(props: ProductDataFieldsProps): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      <FormField label='Name EN' id='nameEn'>
        <DraftStructuredProductNameInput
          id='nameEn'
          value={props.productData.nameEn}
          onValueChange={props.productData.setNameEn}
          placeholder='English product name'
          ariaLabel='English product name'
          title='English product name'
          placeholderDropdownEnabled={props.placeholderDropdownEnabled}
        />
      </FormField>
      <PlaceholderTextField
        id='namePl'
        label='Name PL'
        value={props.productData.namePl}
        onValueChange={props.productData.setNamePl}
        placeholder='Polish product name'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <PlaceholderTextField
        id='nameDe'
        label='Name DE'
        value={props.productData.nameDe}
        onValueChange={props.productData.setNameDe}
        placeholder='German product name'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
    </div>
  );
}

function DescriptionFields(props: ProductDataFieldsProps): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      <PlaceholderTextField
        id='descEn'
        label='Description EN'
        value={props.productData.descEn}
        onValueChange={props.productData.setDescEn}
        placeholder='English description'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
        multiline
      />
      <PlaceholderTextField
        id='descPl'
        label='Description PL'
        value={props.productData.descPl}
        onValueChange={props.productData.setDescPl}
        placeholder='Polish description'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
        multiline
      />
      <PlaceholderTextField
        id='descDe'
        label='Description DE'
        value={props.productData.descDe}
        onValueChange={props.productData.setDescDe}
        placeholder='German description'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
        multiline
      />
    </div>
  );
}

export function DraftCreatorProductDefaultsSection(): React.JSX.Element {
  const { draftKind } = useDraftCreatorBasicInfo();
  const productData = useDraftCreatorProductData();
  const placeholderDropdownEnabled = draftKind === 'scrape_template';
  const sharedProps = { productData, placeholderDropdownEnabled };

  return (
    <FormSection title='Default Product Values' className='p-4'>
      <div className='space-y-6'>
        <ProductIdentityFields {...sharedProps} />
        <StockAndLengthFields {...sharedProps} />
        <PricingAndSizeFields {...sharedProps} />
        <LocalizedNameFields {...sharedProps} />
        <DescriptionFields {...sharedProps} />
        <SupplierFields {...sharedProps} />
      </div>
    </FormSection>
  );
}
