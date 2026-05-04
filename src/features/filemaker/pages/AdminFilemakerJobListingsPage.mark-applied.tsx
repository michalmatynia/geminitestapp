'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { Button, useToast } from '@/shared/ui/primitives.public';

import type {
  FilemakerJobApplication,
  FilemakerJobListing,
} from '../types';
import {
  getManualUnmarkTarget,
  hasTrimmedText,
  normalizeSearchInput,
} from './AdminFilemakerJobListingsPage.components';

type ApplicationInfoPayload = {
  application?: FilemakerJobApplication;
};

type ManualMarkRequest = {
  url: string;
  method: 'POST' | 'PATCH';
  body: {
    removeLogEntryId?: string;
    status: 'draft' | 'ready' | 'applied' | 'rejected' | 'archived';
    action?: 'mark_applied_manual';
    jobListingId?: string;
    jobTitle?: string;
    organizationId?: string;
    organizationName?: string | null;
    personId?: string;
    personName?: string;
    sourceSite?: string | null;
    sourceUrl?: string | null;
  };
};

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
  target: NonNullable<Awaited<ReturnType<typeof getManualUnmarkTarget>>>
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
  mutableApplicationId: string | null
): Promise<ManualMarkRequest> => {
  const target = await getManualUnmarkTarget(normalizedPersonId, listingId, mutableApplicationId);
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
}): Promise<ManualMarkRequest> => {
  if (!params.isApplied) {
    return buildManualMarkRequest(params.props.listing, params.props.personId, params.props.personName);
  }
  return resolveUnmarkRequest(params.props.listing.id, params.normalizedPersonId, params.applicationId);
};

const executeMarkAppliedToggle = async (input: {
  request: ManualMarkRequest;
  wasApplied: boolean;
  setIsLoading: (isLoading: boolean) => void;
  onRequestSuccess: (payload: ApplicationInfoPayload) => void;
  onRequestError: (message: string) => void;
  onRefreshRequested: () => Promise<void> | void;
}): Promise<void> => {
  const { request, wasApplied, setIsLoading, onRequestSuccess, onRequestError, onRefreshRequested } = input;
  setIsLoading(true);
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request.body),
    });
    if (!response.ok) {
      throw new Error(
        wasApplied
          ? `Failed to unmark application (${response.status}).`
          : `Failed to mark as applied (${response.status}).`
      );
    }
    const payload = (await response.json()) as ApplicationInfoPayload;
    onRequestSuccess(payload);
    void onRefreshRequested();
  } catch (error) {
    onRequestError(error instanceof Error ? error.message : 'Failed to update application status.');
  } finally {
    setIsLoading(false);
  }
};

const useMarkAppliedButtonState = (props: MarkAppliedButtonProps): MarkAppliedButtonState => {
  const { toast } = useToast();
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

  const handleResponse = useCallback(
    (payload: ApplicationInfoPayload): void => {
      applyResponseToButtonState({
        payload,
        wasApplied: isApplied,
        setIsApplied,
        setApplicationId,
        onApplicationUpdated: props.onApplicationUpdated,
      });
    },
    [isApplied, props.onApplicationUpdated]
  );

  const handleClick = useCallback(async (): Promise<void> => {
    if (disabled) return;
    const request = await buildMarkAppliedRequest({
      isApplied,
      props,
      normalizedPersonId,
      applicationId,
    });
    await executeMarkAppliedToggle({
      request,
      wasApplied: isApplied,
      setIsLoading,
      onRequestSuccess: handleResponse,
      onRequestError: (message: string) => {
        toast(message, { variant: 'error' });
      },
      onRefreshRequested: props.onRefreshRequested,
    });
  }, [applicationId, disabled, handleResponse, isApplied, normalizedPersonId, props, toast]);

  return {
    isLoading,
    isApplied,
    title,
    disabled,
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
