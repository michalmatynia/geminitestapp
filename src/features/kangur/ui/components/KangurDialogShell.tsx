import { cn } from '@/features/kangur/shared/utils';

export const KANGUR_DIALOG_OVERLAY_BASE_CLASSNAME = cn(
  'fixed inset-0 z-50 backdrop-blur-[2px]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
);
export const KANGUR_DIALOG_CONTENT_BASE_CLASSNAME = cn(
  'fixed left-1/2 top-1/2 z-50',
  'kangur-max-h-screen-2 -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
  'outline-none'
);
