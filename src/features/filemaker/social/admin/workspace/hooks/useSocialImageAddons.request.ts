import type {
  SocialPublishingCaptureAppearanceMode,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import { validateSocialPublishingProgrammableCaptureRoutes } from '@/features/filemaker/social/shared/social-playwright-capture';

import type {
  BatchCaptureOptions,
  BatchCapturePayload,
  BatchCaptureRequest,
  SocialImageAddonsDeps,
  ToastFn,
} from './useSocialImageAddons.types';

const hasOwn = (value: object | undefined, key: PropertyKey): boolean =>
  value !== undefined && Object.prototype.hasOwnProperty.call(value, key);

const throwBatchCaptureValidationError = (
  toast: ToastFn,
  message: string,
  variant: 'error' | 'warning'
): never => {
  toast(message, { variant });
  throw new Error(message);
};

const validateProgrammableRoutes = ({
  baseUrl,
  playwrightRoutes,
  toast,
}: {
  baseUrl: string;
  playwrightRoutes: SocialPublishingProgrammableCaptureRoute[];
  toast: ToastFn;
}): void => {
  const validation = validateSocialPublishingProgrammableCaptureRoutes(
    playwrightRoutes,
    baseUrl
  );
  if (validation.isValid === false && validation.firstIssue !== null) {
    throwBatchCaptureValidationError(toast, validation.firstIssue, 'warning');
  }
};

const requireBaseUrlForPresetCapture = ({
  baseUrl,
  presetIds,
  toast,
}: {
  baseUrl: string;
  presetIds: string[];
  toast: ToastFn;
}): void => {
  if (presetIds.length > 0 && baseUrl.length === 0) {
    throwBatchCaptureValidationError(toast, 'Base URL is required for batch capture', 'error');
  }
};

const requireBatchCaptureTarget = ({
  presetIds,
  routeCount,
  toast,
}: {
  presetIds: string[];
  routeCount: number;
  toast: ToastFn;
}): void => {
  if (presetIds.length === 0 && routeCount === 0) {
    throwBatchCaptureValidationError(
      toast,
      'Select at least one capture preset or programmable route',
      'warning'
    );
  }
};

const validateBatchCaptureRequest = ({
  baseUrl,
  playwrightRoutes,
  presetIds,
  toast,
}: {
  baseUrl: string;
  playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
  presetIds: string[];
  toast: ToastFn;
}): void => {
  const routeCount = playwrightRoutes?.length ?? 0;
  requireBaseUrlForPresetCapture({ baseUrl, presetIds, toast });
  requireBatchCaptureTarget({ presetIds, routeCount, toast });
  if (routeCount > 0) {
    validateProgrammableRoutes({ baseUrl, playwrightRoutes: playwrightRoutes ?? [], toast });
  }
};

const resolvePresetLimit = ({
  deps,
  options,
}: {
  deps: Pick<SocialImageAddonsDeps, 'batchCapturePresetLimit'>;
  options?: BatchCaptureOptions;
}): number | null => {
  if (hasOwn(options, 'presetLimit')) {
    return options?.presetLimit ?? null;
  }
  return deps.batchCapturePresetLimit;
};

const resolvePlaywrightRequestOptions = ({
  options,
  playwrightRoutes,
}: {
  options?: BatchCaptureOptions;
  playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
}): Partial<BatchCaptureRequest> => {
  const requestOptions: Partial<BatchCaptureRequest> = {};
  if (hasOwn(options, 'playwrightPersonaId')) {
    requestOptions.playwrightPersonaId = options?.playwrightPersonaId ?? null;
  }
  if (hasOwn(options, 'playwrightScript')) {
    requestOptions.playwrightScript = options?.playwrightScript;
  }
  if (hasOwn(options, 'playwrightRoutes')) {
    requestOptions.playwrightRoutes = playwrightRoutes;
  }
  return requestOptions;
};

export const resolveBatchCaptureRequest = ({
  deps,
  options,
  toast,
}: {
  deps: Pick<
    SocialImageAddonsDeps,
    'batchCaptureBaseUrl' | 'batchCapturePresetIds' | 'batchCapturePresetLimit'
  >;
  options?: BatchCaptureOptions;
  toast: ToastFn;
}): BatchCaptureRequest => {
  const baseUrl = (options?.baseUrl ?? deps.batchCaptureBaseUrl).trim();
  const presetIds = options?.presetIds ?? deps.batchCapturePresetIds;
  const playwrightRoutes = options?.playwrightRoutes;
  validateBatchCaptureRequest({ baseUrl, presetIds, playwrightRoutes, toast });

  const request: BatchCaptureRequest = {
    baseUrl,
    presetIds,
    presetLimit: resolvePresetLimit({ deps, options }),
  };
  return {
    ...request,
    ...resolvePlaywrightRequestOptions({ options, playwrightRoutes }),
  };
};

export const buildBatchCaptureMutationPayload = ({
  appearanceMode,
  request,
}: {
  appearanceMode: SocialPublishingCaptureAppearanceMode;
  request: BatchCaptureRequest;
}): BatchCapturePayload => {
  const payload: BatchCapturePayload = {
    presetIds: request.presetIds,
    presetLimit: request.presetLimit,
    appearanceMode,
  };
  if (request.baseUrl.length > 0) {
    payload.baseUrl = request.baseUrl;
  }
  if (hasOwn(request, 'playwrightPersonaId')) {
    payload.playwrightPersonaId = request.playwrightPersonaId;
  }
  if (hasOwn(request, 'playwrightScript')) {
    payload.playwrightScript = request.playwrightScript;
  }
  if (hasOwn(request, 'playwrightRoutes')) {
    payload.playwrightRoutes = request.playwrightRoutes;
  }
  return payload;
};
