'use client';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type Asset3DPickerModalRuntimeValue = {
  onSelectAsset: (assetId: string) => void;
};

const {
  Context: Asset3DPickerModalRuntimeContext,
  useStrictContext: useAsset3DPickerModalRuntime,
} = createStrictContext<Asset3DPickerModalRuntimeValue>({
  hookName: 'useAsset3DPickerModalRuntime',
  providerName: 'Asset3DPickerModalRuntimeProvider',
  displayName: 'Asset3DPickerModalRuntimeContext',
});

export { Asset3DPickerModalRuntimeContext, useAsset3DPickerModalRuntime };
