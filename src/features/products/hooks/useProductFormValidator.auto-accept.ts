'use client';

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { api } from '@/shared/lib/api-client';
import type {
  FieldValidatorIssue,
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
} from '@/shared/contracts/products/validation';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { getOrCreateAutoAcceptedSet } from './validator/validator-auto-accept-registry';
import { resolveAutoApplyIssue } from './useProductFormValidator.auto-apply';
import type { ProductValidatorFieldIssues } from './useProductValidatorIssues.types';
import type { ProductFormValidatorDecisionKeyBuilder } from './useProductFormValidator.types';

type PendingAutoAccept = {
  fieldName: string;
  issueKey: string;
  message: string;
  patternId: string;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  replacementValue: string | null;
};

type AutoAcceptCycleArgs = {
  applyAutoReplacementToField: (fieldName: string, value: string) => boolean;
  autoAcceptedIssueKeys: Set<string>;
  buildIssueDecisionKey: ProductFormValidatorDecisionKeyBuilder;
  doesAutoReplacementMatchField: (fieldName: string, value: string) => boolean;
  draftId: string | null;
  productId: string | null;
  setAcceptedIssueKeys: Dispatch<SetStateAction<Set<string>>>;
  validationInstanceScope: ProductValidationInstanceScope;
  validationSessionId: string;
  validatorPatternById: Map<string, ProductValidationPattern>;
  visibleFieldIssues: ProductValidatorFieldIssues;
};

type UseProductFormValidatorAutoAcceptArgs = Omit<AutoAcceptCycleArgs, 'autoAcceptedIssueKeys'> & {
  entityIdentity: string;
  formatterEnabled: boolean;
  validatorEnabled: boolean;
};

const clearAutoAcceptTimer = (
  timer: ReturnType<typeof setTimeout> | null
): ReturnType<typeof setTimeout> | null => {
  if (timer !== null) clearTimeout(timer);
  return null;
};

const resetAutoAcceptState = (autoAcceptedIssueKeysRef: MutableRefObject<Set<string>>): void => {
  if (autoAcceptedIssueKeysRef.current.size > 0) autoAcceptedIssueKeysRef.current.clear();
};

const useAutoAcceptedIssueKeysRef = (entityIdentity: string): MutableRefObject<Set<string>> => {
  const autoAcceptedIssueKeysRef = useRef<Set<string>>(getOrCreateAutoAcceptedSet(entityIdentity));
  useEffect(() => {
    autoAcceptedIssueKeysRef.current = getOrCreateAutoAcceptedSet(entityIdentity);
  }, [entityIdentity]);
  return autoAcceptedIssueKeysRef;
};

const shouldSkipExistingAutoAccept = ({
  autoAcceptedIssueKeys,
  doesAutoReplacementMatchField,
  fieldName,
  issueKey,
  replacementValue,
  shouldAutoApply,
}: {
  autoAcceptedIssueKeys: Set<string>;
  doesAutoReplacementMatchField: (fieldName: string, value: string) => boolean;
  fieldName: string;
  issueKey: string;
  replacementValue: string | null;
  shouldAutoApply: boolean;
}): boolean => {
  if (!autoAcceptedIssueKeys.has(issueKey)) return false;
  if (!shouldAutoApply || replacementValue === null) return true;
  if (doesAutoReplacementMatchField(fieldName, replacementValue)) return true;
  autoAcceptedIssueKeys.delete(issueKey);
  return false;
};

const resolvePendingAutoAccept = ({
  args,
  fieldName,
  issue,
  nextVisibleIssueKeys,
}: {
  args: AutoAcceptCycleArgs;
  fieldName: string;
  issue: FieldValidatorIssue;
  nextVisibleIssueKeys: Set<string>;
}): PendingAutoAccept | null => {
  const issueKey = args.buildIssueDecisionKey(fieldName, issue.patternId);
  nextVisibleIssueKeys.add(issueKey);
  const autoApply = resolveAutoApplyIssue({
    fieldName,
    issue,
    pattern: args.validatorPatternById.get(issue.patternId),
    validationInstanceScope: args.validationInstanceScope,
  });
  if (
    shouldSkipExistingAutoAccept({
      autoAcceptedIssueKeys: args.autoAcceptedIssueKeys,
      doesAutoReplacementMatchField: args.doesAutoReplacementMatchField,
      fieldName: autoApply.replacementFieldName,
      issueKey,
      replacementValue: issue.replacementValue,
      shouldAutoApply: autoApply.shouldAutoApply,
    })
  ) {
    return null;
  }
  if (
    autoApply.shouldAutoApply &&
    !args.applyAutoReplacementToField(autoApply.replacementFieldName, issue.replacementValue ?? '')
  ) {
    return null;
  }
  args.autoAcceptedIssueKeys.add(issueKey);
  return {
    fieldName,
    issueKey,
    message: issue.message,
    patternId: issue.patternId,
    postAcceptBehavior: issue.postAcceptBehavior,
    replacementValue: issue.replacementValue,
  };
};

const collectPendingAutoAccepts = (
  args: AutoAcceptCycleArgs
): { nextVisibleIssueKeys: Set<string>; pendingAccepts: PendingAutoAccept[] } => {
  const nextVisibleIssueKeys = new Set<string>();
  const pendingAccepts: PendingAutoAccept[] = [];
  for (const [fieldName, issues] of Object.entries(args.visibleFieldIssues)) {
    for (const issue of issues) {
      const pendingAccept = resolvePendingAutoAccept({ args, fieldName, issue, nextVisibleIssueKeys });
      if (pendingAccept !== null) pendingAccepts.push(pendingAccept);
    }
  }
  return { nextVisibleIssueKeys, pendingAccepts };
};

const addStopAfterAcceptIssueKeys = (
  prev: Set<string>,
  pendingAccepts: PendingAutoAccept[]
): Set<string> => {
  const next = new Set(prev);
  for (const accept of pendingAccepts) {
    if (accept.postAcceptBehavior === 'stop_after_accept') next.add(accept.issueKey);
  }
  return next;
};

const postPendingAutoAccepts = (
  args: AutoAcceptCycleArgs,
  pendingAccepts: PendingAutoAccept[]
): void => {
  if (pendingAccepts.length === 0) return;
  args.setAcceptedIssueKeys((prev) => addStopAfterAcceptIssueKeys(prev, pendingAccepts));
  void api
    .post(
      '/api/v2/products/validator-decisions/batch',
      {
        decisions: pendingAccepts.map((accept) => ({
          action: 'accept',
          denyBehavior: null,
          draftId: args.draftId,
          fieldName: accept.fieldName,
          message: accept.message,
          patternId: accept.patternId,
          productId: args.productId,
          replacementValue: accept.replacementValue,
          sessionId: args.validationSessionId.length > 0 ? args.validationSessionId : null,
        })),
      },
      { logError: false }
    )
    .catch((error: unknown) => logClientError(error));
};

const pruneStaleAutoAcceptedIssueKeys = (
  autoAcceptedIssueKeys: Set<string>,
  nextVisibleIssueKeys: Set<string>
): void => {
  for (const issueKey of autoAcceptedIssueKeys) {
    if (!nextVisibleIssueKeys.has(issueKey)) autoAcceptedIssueKeys.delete(issueKey);
  }
};

const runAutoAcceptCycle = (args: AutoAcceptCycleArgs): void => {
  const { nextVisibleIssueKeys, pendingAccepts } = collectPendingAutoAccepts(args);
  postPendingAutoAccepts(args, pendingAccepts);
  pruneStaleAutoAcceptedIssueKeys(args.autoAcceptedIssueKeys, nextVisibleIssueKeys);
};

export const useProductFormValidatorAutoAccept = ({
  applyAutoReplacementToField,
  buildIssueDecisionKey,
  doesAutoReplacementMatchField,
  draftId,
  entityIdentity,
  formatterEnabled,
  productId,
  setAcceptedIssueKeys,
  validationInstanceScope,
  validationSessionId,
  validatorEnabled,
  validatorPatternById,
  visibleFieldIssues,
}: UseProductFormValidatorAutoAcceptArgs): void => {
  const autoAcceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAcceptedIssueKeysRef = useAutoAcceptedIssueKeysRef(entityIdentity);
  useEffect(() => {
    if (!validatorEnabled || !formatterEnabled) {
      autoAcceptTimerRef.current = clearAutoAcceptTimer(autoAcceptTimerRef.current);
      resetAutoAcceptState(autoAcceptedIssueKeysRef);
      return () => {};
    }
    autoAcceptTimerRef.current = clearAutoAcceptTimer(autoAcceptTimerRef.current);
    autoAcceptTimerRef.current = setTimeout(() => {
      autoAcceptTimerRef.current = null;
      runAutoAcceptCycle({
        applyAutoReplacementToField,
        autoAcceptedIssueKeys: autoAcceptedIssueKeysRef.current,
        buildIssueDecisionKey,
        doesAutoReplacementMatchField,
        draftId,
        productId,
        setAcceptedIssueKeys,
        validationInstanceScope,
        validationSessionId,
        validatorPatternById,
        visibleFieldIssues,
      });
    }, 200);
    return () => {
      autoAcceptTimerRef.current = clearAutoAcceptTimer(autoAcceptTimerRef.current);
    };
  }, [
    applyAutoReplacementToField,
    buildIssueDecisionKey,
    doesAutoReplacementMatchField,
    draftId,
    formatterEnabled,
    productId,
    setAcceptedIssueKeys,
    validationInstanceScope,
    validationSessionId,
    validatorEnabled,
    validatorPatternById,
    visibleFieldIssues,
  ]);
};
