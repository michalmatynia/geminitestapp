'use client';

import { useMemo } from 'react';

import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { CatalogMultiSelectField } from '@/features/products/components/form/CatalogMultiSelectField';
import { CategorySingleSelectField } from '@/features/products/components/form/CategorySingleSelectField';
import { ProducerMultiSelectField } from '@/features/products/components/form/ProducerMultiSelectField';
import { ProductMetadataFieldProvider } from '@/features/products/components/form/ProductMetadataFieldContext';
import { TagMultiSelectField } from '@/features/products/components/form/TagMultiSelectField';
import type {
  ProductParameter,
  ProductParameterValue,
} from '@/shared/contracts/products';
import {
  PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS,
  type ProductDraftOpenFormTab,
} from '@/shared/contracts/products';
import { Button, Input, Textarea, SelectSimple, FormField, FormSection, Card, EmptyState } from '@/shared/ui';

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
  other: 'Other',
  parameters: 'Parameters',
  images: 'Images',
  studio: 'Studio',
  'import-info': 'Import Info',
  'note-link': 'Note Link',
  validation: 'Validation',
};

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
      <FormField
        label='Draft Name'
        required
        id='name'
      >
        <Input
          id='name'
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
          placeholder='e.g., Standard Product Template'
        />
      </FormField>

      <FormField
        label='Draft Description'
        id='description'
      >
        <Textarea
          id='description'
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescription(e.target.value)}
          placeholder='Describe what this draft is for...'
          rows={2}
        />
      </FormField>

      <FormField
        label='Open Product Form On Tab'
        description='Used when creating a product via Create from Draft.'
        id='openProductFormTab'
      >
        <SelectSimple size='sm'
          options={PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS.map(
            (value: ProductDraftOpenFormTab) => ({
              value,
              label: OPEN_PRODUCT_FORM_TAB_LABELS[value],
            })
          )}
          value={openProductFormTab}
          onValueChange={(value: string): void =>
            setOpenProductFormTab(value as ProductDraftOpenFormTab)
          }
          placeholder='Select tab'
        />
      </FormField>

      <FormField
        label='Validation Controls'
        description='`Validator` enables all validation rules. `Formatter` auto-applies only rules configured for formatter mode.'
      >
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            onClick={(): void => {
              const next = !validatorEnabled;
              setValidatorEnabled(next);
              if (!next) {
                setFormatterEnabled(false);
              }
            }}
            className={`h-8 rounded border px-2.5 text-[10px] font-semibold tracking-wide ${
              validatorEnabled
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                : 'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'
            }`}
          >
            Validator {validatorEnabled ? 'ON' : 'OFF'}
          </Button>
          {validatorEnabled ? (
            <Button
              type='button'
              onClick={(): void => setFormatterEnabled(!formatterEnabled)}
              className={`h-7 rounded border px-2 text-[10px] font-semibold tracking-wide ${
                formatterEnabled
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                  : 'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'
              }`}
            >
              Formatter {formatterEnabled ? 'ON' : 'OFF'}
            </Button>
          ) : null}
        </div>
      </FormField>

      <FormField
        label='Icon'
        description='Icons are shown only after you click Choose Icon.'
      >
        <Card variant='subtle-compact' padding='sm' className='flex items-center gap-3 border-border bg-card/40'>
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
            <Button
              type='button'
              variant='outline'
              onClick={openIconLibrary}
            >
              Choose Icon
            </Button>
            {icon ? (
              <Button
                type='button'
                variant='ghost'
                onClick={(): void => setIcon(null)}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </Card>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-[12rem_minmax(0,1fr)] mt-3'>
          <FormField label='Icon Color' id='iconColorMode'>
            <SelectSimple size='sm'
              options={[
                { value: 'theme', label: 'Match Theme' },
                { value: 'custom', label: 'Custom Color' },
              ]}
              value={iconColorMode}
              onValueChange={(value: string): void =>
                setIconColorMode(value === 'custom' ? 'custom' : 'theme')
              }
              placeholder='Select color mode'
            />
          </FormField>
          {iconColorMode === 'custom' ? (
            <FormField label='Custom Icon Color' id='iconColor'>
              <div className='flex items-center gap-2'>
                <Input
                  id='iconColorPicker'
                  type='color'
                  value={resolvedIconColor}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setIconColor(event.target.value)}
                  className='h-10 w-14 cursor-pointer p-1'
                  aria-label='Pick icon color'
                />
                <Input
                  id='iconColor'
                  value={iconColor}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setIconColor(event.target.value)}
                  onBlur={(): void => setIconColor(normalizeIconColor(iconColor) || DEFAULT_ICON_COLOR)}
                  placeholder='#60a5fa'
                  className='font-mono uppercase'
                />
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
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <FormField label='SKU' id='sku'>
          <Input
            id='sku'
            value={sku}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSku(e.target.value)}
            placeholder='Product SKU'
          />
        </FormField>
        <FormField label='Product Identifier'>
          <div className='flex gap-2'>
            <SelectSimple size='sm'
              options={[
                { value: 'ean', label: 'EAN' },
                { value: 'gtin', label: 'GTIN' },
                { value: 'asin', label: 'ASIN' },
              ]}
              value={identifierType}
              onValueChange={(value: string): void =>
                setIdentifierType(value as 'ean' | 'gtin' | 'asin')
              }
              placeholder='Select type'
              className='w-[100px]'
            />
            {identifierType === 'ean' ? (
              <Input
                id='ean'
                value={ean}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEan(e.target.value)}
                placeholder='Enter EAN'
              />
            ) : null}
            {identifierType === 'gtin' ? (
              <Input
                id='gtin'
                value={gtin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setGtin(e.target.value)}
                placeholder='Enter GTIN'
              />
            ) : null}
            {identifierType === 'asin' ? (
              <Input
                id='asin'
                value={asin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setAsin(e.target.value)}
                placeholder='Enter ASIN'
              />
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
          />
        </FormField>
        <FormField label='Length (cm)' id='sizeLength'>
          <Input
            id='sizeLength'
            type='number'
            step='0.01'
            value={sizeLength}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSizeLength(e.target.value)}
            placeholder='0.00'
          />
        </FormField>
        <FormField label='Width (cm)' id='sizeWidth'>
          <Input
            id='sizeWidth'
            type='number'
            step='0.01'
            value={sizeWidth}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSizeWidth(e.target.value)}
            placeholder='0.00'
          />
        </FormField>
        <FormField label='Height (cm)' id='length'>
          <Input
            id='length'
            type='number'
            step='0.01'
            value={length}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setLength(e.target.value)}
            placeholder='0.00'
          />
        </FormField>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <FormField label='Name (English)' id='nameEn'>
          <Input
            id='nameEn'
            value={nameEn}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameEn(e.target.value)}
            placeholder='Product name'
          />
        </FormField>
        <FormField label='Name (Polish)' id='namePl'>
          <Input
            id='namePl'
            value={namePl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNamePl(e.target.value)}
            placeholder='Nazwa produktu'
          />
        </FormField>
        <FormField label='Name (German)' id='nameDe'>
          <Input
            id='nameDe'
            value={nameDe}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameDe(e.target.value)}
            placeholder='Produktname'
          />
        </FormField>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <FormField label='Description (English)' id='descEn'>
          <Textarea
            id='descEn'
            value={descEn}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescEn(e.target.value)}
            placeholder='Product description'
            rows={3}
          />
        </FormField>
        <FormField label='Description (Polish)' id='descPl'>
          <Textarea
            id='descPl'
            value={descPl}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescPl(e.target.value)}
            placeholder='Opis produktu'
            rows={3}
          />
        </FormField>
        <FormField label='Description (German)' id='descDe'>
          <Textarea
            id='descDe'
            value={descDe}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescDe(e.target.value)}
            placeholder='Produktbeschreibung'
            rows={3}
          />
        </FormField>
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
          />
        </FormField>
        <FormField label='Stock' id='stock'>
          <Input
            id='stock'
            type='number'
            value={stock}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setStock(e.target.value)}
            placeholder='0'
          />
        </FormField>
      </div>

      <FormField label='Supplier Name' id='supplierName'>
        <Input
          id='supplierName'
          value={supplierName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSupplierName(e.target.value)}
          placeholder='Supplier name'
        />
      </FormField>

      <FormField label='Supplier Link' id='supplierLink'>
        <Input
          id='supplierLink'
          value={supplierLink}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSupplierLink(e.target.value)}
          placeholder='https://...'
        />
      </FormField>

      <FormField label='Price Comment' id='priceComment'>
        <Input
          id='priceComment'
          value={priceComment}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPriceComment(e.target.value)}
          placeholder='Additional price information'
        />
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setBaseProductId(e.target.value)}
          placeholder='Imported from Base.com'
        />
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
                selectedCatalogIds.length > 0
                  ? 'Select category'
                  : 'Select a catalog first'
              }
            />
          </FormSection>
        ) : null}

        {tags.length > 0 ? (
          <FormSection title='Tags' className='p-4'>
            <TagMultiSelectField
              disabled={selectedCatalogIds.length === 0}
              placeholder={
                selectedCatalogIds.length > 0
                  ? 'Select tags'
                  : 'Select a catalog first'
              }
            />
          </FormSection>
        ) : null}

        <FormSection className='p-4'>
          <ProducerMultiSelectField />
        </FormSection>

        {selectedCatalogIds.length > 0 ? (
          <FormSection title='Price Group Information' variant='subtle' className='bg-blue-950/20 border-blue-900/50 p-4'>
            <p className='text-sm text-blue-300/70'>
              Products created from this draft will automatically use the default price group from
              the selected catalog(s). Price groups are configured per catalog and cannot be manually
              overridden in drafts.
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

  const getParameterLabel = (parameter: ProductParameter): string =>
    parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';

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
        <EmptyState
          title='Loading parameters...'
          variant='compact'
          className='border-dashed border-border/60 py-8'
        />
      ) : parameters.length === 0 ? (
        <EmptyState
          title='No parameters'
          description='No parameters available for the selected catalog(s).'
          variant='compact'
          className='border-dashed border-border/60 py-8'
        />
      ) : parameterValues.length === 0 ? (
        <EmptyState
          title='No values'
          description='Add your first parameter to start defining defaults.'
          variant='compact'
          className='border-dashed border-border/60 py-8'
        />
      ) : (
        <div className='space-y-3'>
          {parameterValues.map((entry: ProductParameterValue, index: number): React.JSX.Element => {
            const availableOptions: ProductParameter[] = parameters.filter(
              (parameter: ProductParameter): boolean =>
                !selectedParameterIds.includes(parameter.id) ||
                parameter.id === entry.parameterId
            );
            return (
              <Card
                key={`${entry.parameterId || 'new'}-${index}`}
                variant='subtle-compact'
                padding='sm'
                className='flex flex-col gap-3 border-border bg-card/60 md:flex-row md:items-center'
              >
                <div className='w-full md:w-64'>
                  <SelectSimple size='sm'
                    options={availableOptions.map((parameter: ProductParameter) => ({
                      value: parameter.id,
                      label: getParameterLabel(parameter),
                    }))}
                    value={entry.parameterId}
                    onValueChange={(value: string): void => updateParameterId(index, value)}
                    placeholder='Select parameter'
                  />
                </div>
                <div className='flex-1'>
                  <Input
                    value={entry.value ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      updateParameterValue(index, event.target.value)
                    }
                    placeholder='Value'
                    disabled={!entry.parameterId}
                  />
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
