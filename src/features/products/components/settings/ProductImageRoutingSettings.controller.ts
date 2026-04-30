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

export type ProductImageRoutingSettingsController = ProductImageRoutesState &
  ProductImageRouteActions &
  ProductImageStudioProjectState &
  ProductImageStudioProjectActions &
  ProductStudioSequenceGenerationState &
  ProductStudioSequenceGenerationActions & {
    updateSequenceGenerationModePending: boolean;
    updateSettingsBulkPending: boolean;
    updateStudioProjectPending: boolean;
  };

export const useProductImageRoutingSettingsController =
  (): ProductImageRoutingSettingsController => {
    const router = useRouter();
    const { toast } = useToast();
    const {
      imageExternalBaseUrl: persistedBaseUrlRaw,
      imageExternalRoutesRaw: persistedRoutesRaw,
      defaultProjectId: persistedStudioProject,
      sequenceGenerationMode: persistedSequenceGenerationMode,
      refetch: refetchSettings,
    } = useProductSettings();
    const updateStudioProjectSetting = useUpdateSetting();
    const updateSequenceGenerationModeSetting = useUpdateSetting();
    const updateSettingsBulk = useUpdateSettingsBulk();
    const routeState = useProductImageRoutesState({ persistedBaseUrlRaw, persistedRoutesRaw });
    const studioProjectState = useProductImageStudioProjectState(persistedStudioProject);
    const sequenceGenerationState = useProductStudioSequenceGenerationState(
      persistedSequenceGenerationMode
    );
    const routeActions = useProductImageRouteActions({
      ...routeState,
      toast,
      updateSettingsBulk,
    });
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
      ...routeState,
      ...routeActions,
      ...studioProjectState,
      ...studioProjectActions,
      ...sequenceGenerationState,
      ...sequenceGenerationActions,
      updateSequenceGenerationModePending: updateSequenceGenerationModeSetting.isPending,
      updateSettingsBulkPending: updateSettingsBulk.isPending,
      updateStudioProjectPending: updateStudioProjectSetting.isPending,
    };
  };
