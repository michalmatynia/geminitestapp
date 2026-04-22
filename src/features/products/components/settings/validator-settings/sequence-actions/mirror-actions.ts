import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { api } from '@/shared/lib/api-client';
import { invalidateValidatorConfig } from '@/shared/lib/query-invalidation';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { buildNameMirrorPolishSequenceBundle } from '@/features/products/lib/validatorSemanticPresets';

import { createSequenceGroupId, getPatternSequence } from '../helpers';

import type { CreatePatternMutation } from './types';
import type { QueryClient } from '@tanstack/react-query';

export const handleCreateNameLengthMirrorPattern = async (args: {
  queryClient: QueryClient;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
}): Promise<void> => {
  const { queryClient, notifySuccess, notifyError, notifyInfo } = args;
  try {
    const templateResult = await api.post<{
      outcomes?: Array<{
        action?: string;
        target?: string;
      }>;
    }>(
      '/api/v2/products/validator-patterns/templates/name-segment-dimensions',
      {},
      { logError: false }
    );
    void invalidateValidatorConfig(queryClient);
    const createdCount = (templateResult.outcomes ?? []).filter(
      (item) => item.action === 'created'
    ).length;
    notifySuccess('Name segment -> Length & Height patterns created or updated.');
    if (createdCount > 0) {
      notifyInfo(
        createdCount === 1
          ? '1 new pattern was created from the template.'
          : `${createdCount} new patterns were created from the template.`
      );
    }
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'createNameLengthMirrorPattern',
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create name segment dimension patterns.'
    );
  }
};

export const handleCreateNameCategoryMirrorPattern = async (args: {
  queryClient: QueryClient;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
}): Promise<void> => {
  const { queryClient, notifySuccess, notifyError, notifyInfo } = args;
  try {
    const templateResult = await api.post<{
      outcomes?: Array<{
        action?: string;
        target?: string;
      }>;
    }>(
      '/api/v2/products/validator-patterns/templates/name-segment-category',
      {},
      { logError: false }
    );
    void invalidateValidatorConfig(queryClient);
    const createdCount = (templateResult.outcomes ?? []).filter(
      (item) => item.action === 'created'
    ).length;
    notifySuccess('Name segment -> Category pattern created or updated.');
    if (createdCount > 0) {
      notifyInfo(
        createdCount === 1
          ? '1 new pattern was created from the template.'
          : `${createdCount} new patterns were created from the template.`
      );
    }
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'createNameCategoryMirrorPattern',
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create name segment category pattern.'
    );
  }
};

export const handleCreateStarGaterProducerPattern = async (args: {
  queryClient: QueryClient;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
}): Promise<void> => {
  const { queryClient, notifySuccess, notifyError, notifyInfo } = args;
  try {
    const templateResult = await api.post<{
      outcomes?: Array<{
        action?: string;
        target?: string;
      }>;
    }>(
      '/api/v2/products/validator-patterns/templates/producer-stargater',
      {},
      { logError: false }
    );
    void invalidateValidatorConfig(queryClient);
    const createdCount = (templateResult.outcomes ?? []).filter(
      (item) => item.action === 'created'
    ).length;
    notifySuccess('StarGater.net producer pattern created or updated.');
    if (createdCount > 0) {
      notifyInfo(
        createdCount === 1
          ? '1 new pattern was created from the template.'
          : `${createdCount} new patterns were created from the template.`
      );
    }
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'createStarGaterProducerPattern',
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create StarGater.net producer pattern.'
    );
  }
};

export const handleCreateNameMirrorPolishSequence = async (args: {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  createPattern: CreatePatternMutation;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patterns, orderedPatterns, createPattern, notifySuccess, notifyError } = args;
  const existingLabels = new Set(
    patterns
      .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
      .filter((value: string) => value.length > 0)
  );
  const sequenceGroupId = createSequenceGroupId();
  const maxSequence = orderedPatterns.reduce(
    (max: number, pattern: ProductValidationPattern, index: number) =>
      Math.max(max, getPatternSequence(pattern, index)),
    0
  );
  const bundle = buildNameMirrorPolishSequenceBundle({
    existingLabels,
    sequenceGroupId,
    firstSequence: maxSequence + 10,
  });

  try {
    for (const payload of bundle.patterns) {
      await createPattern.mutateAsync(payload);
    }

    notifySuccess('English -> Polish name mirror sequence created.');
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'createNameMirrorPolishSequence',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to create name mirror sequence.');
  }
};
