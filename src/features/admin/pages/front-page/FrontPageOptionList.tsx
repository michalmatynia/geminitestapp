import { Button, Badge } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';
import { FRONT_PAGE_OPTIONS, type FrontPageOption, type FrontPageSelectableApp } from '@/shared/lib/front-page-app';

export function FrontPageOptionList({
  selected,
  setSelected,
}: {
  selected: FrontPageSelectableApp;
  setSelected: (value: FrontPageSelectableApp) => void;
}): React.ReactNode {
  return (
    <div className='grid gap-3'>
      {FRONT_PAGE_OPTIONS.map((option: FrontPageOption) => (
        <Button
          key={option.id}
          type='button'
          onClick={() => setSelected(option.id)}
          aria-pressed={selected === option.id}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
            selected === option.id
              ? 'border-blue-500/60 bg-blue-500/10 text-white'
              : 'border-border bg-card/40 text-gray-200 hover:border'
          )}
        >
          <div>
            <div className='text-base font-semibold'>{option.title}</div>
            <div className='text-xs text-gray-400'>{option.description}</div>
          </div>
          <Badge
            variant={selected === option.id ? 'active' : 'outline'}
            className={cn(
              'h-auto px-2 py-0.5 text-[10px] uppercase tracking-wide',
              selected === option.id
                ? 'border-blue-500/60 text-blue-200'
                : 'border-white/10 text-gray-400'
            )}
          >
            {option.route}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
