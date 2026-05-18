import type {
  BatchCaptureStateControls,
  SocialImageAddonsMutations,
  SocialImageAddonsResult,
} from './useSocialImageAddons.types';

export const buildSocialImageAddonsResult = ({
  captureAppearanceMode,
  handleBatchCapture,
  handleCreateAddon,
  handleRetryFailedPresetBatchCaptureJob,
  mutations,
  readBatchCaptureJob,
  runBatchCapture,
  startBatchCapture,
  state,
}: Pick<SocialImageAddonsResult, 'captureAppearanceMode'> & {
  handleBatchCapture: SocialImageAddonsResult['handleBatchCapture'];
  handleCreateAddon: SocialImageAddonsResult['handleCreateAddon'];
  handleRetryFailedPresetBatchCaptureJob: SocialImageAddonsResult['handleRetryFailedPresetBatchCaptureJob'];
  mutations: SocialImageAddonsMutations;
  readBatchCaptureJob: SocialImageAddonsResult['readBatchCaptureJob'];
  runBatchCapture: SocialImageAddonsResult['runBatchCapture'];
  startBatchCapture: SocialImageAddonsResult['startBatchCapture'];
  state: BatchCaptureStateControls;
}): SocialImageAddonsResult => ({
  createAddonMutation: mutations.createAddonMutation,
  batchCaptureMutation: mutations.batchCaptureMutation,
  startBatchCaptureMutation: mutations.startBatchCaptureMutation,
  batchCaptureResult: state.batchCaptureResult,
  batchCapturePending: state.batchCapturePending,
  batchCaptureJob: state.batchCaptureJob,
  batchCaptureMessage: state.batchCaptureMessage,
  batchCaptureErrorMessage: state.batchCaptureErrorMessage,
  captureAppearanceMode,
  setBatchCaptureResult: state.setBatchCaptureResult,
  runBatchCapture,
  startBatchCapture,
  readBatchCaptureJob,
  handleCreateAddon,
  handleBatchCapture,
  handleRetryFailedPresetBatchCaptureJob,
});
