'use client';

import { XIcon } from 'lucide-react';
import React, { useEffect } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { SectionHeader } from './section-header';

interface DrawerProps {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  width?: string | number;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  position?: 'left' | 'right';
  showClose?: boolean;
}

/**
 * Standardized Drawer component for floating side panels with backdrop.
 */
export function Drawer({
  children,
  open,
  onClose,
  title,
  description,
  actions,
  width = 448, // Default to max-w-md (448px)
  className,
  headerClassName,
  contentClassName,
  position = 'right',
  showClose = true,
}: DrawerProps): React.JSX.Element | null {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const drawerWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <div className='fixed inset-0 z-[70]'>
      {/* Backdrop */}
      <div 
        className='absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity' 
        onClick={onClose} 
      />
      
      {/* Panel */}
      <aside
        className={cn(
          'absolute top-0 h-full bg-gray-950 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col',
          position === 'right' ? 'right-0 border-l border-border' : 'left-0 border-r border-border',
          className
        )}
        style={{ width: drawerWidth }}
      >
        {(title || showClose) && (
          <div className={cn('flex items-center justify-between border-b border-border px-4 py-3', headerClassName)}>
            <SectionHeader
              title={title}
              description={description}
              size='xs'
              className='flex-1'
            />
            <div className='flex items-center gap-2 ml-4'>
              {actions}
              {showClose && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onClose}
                  className='h-7 w-7'
                  aria-label='Close drawer'
                >
                  <XIcon className='size-4' />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className={cn('flex-1 overflow-y-auto p-4', contentClassName)}>
          {children}
        </div>
      </aside>
    </div>
  );
}
