'use client';

import { AlertTriangle, CheckCircle2, RefreshCw, Save, Sparkles } from 'lucide-react';

import type { BackgroundSettingsController } from './background-cms.client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
} from '@/shared/ui/primitives.public';

const formatUpdatedAt = (value: string | null): string => {
  if (value === null) return 'Never saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function BackgroundSettingsCard({
  controller,
}: {
  controller: BackgroundSettingsController;
}): React.JSX.Element {
  const cloudConfigured = controller.background?.cloudConfigured === true;
  return (
    <Card>
      <CardHeader className='space-y-2'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Sparkles className='size-4 text-amber-500' />
              Cosmos Background
            </CardTitle>
            <div className='mt-1 text-xs text-muted-foreground'>
              Updated: {formatUpdatedAt(controller.background?.updatedAt ?? null)}
            </div>
          </div>
          <BackgroundActions controller={controller} />
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {controller.error !== null ? <Alert variant='error'>{controller.error}</Alert> : null}
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]'>
          <BackgroundTogglePanel controller={controller} cloudConfigured={cloudConfigured} />
          <CosmosPreview enabled={controller.cosmosParallaxEnabled} />
        </div>
      </CardContent>
    </Card>
  );
}

function BackgroundTogglePanel({
  cloudConfigured,
  controller,
}: {
  cloudConfigured: boolean;
  controller: BackgroundSettingsController;
}): React.JSX.Element {
  return (
    <div className='rounded-md border p-4'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <div className='text-sm font-medium'>4-layer CSS parallax</div>
          <div className='mt-1 text-xs text-muted-foreground'>
            Base color plus far, middle, and near star layers.
          </div>
        </div>
        <Switch
          aria-label='Toggle cosmos parallax background'
          checked={controller.cosmosParallaxEnabled}
          disabled={controller.isLoading || controller.isSaving}
          onCheckedChange={controller.setCosmosParallaxEnabled}
        />
      </div>
      <div className='mt-4 grid gap-2 text-sm sm:grid-cols-2'>
        <StatusBox
          label='Storefront state'
          value={controller.cosmosParallaxEnabled ? 'Enabled' : 'Disabled'}
        />
        <CloudStatusBox cloudConfigured={cloudConfigured} />
      </div>
    </div>
  );
}

function CloudStatusBox({ cloudConfigured }: { cloudConfigured: boolean }): React.JSX.Element {
  return (
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
  );
}

function BackgroundActions({
  controller,
}: {
  controller: BackgroundSettingsController;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        variant='outline'
        onClick={controller.handleRefreshClick}
        disabled={controller.isLoading || controller.isSaving}
      >
        <RefreshCw className={`mr-2 size-4 ${controller.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button
        type='button'
        onClick={controller.handleSaveClick}
        disabled={controller.isLoading || controller.isSaving}
      >
        {controller.isSaving ? (
          <RefreshCw className='mr-2 size-4 animate-spin' />
        ) : (
          <Save className='mr-2 size-4' />
        )}
        Save background
      </Button>
    </div>
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

function CosmosPreview({ enabled }: { enabled: boolean }): React.JSX.Element {
  return (
    <div
      className={`relative min-h-52 overflow-hidden rounded-md border bg-[#020205] ${
        enabled ? 'opacity-100' : 'opacity-45 grayscale'
      }`}
    >
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(229,183,94,0.16),transparent_34%),linear-gradient(180deg,#020205,#03040a_48%,#010104)]' />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(234,247,238,0.8)_0_1px,transparent_1.8px),radial-gradient(circle_at_72%_42%,rgba(229,183,94,0.65)_0_1px,transparent_1.8px)]' />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_44%_68%,rgba(44,70,216,0.8)_0_1px,transparent_1.9px),radial-gradient(circle_at_84%_76%,rgba(201,60,47,0.65)_0_1px,transparent_1.9px)]' />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_56%_25%,rgba(248,237,200,0.95)_0_1px,transparent_2px),radial-gradient(circle_at_26%_82%,rgba(126,202,216,0.75)_0_1px,transparent_2px)]' />
      <div className='absolute bottom-3 left-3 rounded border border-amber-300/30 bg-black/40 px-3 py-1 text-xs text-amber-100'>
        {enabled ? 'ON' : 'OFF'}
      </div>
    </div>
  );
}
