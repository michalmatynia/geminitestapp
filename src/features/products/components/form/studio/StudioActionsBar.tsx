'use client';

import { RotateCcw, RotateCw, ExternalLink, Monitor, Check } from 'lucide-react';
import type { JSX } from 'react';

import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import type { ProductStudioContextValue } from '@/features/products/context/ProductStudioContext.types';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { StatusBadge } from '@/shared/ui/status-badge';

type StudioAction = () => Promise<unknown>;
type StudioActionsContext = Pick<
  ProductStudioContextValue,
  | 'accepting'
  | 'blockSendForSequenceReadiness'
  | 'handleAcceptVariant'
  | 'handleConvertLinkImageToFile'
  | 'handleOpenInImageStudio'
  | 'handleRotateImageSlot'
  | 'handleSendToStudio'
  | 'convertingLinkImageIndex'
  | 'openingInImageStudio'
  | 'refreshVariants'
  | 'rotatingDirection'
  | 'runStatus'
  | 'selectedImageIndex'
  | 'selectedSourcePreview'
  | 'selectedVariant'
  | 'sending'
  | 'sequenceReadinessMessage'
  | 'studioActionError'
  | 'variantsLoading'
>;

const createStudioActionClickHandler =
  (action: StudioAction): (() => void) =>
  (): void => {
    action().catch((): undefined => undefined);
  };

const hasAlertText = (value: string | null): value is string => value !== null && value !== '';

const isBaseActionDisabled = ({
  accepting,
  rotatingDirection,
  selectedImageIndex,
  selectedSourcePreview,
  sending,
}: StudioActionsContext): boolean =>
  sending ||
  accepting ||
  rotatingDirection !== null ||
  selectedImageIndex === null ||
  selectedSourcePreview === null ||
  selectedSourcePreview.sourceType === 'link';

function StudioConvertSelectedLinkButton({ context }: { context: StudioActionsContext }): JSX.Element | null {
  const selectedPreview = context.selectedSourcePreview;
  if (selectedPreview?.sourceType !== 'link') return null;

  return (
    <Button
      size='xs'
      variant='outline'
      onClick={createStudioActionClickHandler(() =>
        context.handleConvertLinkImageToFile(selectedPreview.index)
      )}
      disabled={context.convertingLinkImageIndex !== null}
      loading={context.convertingLinkImageIndex === selectedPreview.index}
      className='border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
    >
      Convert selected link to file
    </Button>
  );
}

function StudioRotateButtons({
  context,
  isDisabled,
}: {
  context: StudioActionsContext;
  isDisabled: boolean;
}): JSX.Element {
  return (
    <>
      <Button
        size='xs'
        variant='outline'
        onClick={createStudioActionClickHandler(() => context.handleRotateImageSlot('left'))}
        disabled={isDisabled}
        loading={context.rotatingDirection === 'left'}
      >
        <RotateCcw className='mr-2 size-4' /> Rotate Left
      </Button>
      <Button
        size='xs'
        variant='outline'
        onClick={createStudioActionClickHandler(() => context.handleRotateImageSlot('right'))}
        disabled={isDisabled}
        loading={context.rotatingDirection === 'right'}
      >
        <RotateCw className='mr-2 size-4' /> Rotate Right
      </Button>
    </>
  );
}

function StudioOpenButton({
  context,
  isDisabled,
}: {
  context: StudioActionsContext;
  isDisabled: boolean;
}): JSX.Element {
  return (
    <Button
      size='xs'
      variant='outline'
      onClick={createStudioActionClickHandler(context.handleOpenInImageStudio)}
      disabled={context.openingInImageStudio || isDisabled}
      loading={context.openingInImageStudio}
    >
      <ExternalLink className='mr-2 size-4' /> Open In Image Studio
    </Button>
  );
}

function StudioSendButton({
  context,
  isDisabled,
}: {
  context: StudioActionsContext;
  isDisabled: boolean;
}): JSX.Element {
  const isRunActive = context.runStatus === 'queued' || context.runStatus === 'running';
  return (
    <Button
      size='xs'
      onClick={createStudioActionClickHandler(context.handleSendToStudio)}
      disabled={
        context.openingInImageStudio ||
        context.blockSendForSequenceReadiness ||
        isDisabled ||
        isRunActive
      }
      loading={context.sending}
    >
      <Monitor className='mr-2 size-4' /> Send To Studio
    </Button>
  );
}

function StudioAcceptButton({ context }: { context: StudioActionsContext }): JSX.Element {
  return (
    <Button
      size='xs'
      onClick={createStudioActionClickHandler(context.handleAcceptVariant)}
      disabled={
        context.selectedVariant === null ||
        context.accepting ||
        context.sending ||
        context.openingInImageStudio
      }
      variant='outline'
      className='border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
      loading={context.accepting}
    >
      <Check className='mr-2 size-4' /> Accept Variant
    </Button>
  );
}

function StudioRefreshButton({ context }: { context: StudioActionsContext }): JSX.Element {
  return (
    <Button
      size='xs'
      variant='outline'
      onClick={createStudioActionClickHandler(context.refreshVariants)}
      disabled={context.variantsLoading || context.sending || context.accepting}
      loading={context.variantsLoading}
    >
      Refresh Variants
    </Button>
  );
}

function StudioRunStatusBadge({ context }: { context: StudioActionsContext }): JSX.Element | null {
  if (context.runStatus === null) return null;

  return (
    <StatusBadge
      status={`Run status: ${context.runStatus}`}
      variant='processing'
      size='sm'
    />
  );
}

function StudioActionAlerts({ context }: { context: StudioActionsContext }): JSX.Element {
  return (
    <>
      {hasAlertText(context.studioActionError) ? (
        <Alert variant='error' className='py-2 text-xs'>
          {context.studioActionError}
        </Alert>
      ) : null}
      {hasAlertText(context.sequenceReadinessMessage) ? (
        <Alert variant='warning' className='py-2 text-xs'>
          {context.sequenceReadinessMessage}
        </Alert>
      ) : null}
      {context.selectedSourcePreview?.sourceType === 'link' ? (
        <Alert variant='warning' className='py-2 text-xs'>
          Selected image is a link. Convert it to a product file before using Studio operations.
        </Alert>
      ) : null}
    </>
  );
}

export function StudioActionsBar(): JSX.Element {
  const context = useProductStudioContext();
  const isDisabled = isBaseActionDisabled(context);

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <StudioConvertSelectedLinkButton context={context} />
        <StudioRotateButtons context={context} isDisabled={isDisabled} />
        <StudioOpenButton context={context} isDisabled={isDisabled} />
        <StudioSendButton context={context} isDisabled={isDisabled} />
        <StudioAcceptButton context={context} />
        <StudioRefreshButton context={context} />
        <StudioRunStatusBadge context={context} />
        {context.runStatus === null ? (
          <StatusBadge status='Studio ready' variant='success' size='sm' />
        ) : null}
      </div>
      <StudioActionAlerts context={context} />
    </div>
  );
}
