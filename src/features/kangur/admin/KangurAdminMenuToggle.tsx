'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { Button } from '@/shared/ui';

export function KangurAdminMenuToggle(): React.JSX.Element | null {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMenuHidden(false);
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [setIsMenuHidden]);

  if (!mounted) return null;

  return createPortal(
    <Button
      size='xs'
      type='button'
      variant='outline'
      onClick={() => setIsMenuHidden(!isMenuHidden)}
      title={isMenuHidden ? 'Show side panels' : 'Show canvas only'}
      aria-label={isMenuHidden ? 'Show side panels' : 'Show canvas only'}
      className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
    >
      {isMenuHidden ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
    </Button>,
    document.body
  );
}
