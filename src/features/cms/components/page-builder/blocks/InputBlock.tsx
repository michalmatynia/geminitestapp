import { Input } from '@/shared/ui/primitives.public';

export function InputBlock({ settings }: { settings: Record<string, unknown> }) {
  const value = typeof settings['inputValue'] === 'string' ? settings['inputValue'] : '';
  const placeholder = typeof settings['inputPlaceholder'] === 'string' ? settings['inputPlaceholder'] : '';
  
  return (
    <Input
      readOnly
      value={value}
      placeholder={placeholder || 'Input'}
      aria-label={placeholder || 'Input field'}
      className='pointer-events-none w-full'
    />
  );
}
