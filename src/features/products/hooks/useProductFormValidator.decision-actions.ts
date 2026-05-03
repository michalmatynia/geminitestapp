'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { api } from '@/shared/lib/api-client';
import type {
  ProductValidationAcceptIssueInput,
  ProductValidationDenyBehavior,
  ProductValidationDenyIssueInput,
} from '@/shared/contracts/products/validation';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  addIssueKeyWhenMissing,
  normalizeProductFormValidatorIssueIdentity,
  updateAcceptedIssueKeysForPostAccept,
} from './useProductFormValidator.helpers';
import type { ProductFormValidatorDecisionKeyBuilder } from './useProductFormValidator.types';

type UseProductFormValidatorDecisionActionsArgs = {
  buildIssueDecisionKey: ProductFormValidatorDecisionKeyBuilder;
  draftId: string | null;
  getIssueDenyBehavior: (patternId: string) => ProductValidationDenyBehavior;
  productId: string | null;
  setAcceptedIssueKeys: Dispatch<SetStateAction<Set<string>>>;
  setDeniedIssueKeys: Dispatch<SetStateAction<Set<string>>>;
  validationSessionId: string;
};

export type ProductFormValidatorDecisionActions = {
  acceptIssue: (input: ProductValidationAcceptIssueInput) => Promise<void>;
  denyIssue: (input: ProductValidationDenyIssueInput) => Promise<void>;
};

type IssueDecisionPayloadBase = {
  draftId: string | null;
  fieldName: string;
  message: string | null;
  patternId: string;
  productId: string | null;
  replacementValue: string | null;
  sessionId: string | null;
};

const resolveValidationSessionIdPayload = (validationSessionId: string): string | null =>
  validationSessionId.length > 0 ? validationSessionId : null;

const postValidatorDecision = (payload: Record<string, unknown>): void => {
  void api
    .post('/api/v2/products/validator-decisions', payload, { logError: false })
    .catch((error: unknown) => logClientError(error));
};

const buildIssueDecisionPayloadBase = ({
  draftId,
  fieldName,
  input,
  patternId,
  productId,
  validationSessionId,
}: {
  draftId: string | null;
  fieldName: string;
  input: ProductValidationAcceptIssueInput | ProductValidationDenyIssueInput;
  patternId: string;
  productId: string | null;
  validationSessionId: string;
}): IssueDecisionPayloadBase => ({
  draftId,
  fieldName,
  message: input.message ?? null,
  patternId,
  productId,
  replacementValue: input.replacementValue ?? null,
  sessionId: resolveValidationSessionIdPayload(validationSessionId),
});

const useDenyValidatorIssue = ({
  buildIssueDecisionKey,
  draftId,
  getIssueDenyBehavior,
  productId,
  setDeniedIssueKeys,
  validationSessionId,
}: Omit<
  UseProductFormValidatorDecisionActionsArgs,
  'setAcceptedIssueKeys'
>): ProductFormValidatorDecisionActions['denyIssue'] =>
  useCallback(
    (input: ProductValidationDenyIssueInput): Promise<void> => {
      const identity = normalizeProductFormValidatorIssueIdentity(input);
      if (identity === null) return Promise.resolve();
      const issueKey = buildIssueDecisionKey(identity.fieldName, identity.patternId);
      const denyBehavior = getIssueDenyBehavior(identity.patternId);
      if (denyBehavior === 'mute_session') {
        setDeniedIssueKeys((prev) => addIssueKeyWhenMissing(prev, issueKey));
      }
      postValidatorDecision({
        action: 'deny',
        denyBehavior,
        ...buildIssueDecisionPayloadBase({ draftId, input, productId, validationSessionId, ...identity }),
      });
      return Promise.resolve();
    },
    [buildIssueDecisionKey, draftId, getIssueDenyBehavior, productId, setDeniedIssueKeys, validationSessionId]
  );

const useAcceptValidatorIssue = ({
  buildIssueDecisionKey,
  draftId,
  productId,
  setAcceptedIssueKeys,
  validationSessionId,
}: Omit<
  UseProductFormValidatorDecisionActionsArgs,
  'getIssueDenyBehavior' | 'setDeniedIssueKeys'
>): ProductFormValidatorDecisionActions['acceptIssue'] =>
  useCallback(
    (input: ProductValidationAcceptIssueInput): Promise<void> => {
      const identity = normalizeProductFormValidatorIssueIdentity(input);
      if (identity === null) return Promise.resolve();
      const issueKey = buildIssueDecisionKey(identity.fieldName, identity.patternId);
      setAcceptedIssueKeys((prev) =>
        updateAcceptedIssueKeysForPostAccept(
          prev,
          issueKey,
          input.postAcceptBehavior === 'stop_after_accept'
        )
      );
      postValidatorDecision({
        action: 'accept',
        denyBehavior: null,
        ...buildIssueDecisionPayloadBase({ draftId, input, productId, validationSessionId, ...identity }),
      });
      return Promise.resolve();
    },
    [buildIssueDecisionKey, draftId, productId, setAcceptedIssueKeys, validationSessionId]
  );

export const useProductFormValidatorDecisionActions = (
  args: UseProductFormValidatorDecisionActionsArgs
): ProductFormValidatorDecisionActions => {
  const denyIssue = useDenyValidatorIssue(args);
  const acceptIssue = useAcceptValidatorIssue(args);

  return { acceptIssue, denyIssue };
};
