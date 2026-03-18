'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/utils';

const ACCESSIBILITY_FEATURES = [
  'Use Tab and Shift+Tab to move across interactive elements with a visible focus ring.',
  'A “Skip to content” link appears at the top of the page when you start tabbing.',
  'After navigation we announce the new page and focus the main content region.',
  'Dialogs and menus keep focus inside and close with the Escape key.',
];

export function SiteAccessibilityPanel(): JSX.Element | null {
  const pathname = usePathname();
  const isKangurRoute = pathname?.startsWith('/kangur');
  const [isKangurShell, setIsKangurShell] = useState(() =>
    typeof document !== 'undefined' && document.body.dataset.kangurShell === 'true'
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const checkShell = () => {
      setIsKangurShell(document.body.dataset.kangurShell === 'true');
    };

    checkShell();

    const observer = new MutationObserver(checkShell);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-kangur-shell'],
    });

    return () => observer.disconnect();
  }, []);

  if (isKangurRoute || isKangurShell) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-auto z-40 flex items-center justify-end',
        'fixed top-4 right-4 max-sm:top-2 max-sm:right-2'
      )}
    >
      <Dialog>
        <DialogTrigger asChild>
          <Button
            aria-label='Open accessibility panel'
            className='uppercase tracking-wide'
            size='sm'
            variant='outline'
          >
            Accessibility
          </Button>
        </DialogTrigger>
        <DialogContent className='max-w-lg rounded-2xl'>
          <DialogHeader>
            <DialogTitle>Accessibility guide</DialogTitle>
            <DialogDescription>
              Shortcuts and behaviors that make the StudiQ experience easier to navigate with a keyboard or screen reader.
            </DialogDescription>
          </DialogHeader>
          <ul className='list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
            {ACCESSIBILITY_FEATURES.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <div className='flex justify-end'>
            <DialogClose asChild>
              <Button variant='primary' size='sm'>
                Got it
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
