'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, startTransition } from 'react';

import { useStudioProjects } from '@/features/ai/public';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { type ProductStudioSequenceGenerationMode } from '@/shared/contracts/products';
import { useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
  PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY,
} from '@/shared/lib/products/constants';
import { Button } from '@/shared/ui/button';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { FormActions } from '@/shared/ui/FormActions';
import { Input } from '@/shared/ui/input';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Separator } from '@/shared/ui/separator';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';
import { useToast } from '@/shared/ui/toast';

import { normalizeProductImageExternalBaseUrl } from '@/shared/utils/image-routing';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const SEQUENCE_GENERATION_MODE_OPTIONS: Array<LabeledOptionDto<ProductStudioSequenceGenerationMode>> =
  [
    {
      value: 'auto',
      label: 'Auto (Best Route)',
    },
    {
      value: 'studio_prompt_then_sequence',
      label: 'Prompt then Image Studio Sequencer',
    },
    {
      value: 'studio_native_sequencer_prior_generation',
      label: 'Native Sequencer (Prior Generation)',
    },
    {
      value: 'model_full_sequence',
      label: 'Model Full Sequence (if supported)',
    },
  ];

const dedupeRoutes = (routes: string[]): string[] => {
  const next: string[] = [];
  routes.forEach((route) => {
    if (!route) return;
    if (next.includes(route)) return;
    next.push(route);
  });
  return next;
};

const parseRoutesSetting = (
  rawValue: string | null | undefined,
  fallbackRoute: string
): string[] => {
  if (!rawValue?.trim()) return [fallbackRoute];
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [fallbackRoute];
    const normalized = dedupeRoutes(
      parsed
        .map((entry: unknown) =>
          typeof entry === 'string' ? normalizeProductImageExternalBaseUrl(entry) : ''
        )
        .filter((entry: string) => entry.length > 0)
    );
    return normalized.length > 0 ? normalized : [fallbackRoute];
  } catch (error) {
    logClientError(error);
    return [fallbackRoute];
  }
};

const STUDIO_PROJECT_NONE = '__product_studio_not_connected__';

export function ProductImageRoutingSettings(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const {
    imageExternalBaseUrl: persistedBaseUrlRaw,
    imageExternalRoutesRaw: persistedRoutesRaw,
    defaultProjectId: persistedStudioProject,
    sequenceGenerationMode: persistedSequenceGenerationMode,
    refetch: refetchSettings,
  } = useProductSettings();
  const persistedBaseUrl =
    normalizeProductImageExternalBaseUrl(persistedBaseUrlRaw) ||
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const studioProjectsQuery = useStudioProjects();
  const updateStudioProjectSetting = useUpdateSetting();
  const updateSequenceGenerationModeSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const [routes, setRoutes] = useState<string[]>(
    parseRoutesSetting(persistedRoutesRaw, persistedBaseUrl)
  );
  const [defaultRoute, setDefaultRoute] = useState<string>(persistedBaseUrl);
  const [newRoute, setNewRoute] = useState<string>('');
  const [selectedStudioProject, setSelectedStudioProject] = useState<string>(
    persistedStudioProject || STUDIO_PROJECT_NONE
  );
  const [sequenceGenerationMode, setSequenceGenerationMode] =
    useState<ProductStudioSequenceGenerationMode>(persistedSequenceGenerationMode);

  const studioProjectOptions = useMemo(
    () => [
      { value: STUDIO_PROJECT_NONE, label: 'Not Connected' },
      ...(studioProjectsQuery.data ?? []).map((project) => ({
        value: project.id,
        label: project.id,
      })),
    ],
    [studioProjectsQuery.data]
  );
  const normalizedSelectedStudioProject =
    selectedStudioProject === STUDIO_PROJECT_NONE ? '' : selectedStudioProject.trim();
  const isStudioProjectDirty = normalizedSelectedStudioProject !== persistedStudioProject;
  const isSequenceGenerationModeDirty = sequenceGenerationMode !== persistedSequenceGenerationMode;

  useEffect(() => {
    const nextRoutes = parseRoutesSetting(persistedRoutesRaw, persistedBaseUrl);
    const ensuredRoutes = nextRoutes.includes(persistedBaseUrl)
      ? nextRoutes
      : dedupeRoutes([persistedBaseUrl, ...nextRoutes]);
    setRoutes(ensuredRoutes);
    setDefaultRoute(persistedBaseUrl);
  }, [persistedBaseUrl, persistedRoutesRaw]);

  useEffect(() => {
    setSelectedStudioProject(persistedStudioProject || STUDIO_PROJECT_NONE);
  }, [persistedStudioProject]);

  useEffect(() => {
    setSequenceGenerationMode(persistedSequenceGenerationMode);
  }, [persistedSequenceGenerationMode]);

  const handleAddRoute = (): void => {
    const normalized = normalizeProductImageExternalBaseUrl(newRoute);
    if (!normalized) {
      toast('Enter a valid route URL.', { variant: 'warning' });
      return;
    }
    setRoutes((prev: string[]) =>
      prev.includes(normalized) ? prev : dedupeRoutes([...prev, normalized])
    );
    setNewRoute('');
  };

  const handleRemoveRoute = (route: string): void => {
    setRoutes((prev: string[]) => {
      const next = prev.filter((entry: string) => entry !== route);
      if (next.length > 0) {
        if (defaultRoute === route) {
          setDefaultRoute(next[0] ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL);
        }
        return next;
      }
      const fallback = DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
      setDefaultRoute(fallback);
      return [fallback];
    });
  };

  const handleSave = (): void => {
    const normalizedRoutes = dedupeRoutes(
      routes
        .map((route: string) => normalizeProductImageExternalBaseUrl(route))
        .filter((route: string) => route.length > 0)
    );
    const normalizedDefault =
      normalizeProductImageExternalBaseUrl(defaultRoute) ||
      normalizedRoutes[0] ||
      DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
    const ensuredRoutes = normalizedRoutes.includes(normalizedDefault)
      ? normalizedRoutes
      : dedupeRoutes([normalizedDefault, ...normalizedRoutes]);
    const routesPayload =
      ensuredRoutes.length > 0 ? ensuredRoutes : [DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL];
    const defaultPayload = routesPayload.includes(normalizedDefault)
      ? normalizedDefault
      : (routesPayload[0] ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL);

    updateSettingsBulk.mutate(
      [
        {
          key: PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
          value: defaultPayload,
        },
        {
          key: PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
          value: JSON.stringify(routesPayload),
        },
      ],
      {
        onSuccess: () => {
          setRoutes(routesPayload);
          setDefaultRoute(defaultPayload);
          toast('Image routes saved.', { variant: 'success' });
        },
        onError: () => {
          toast('Failed to save image routes.', { variant: 'error' });
        },
      }
    );
  };

  const handleUseLocalhost = (): void => {
    const localhostRoute = DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
    setRoutes((prev: string[]) =>
      prev.includes(localhostRoute) ? prev : dedupeRoutes([localhostRoute, ...prev])
    );
    setDefaultRoute(localhostRoute);
  };

  const handleSaveStudioProject = (): void => {
    updateStudioProjectSetting.mutate(
      {
        key: PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
        value: normalizedSelectedStudioProject,
      },
      {
        onSuccess: () => {
          refetchSettings();
          toast('Image Studio default project saved.', { variant: 'success' });
        },
        onError: () => {
          toast('Failed to save Image Studio default project.', { variant: 'error' });
        },
      }
    );
  };

  const handleSaveSequenceGenerationMode = (): void => {
    updateSequenceGenerationModeSetting.mutate(
      {
        key: PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY,
        value: sequenceGenerationMode,
      },
      {
        onSuccess: () => {
          refetchSettings();
          toast('Image Studio sequence generation mode saved.', {
            variant: 'success',
          });
        },
        onError: () => {
          toast('Failed to save Image Studio sequence generation mode.', {
            variant: 'error',
          });
        },
      }
    );
  };

  const handleStartStudioConnection = (): void => {
    const params = new URLSearchParams();
    if (normalizedSelectedStudioProject) {
      params.set('tab', 'studio');
      params.set('projectId', normalizedSelectedStudioProject);
    } else {
      params.set('tab', 'projects');
    }
    startTransition(() => { router.push(`/admin/image-studio?${params.toString()}`); });
  };

  return (
    <div className='space-y-5'>
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
              value={selectedStudioProject}
              onValueChange={setSelectedStudioProject}
              options={studioProjectOptions}
              placeholder={
                studioProjectsQuery.isLoading
                  ? 'Loading Image Studio projects...'
                  : 'Select Image Studio project'
              }
              disabled={studioProjectsQuery.isLoading || updateStudioProjectSetting.isPending}
              triggerClassName='h-9'
              ariaLabel='Default Image Studio project'
             title={studioProjectsQuery.isLoading
                  ? 'Loading Image Studio projects...'
                  : 'Select Image Studio project'}/>
          </FormField>
          <FormActions
            onSave={handleSaveStudioProject}
            saveText='Save Project Binding'
            isDisabled={
              updateStudioProjectSetting.isPending ||
              studioProjectsQuery.isLoading ||
              !isStudioProjectDirty
            }
            isSaving={updateStudioProjectSetting.isPending}
            className='justify-start'
          >
            <Button
              size='sm'
              type='button'
              variant='outline'
              onClick={handleStartStudioConnection}
              disabled={studioProjectsQuery.isLoading}
            >
              {normalizedSelectedStudioProject
                ? 'Start Image Studio Connection'
                : 'Open Image Studio Projects'}
            </Button>
          </FormActions>
        </div>
      </FormSection>

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
              value={sequenceGenerationMode}
              onValueChange={(value: string) => {
                if (
                  value !== 'studio_prompt_then_sequence' &&
                  value !== 'model_full_sequence' &&
                  value !== 'studio_native_sequencer_prior_generation' &&
                  value !== 'auto'
                ) {
                  return;
                }
                setSequenceGenerationMode(value);
              }}
              options={SEQUENCE_GENERATION_MODE_OPTIONS}
              disabled={updateSequenceGenerationModeSetting.isPending}
              triggerClassName='h-9'
              ariaLabel='Product Studio sequence generation mode'
             title='Generation + Sequencing Mode'/>
          </FormField>
          <FormActions
            onSave={handleSaveSequenceGenerationMode}
            saveText='Save Sequence Mode'
            isDisabled={
              updateSequenceGenerationModeSetting.isPending || !isSequenceGenerationModeDirty
            }
            isSaving={updateSequenceGenerationModeSetting.isPending}
            className='justify-start'
          />
        </div>
      </FormSection>

      <Separator className='bg-border/60' />

      <FormField
        label='Add Product Image Route'
        description='Add multiple image routes and choose one default route used by Product List and modals.'
      >
        <div className='flex items-center gap-2'>
          <Input
            id='productImageRoute'
            value={newRoute}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setNewRoute(event.target.value)
            }
            placeholder={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddRoute();
              }
            }}
           aria-label={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL} title={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL}/>
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={handleAddRoute}
            disabled={updateSettingsBulk.isPending}
          >
            Add
          </Button>
        </div>
      </FormField>

      <div className='space-y-2'>
        <FormField label='Available Routes'>
          <RadioGroup
            value={defaultRoute}
            onValueChange={setDefaultRoute}
            disabled={updateSettingsBulk.isPending}
          >
            <SimpleSettingsList
              items={routes.map((route: string) => ({
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
                  onClick={() => handleRemoveRoute(item.original)}
                  disabled={routes.length <= 1 || updateSettingsBulk.isPending}
                >
                  Remove
                </Button>
              )}
              emptyMessage='No routes available.'
            />
          </RadioGroup>
        </FormField>
      </div>

      <FormActions
        onSave={handleSave}
        saveText='Save'
        isDisabled={updateSettingsBulk.isPending}
        isSaving={updateSettingsBulk.isPending}
        className='mt-6 justify-start'
      >
        <Button
          size='sm'
          type='button'
          variant='outline'
          onClick={handleUseLocalhost}
          disabled={updateSettingsBulk.isPending}
        >
          Use localhost:3000
        </Button>
      </FormActions>
    </div>
  );
}
