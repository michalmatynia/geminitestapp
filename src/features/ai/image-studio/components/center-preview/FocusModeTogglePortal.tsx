import { Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/shared/ui';
import { useUiActions, useUiState } from '../../context/UiContext';

export function FocusModeTogglePortal(): React.JSX.Element | null {
  const { isFocusMode } = useUiState();
  const { toggleFocusMode } = useUiActions();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <Button
      size='xs'
      type='button'
      variant='outline'
      onClick={toggleFocusMode}
      title={isFocusMode ? 'Show side panels' : 'Show canvas only'}
      aria-label={isFocusMode ? 'Show side panels' : 'Show canvas only'}
      className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
    >
      {isFocusMode ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
    </Button>,
    document.body
  );
}
