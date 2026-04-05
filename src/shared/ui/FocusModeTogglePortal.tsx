'use client';

import { Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils/ui-utils';

import { Button } from './button';

type FocusModeTogglePortalProps = {
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  labelOn?: string;
  labelOff?: string;
  className?: string;
};

const DEFAULT_LABEL_ON = 'Show side panels';
const DEFAULT_LABEL_OFF = 'Show canvas only';

type FocusModeTogglePortalModel = {
  label: string;
  mounted: boolean;
};

function useFocusModeTogglePortalModel({
  isFocusMode,
  labelOn = DEFAULT_LABEL_ON,
  labelOff = DEFAULT_LABEL_OFF,
}: FocusModeTogglePortalProps): FocusModeTogglePortalModel {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = isFocusMode ? labelOn : labelOff;

  return {
    label,
    mounted,
  };
}

function renderFocusModeTogglePortal(
  {
    className,
    isFocusMode,
    onToggleFocusMode,
  }: FocusModeTogglePortalProps,
  { label, mounted }: FocusModeTogglePortalModel
): React.JSX.Element | null {
  if (!mounted) return null;

  return createPortal(
    <Button
      size='xs'
      type='button'
      variant='outline'
      onClick={onToggleFocusMode}
      title={label}
      aria-label={label}
      aria-pressed={isFocusMode}
      className={cn(
        'fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2',
        className
      )}
    >
      {isFocusMode ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
    </Button>,
    document.body
  );
}

export function FocusModeTogglePortal(
  props: FocusModeTogglePortalProps
): React.JSX.Element | null {
  const model = useFocusModeTogglePortalModel(props);
  return renderFocusModeTogglePortal(props, model);
}
