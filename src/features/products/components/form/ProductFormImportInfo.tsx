import { useFormContext } from 'react-hook-form';

import { ProductFormData } from '@/shared/contracts/products';
import { FormSection, FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';

export default function ProductFormImportInfo(): React.JSX.Element {
  const { register } = useFormContext<ProductFormData>();

  return (
    <FormSection
      title='System Information'
      description='Read-only linkage data used by external marketplace integrations.'
    >
      <FormField
        label='Base ID'
        id='baseProductId'
        description='External Base.com product ID used for sync and export linkage.'
      >
        <Input
          id='baseProductId'
          {...register('baseProductId')}
          disabled
          className='bg-muted cursor-not-allowed'
          placeholder='Linked Base.com product ID'
          aria-readonly='true'
          aria-label='Linked Base.com product ID'
          title='Linked Base.com product ID'
        />
      </FormField>
    </FormSection>
  );
}
