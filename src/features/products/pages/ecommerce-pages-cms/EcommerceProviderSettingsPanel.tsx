'use client';

import { RefreshCw, Save, ShieldCheck, XCircle } from 'lucide-react';

import {
  PaymentProviderFields,
  ShippingProviderFields,
} from './EcommerceProviderSettingsFields';
import { useProviderSettingsPanelModel } from './EcommerceProviderSettingsPanel.model';
import { ProviderPushResults } from './EcommerceProviderSettingsPushResults';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
} from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

const formatDateTime = (value: string | null): string => {
  if (value === null) return 'Never';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export function EcommerceProviderSettingsPanel(): React.JSX.Element {
  const model = useProviderSettingsPanelModel();

  return (
    <div className='space-y-4'>
      {model.error !== null ? (
        <Alert
          variant='error'
          icon={<XCircle className='size-4' aria-hidden='true' />}
          title='Provider settings update failed'
          description={model.error}
        />
      ) : null}
      <Card variant='outline'>
        <CardHeader className='gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0'>
          <ProviderSettingsTitle
            lastPushedAt={model.meta.lastPushedAt}
            updatedAt={model.meta.updatedAt}
          />
          <ProviderSettingsActions
            isLoading={model.isLoading}
            isSaving={model.isSaving}
            pushToEcommerce={model.pushToEcommerce}
            onPushToEcommerceChange={model.setPushToEcommerce}
            onRefresh={() => {
              void model.loadSettings();
            }}
            onSave={() => {
              void model.handleSave();
            }}
          />
        </CardHeader>
        <CardContent className='space-y-5'>
          <PaymentProviderFields
            disabled={model.isLoading || model.isSaving}
            settings={model.settings.payment.payu}
            onChange={model.updatePayu}
          />
          <ShippingProviderFields
            disabled={model.isLoading || model.isSaving}
            settings={model.settings.shipping}
            onDpdChange={model.updateDpd}
            onInpostChange={model.updateInpost}
            onPocztaPolskaChange={model.updatePocztaPolska}
          />
        </CardContent>
      </Card>
      <ProviderPushResults targets={model.targets} />
    </div>
  );
}

function ProviderSettingsTitle({
  lastPushedAt,
  updatedAt,
}: {
  lastPushedAt: string | null;
  updatedAt: string | null;
}): React.JSX.Element {
  return (
    <div className='min-w-0'>
      <CardTitle className='flex items-center gap-2 text-base'>
        <ShieldCheck className='size-4 text-emerald-400' aria-hidden='true' />
        Payment and Shipping Providers
      </CardTitle>
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Badge variant={updatedAt === null ? 'neutral' : 'active'}>
          Saved {formatDateTime(updatedAt)}
        </Badge>
        <Badge variant={lastPushedAt === null ? 'neutral' : 'info'}>
          Pushed {formatDateTime(lastPushedAt)}
        </Badge>
      </div>
    </div>
  );
}

function ProviderSettingsActions({
  isLoading,
  isSaving,
  onPushToEcommerceChange,
  onRefresh,
  onSave,
  pushToEcommerce,
}: {
  isLoading: boolean;
  isSaving: boolean;
  onPushToEcommerceChange: (value: boolean) => void;
  onRefresh: () => void;
  onSave: () => void;
  pushToEcommerce: boolean;
}): React.JSX.Element {
  return (
    <div className='flex flex-col items-start gap-3 sm:items-end'>
      <div className='flex items-center gap-2 text-sm'>
        <Switch
          aria-label='Push provider settings to ecommerce databases on save'
          checked={pushToEcommerce}
          disabled={isLoading || isSaving}
          onCheckedChange={onPushToEcommerceChange}
        />
        <span>Push to ecommerce databases on save</span>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='outline'
          icon={<RefreshCw className={cn('size-4', isLoading && 'animate-spin')} aria-hidden='true' />}
          disabled={isSaving}
          onClick={onRefresh}
        >
          Refresh
        </Button>
        <Button
          type='button'
          variant='solid'
          icon={<Save className='size-4' aria-hidden='true' />}
          loading={isSaving}
          loadingText='Saving'
          disabled={isLoading}
          onClick={onSave}
        >
          Save settings
        </Button>
      </div>
    </div>
  );
}
