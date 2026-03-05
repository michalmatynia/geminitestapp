'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, Hint, Button, FileUploadTrigger, FileUploadButton } from '@/shared/ui';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';

type LogoWidthSettings = {
  logoWidth: number;
};

export function ThemeLogoSection(): React.JSX.Element {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState<number>(180);
  const previewUrlRef = useRef<string | null>(null);

  useEffect((): (() => void) => {
    return (): void => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleLogoSelect = useCallback((files: File[]): void => {
    const file = files[0];
    if (!file) return;
    setLogoFile(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setLogoPreviewUrl(url);
  }, []);

  return (
    <div className='space-y-3'>
      <Card
        variant='subtle-compact'
        padding='sm'
        className='border-dashed border-border/50 bg-card/30'
      >
        <Hint size='xxs' uppercase className='font-semibold text-gray-500'>
          Logo preview
        </Hint>
        <div className='mt-3 flex items-center justify-center rounded border border-border/40 bg-card/50 p-4'>
          {logoPreviewUrl ? (
            <Image
              src={logoPreviewUrl}
              alt='Logo preview'
              width={Math.max(1, logoWidth)}
              height={Math.max(1, Math.round((logoWidth / 4) * 3))}
              style={{ width: `${logoWidth}px`, height: 'auto' }}
              className='h-auto max-w-full object-contain'
            />
          ) : (
            <div className='text-xs text-gray-500'>No logo selected</div>
          )}
        </div>
      </Card>
      <SettingsFieldsRenderer<LogoWidthSettings>
        fields={[
          {
            key: 'logoWidth',
            label: 'Desktop logo width',
            type: 'range',
            min: 50,
            max: 300,
            suffix: 'px',
          },
        ]}
        values={{ logoWidth }}
        onChange={(vals: Partial<LogoWidthSettings>) => {
          const nextWidth = vals.logoWidth;
          if (typeof nextWidth === 'number') {
            setLogoWidth(nextWidth);
          }
        }}
      />
      <div className='space-y-2'>
        <FileUploadTrigger
          accept='image/*'
          onFilesSelected={(files: File[]) => handleLogoSelect(files)}
          asChild
        >
          <Button
            type='button'
            variant='outline'
            className='flex w-full items-center justify-center rounded border border-border/50 bg-card/30 px-3 py-3 text-xs font-medium text-gray-300 hover:bg-muted/40'
          >
            Image upload box
          </Button>
        </FileUploadTrigger>
        <div className='flex items-center gap-2'>
          <FileUploadButton
            size='sm'
            variant='outline'
            accept='image/*'
            onFilesSelected={(files: File[]) => handleLogoSelect(files)}
          >
            Choose file
          </FileUploadButton>
          <span className='flex-1 truncate text-[11px] text-gray-500'>
            {logoFile?.name ?? 'No file selected'}
          </span>
        </div>
      </div>
    </div>
  );
}
