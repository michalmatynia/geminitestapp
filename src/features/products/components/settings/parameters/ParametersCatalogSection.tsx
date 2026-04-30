import type { LabeledOptionDto } from '@/shared/contracts/base';
import { FormSection } from '@/shared/ui/form-section';
import { SelectSimple } from '@/shared/ui/select-simple';

type ParametersCatalogSectionProps = {
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  catalogOptions: Array<LabeledOptionDto<string>>;
};

export function ParametersCatalogSection({
  selectedCatalogId,
  onCatalogChange,
  catalogOptions,
}: ParametersCatalogSectionProps): React.JSX.Element {
  return (
    <FormSection
      title='Select Catalog'
      description='Parameters are managed per catalog.'
      className='p-4'
    >
      <div className='mt-4 w-full max-w-xs'>
        <SelectSimple
          size='sm'
          value={selectedCatalogId ?? ''}
          onValueChange={onCatalogChange}
          options={catalogOptions}
          placeholder='Select a catalog...'
          ariaLabel='Catalog'
          title='Select a catalog...'
        />
      </div>
    </FormSection>
  );
}
