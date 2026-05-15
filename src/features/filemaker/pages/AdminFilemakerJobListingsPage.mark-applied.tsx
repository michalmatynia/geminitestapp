'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Button, useToast } from '@/shared/ui/primitives.public';

import type {
  FilemakerJobApplication,
  FilemakerJobListing,
} from '../types';
import {
  hasTrimmedText,
  type ManualUnmarkTarget,
  normalizeSearchInput,
} from './AdminFilemakerJobListingsPage.components';
import {
  useMarkAppliedMutation,
  useResolveManualUnmarkTargetMutation,
  type ApplicationInfoPayload,
  type ManualMarkMutationVariables,
  type ManualMarkRequest,
  type ResolveManualUnmarkTargetVariables,
} from './AdminFilemakerJobListingsPage.mark-applied.mutation';

type MarkAppliedButtonProps = {
  listing: FilemakerJobListing;
  applicationId: string | null;
  personId: string;
  personName: string;
  initialApplied: boolean;
  onApplicationUpdated: (application: FilemakerJobApplication | null) => void;
  onRefreshRequested: () => Promise<void> | void;
};

const buildButtonTitle = (params: {
  isLoading: boolean;
  normalizedPersonId: string;
  isApplied: boolean;
  personLabel: string;
}): string => {
  if (params.isLoading) return 'Updating application status...';
  if (params.normalizedPersonId.length === 0) {
    return 'Set a default person in Filemaker settings before marking as applied';
  }
  return params.isApplied
    ? `Unmark application for ${params.personLabel}`
    : `Mark applied manually for ${params.personLabel}`;
};

const buildManualMarkRequest = (
  listing: FilemakerJobListing,
  personId: string,
  personName: string
): ManualMarkRequest => ({
  url: '/api/filemaker/job-applications',
  method: 'POST',
  body: {
    action: 'mark_applied_manual',
    jobListingId: listing.id,
    jobTitle: listing.title,
    organizationId: listing.organizationId,
    organizationName: null,
    personId,
    personName,
    sourceSite: listing.sourceSite ?? null,
    sourceUrl: listing.sourceUrl ?? null,
    status: 'draft',
  },
});

const buildUnmarkRequest = (
  target: ManualUnmarkTarget
): ManualMarkRequest => ({
  url: `/api/filemaker/job-applications/${encodeURIComponent(target.applicationId)}`,
  method: 'PATCH',
  body: {
    status: 'draft',
    ...(target.removeLogEntryId === undefined ? {} : { removeLogEntryId: target.removeLogEntryId }),
  },
});

const resolveUnmarkRequest = async (
  listingId: string,
  normalizedPersonId: string,
  mutableApplicationId: string | null,
  runResolveTarget: (
    variables: ResolveManualUnmarkTargetVariables
  ) => Promise<ManualUnmarkTarget | null>
): Promise<ManualMarkRequest> => {
  const target = await runResolveTarget({
    listingId,
    mutableApplicationId,
    personId: normalizedPersonId,
  });
  if (target === null) {
    throw new Error('Unable to resolve the applied application to unmark.');
  }
  return buildUnmarkRequest(target);
};

type MarkAppliedButtonState = {
  isLoading: boolean;
  isApplied: boolean;
  title: string;
  disabled: boolean;
  handleClick: () => Promise<void>;
};

type MarkAppliedLocalState = {
  applicationId: string | null;
  disabled: boolean;
  isApplied: boolean;
  isLoading: boolean;
  normalizedPersonId: string;
  setApplicationId: (value: string | null) => void;
  setIsApplied: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  title: string;
};

const applyResponseToButtonState = (input: {
  payload: ApplicationInfoPayload;
  wasApplied: boolean;
  setIsApplied: (value: boolean) => void;
  setApplicationId: (value: string | null) => void;
  onApplicationUpdated: (application: FilemakerJobApplication | null) => void;
}): void => {
  const { payload, wasApplied, setIsApplied, setApplicationId, onApplicationUpdated } = input;
  if (payload.application === undefined) {
    if (wasApplied) {
      setIsApplied(false);
      setApplicationId(null);
      onApplicationUpdated(null);
      return;
    }
    setIsApplied(true);
    return;
  }

  setIsApplied(payload.application.status === 'applied');
  setApplicationId(payload.application.id);
  onApplicationUpdated(payload.application);
};

const buildMarkAppliedRequest = async (params: {
  isApplied: boolean;
  props: MarkAppliedButtonProps;
  normalizedPersonId: string;
  applicationId: string | null;
  runResolveTarget: (
    variables: ResolveManualUnmarkTargetVariables
  ) => Promise<ManualUnmarkTarget | null>;
}): Promise<ManualMarkRequest> => {
  if (!params.isApplied) {
    return buildManualMarkRequest(params.props.listing, params.props.personId, params.props.personName);
  }
  return resolveUnmarkRequest(
    params.props.listing.id,
    params.normalizedPersonId,
    params.applicationId,
    params.runResolveTarget
  );
};

const executeMarkAppliedToggle = async (input: {
  request: ManualMarkRequest;
  wasApplied: boolean;
  setIsLoading: (isLoading: boolean) => void;
  runRequest: (variables: ManualMarkMutationVariables) => Promise<ApplicationInfoPayload>;
  onRequestSuccess: (payload: ApplicationInfoPayload) => void;
  onRequestError: (message: string) => void;
  onRefreshRequested: () => Promise<void> | void;
}): Promise<void> => {
  const {
    request,
    wasApplied,
    setIsLoading,
    runRequest,
    onRequestSuccess,
    onRequestError,
    onRefreshRequested,
  } = input;
  setIsLoading(true);
  try {
    const payload = await runRequest({ request, wasApplied });
    onRequestSuccess(payload);
    void onRefreshRequested();
  } catch (error) {
    onRequestError(error instanceof Error ? error.message : 'Failed to update application status.');
  } finally {
    setIsLoading(false);
  }
};

const useMarkAppliedLocalState = (props: MarkAppliedButtonProps): MarkAppliedLocalState => {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(props.initialApplied);
  const [applicationId, setApplicationId] = useState(props.applicationId);

  useEffect(() => {
    setIsApplied(props.initialApplied);
  }, [props.initialApplied]);
  useEffect(() => {
    setApplicationId(props.applicationId);
  }, [props.applicationId]);

  const normalizedPersonId = normalizeSearchInput(props.personId);
  const personLabel = hasTrimmedText(props.personName) ? props.personName : props.personId;
  const disabled = normalizedPersonId.length === 0 || isLoading;
  const title = buildButtonTitle({
    isLoading,
    normalizedPersonId,
    isApplied,
    personLabel,
  });
  return {
    applicationId,
    disabled,
    isApplied,
    isLoading,
    normalizedPersonId,
    setApplicationId,
    setIsApplied,
    setIsLoading,
    title,
  };
};

const useMarkAppliedButtonState = (props: MarkAppliedButtonProps): MarkAppliedButtonState => {
  const { toast } = useToast();
  const markAppliedMutation = useMarkAppliedMutation();
  const resolveUnmarkTargetMutation = useResolveManualUnmarkTargetMutation();
  const localState = useMarkAppliedLocalState(props);

  const handleResponse = useCallback(
    (payload: ApplicationInfoPayload): void => {
      applyResponseToButtonState({
        payload,
        wasApplied: localState.isApplied,
        setIsApplied: localState.setIsApplied,
        setApplicationId: localState.setApplicationId,
        onApplicationUpdated: props.onApplicationUpdated,
      });
    },
    [localState, props.onApplicationUpdated]
  );

  const handleClick = useCallback(async (): Promise<void> => {
    if (localState.disabled) return;
    const request = await buildMarkAppliedRequest({
      isApplied: localState.isApplied,
      props,
      normalizedPersonId: localState.normalizedPersonId,
      applicationId: localState.applicationId,
      runResolveTarget: (variables) => resolveUnmarkTargetMutation.mutateAsync(variables),
    });
    await executeMarkAppliedToggle({
      request,
      wasApplied: localState.isApplied,
      setIsLoading: localState.setIsLoading,
      runRequest: (variables) => markAppliedMutation.mutateAsync(variables),
      onRequestSuccess: handleResponse,
      onRequestError: (message: string) => {
        toast(message, { variant: 'error' });
      },
      onRefreshRequested: props.onRefreshRequested,
    });
  }, [
    handleResponse,
    localState,
    markAppliedMutation,
    props,
    resolveUnmarkTargetMutation,
    toast,
  ]);

  return {
    isLoading: localState.isLoading,
    isApplied: localState.isApplied,
    title: localState.title,
    disabled: localState.disabled,
    handleClick,
  };
};

function MarkAppliedButton(props: MarkAppliedButtonProps): React.JSX.Element {
  const { isLoading, isApplied, title, disabled, handleClick } = useMarkAppliedButtonState(props);
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-7 gap-1.5 text-[11px]'
      disabled={disabled}
      title={title}
      onClick={(): void => {
        void handleClick();
      }}
    >
      {isLoading ? (
        <Loader2 className='size-3 animate-spin' aria-hidden='true' />
      ) : (
        <CheckCircle2 className='size-3' aria-hidden='true' />
      )}
      {isApplied ? 'Applied' : 'Mark applied'}
    </Button>
  );
}

export { MarkAppliedButton };
