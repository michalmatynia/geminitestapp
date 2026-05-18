import React from 'react';

import { FormField, SelectSimple } from '@/shared/ui';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { useSocialPostContext } from '../SocialPostContext';
import { useSocialSettingsModalContext } from './SocialSettingsModalContext';

type PublishingModalState = ReturnType<typeof useSocialSettingsModalContext>;

const DEFAULT_HELPER_MESSAGE =
  'Per-post editors now use the default publishing connection from this settings modal.';

const MUTED_HELPER_CLASS = 'mt-3 text-xs text-muted-foreground';
const ERROR_HELPER_CLASS = 'mt-3 text-xs text-red-500';
const WARNING_HELPER_CLASS = 'mt-3 text-xs text-amber-500';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasLinkedInIntegration = (state: PublishingModalState): boolean => {
  const integration: unknown = state.linkedinIntegration;
  return integration !== null && integration !== undefined;
};

const isSelectedConnectionUnauthorized = (state: PublishingModalState): boolean => {
  const connection: unknown = state.selectedLinkedInConnection;
  return isRecord(connection) && connection['hasLinkedInAccessToken'] !== true;
};

const formatExpiryLabel = (prefix: string, label: string | null | undefined): string => {
  const trimmedLabel = label?.trim();
  return trimmedLabel === undefined || trimmedLabel.length === 0
    ? prefix
    : `${prefix} ${trimmedLabel}`;
};

const resolveConnectionTitle = ({
  isRuntimeLocked,
  state,
}: {
  isRuntimeLocked: boolean;
  state: PublishingModalState;
}): string => {
  if (isRuntimeLocked) return 'Wait for the current Social runtime job to finish.';
  if (!hasLinkedInIntegration(state)) return 'Create LinkedIn integration first';
  if (state.linkedInOptions.length === 0) {
    return 'Add a publishing connection in Admin > Integrations to use it here.';
  }
  return 'Default publishing connection';
};

const resolveWarningMessage = (state: PublishingModalState): string => {
  const dayText = state.linkedInDaysRemaining === 1 ? 'day' : 'days';
  const label = state.linkedInExpiryLabel?.trim();
  const labelText = label !== undefined && label.length > 0 ? ` (${label})` : '';
  return `LinkedIn token expires in ${state.linkedInDaysRemaining} ${dayText}${labelText}.`;
};

const resolveHelperMessage = (state: PublishingModalState): React.ReactNode => {
  if (!hasLinkedInIntegration(state)) {
    return 'Create the LinkedIn integration in Admin > Integrations to enable publishing.';
  }
  if (state.linkedInOptions.length === 0) {
    return 'Add a publishing connection in Admin > Integrations to use it here.';
  }
  if (isSelectedConnectionUnauthorized(state)) {
    return 'Selected connection is not authorized. Reconnect in Admin > Integrations.';
  }
  if (state.linkedInExpiryStatus === 'expired') {
    return `${formatExpiryLabel('LinkedIn token expired on', state.linkedInExpiryLabel)}.`;
  }
  if (state.linkedInExpiryStatus === 'warning') {
    return resolveWarningMessage(state);
  }
  return DEFAULT_HELPER_MESSAGE;
};

const resolveHelperClassName = (state: PublishingModalState): string => {
  if (!hasLinkedInIntegration(state) || state.linkedInOptions.length === 0) {
    return MUTED_HELPER_CLASS;
  }
  if (isSelectedConnectionUnauthorized(state)) {
    return ERROR_HELPER_CLASS;
  }
  if (state.linkedInExpiryStatus === 'expired') {
    return ERROR_HELPER_CLASS;
  }
  return state.linkedInExpiryStatus === 'warning' ? WARNING_HELPER_CLASS : MUTED_HELPER_CLASS;
};

const isPublishingRuntimeLocked = (context: ReturnType<typeof useSocialPostContext>): boolean =>
  [
    context.currentVisualAnalysisJob?.status,
    context.currentGenerationJob?.status,
    context.currentPipelineJob?.status,
  ].some((status) => isSocialRuntimeJobInFlight(status));

const resolvePlaceholder = (state: PublishingModalState): string =>
  hasLinkedInIntegration(state)
    ? 'Select publishing connection'
    : 'Create LinkedIn integration first';

const isPublishingSelectDisabled = ({
  isRuntimeLocked,
  state,
}: {
  isRuntimeLocked: boolean;
  state: PublishingModalState;
}): boolean =>
  !hasLinkedInIntegration(state) || state.linkedInOptions.length === 0 || isRuntimeLocked;

export function SocialSettingsPublishingTab(): React.JSX.Element {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalContext();
  const isRuntimeLocked = isPublishingRuntimeLocked(context);

  return (
    <KangurAdminCard>
      <FormField
        label='Default publishing connection'
        description='Applies across Social Publishing. LinkedIn is the currently available channel adapter.'
      >
        <SelectSimple
          value={context.publishingConnectionId ?? undefined}
          onValueChange={(id) => {
            context.handlePublishingConnectionChange(id);
          }}
          options={state.linkedInOptions}
          placeholder={resolvePlaceholder(state)}
          disabled={isPublishingSelectDisabled({ isRuntimeLocked, state })}
          size='sm'
          ariaLabel='Default publishing connection'
          title={resolveConnectionTitle({ isRuntimeLocked, state })}
        />
      </FormField>

      <div className={resolveHelperClassName(state)}>{resolveHelperMessage(state)}</div>
    </KangurAdminCard>
  );
}
