import React from 'react';
import { PreviewSectionProvider, type PreviewSectionContextValue } from '../context/PreviewSectionContext';
import { 
  PreviewImageWithTextSection,
  PreviewHeroSection,
  PreviewRichTextSection,
} from './PreviewSectionVariants';
import { PreviewGridSection } from './PreviewGridSection';
import { PreviewSlideshowSection } from './PreviewSlideshowSection';
import { type SectionInstance } from '@/shared/contracts/cms';

type StandardSectionProps = {
  section: SectionInstance;
  sectionContextValue: PreviewSectionContextValue;
};

export const PreviewStandardSection: React.FC<StandardSectionProps> = ({
  section,
  sectionContextValue,
}): React.JSX.Element | null => {
  const providers = (node: React.ReactNode): React.JSX.Element => (
    <PreviewSectionProvider value={sectionContextValue}>{node}</PreviewSectionProvider>
  );

  switch (section.type) {
    case 'Slideshow':
      return providers(<PreviewSlideshowSection />);
    case 'Grid':
      return providers(<PreviewGridSection />);
    case 'ImageWithText':
      return providers(<PreviewImageWithTextSection />);
    case 'Hero':
      return providers(<PreviewHeroSection />);
    case 'RichText':
      return providers(<PreviewRichTextSection />);
    default:
      return null;
  }
};
