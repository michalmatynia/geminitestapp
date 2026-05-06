import React from 'react';
import {
  FormSection,
  FormField,
  Input,
  SelectSimple,
  Textarea,
  ToggleRow,
  Button,
  Card,
} from '@/shared/ui/primitives.public';
import {
  DRAFT_KIND_SELECT_OPTIONS,
  OPEN_PRODUCT_FORM_TAB_SELECT_OPTIONS,
  ICON_COLOR_MODE_OPTIONS,
  ANY_SCRAPE_PROFILE_VALUE,
  DEFAULT_ICON_COLOR,
} from '../../constants';
import { ICON_LIBRARY_MAP, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/lib/icons';
import { useDraftCreatorBasicInfo } from '../hooks/useDraftCreatorForm';
import { useScrapeProfiles } from '@/features/integrations/hooks/useScrapeProfiles';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductDraftOpenFormTab } from '@/shared/contracts/products';

const normalizeIconColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
  if (HEX_PATTERN.test(trimmed) === false) return null;
  return trimmed.toLowerCase();
};

export function DraftCreatorDraftInfoSection(): React.JSX.Element {
  const {
    name,
    setName,
    draftKind,
    setDraftKind,
    scrapeProfileId,
    setScrapeProfileId,
    description,
    setDescription,
    validatorEnabled,
    setValidatorEnabled,
    formatterEnabled,
    setFormatterEnabled,
    icon,
    setIcon,
    iconColorMode,
    setIconColorMode,
    iconColor,
    setIconColor,
    openProductFormTab,
    setOpenProductFormTab,
    resolvedIconColor,
    openIconLibrary,
  } = useDraftCreatorBasicInfo();
  const scrapeProfilesQuery = useScrapeProfiles();
  const scrapeProfileOptions: Array<LabeledOptionDto<string>> = [
    { value: ANY_SCRAPE_PROFILE_VALUE, label: 'Any scrape profile' },
    ...(scrapeProfilesQuery.data?.profiles ?? []).map((profile) => ({
      value: profile.id,
      label: profile.label,
    })),
  ];
  const SelectedIcon = icon ? ICON_LIBRARY_MAP[icon] : null;

  return (
    <FormSection title='Draft Information' className='p-4'>
      <FormField label='Draft Name' required id='name'>
        <Input
          id='name'
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
          placeholder='e.g., Standard Product Template'
          aria-label='e.g., Standard Product Template'
          title='e.g., Standard Product Template'
        />
      </FormField>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <FormField label='Draft Type' id='draftKind'>
          <SelectSimple
            size='sm'
            options={DRAFT_KIND_SELECT_OPTIONS}
            value={draftKind}
            onValueChange={(value: string): void => {
              const nextKind = value === 'scrape_template' ? 'scrape_template' : 'standard';
              setDraftKind(nextKind);
              if (nextKind === 'standard') setScrapeProfileId(null);
            }}
            placeholder='Select draft type'
            ariaLabel='Select draft type'
            title='Select draft type'
          />
        </FormField>
        {draftKind === 'scrape_template' ? (
          <FormField label='Scrape Profile' id='scrapeProfileId'>
            <SelectSimple
              size='sm'
              options={scrapeProfileOptions}
              value={scrapeProfileId ?? ANY_SCRAPE_PROFILE_VALUE}
              onValueChange={(value: string): void =>
                setScrapeProfileId(value === ANY_SCRAPE_PROFILE_VALUE ? null : value)
              }
              placeholder={
                scrapeProfilesQuery.isLoading ? 'Loading scrape profiles...' : 'Any scrape profile'
              }
              ariaLabel='Select scrape profile'
              title='Select scrape profile'
            />
          </FormField>
        ) : null}
      </div>

      <FormField label='Draft Description' id='description'>
        <Textarea
          id='description'
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
            setDescription(e.target.value)
          }
          placeholder='Describe what this draft is for...'
          rows={2}
          aria-label='Describe what this draft is for...'
          title='Describe what this draft is for...'
        />
      </FormField>

      <FormField
        label='Open Product Form On Tab'
        description='Used when creating a product via Create from Draft.'
        id='openProductFormTab'
      >
        <SelectSimple
          size='sm'
          options={OPEN_PRODUCT_FORM_TAB_SELECT_OPTIONS}
          value={openProductFormTab}
          onValueChange={(value: string): void =>
            setOpenProductFormTab(value as ProductDraftOpenFormTab)
          }
          placeholder='Select tab'
          ariaLabel='Select tab'
          title='Select tab'
        />
      </FormField>

      <FormField
        label='Validation Controls'
        description='`Validator` enables all validation rules. `Formatter` auto-applies only rules configured for formatter mode.'
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <ToggleRow
            label='Validator'
            checked={validatorEnabled}
            onCheckedChange={(checked) => {
              setValidatorEnabled(checked);
              if (!checked) setFormatterEnabled(false);
            }}
            variant='switch'
            className='bg-gray-900/70 border-border'
          />
          {validatorEnabled && (
            <ToggleRow
              label='Formatter'
              checked={formatterEnabled}
              onCheckedChange={setFormatterEnabled}
              variant='switch'
              className='bg-gray-900/70 border-border'
            />
          )}
        </div>
      </FormField>

      <FormField label='Icon' description='Icons are shown only after you click Choose Icon.'>
        <Card
          variant='subtle-compact'
          padding='sm'
          className={`${UI_CENTER_ROW_SPACED_CLASSNAME} border-border bg-card/40`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-gray-800 ${
              iconColorMode === 'custom' ? '' : 'text-gray-200'
            }`}
            style={iconColorMode === 'custom' ? { color: resolvedIconColor } : undefined}
          >
            {SelectedIcon ? (
              <SelectedIcon className='h-4 w-4' />
            ) : (
              <span className='text-xs text-gray-500'>None</span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='outline' onClick={openIconLibrary}>
              Choose Icon
            </Button>
            {icon ? (
              <Button type='button' variant='ghost' onClick={(): void => setIcon(null)}>
                Clear
              </Button>
            ) : null}
          </div>
        </Card>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-[12rem_minmax(0,1fr)] mt-3'>
          <FormField label='Icon Color' id='iconColorMode'>
            <SelectSimple
              size='sm'
              options={ICON_COLOR_MODE_OPTIONS}
              value={iconColorMode}
              onValueChange={(value: string): void =>
                setIconColorMode(value === 'custom' ? 'custom' : 'theme')
              }
              placeholder='Select color mode'
              ariaLabel='Select color mode'
              title='Select color mode'
            />
          </FormField>
          {iconColorMode === 'custom' ? (
            <FormField label='Custom Icon Color' id='iconColor'>
              <div className='flex items-center gap-2'>
                <Input
                  id='iconColorPicker'
                  type='color'
                  value={resolvedIconColor}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setIconColor(event.target.value)
                  }
                  className='h-10 w-14 cursor-pointer p-1'
                  aria-label='Pick icon color'
                  title='Custom Icon Color'
                />
                <Input
                  id='iconColor'
                  value={iconColor}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setIconColor(event.target.value)
                  }
                  onBlur={(): void =>
                    setIconColor(normalizeIconColor(iconColor) || DEFAULT_ICON_COLOR)
                  }
                  placeholder='#60a5fa'
                  className='font-mono uppercase'
                  aria-label='#60a5fa'
                  title='#60a5fa'
                />
              </div>
            </FormField>
          ) : null}
        </div>
      </FormField>
    </FormSection>
  );
}
