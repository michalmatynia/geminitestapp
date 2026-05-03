import { getBlockTypographyStyles } from '../frontend/theme-styles';

export function TextBlock({ settings }: { settings: Record<string, unknown> }) {
  const text = (settings['textContent'] as string) || '';
  const typoStyles = getBlockTypographyStyles(settings);
  
  if (!text.trim()) return <p className='text-sm italic text-gray-500'>Add text content...</p>;

  return (
    <p className='text-base leading-relaxed text-gray-300 md:text-lg' style={typoStyles}>
      {text}
    </p>
  );
}
