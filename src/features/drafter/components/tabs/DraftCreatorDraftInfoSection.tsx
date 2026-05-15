import type React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductDraftKind, ProductDraftOpenFormTab } from '@/shared/contracts/products';
import type { ProductScrapeProfilesListResponse } from '@/shared/contracts/products/scrape-profiles';
import { api } from '@/shared/lib/api-client';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import {
  FormField,
  FormSection,
  Input,
  SelectSimple,
  Textarea,
  ToggleRow,
} from '@/shared/ui/forms-and-actions.public';

import {
  ANY_SCRAPE_PROFILE_VALUE,
  DRAFT_KIND_SELECT_OPTIONS,
  OPEN_PRODUCT_FORM_TAB_SELECT_OPTIONS,
} from '../../constants';
import { useDraftCreatorBasicInfo } from '../DraftCreatorFormContext';
import { IconPickerField } from './DraftCreatorIconFields';

const SCRAPE_PROFILES_QUERY_KEY = ['products', 'scrape-profiles'] as const;

const fetchScrapeProfiles = async (): Promise<ProductScrapeProfilesListResponse> =>
  await api.get<ProductScrapeProfilesListResponse>('/api/v2/products/scrape-profiles');

const buildScrapeProfileOptions = (
  profiles: ProductScrapeProfilesListResponse['profiles']
): Array<LabeledOptionDto<string>> => [
  { value: ANY_SCRAPE_PROFILE_VALUE, label: 'Any scrape profile' },
  ...profiles.map((profile) => ({
    value: profile.id,
    label: profile.label,
  })),
];

function DraftNameField(props: {
  name: string;
  setName: (next: string) => void;
}): React.JSX.Element {
  return (
    <FormField label='Draft Name' required id='name'>
      <Input
        id='name'
        value={props.name}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          props.setName(event.target.value)
        }
        placeholder='e.g., Standard Product Template'
        aria-label='e.g., Standard Product Template'
        title='e.g., Standard Product Template'
      />
    </FormField>
  );
}

function DraftKindAndProfileFields(props: {
  draftKind: ProductDraftKind;
  setDraftKind: (next: ProductDraftKind) => void;
  scrapeProfileId: string | null;
  setScrapeProfileId: (next: string | null) => void;
  scrapeProfileOptions: Array<LabeledOptionDto<string>>;
  scrapeProfilesLoading: boolean;
}): React.JSX.Element {
  const updateDraftKind = (value: string): void => {
    const nextKind = value === 'scrape_template' ? 'scrape_template' : 'standard';
    props.setDraftKind(nextKind);
    if (nextKind === 'standard') props.setScrapeProfileId(null);
  };

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
      <FormField label='Draft Type' id='draftKind'>
        <SelectSimple
          size='sm'
          options={DRAFT_KIND_SELECT_OPTIONS}
          value={props.draftKind}
          onValueChange={updateDraftKind}
          placeholder='Select draft type'
          ariaLabel='Select draft type'
          title='Select draft type'
        />
      </FormField>
      {props.draftKind === 'scrape_template' ? (
        <ScrapeProfileField
          scrapeProfileId={props.scrapeProfileId}
          setScrapeProfileId={props.setScrapeProfileId}
          scrapeProfileOptions={props.scrapeProfileOptions}
          scrapeProfilesLoading={props.scrapeProfilesLoading}
        />
      ) : null}
    </div>
  );
}

function ScrapeProfileField(props: {
  scrapeProfileId: string | null;
  setScrapeProfileId: (next: string | null) => void;
  scrapeProfileOptions: Array<LabeledOptionDto<string>>;
  scrapeProfilesLoading: boolean;
}): React.JSX.Element {
  return (
    <FormField label='Scrape Profile' id='scrapeProfileId'>
      <SelectSimple
        size='sm'
        options={props.scrapeProfileOptions}
        value={props.scrapeProfileId ?? ANY_SCRAPE_PROFILE_VALUE}
        onValueChange={(value: string): void =>
          props.setScrapeProfileId(value === ANY_SCRAPE_PROFILE_VALUE ? null : value)
        }
        placeholder={props.scrapeProfilesLoading ? 'Loading scrape profiles...' : 'Any scrape profile'}
        ariaLabel='Select scrape profile'
        title='Select scrape profile'
      />
    </FormField>
  );
}

function DraftDescriptionField(props: {
  description: string;
  setDescription: (next: string) => void;
}): React.JSX.Element {
  return (
    <FormField label='Draft Description' id='description'>
      <Textarea
        id='description'
        value={props.description}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
          props.setDescription(event.target.value)
        }
        placeholder='Describe what this draft is for...'
        rows={2}
        aria-label='Describe what this draft is for...'
        title='Describe what this draft is for...'
      />
    </FormField>
  );
}

function OpenProductFormTabField(props: {
  openProductFormTab: ProductDraftOpenFormTab;
  setOpenProductFormTab: (next: ProductDraftOpenFormTab) => void;
}): React.JSX.Element {
  return (
    <FormField
      label='Open Product Form On Tab'
      description='Used when creating a product via Create from Draft.'
      id='openProductFormTab'
    >
      <SelectSimple
        size='sm'
        options={OPEN_PRODUCT_FORM_TAB_SELECT_OPTIONS}
        value={props.openProductFormTab}
        onValueChange={(value: string): void =>
          props.setOpenProductFormTab(value as ProductDraftOpenFormTab)
        }
        placeholder='Select tab'
        ariaLabel='Select tab'
        title='Select tab'
      />
    </FormField>
  );
}

function ValidationControlsField(props: {
  validatorEnabled: boolean;
  setValidatorEnabled: (next: boolean) => void;
  formatterEnabled: boolean;
  setFormatterEnabled: (next: boolean) => void;
}): React.JSX.Element {
  const updateValidatorEnabled = (checked: boolean): void => {
    props.setValidatorEnabled(checked);
    if (checked === false) props.setFormatterEnabled(false);
  };

  return (
    <FormField
      label='Validation Controls'
      description='`Validator` enables all validation rules. `Formatter` auto-applies only rules configured for formatter mode.'
    >
      <div className='grid gap-3 md:grid-cols-2'>
        <ToggleRow
          label='Validator'
          checked={props.validatorEnabled}
          onCheckedChange={updateValidatorEnabled}
          variant='switch'
          className='bg-gray-900/70 border-border'
        />
        {props.validatorEnabled ? (
          <ToggleRow
            label='Formatter'
            checked={props.formatterEnabled}
            onCheckedChange={props.setFormatterEnabled}
            variant='switch'
            className='bg-gray-900/70 border-border'
          />
        ) : null}
      </div>
    </FormField>
  );
}

export function DraftCreatorDraftInfoSection(): React.JSX.Element {
  const info = useDraftCreatorBasicInfo();
  const scrapeProfilesQuery = useSingleQueryV2<ProductScrapeProfilesListResponse>({
    queryKey: SCRAPE_PROFILES_QUERY_KEY,
    queryFn: fetchScrapeProfiles,
    staleTime: 60_000,
    meta: {
      source: 'drafter.components.DraftCreatorDraftInfoSection',
      operation: 'list',
      resource: 'products.scrape-profiles',
      domain: 'drafter',
      queryKey: SCRAPE_PROFILES_QUERY_KEY,
      tags: ['drafter', 'scrape-profiles'],
      description: 'Loads product scrape profiles for draft templates.',
    },
  });
  const scrapeProfileOptions = buildScrapeProfileOptions(scrapeProfilesQuery.data?.profiles ?? []);

  return (
    <FormSection title='Draft Information' className='p-4'>
      <DraftNameField name={info.name} setName={info.setName} />
      <DraftKindAndProfileFields
        draftKind={info.draftKind}
        setDraftKind={info.setDraftKind}
        scrapeProfileId={info.scrapeProfileId}
        setScrapeProfileId={info.setScrapeProfileId}
        scrapeProfileOptions={scrapeProfileOptions}
        scrapeProfilesLoading={scrapeProfilesQuery.isLoading}
      />
      <DraftDescriptionField description={info.description} setDescription={info.setDescription} />
      <OpenProductFormTabField
        openProductFormTab={info.openProductFormTab}
        setOpenProductFormTab={info.setOpenProductFormTab}
      />
      <ValidationControlsField
        validatorEnabled={info.validatorEnabled}
        setValidatorEnabled={info.setValidatorEnabled}
        formatterEnabled={info.formatterEnabled}
        setFormatterEnabled={info.setFormatterEnabled}
      />
      <IconPickerField
        icon={info.icon}
        setIcon={info.setIcon}
        iconColorMode={info.iconColorMode}
        setIconColorMode={info.setIconColorMode}
        iconColor={info.iconColor}
        setIconColor={info.setIconColor}
        resolvedIconColor={info.resolvedIconColor}
        openIconLibrary={info.openIconLibrary}
      />
    </FormSection>
  );
}
