import { Button, Tooltip } from '@/shared/ui/primitives.public';
import { accentOptions, type AccentType } from './types';

export function AccentPalette({
  accent,
  setAccent,
}: {
  accent: AccentType;
  setAccent: (accent: AccentType) => void;
}) {
  return (
    <div className='grid grid-cols-5 gap-2'>
      {accentOptions.map((option) => (
        <Tooltip key={option.value} content={option.label}>
          <Button
            onClick={() => setAccent(option.value as AccentType)}
            className={`group relative flex items-center justify-center rounded-lg px-3 py-2 transition-all ${
              accent === option.value
                ? 'ring-2 ring-offset-2 ring-offset-gray-950 ring-white'
                : 'border hover:border-border/60'
            }`}
            aria-label={`Select ${option.label} accent color`}
            title={option.label}
          >
            <div className={`size-6 rounded-md ${option.color}`} />
          </Button>
        </Tooltip>
      ))}
    </div>
  );
}
