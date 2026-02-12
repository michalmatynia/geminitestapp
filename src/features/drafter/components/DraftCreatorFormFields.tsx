'use client';

import { useMemo } from 'react';

import { ICON_LIBRARY_MAP } from '@/features/icons';
import { CatalogMultiSelectField } from '@/features/products/components/form/CatalogMultiSelectField';
import { CategorySingleSelectField } from '@/features/products/components/form/CategorySingleSelectField';
import { ProducerMultiSelectField } from '@/features/products/components/form/ProducerMultiSelectField';
import { ProductMetadataFieldProvider } from '@/features/products/components/form/ProductMetadataFieldContext';
import { TagMultiSelectField } from '@/features/products/components/form/TagMultiSelectField';
import type { ProductParameter, ProductParameterValue } from '@/features/products/types';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/shared/ui';

import { useDraftCreatorFormContext } from './DraftCreatorFormContext';

const DEFAULT_ICON_COLOR = '#60a5fa';
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const normalizeIconColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase();
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
    resolvedIconColor,
    openIconLibrary,
  } = useDraftCreatorFormContext();
  const SelectedIcon = icon ? ICON_LIBRARY_MAP[icon] : null;

  return (
    <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
      <h3 className='text-sm font-semibold text-white'>Draft Information</h3>

      <div className='space-y-2'>
        <Label htmlFor='name'>
          Draft Name <span className='text-red-500'>*</span>
        </Label>
        <Input
          id='name'
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
          placeholder='e.g., Standard Product Template'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='description'>Draft Description</Label>
        <Textarea
          id='description'
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescription(e.target.value)}
          placeholder='Describe what this draft is for...'
          rows={2}
        />
      </div>

      <div className='space-y-2'>
        <Label>Validation Controls</Label>
        <div className='rounded-md border border-border bg-gray-900/70 p-3'>
          <p className='text-xs text-gray-400'>
            `Validator` enables all validation rules. `Formatter` auto-applies only rules configured for formatter mode.
          </p>
          <div className='mt-3 flex flex-wrap items-center gap-2'>
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
        </div>
      </div>

      <div className='space-y-2'>
        <Label>Icon</Label>
        <div className='flex items-center gap-3 rounded-md border border-border bg-gray-900 px-3 py-2'>
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
        </div>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-[12rem_minmax(0,1fr)]'>
          <div className='space-y-2'>
            <Label htmlFor='iconColorMode'>Icon Color</Label>
            <Select
              value={iconColorMode}
              onValueChange={(value: string): void =>
                setIconColorMode(value === 'custom' ? 'custom' : 'theme')
              }
            >
              <SelectTrigger id='iconColorMode'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='theme'>Match Theme</SelectItem>
                <SelectItem value='custom'>Custom Color</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {iconColorMode === 'custom' ? (
            <div className='space-y-2'>
              <Label htmlFor='iconColor'>Custom Icon Color</Label>
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
            </div>
          ) : null}
        </div>
        <p className='text-xs text-gray-500'>
          Icons are shown only after you click Choose Icon.
        </p>
      </div>
    </div>
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
  } = useDraftCreatorFormContext();

  return (
    <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
      <h3 className='text-sm font-semibold text-white'>Default Product Values</h3>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='sku'>SKU</Label>
          <Input
            id='sku'
            value={sku}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSku(e.target.value)}
            placeholder='Product SKU'
          />
        </div>
        <div className='space-y-2'>
          <Label>Product Identifier</Label>
          <div className='flex gap-2'>
            <Select
              value={identifierType}
              onValueChange={(value: string): void =>
                setIdentifierType(value as 'ean' | 'gtin' | 'asin')
              }
            >
              <SelectTrigger className='w-[100px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ean'>EAN</SelectItem>
                <SelectItem value='gtin'>GTIN</SelectItem>
                <SelectItem value='asin'>ASIN</SelectItem>
              </SelectContent>
            </Select>
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
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='weight'>Weight (kg)</Label>
          <Input
            id='weight'
            type='number'
            step='0.01'
            value={weight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setWeight(e.target.value)}
            placeholder='0.00'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='sizeLength'>Length (cm)</Label>
          <Input
            id='sizeLength'
            type='number'
            step='0.01'
            value={sizeLength}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSizeLength(e.target.value)}
            placeholder='0.00'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='sizeWidth'>Width (cm)</Label>
          <Input
            id='sizeWidth'
            type='number'
            step='0.01'
            value={sizeWidth}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSizeWidth(e.target.value)}
            placeholder='0.00'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='length'>Height (cm)</Label>
          <Input
            id='length'
            type='number'
            step='0.01'
            value={length}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setLength(e.target.value)}
            placeholder='0.00'
          />
        </div>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='nameEn'>Name (English)</Label>
          <Input
            id='nameEn'
            value={nameEn}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameEn(e.target.value)}
            placeholder='Product name'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='namePl'>Name (Polish)</Label>
          <Input
            id='namePl'
            value={namePl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNamePl(e.target.value)}
            placeholder='Nazwa produktu'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='nameDe'>Name (German)</Label>
          <Input
            id='nameDe'
            value={nameDe}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameDe(e.target.value)}
            placeholder='Produktname'
          />
        </div>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='descEn'>Description (English)</Label>
          <Textarea
            id='descEn'
            value={descEn}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescEn(e.target.value)}
            placeholder='Product description'
            rows={3}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='descPl'>Description (Polish)</Label>
          <Textarea
            id='descPl'
            value={descPl}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescPl(e.target.value)}
            placeholder='Opis produktu'
            rows={3}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='descDe'>Description (German)</Label>
          <Textarea
            id='descDe'
            value={descDe}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescDe(e.target.value)}
            placeholder='Produktbeschreibung'
            rows={3}
          />
        </div>
      </div>
    </div>
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
  } = useDraftCreatorFormContext();

  return (
    <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
      <h3 className='text-sm font-semibold text-white'>Pricing & Supplier Information</h3>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='price'>Base Price</Label>
          <Input
            id='price'
            type='number'
            step='0.01'
            value={price}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPrice(e.target.value)}
            placeholder='0.00'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='stock'>Stock</Label>
          <Input
            id='stock'
            type='number'
            value={stock}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setStock(e.target.value)}
            placeholder='0'
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='supplierName'>Supplier Name</Label>
        <Input
          id='supplierName'
          value={supplierName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSupplierName(e.target.value)}
          placeholder='Supplier name'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='supplierLink'>Supplier Link</Label>
        <Input
          id='supplierLink'
          value={supplierLink}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSupplierLink(e.target.value)}
          placeholder='https://...'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='priceComment'>Price Comment</Label>
        <Input
          id='priceComment'
          value={priceComment}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPriceComment(e.target.value)}
          placeholder='Additional price information'
        />
      </div>
    </div>
  );
}

export function DraftCreatorImportInfoSection(): React.JSX.Element {
  const { baseProductId, setBaseProductId } = useDraftCreatorFormContext();

  return (
    <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
      <h3 className='text-sm font-semibold text-white'>Import Information</h3>
      <div className='space-y-2'>
        <Label htmlFor='baseProductId'>Base Product ID</Label>
        <Input
          id='baseProductId'
          value={baseProductId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setBaseProductId(e.target.value)}
          placeholder='Imported from Base.com'
        />
        <p className='text-xs text-gray-400'>
          This ID is used for products imported from Base.com
        </p>
      </div>
    </div>
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
  } = useDraftCreatorFormContext();

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

        <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
          <h3 className='text-sm font-semibold text-white'>Catalogs</h3>
          <CatalogMultiSelectField />
        </div>

        {categories.length > 0 ? (
          <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
            <h3 className='text-sm font-semibold text-white'>Categories</h3>
            <CategorySingleSelectField
              disabled={selectedCatalogIds.length === 0}
              placeholder={
                selectedCatalogIds.length > 0
                  ? 'Select category'
                  : 'Select a catalog first'
              }
            />
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
            <h3 className='text-sm font-semibold text-white'>Tags</h3>
            <TagMultiSelectField
              disabled={selectedCatalogIds.length === 0}
              placeholder={
                selectedCatalogIds.length > 0
                  ? 'Select tags'
                  : 'Select a catalog first'
              }
            />
          </div>
        ) : null}

        <div className='space-y-4 rounded-lg border border-border bg-card/50 p-4'>
          <ProducerMultiSelectField />
        </div>

        {selectedCatalogIds.length > 0 ? (
          <div className='rounded-lg border border-blue-900/50 bg-blue-950/20 p-4'>
            <h3 className='mb-2 text-sm font-semibold text-blue-400'>Price Group Information</h3>
            <p className='text-sm text-blue-300/70'>
              Products created from this draft will automatically use the default price group from
              the selected catalog(s). Price groups are configured per catalog and cannot be manually
              overridden in drafts.
            </p>
          </div>
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
  } = useDraftCreatorFormContext();

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
    <div className='rounded-lg border border-border bg-card/50 p-4 space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold text-white'>Parameters</h3>
          <p className='text-xs text-gray-400'>
            Set default parameter values for products created from this draft.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={addParameterValue}
          disabled={parametersLoading || parameters.length === 0}
        >
          Add parameter
        </Button>
      </div>

      {parametersLoading ? (
        <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
          Loading parameters...
        </div>
      ) : parameters.length === 0 ? (
        <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
          No parameters available for the selected catalog(s).
        </div>
      ) : parameterValues.length === 0 ? (
        <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
          Add your first parameter to start defining defaults.
        </div>
      ) : (
        <div className='space-y-3'>
          {parameterValues.map((entry: ProductParameterValue, index: number): React.JSX.Element => {
            const availableOptions: ProductParameter[] = parameters.filter(
              (parameter: ProductParameter): boolean =>
                !selectedParameterIds.includes(parameter.id) ||
                parameter.id === entry.parameterId
            );
            return (
              <div
                key={`${entry.parameterId || 'new'}-${index}`}
                className='flex flex-col gap-3 rounded-md border border-border bg-card/60 p-3 md:flex-row md:items-center'
              >
                <div className='w-full md:w-64'>
                  <Select
                    value={entry.parameterId}
                    onValueChange={(value: string): void => updateParameterId(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select parameter' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.map((parameter: ProductParameter): React.JSX.Element => (
                        <SelectItem key={parameter.id} value={parameter.id}>
                          {getParameterLabel(parameter)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex-1'>
                  <Input
                    value={entry.value}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
