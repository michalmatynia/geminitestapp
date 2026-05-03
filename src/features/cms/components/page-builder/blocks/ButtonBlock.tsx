import { Button } from '@/shared/ui/primitives.public';

export function ButtonBlock({ settings }: { settings: Record<string, unknown> }) {
  const label = (settings['buttonLabel'] as string) || 'Button';
  const style = (settings['buttonStyle'] as string) || 'solid';

  return (
    <button
      type='button'
      disabled
      className={`pointer-events-none inline-flex rounded-md px-6 py-2.5 text-sm font-semibold transition ${style === 'outline' ? 'border-2 border-white text-white' : 'bg-white text-gray-900'}`}
    >
      {label}
    </button>
  );
}
