'use client';

import { useRouter } from 'nextjs-toploader/app';

import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import { useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/toast';
import {
  useProductImageRouteActions,
  type ProductImageRouteActions,
} from './ProductImageRoutingSettings.route-actions';
import {
  useProductImageRoutesState,
  type ProductImageRoutesState,
} from './ProductImageRoutingSettings.route-state';
import {
  useProductStudioSequenceGenerationActions,
  useProductStudioSequenceGenerationState,
  type ProductStudioSequenceGenerationActions,
  type ProductStudioSequenceGenerationState,
} from './ProductImageRoutingSettings.sequence-settings';
import {
  useProductImageStudioProjectActions,
  useProductImageStudioProjectState,
  type ProductImageStudioProjectActions,
  type ProductImageStudioProjectState,
} from './ProductImageRoutingSettings.studio-settings';

export { SEQUENCE_GENERATION_MODE_OPTIONS } from './ProductImageRoutingSettings.sequence-settings';

export type ProductImageServingSettingsController = ProductImageRoutesState &
  ProductImageRouteActions & {
    updateSettingsBulkPending: boolean;
  };

export type ProductStudioSettingsController = ProductImageStudioProjectState &
  ProductImageStudioProjectActions &
  ProductStudioSequenceGenerationState &
  ProductStudioSequenceGenerationActions & {
    updateSequenceGenerationModePending: boolean;
    updateStudioProjectPending: boolean;
  };

export type ProductImageRoutingSettingsController = ProductImageServingSettingsController &
  ProductStudioSettingsController;

export const useProductImageServingSettingsController =
  (): ProductImageServingSettingsController => {
    const { toast } = useToast();
    const {
      imageExternalBaseUrl: persistedBaseUrlRaw,
      imageExternalRoutesRaw: persistedRoutesRaw,
    } = useProductSettings();
    const updateSettingsBulk = useUpdateSettingsBulk();
    const routeState = useProductImageRoutesState({ persistedBaseUrlRaw, persistedRoutesRaw });
    const routeActions = useProductImageRouteActions({
      ...routeState,
      toast,
      updateSettingsBulk,
    });

    return {
      ...routeState,
      ...routeActions,
      updateSettingsBulkPending: updateSettingsBulk.isPending,
    };
  };

export const useProductStudioSettingsController = (): ProductStudioSettingsController => {
  const router = useRouter();
  const { toast } = useToast();
  const {
    defaultProjectId: persistedStudioProject,
    sequenceGenerationMode: persistedSequenceGenerationMode,
    refetch: refetchSettings,
  } = useProductSettings();
  const updateStudioProjectSetting = useUpdateSetting();
  const updateSequenceGenerationModeSetting = useUpdateSetting();
  const studioProjectState = useProductImageStudioProjectState(persistedStudioProject);
  const sequenceGenerationState = useProductStudioSequenceGenerationState(
    persistedSequenceGenerationMode
  );
  const studioProjectActions = useProductImageStudioProjectActions({
    ...studioProjectState,
    refetchSettings,
    router,
    toast,
    updateStudioProjectSetting,
  });
  const sequenceGenerationActions = useProductStudioSequenceGenerationActions({
    ...sequenceGenerationState,
    refetchSettings,
    toast,
    updateSequenceGenerationModeSetting,
  });

  return {
    ...studioProjectState,
    ...studioProjectActions,
    ...sequenceGenerationState,
    ...sequenceGenerationActions,
    updateSequenceGenerationModePending: updateSequenceGenerationModeSetting.isPending,
    updateStudioProjectPending: updateStudioProjectSetting.isPending,
  };
};

export const useProductImageRoutingSettingsController =
  (): ProductImageRoutingSettingsController => {
    const imageServingController = useProductImageServingSettingsController();
    const studioController = useProductStudioSettingsController();

    return {
      ...imageServingController,
      ...studioController,
    };
  };
