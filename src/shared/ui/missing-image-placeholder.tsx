import { cn } from '@/shared/utils/ui-utils';

interface MissingImagePlaceholderProps {
  className?: string;
  label?: string;
}

export default function MissingImagePlaceholder({
  className,
  label = 'No image',
}: MissingImagePlaceholderProps): React.JSX.Element {
  return (
    <div
      role='img'
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-md border border-border bg-muted/60 text-[10px] font-medium uppercase tracking-wide text-gray-500',
        className
      )}
    >
      {label}
    </div>
  );
}
