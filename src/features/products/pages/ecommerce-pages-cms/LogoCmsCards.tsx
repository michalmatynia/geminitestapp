'use client';

import { AlertTriangle, CheckCircle2, ImageIcon, RefreshCw, UploadCloud } from 'lucide-react';

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/ui/primitives.public';

type LogoState = {
  logoUrl: string;
  logoAlt: string;
  updatedAt: string | null;
  updatedBy: string | null;
  cloudConfigured: boolean;
  localPublicPath?: string;
};

export type LogoController = {
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRefreshClick: () => void;
  handleUploadClick: () => void;
  isLoading: boolean;
  isSaving: boolean;
  logo: LogoState | null;
  logoAlt: string;
  previewUrl: string;
  selectedFile: File | null;
  setLogoAlt: (value: string) => void;
};

const formatUpdatedAt = (value: string | null): string => {
  if (value === null) return 'Never saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function LogoUploadCard({ controller }: { controller: LogoController }): React.JSX.Element {
  return (
    <Card className='max-w-xl'>
      <CardHeader className='space-y-1'>
        <CardTitle className='text-base'>Logo</CardTitle>
        <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
          <span>Local MongoDB</span>
          <span>FastComet: cms/stargater/logo</span>
          <span>Ecommerce cloud mirror</span>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {controller.error !== null ? <Alert variant='error'>{controller.error}</Alert> : null}
        <LogoFileField controller={controller} />
        <LogoAltField controller={controller} />
        <LogoActions controller={controller} />
      </CardContent>
    </Card>
  );
}

function LogoFileField({ controller }: { controller: LogoController }): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='ecommerce-pages-logo-file'>Logo file</Label>
      <Input
        ref={controller.fileInputRef}
        id='ecommerce-pages-logo-file'
        type='file'
        accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
        disabled={controller.isSaving}
        onChange={controller.handleFileChange}
      />
    </div>
  );
}

function LogoAltField({ controller }: { controller: LogoController }): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='ecommerce-pages-logo-alt'>Alt text</Label>
      <Input
        id='ecommerce-pages-logo-alt'
        value={controller.logoAlt}
        disabled={controller.isSaving}
        onChange={(event) => controller.setLogoAlt(event.target.value)}
        placeholder='Store logo'
      />
    </div>
  );
}

function LogoActions({ controller }: { controller: LogoController }): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button type='button' onClick={controller.handleUploadClick}
        disabled={controller.isSaving || controller.selectedFile === null}>
        {controller.isSaving ? (
          <RefreshCw className='mr-2 size-4 animate-spin' />
        ) : (
          <UploadCloud className='mr-2 size-4' />
        )}
        Save logo
      </Button>
      <Button type='button' variant='outline' onClick={controller.handleRefreshClick}
        disabled={controller.isLoading || controller.isSaving}>
        <RefreshCw className={`mr-2 size-4 ${controller.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

export function LogoPreviewCard({
  controller,
}: {
  controller: LogoController;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className='space-y-1'>
        <CardTitle className='text-base'>Current Logo</CardTitle>
        <div className='text-xs text-muted-foreground'>
          Updated: {formatUpdatedAt(controller.logo?.updatedAt ?? null)}
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <LogoPreviewImage logoAlt={controller.logoAlt} previewUrl={controller.previewUrl} />
        <LogoStatusGrid logo={controller.logo} />
        <LogoPaths logo={controller.logo} />
      </CardContent>
    </Card>
  );
}

function LogoPreviewImage(props: {
  logoAlt: string;
  previewUrl: string;
}): React.JSX.Element {
  const alt = props.logoAlt.length > 0 ? props.logoAlt : 'Store logo preview';
  return (
    <div className='flex min-h-44 items-center justify-center rounded-md border bg-muted/30 p-4'>
      {props.previewUrl.length > 0 ? (
        <img src={props.previewUrl} alt={alt} className='max-h-40 max-w-full object-contain' />
      ) : (
        <div className='flex flex-col items-center gap-2 text-sm text-muted-foreground'>
          <ImageIcon className='size-8' />
          <span>No logo saved</span>
        </div>
      )}
    </div>
  );
}

function LogoStatusGrid({ logo }: { logo: LogoState | null }): React.JSX.Element {
  const isCloudConfigured = logo?.cloudConfigured === true;
  return (
    <div className='grid gap-2 text-sm md:grid-cols-2'>
      <div className='rounded-md border p-3'>
        <div className='text-xs text-muted-foreground'>Cloud mirror</div>
        <div className='mt-1 flex items-center gap-2'>
          {isCloudConfigured ? (
            <CheckCircle2 className='size-4 text-emerald-500' />
          ) : (
            <AlertTriangle className='size-4 text-amber-500' />
          )}
          <span>{isCloudConfigured ? 'Configured' : 'Not configured'}</span>
        </div>
      </div>
      <div className='rounded-md border p-3'>
        <div className='text-xs text-muted-foreground'>Updated by</div>
        <div className='mt-1 truncate'>{logo?.updatedBy ?? 'Unknown'}</div>
      </div>
    </div>
  );
}

function LogoPaths({ logo }: { logo: LogoState | null }): React.JSX.Element | null {
  const logoUrl = logo?.logoUrl ?? '';
  const localPublicPath = logo?.localPublicPath ?? '';
  if (logoUrl.length === 0) return null;
  return (
    <div className='space-y-1 text-xs text-muted-foreground'>
      <div className='break-all'>Remote: {logoUrl}</div>
      {localPublicPath.length > 0 ? (
        <div className='break-all'>Local: {localPublicPath}</div>
      ) : null}
    </div>
  );
}
