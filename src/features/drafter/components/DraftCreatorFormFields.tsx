'use client';

import { useMemo } from 'react';

import {
  CatalogMultiSelectField,
  CategorySingleSelectField,
  ProducerMultiSelectField,
  ProductMetadataFieldProvider,
  TagMultiSelectField,
} from '@/features/products/forms.public';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS } from '@/shared/contracts/products/drafts';
import { type ProductDraftOpenFormTab } from '@/shared/contracts/products';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { Button, Input, Textarea, Card } from '@/shared/ui/primitives.public';
import { SelectSimple, FormField, FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { CompactEmptyState, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  useDraftCreatorBasicInfo,
  useDraftCreatorProductData,
  useDraftCreatorMetadata,
  useDraftCreatorParameters,
} from './DraftCreatorFormContext';

const DEFAULT_ICON_COLOR = '#60a5fa';
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const normalizeIconColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase();
};

const OPEN_PRODUCT_FORM_TAB_LABELS: Record<ProductDraftOpenFormTab, string> = {
  general: 'General',
  'marketplace-copy': 'Marketplace Copy',
  other: 'Other',
  'custom-fields': 'Custom Fields',
  parameters: 'Parameters',
  images: 'Images',
  studio: 'Studio',
  'import-info': 'Import Info',
  'note-link': 'Note Link',
  validation: 'Validation',
};

const OPEN_PRODUCT_FORM_TAB_SELECT_OPTIONS: Array<LabeledOptionDto<ProductDraftOpenFormTab>> =
  PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS.map((value) => ({
    value,
    label: OPEN_PRODUCT_FORM_TAB_LABELS[value],
  }));

const ICON_COLOR_MODE_OPTIONS: Array<LabeledOptionDto<'theme' | 'custom'>> = [
  { value: 'theme', label: 'Match Theme' },
  { value: 'custom', label: 'Custom Color' },
];

const PRODUCT_IDENTIFIER_OPTIONS: Array<LabeledOptionDto<'ean' | 'gtin' | 'asin'>> = [
  { value: 'ean', label: 'EAN' },
  { value: 'gtin', label: 'GTIN' },
  { value: 'asin', label: 'ASIN' },
];

const getParameterLabel = (parameter: ProductParameter): string =>
  parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';

const buildParameterOptions = (
  parameters: ProductParameter[]
): Array<LabeledOptionDto<string>> =>
  parameters.map((parameter) => ({
    value: parameter.id,
    label: getParameterLabel(parameter),
  }));

export function DraftCreatorDraftInfoSection(): React.JSX.Element {
  const {
    name,
    setName,
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
  const SelectedIcon = icon ? ICON_LIBRARY_MAP[icon] : null;

  return (
    <FormSection title='Draft Information' className='p-4'>
      <FormField label='Draft Name' required id='name'>
        <Input
          id='name'
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
          placeholder='e.g., Standard Product Template'
         aria-label='e.g., Standard Product Template' title='e.g., Standard Product Template'/>
      </FormField>

      <FormField label='Draft Description' id='description'>
        <Textarea
          id='description'
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
            setDescription(e.target.value)
          }
          placeholder='Describe what this draft is for...'
          rows={2}
         aria-label='Describe what this draft is for...' title='Describe what this draft is for...'/>
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
         ariaLabel='Select tab' title='Select tab'/>
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
             ariaLabel='Select color mode' title='Select color mode'/>
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
                 title='Custom Icon Color'/>
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
                 aria-label='#60a5fa' title='#60a5fa'/>
              </div>
            </FormField>
          ) : null}
        </div>
      </FormField>
    </FormSection>
  );
}

export function DraftCreatorProductDefaultsSection(): React.JSX.Element {
  const {
    sku,
    setSku,
    identifierType,
    setIdentifierType,
    ean,
    setEan,
    gtin,
    setGtin,
    asin,
    setAsin,
    weight,
    setWeight,
    sizeLength,
    setSizeLength,
    sizeWidth,
    setSizeWidth,
    length,
    setLength,
    nameEn,
    setNameEn,
    namePl,
    setNamePl,
    nameDe,
    setNameDe,
    descEn,
    setDescEn,
    descPl,
    setDescPl,
    descDe,
    setDescDe,
  } = useDraftCreatorProductData();

  return (
    <FormSection title='Default Product Values' className='p-4'>
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField label='SKU' id='sku'>
            <Input
              id='sku'
              value={sku}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSku(e.target.value)}
              placeholder='Product SKU'
             aria-label='Product SKU' title='Product SKU'/>
          </FormField>
          <FormField label='Product Identifier'>
            <div className='flex gap-2'>
              <SelectSimple
                size='sm'
                options={PRODUCT_IDENTIFIER_OPTIONS}
                value={identifierType}
                onValueChange={(value: string): void =>
                  setIdentifierType(value as 'ean' | 'gtin' | 'asin')
                }
                placeholder='Select type'
                className='w-[100px]'
               ariaLabel='Select type' title='Select type'/>
              {identifierType === 'ean' ? (
                <Input
                  id='ean'
                  value={ean}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setEan(e.target.value)
                  }
                  placeholder='Enter EAN'
                 aria-label='Enter EAN' title='Enter EAN'/>
              ) : null}
              {identifierType === 'gtin' ? (
                <Input
                  id='gtin'
                  value={gtin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setGtin(e.target.value)
                  }
                  placeholder='Enter GTIN'
                 aria-label='Enter GTIN' title='Enter GTIN'/>
              ) : null}
              {identifierType === 'asin' ? (
                <Input
                  id='asin'
                  value={asin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setAsin(e.target.value)
                  }
                  placeholder='Enter ASIN'
                 aria-label='Enter ASIN' title='Enter ASIN'/>
              ) : null}
            </div>
          </FormField>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <FormField label='Weight (kg)' id='weight'>
            <Input
              id='weight'
              type='number'
              step='0.01'
              value={weight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setWeight(e.target.value)}
              placeholder='0.00'
             aria-label='0.00' title='0.00'/>
          </FormField>
          <FormField label='Length (cm)' id='sizeLength'>
            <Input
              id='sizeLength'
              type='number'
              step='0.01'
              value={sizeLength}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setSizeLength(e.target.value)
              }
              placeholder='0.00'
             aria-label='0.00' title='0.00'/>
          </FormField>
          <FormField label='Width (cm)' id='sizeWidth'>
            <Input
              id='sizeWidth'
              type='number'
              step='0.01'
              value={sizeWidth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setSizeWidth(e.target.value)
              }
              placeholder='0.00'
             aria-label='0.00' title='0.00'/>
          </FormField>
          <FormField label='Height (cm)' id='length'>
            <Input
              id='length'
              type='number'
              step='0.01'
              value={length}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setLength(e.target.value)}
              placeholder='0.00'
             aria-label='0.00' title='0.00'/>
          </FormField>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <FormField label='Name (English)' id='nameEn'>
            <Input
              id='nameEn'
              value={nameEn}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameEn(e.target.value)}
              placeholder='Product name'
             aria-label='Product name' title='Product name'/>
          </FormField>
          <FormField label='Name (Polish)' id='namePl'>
            <Input
              id='namePl'
              value={namePl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNamePl(e.target.value)}
              placeholder='Nazwa produktu'
             aria-label='Nazwa produktu' title='Nazwa produktu'/>
          </FormField>
          <FormField label='Name (German)' id='nameDe'>
            <Input
              id='nameDe'
              value={nameDe}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameDe(e.target.value)}
              placeholder='Produktname'
             aria-label='Produktname' title='Produktname'/>
          </FormField>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <FormField label='Description (English)' id='descEn'>
            <Textarea
              id='descEn'
              value={descEn}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setDescEn(e.target.value)
              }
              placeholder='Product description'
              rows={3}
             aria-label='Product description' title='Product description'/>
          </FormField>
          <FormField label='Description (Polish)' id='descPl'>
            <Textarea
              id='descPl'
              value={descPl}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setDescPl(e.target.value)
              }
              placeholder='Opis produktu'
              rows={3}
             aria-label='Opis produktu' title='Opis produktu'/>
          </FormField>
          <FormField label='Description (German)' id='descDe'>
            <Textarea
              id='descDe'
              value={descDe}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setDescDe(e.target.value)
              }
              placeholder='Produktbeschreibung'
              rows={3}
             aria-label='Produktbeschreibung' title='Produktbeschreibung'/>
          </FormField>
        </div>
      </div>
    </FormSection>
  );
}

export function DraftCreatorPricingSupplierSection(): React.JSX.Element {
  const {
    price,
    setPrice,
    stock,
    setStock,
    supplierName,
    setSupplierName,
    supplierLink,
    setSupplierLink,
    priceComment,
    setPriceComment,
  } = useDraftCreatorProductData();

  return (
    <FormSection title='Pricing & Supplier Information' className='p-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <FormField label='Base Price' id='price'>
          <Input
            id='price'
            type='number'
            step='0.01'
            value={price}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPrice(e.target.value)}
            placeholder='0.00'
           aria-label='0.00' title='0.00'/>
        </FormField>
        <FormField label='Stock' id='stock'>
          <Input
            id='stock'
            type='number'
            value={stock}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setStock(e.target.value)}
            placeholder='0'
           aria-label='0' title='0'/>
        </FormField>
      </div>

      <FormField label='Supplier Name' id='supplierName'>
        <Input
          id='supplierName'
          value={supplierName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setSupplierName(e.target.value)
          }
          placeholder='Supplier name'
         aria-label='Supplier name' title='Supplier name'/>
      </FormField>

      <FormField label='Supplier Link' id='supplierLink'>
        <Input
          id='supplierLink'
          value={supplierLink}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setSupplierLink(e.target.value)
          }
          placeholder='https://...'
         aria-label='https://...' title='https://...'/>
      </FormField>

      <FormField label='Price Comment' id='priceComment'>
        <Input
          id='priceComment'
          value={priceComment}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setPriceComment(e.target.value)
          }
          placeholder='Additional price information'
         aria-label='Additional price information' title='Additional price information'/>
      </FormField>
    </FormSection>
  );
}

export function DraftCreatorImportInfoSection(): React.JSX.Element {
  const { baseProductId, setBaseProductId } = useDraftCreatorProductData();

  return (
    <FormSection title='Import Information' className='p-4'>
      <FormField
        label='Base Product ID'
        description='This ID is used for products imported from Base.com'
        id='baseProductId'
      >
        <Input
          id='baseProductId'
          value={baseProductId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setBaseProductId(e.target.value)
          }
          placeholder='Imported from Base.com'
         aria-label='Imported from Base.com' title='Imported from Base.com'/>
      </FormField>
    </FormSection>
  );
}

export function DraftCreatorDetailsTab(): React.JSX.Element {
  const {
    catalogs,
    selectedCatalogIds,
    setSelectedCatalogIds,
    categories,
    categoryLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    tags,
    tagLoading,
    selectedTagIds,
    setSelectedTagIds,
    producers,
    producersLoading,
    selectedProducerIds,
    setSelectedProducerIds,
  } = useDraftCreatorMetadata();

  return (
    <ProductMetadataFieldProvider
      value={{
        catalogs,
        selectedCatalogIds,
        onCatalogsChange: setSelectedCatalogIds,
        categories,
        selectedCategoryId,
        onCategoryChange: setSelectedCategoryId,
        categoriesLoading: categoryLoading,
        tags,
        selectedTagIds,
        onTagsChange: setSelectedTagIds,
        tagsLoading: tagLoading,
        producers,
        selectedProducerIds,
        onProducersChange: setSelectedProducerIds,
        producersLoading,
      }}
    >
      <div className='space-y-6'>
        <DraftCreatorDraftInfoSection />
        <DraftCreatorProductDefaultsSection />
        <DraftCreatorPricingSupplierSection />

        <FormSection title='Catalogs' className='p-4'>
          <CatalogMultiSelectField />
        </FormSection>

        {categories.length > 0 ? (
          <FormSection title='Categories' className='p-4'>
            <CategorySingleSelectField
              disabled={selectedCatalogIds.length === 0}
              placeholder={
                selectedCatalogIds.length > 0 ? 'Select category' : 'Select a catalog first'
              }
            />
          </FormSection>
        ) : null}

        {tags.length > 0 ? (
          <FormSection title='Tags' className='p-4'>
            <TagMultiSelectField
              disabled={selectedCatalogIds.length === 0}
              placeholder={selectedCatalogIds.length > 0 ? 'Select tags' : 'Select a catalog first'}
            />
          </FormSection>
        ) : null}

        <FormSection className='p-4'>
          <ProducerMultiSelectField />
        </FormSection>

        {selectedCatalogIds.length > 0 ? (
          <FormSection
            title='Price Group Information'
            variant='subtle'
            className='bg-blue-950/20 border-blue-900/50 p-4'
          >
            <p className='text-sm text-blue-300/70'>
              Products created from this draft will automatically use the default price group from
              the selected catalog(s). Price groups are configured per catalog and cannot be
              manually overridden in drafts.
            </p>
          </FormSection>
        ) : null}

        <DraftCreatorImportInfoSection />
      </div>
    </ProductMetadataFieldProvider>
  );
}

export function DraftCreatorParametersTab(): React.JSX.Element {
  const {
    parameters,
    parametersLoading,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValue,
    removeParameterValue,
  } = useDraftCreatorParameters();

  const selectedParameterIds = useMemo(
    (): (string | undefined)[] =>
      parameterValues
        .map((entry: ProductParameterValue): string | undefined => entry.parameterId)
        .filter(Boolean),
    [parameterValues]
  );

  return (
    <FormSection
      title='Parameters'
      description='Set default parameter values for products created from this draft.'
      className='p-4'
      actions={
        <Button
          type='button'
          variant='outline'
          onClick={addParameterValue}
          disabled={parametersLoading || parameters.length === 0}
        >
          Add parameter
        </Button>
      }
    >
      {parametersLoading ? (
        <CompactEmptyState
          title='Loading parameters...'
          className='border-dashed border-border/60 py-8'
         />
      ) : parameters.length === 0 ? (
        <CompactEmptyState
          title='No parameters'
          description='No parameters available for the selected catalog(s).'
          className='border-dashed border-border/60 py-8'
         />
      ) : parameterValues.length === 0 ? (
        <CompactEmptyState
          title='No values'
          description='Add your first parameter to start defining defaults.'
          className='border-dashed border-border/60 py-8'
         />
      ) : (
        <div className='space-y-3'>
          {parameterValues.map((entry: ProductParameterValue, index: number): React.JSX.Element => {
            const availableOptions: ProductParameter[] = parameters.filter(
              (parameter: ProductParameter): boolean =>
                !selectedParameterIds.includes(parameter.id) || parameter.id === entry.parameterId
            );
            return (
              <Card
                key={`${entry.parameterId || 'new'}-${index}`}
                variant='subtle-compact'
                padding='sm'
                className='flex flex-col gap-3 border-border bg-card/60 md:flex-row md:items-center'
              >
                <div className='w-full md:w-64'>
                  <SelectSimple
                    size='sm'
                    options={buildParameterOptions(availableOptions)}
                    value={entry.parameterId}
                    onValueChange={(value: string): void => updateParameterId(index, value)}
                    placeholder='Select parameter'
                   ariaLabel='Select parameter' title='Select parameter'/>
                </div>
                <div className='flex-1'>
                  <Input
                    value={entry.value ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      updateParameterValue(index, event.target.value)
                    }
                    placeholder='Value'
                    disabled={!entry.parameterId}
                   aria-label='Value' title='Value'/>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={(): void => removeParameterValue(index)}
                >
                  Remove
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
