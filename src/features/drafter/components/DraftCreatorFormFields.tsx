'use client';

import {
  CatalogMultiSelectField,
  CategorySingleSelectField,
  ProducerMultiSelectField,
  TagMultiSelectField,
} from '@/features/products/forms.public';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { Button } from '@/shared/ui/primitives.public';
import { FormField, FormSection, Input, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import {
  useDraftCreatorMetadata,
  useDraftCreatorParameters,
} from './DraftCreatorFormContext';
import { DraftCreatorParameterDefinitionModal } from './DraftCreatorParameterDefinitionModal';
import { DraftCreatorDraftInfoSection } from './tabs/DraftCreatorDraftInfoSection';
import { DraftCreatorProductDefaultsSection } from './tabs/DraftCreatorProductDefaultsSection';

const getFirstNonEmptyString = (values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
};

const getParameterLabel = (parameter: ProductParameter): string =>
  getFirstNonEmptyString([parameter.name_en, parameter.name_pl, parameter.name_de]) ??
  'Unnamed parameter';

const buildParameterOptions = (
  parameters: ProductParameter[]
): Array<LabeledOptionDto<string>> =>
  parameters.map((parameter) => ({
    value: parameter.id,
    label: getParameterLabel(parameter),
  }));

const resolveParameterById = (
  parameters: ProductParameter[],
  parameterId: string | undefined
): ProductParameter | null =>
  parameters.find((parameter) => parameter.id === parameterId) ?? null;

const getLinkedTitleTermLabel = (parameter: ProductParameter | null): string | null => {
  if (parameter?.linkedTitleTermType === 'material') return 'Material';
  if (parameter?.linkedTitleTermType === 'size') return 'Size';
  if (parameter?.linkedTitleTermType === 'theme') return 'Theme';
  return null;
};

function LinkedTitleTermNotice(props: { label: string | null }): React.JSX.Element | null {
  if (props.label === null) return null;
  return (
    <div className='flex items-center gap-2 text-xs text-emerald-300'>
      <span className='rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-medium tracking-wide'>
        Synced from English Title
      </span>
      <span>{props.label} term</span>
    </div>
  );
}

function DraftCreatorParameterRow(props: {
  entry: ProductParameterValue;
  index: number;
  parameterOptions: Array<LabeledOptionDto<string>>;
  parameters: ProductParameter[];
  onRemove: (index: number) => void;
  onUpdateParameterId: (index: number, parameterId: string) => void;
  onUpdateParameterValue: (index: number, value: string) => void;
}): React.JSX.Element {
  const selectedParameter = resolveParameterById(props.parameters, props.entry.parameterId);
  const linkedTitleTermLabel = getLinkedTitleTermLabel(selectedParameter);
  const isLinkedParameter = linkedTitleTermLabel !== null;

  return (
    <div className='rounded-md border border-border/60 bg-card/35 p-3'>
      <div className='grid gap-3 md:grid-cols-[16rem_minmax(0,1fr)_auto] md:items-end'>
        <FormField label='Parameter'>
          <SelectSimple
            size='sm'
            value={props.entry.parameterId}
            onValueChange={(value): void => props.onUpdateParameterId(props.index, value)}
            options={props.parameterOptions}
            placeholder='Select parameter'
            ariaLabel='Parameter'
            title='Select parameter'
            disabled={isLinkedParameter}
          />
        </FormField>
        <FormField label='Value'>
          <Input
            value={props.entry.value ?? ''}
            onChange={(event): void => props.onUpdateParameterValue(props.index, event.target.value)}
            aria-label='Value'
            disabled={isLinkedParameter}
          />
        </FormField>
        <Button
          type='button'
          variant='outline'
          onClick={(): void => props.onRemove(props.index)}
          disabled={isLinkedParameter}
          title={isLinkedParameter ? 'Linked parameters are synced from English Title' : 'Remove'}
        >
          Remove
        </Button>
      </div>
      <div className='mt-2'>
        <LinkedTitleTermNotice label={linkedTitleTermLabel} />
      </div>
    </div>
  );
}

export function DraftCreatorCatalogsSection(): React.JSX.Element {
  const { catalogs, selectedCatalogIds, setSelectedCatalogIds } = useDraftCreatorMetadata();
  return (
    <div className='p-4'>
      <CatalogMultiSelectField
        catalogs={catalogs}
        selectedCatalogIds={selectedCatalogIds}
        onChange={setSelectedCatalogIds}
      />
    </div>
  );
}

function DraftCreatorMetadataSection(): React.JSX.Element {
  const metadata = useDraftCreatorMetadata();
  return (
    <FormSection title='Catalog & Classification' className='p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <CatalogMultiSelectField
          catalogs={metadata.catalogs}
          selectedCatalogIds={metadata.selectedCatalogIds}
          onChange={metadata.setSelectedCatalogIds}
        />
        <CategorySingleSelectField
          categories={metadata.categories}
          selectedCategoryId={metadata.selectedCategoryId}
          onChange={metadata.setSelectedCategoryId}
          loading={metadata.categoryLoading}
        />
        <TagMultiSelectField
          tags={metadata.tags}
          selectedTagIds={metadata.selectedTagIds}
          onChange={metadata.setSelectedTagIds}
          loading={metadata.tagLoading}
        />
        <ProducerMultiSelectField
          producers={metadata.producers}
          selectedProducerIds={metadata.selectedProducerIds}
          onChange={metadata.setSelectedProducerIds}
          loading={metadata.producersLoading}
        />
      </div>
    </FormSection>
  );
}

export function DraftCreatorDetailsTab(): React.JSX.Element {
  return (
    <div className='space-y-6'>
      <DraftCreatorDraftInfoSection />
      <DraftCreatorProductDefaultsSection />
      <DraftCreatorMetadataSection />
    </div>
  );
}

export function DraftCreatorParametersTab(): React.JSX.Element {
  const {
    addParameterValue,
    parameterValues,
    parameters,
    parametersLoading,
    removeParameterValue,
    updateParameterId,
    updateParameterValue,
  } = useDraftCreatorParameters();
  const parameterOptions = buildParameterOptions(parameters);

  return (
    <FormSection
      title='Parameters'
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' onClick={addParameterValue}>
            Add parameter
          </Button>
          <DraftCreatorParameterDefinitionModal />
        </div>
      }
    >
      {parametersLoading ? (
        <p className='text-sm text-muted-foreground'>Loading parameters...</p>
      ) : null}
      <div className='space-y-3'>
        {parameterValues.map((entry, index) => (
          <DraftCreatorParameterRow
            key={`${entry.parameterId.length > 0 ? entry.parameterId : 'parameter'}-${index}`}
            entry={entry}
            index={index}
            parameterOptions={parameterOptions}
            parameters={parameters}
            onRemove={removeParameterValue}
            onUpdateParameterId={updateParameterId}
            onUpdateParameterValue={updateParameterValue}
          />
        ))}
      </div>
    </FormSection>
  );
}

export { DraftCreatorProductDefaultsSection };
