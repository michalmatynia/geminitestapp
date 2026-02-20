import { useFormContext } from 'react-hook-form';

import { ProductFormData } from '@/shared/contracts/products';
import { Input, FormSection, FormField } from '@/shared/ui';

export default function ProductFormImportInfo(): React.JSX.Element {
  const { register } = useFormContext<ProductFormData>();

  return (
    <FormSection title='System Information' description='Data imported from external integration platforms.'>
      <FormField 
        label='Base ID' 
        id='baseProductId'
        description='This ID is imported from Base.com and cannot be edited.'
      >
        <Input
          id='baseProductId'
          {...register('baseProductId')}
          disabled
          className='bg-muted cursor-not-allowed'
          placeholder='Imported from Base.com'
          aria-readonly='true'
        />
      </FormField>
    </FormSection>
  );
}