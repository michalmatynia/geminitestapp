
import { getBlockTypographyStyles } from '../theme-styles';
import { useOptionalSectionBlockData } from './SectionBlockContext';

interface FrontendTextElementSectionProps {
  settings?: Record<string, unknown>;
}

export function FrontendTextElementSection({ settings: propSettings }: FrontendTextElementSectionProps): React.ReactNode {
  const sectionBlockData = useOptionalSectionBlockData();
  const settings = propSettings ?? sectionBlockData?.settings ?? {};
  const text = (settings['textContent'] as string) || '';
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);
  return (
    <section className='m-0 w-full p-0'>
      <p className='m-0 p-0 text-base leading-relaxed text-gray-200' style={typoStyles}>
        {text}
      </p>
    </section>
  );
}
