'use client';

import { AlertTriangle, CheckCircle2, RefreshCw, Save, UploadCloud } from 'lucide-react';

import type { ManifestoController, ManifestoField, ManifestoState } from './manifesto-cms.client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/ui/primitives.public';

const formatUpdatedAt = (value: string | null): string => {
  if (value === null) return 'Never saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function ManifestoCmsCard({
  controller,
}: {
  controller: ManifestoController;
}): React.JSX.Element {
  const manifesto = controller.manifesto;
  return (
    <Card>
      <CardHeader className='space-y-2'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-base'>Collector&apos;s Creed</CardTitle>
            <div className='mt-1 text-xs text-muted-foreground'>
              Updated: {formatUpdatedAt(manifesto?.updatedAt ?? null)}
            </div>
          </div>
          <ManifestoActions controller={controller} />
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {controller.error !== null ? <Alert variant='error'>{controller.error}</Alert> : null}
        <ManifestoStatus manifesto={manifesto} />
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]'>
          <ManifestoFields controller={controller} manifesto={manifesto} />
          <ManifestoBackgroundPanel controller={controller} manifesto={manifesto} />
        </div>
      </CardContent>
    </Card>
  );
}

function ManifestoActions({
  controller,
}: {
  controller: ManifestoController;
}): React.JSX.Element {
  const isBusy = controller.isLoading || controller.isSaving || controller.isUploadingBackground;
  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        variant='outline'
        onClick={controller.handleRefreshClick}
        disabled={isBusy}
      >
        <RefreshCw className={`mr-2 size-4 ${controller.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button type='button' onClick={controller.handleSaveClick} disabled={isBusy}>
        {controller.isSaving ? (
          <RefreshCw className='mr-2 size-4 animate-spin' />
        ) : (
          <Save className='mr-2 size-4' />
        )}
        Save creed
      </Button>
    </div>
  );
}

function ManifestoStatus({ manifesto }: { manifesto: ManifestoState | null }): React.JSX.Element {
  const cloudConfigured = manifesto?.cloudConfigured === true;
  return (
    <div className='grid gap-2 text-sm md:grid-cols-3'>
      <StatusBox label='FastComet folder' value='cms/stargater/manifesto' />
      <StatusBox label='Updated by' value={manifesto?.updatedBy ?? 'Unknown'} />
      <div className='rounded-md border p-3'>
        <div className='text-xs text-muted-foreground'>Cloud mirror</div>
        <div className='mt-1 flex items-center gap-2'>
          {cloudConfigured ? (
            <CheckCircle2 className='size-4 text-emerald-500' />
          ) : (
            <AlertTriangle className='size-4 text-amber-500' />
          )}
          <span>{cloudConfigured ? 'Configured' : 'Not configured'}</span>
        </div>
      </div>
    </div>
  );
}

function ManifestoFields({
  controller,
  manifesto,
}: {
  controller: ManifestoController;
  manifesto: ManifestoState | null;
}): React.JSX.Element {
  const getValue = (field: ManifestoField): string => manifesto?.[field] ?? '';
  return (
    <div className='space-y-4'>
      <TextInput controller={controller} field='eyebrow' label='Eyebrow' value={getValue('eyebrow')} />
      <div className='grid gap-3 md:grid-cols-3'>
        <TextInput controller={controller} field='quotePrefix' label='Quote before highlight' value={getValue('quotePrefix')} />
        <TextInput controller={controller} field='quoteEmphasis' label='Quote highlight' value={getValue('quoteEmphasis')} />
        <TextInput controller={controller} field='quoteSuffix' label='Quote after highlight' value={getValue('quoteSuffix')} />
      </div>
      <TextAreaInput controller={controller} field='body' label='Body' value={getValue('body')} />
      <div className='grid gap-3 md:grid-cols-2'>
        <TextInput controller={controller} field='ctaLabel' label='Button label' value={getValue('ctaLabel')} />
        <TextInput controller={controller} field='ctaHref' label='Button href' value={getValue('ctaHref')} />
      </div>
      <TextInput
        controller={controller}
        field='backgroundImageUrl'
        label='Background image URL'
        value={getValue('backgroundImageUrl')}
      />
    </div>
  );
}

function TextInput({
  controller,
  field,
  label,
  value,
}: {
  controller: ManifestoController;
  field: ManifestoField;
  label: string;
  value: string;
}): React.JSX.Element {
  const isBusy = controller.isLoading || controller.isSaving || controller.isUploadingBackground;
  return (
    <div className='space-y-2'>
      <Label htmlFor={`manifesto-${field}`}>{label}</Label>
      <Input
        id={`manifesto-${field}`}
        value={value}
        disabled={isBusy}
        onChange={(event) => controller.updateField(field, event.target.value)}
      />
    </div>
  );
}

function TextAreaInput({
  controller,
  field,
  label,
  value,
}: {
  controller: ManifestoController;
  field: ManifestoField;
  label: string;
  value: string;
}): React.JSX.Element {
  const isBusy = controller.isLoading || controller.isSaving || controller.isUploadingBackground;
  return (
    <div className='space-y-2'>
      <Label htmlFor={`manifesto-${field}`}>{label}</Label>
      <Textarea
        id={`manifesto-${field}`}
        rows={5}
        value={value}
        disabled={isBusy}
        onChange={(event) => controller.updateField(field, event.target.value)}
      />
    </div>
  );
}

function ManifestoBackgroundPanel({
  controller,
  manifesto,
}: {
  controller: ManifestoController;
  manifesto: ManifestoState | null;
}): React.JSX.Element {
  const backgroundImageUrl = manifesto?.backgroundImageUrl ?? '';
  const isBusy = controller.isLoading || controller.isSaving || controller.isUploadingBackground;
  return (
    <div className='space-y-4 rounded-md border bg-card/30 p-4'>
      <div className='space-y-2'>
        <Label htmlFor='manifesto-background-file'>Upload background</Label>
        <Input
          ref={controller.backgroundFileInputRef}
          id='manifesto-background-file'
          type='file'
          accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
          disabled={isBusy}
          onChange={controller.handleBackgroundFileChange}
        />
      </div>
      <ManifestoBackgroundUploadButton controller={controller} isBusy={isBusy} />
      <ManifestoBackgroundPreview backgroundImageUrl={backgroundImageUrl} />
    </div>
  );
}

function ManifestoBackgroundUploadButton({
  controller,
  isBusy,
}: {
  controller: ManifestoController;
  isBusy: boolean;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      onClick={controller.handleUploadBackgroundClick}
      disabled={isBusy || controller.selectedBackgroundFile === null}
    >
      {controller.isUploadingBackground ? (
        <RefreshCw className='mr-2 size-4 animate-spin' />
      ) : (
        <UploadCloud className='mr-2 size-4' />
      )}
      Upload background
    </Button>
  );
}

function ManifestoBackgroundPreview({
  backgroundImageUrl,
}: {
  backgroundImageUrl: string;
}): React.JSX.Element {
  return (
    <>
      <div className='min-h-48 overflow-hidden rounded-md border bg-muted/30'>
        {backgroundImageUrl.length > 0 ? (
          <img
            src={backgroundImageUrl}
            alt='Collector Creed background preview'
            className='h-48 w-full object-cover'
          />
        ) : (
          <div className='flex h-48 items-center justify-center text-sm text-muted-foreground'>
            No background image
          </div>
        )}
      </div>
      {backgroundImageUrl.length > 0 ? (
        <div className='break-all text-xs text-muted-foreground'>{backgroundImageUrl}</div>
      ) : null}
    </>
  );
}

function StatusBox({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className='rounded-md border p-3'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className='mt-1 truncate'>{value}</div>
    </div>
  );
}
