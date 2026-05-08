'use client';

import React from 'react';

import { DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL } from '@/shared/lib/products/constants';
import { Button } from '@/shared/ui/button';
import { FormActions } from '@/shared/ui/FormActions';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Separator } from '@/shared/ui/separator';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';

import {
  SEQUENCE_GENERATION_MODE_OPTIONS,
  type ProductImageRoutingSettingsController,
  type ProductImageServingSettingsController,
  type ProductStudioSettingsController,
} from './ProductImageRoutingSettings.controller';
import { ProductFileStorageSourceSettings } from './ProductFileStorageSourceSettings';

function ImageStudioProjectSection({
  controller,
}: {
  controller: ProductStudioSettingsController;
}): React.JSX.Element {
  const placeholder = controller.studioProjectsLoading
    ? 'Loading Image Studio projects...'
    : 'Select Image Studio project';

  return (
    <FormSection
      title='Image Studio Connection'
      description='Choose the default Image Studio project for products, then open Studio to continue.'
    >
      <div className='space-y-4'>
        <FormField
          id='productStudioDefaultProject'
          label='Default Image Studio Project'
          description='Used as the default project binding in product workflows.'
        >
          <SelectSimple
            size='sm'
            value={controller.selectedStudioProject}
            onValueChange={controller.setSelectedStudioProject}
            options={controller.studioProjectOptions}
            placeholder={placeholder}
            disabled={controller.studioProjectsLoading || controller.updateStudioProjectPending}
            triggerClassName='h-9'
            ariaLabel='Default Image Studio project'
            title={placeholder}
          />
        </FormField>
        <FormActions
          onSave={controller.handleSaveStudioProject}
          saveText='Save Project Binding'
          isDisabled={
            controller.updateStudioProjectPending ||
            controller.studioProjectsLoading ||
            !controller.isStudioProjectDirty
          }
          isSaving={controller.updateStudioProjectPending}
          className='justify-start'
        >
          <Button
            size='sm'
            type='button'
            variant='outline'
            onClick={controller.handleStartStudioConnection}
            disabled={controller.studioProjectsLoading}
          >
            {controller.normalizedSelectedStudioProject.length > 0
              ? 'Start Image Studio Connection'
              : 'Open Image Studio Projects'}
          </Button>
        </FormActions>
      </div>
    </FormSection>
  );
}

function SequenceGenerationModeSection({
  controller,
}: {
  controller: ProductStudioSettingsController;
}): React.JSX.Element {
  return (
    <FormSection
      title='Image Studio Sequence Mode'
      description='Choose whether Product Studio runs sequencing in Image Studio runtime or delegates full sequencing to the AI model.'
    >
      <div className='space-y-4'>
        <FormField
          id='productStudioSequenceGenerationMode'
          label='Generation + Sequencing Mode'
          description='If model-native full sequencing is selected but unsupported by the current model, Product Studio falls back to Image Studio sequencing and shows a warning.'
        >
          <SelectSimple
            size='sm'
            value={controller.sequenceGenerationMode}
            onValueChange={controller.setSequenceGenerationMode}
            options={SEQUENCE_GENERATION_MODE_OPTIONS}
            disabled={controller.updateSequenceGenerationModePending}
            triggerClassName='h-9'
            ariaLabel='Product Studio sequence generation mode'
            title='Generation + Sequencing Mode'
          />
        </FormField>
        <FormActions
          onSave={controller.handleSaveSequenceGenerationMode}
          saveText='Save Sequence Mode'
          isDisabled={
            controller.updateSequenceGenerationModePending ||
            !controller.isSequenceGenerationModeDirty
          }
          isSaving={controller.updateSequenceGenerationModePending}
          className='justify-start'
        />
      </div>
    </FormSection>
  );
}

function AddProductImageRouteField({
  controller,
}: {
  controller: ProductImageServingSettingsController;
}): React.JSX.Element {
  return (
    <FormField
      label='Add Product Image Route'
      description='Add multiple image routes and choose one default route used by Product List and modals.'
    >
      <div className='flex items-center gap-2'>
        <Input
          id='productImageRoute'
          value={controller.newRoute}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            controller.setNewRoute(event.target.value);
          }}
          placeholder={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
            if (event.key === 'Enter') {
              event.preventDefault();
              controller.handleAddRoute();
            }
          }}
          aria-label={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL}
          title={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL}
        />
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={controller.handleAddRoute}
          disabled={controller.updateSettingsBulkPending}
        >
          Add
        </Button>
      </div>
    </FormField>
  );
}

const IMAGE_SERVING_SOURCE_OPTIONS = [
  { value: 'fastcomet', label: 'FastComet (sparksofsindri.com)' },
  { value: 'local', label: 'Local drive' },
] as const;

function ProductImageServingModeField({
  controller,
}: {
  controller: ProductImageServingSettingsController;
}): React.JSX.Element {
  return (
    <FormField
      label='Serve Product Images From'
      description='Switch the image base used for product previews, lists, and modals.'
    >
      <SelectSimple
        size='sm'
        value={controller.servingMode}
        onValueChange={(value: string): void => {
          controller.handleSelectServingMode(value as 'fastcomet' | 'local');
        }}
        options={IMAGE_SERVING_SOURCE_OPTIONS}
        placeholder='Select image source'
        disabled={controller.updateSettingsBulkPending}
        triggerClassName='h-9 w-64'
        ariaLabel='Product image serving source'
        title='Product image serving source'
      />
    </FormField>
  );
}

function ProductImageRouteList({
  controller,
}: {
  controller: ProductImageServingSettingsController;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <FormField label='Available Routes'>
        <RadioGroup
          value={controller.defaultRoute}
          onValueChange={controller.setDefaultRoute}
          disabled={controller.updateSettingsBulkPending}
        >
          <SimpleSettingsList
            items={controller.routes.map((route: string) => ({
              id: route,
              title: route,
              icon: <RadioGroupItem value={route} id={`route-${route}`} className='mt-1' />,
              original: route,
            }))}
            renderActions={(item) => (
              <Button
                size='xs'
                type='button'
                variant='ghost'
                className='text-red-400 hover:text-red-300 hover:bg-red-500/10'
                onClick={() => {
                  controller.handleRemoveRoute(item.original);
                }}
                disabled={controller.routes.length <= 1 || controller.updateSettingsBulkPending}
              >
                Remove
              </Button>
            )}
            emptyMessage='No routes available.'
          />
        </RadioGroup>
      </FormField>
    </div>
  );
}

function ProductImageRouteActions({
  controller,
}: {
  controller: ProductImageServingSettingsController;
}): React.JSX.Element {
  return (
    <FormActions
      onSave={controller.handleSave}
      saveText='Save Image Serving'
      isDisabled={controller.updateSettingsBulkPending}
      isSaving={controller.updateSettingsBulkPending}
      className='mt-6 justify-start'
    />
  );
}

export function ProductStudioSections({
  controller,
}: {
  controller: ProductStudioSettingsController;
}): React.JSX.Element {
  return (
    <div className='space-y-5'>
      <ImageStudioProjectSection controller={controller} />
      <SequenceGenerationModeSection controller={controller} />
    </div>
  );
}

export function ProductImageServingSections({
  controller,
}: {
  controller: ProductImageServingSettingsController;
}): React.JSX.Element {
  return (
    <div className='space-y-5'>
      <ProductFileStorageSourceSettings />
      <Separator className='bg-border/60' />
      <ProductImageServingModeField controller={controller} />
      <AddProductImageRouteField controller={controller} />
      <ProductImageRouteList controller={controller} />
      <ProductImageRouteActions controller={controller} />
    </div>
  );
}

export function ProductImageRouteSections({
  controller,
}: {
  controller: ProductImageRoutingSettingsController;
}): React.JSX.Element {
  return (
    <div className='space-y-5'>
      <ProductImageServingSections controller={controller} />
      <Separator className='bg-border/60' />
      <ProductStudioSections controller={controller} />
    </div>
  );
}
