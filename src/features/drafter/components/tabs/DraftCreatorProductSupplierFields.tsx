import type React from 'react';

import { FormField } from '@/shared/ui/forms-and-actions.public';

import type { DraftCreatorProductData } from '../DraftCreatorFormContext';
import { DraftPlaceholderTextInput } from '../DraftPlaceholderTextInput';

type SupplierFieldsProps = {
  productData: DraftCreatorProductData;
  placeholderDropdownEnabled: boolean;
};

function SupplierTextField(props: {
  id: string;
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  placeholder: string;
  placeholderDropdownEnabled: boolean;
}): React.JSX.Element {
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
      />
    </FormField>
  );
}

export function SupplierFields(props: SupplierFieldsProps): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <SupplierTextField
        id='supplierName'
        label='Supplier Name'
        value={props.productData.supplierName}
        onValueChange={props.productData.setSupplierName}
        placeholder='Supplier name'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <SupplierTextField
        id='supplierLink'
        label='Supplier Link'
        value={props.productData.supplierLink}
        onValueChange={props.productData.setSupplierLink}
        placeholder='Supplier link'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <SupplierTextField
        id='priceComment'
        label='Price Comment'
        value={props.productData.priceComment}
        onValueChange={props.productData.setPriceComment}
        placeholder='Price comment'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
      <SupplierTextField
        id='baseProductId'
        label='Base Product ID'
        value={props.productData.baseProductId}
        onValueChange={props.productData.setBaseProductId}
        placeholder='Base product ID'
        placeholderDropdownEnabled={props.placeholderDropdownEnabled}
      />
    </div>
  );
}
