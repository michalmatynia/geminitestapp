import { CmsPageRenderer } from '@/features/cms/components/frontend/CmsPageRenderer';
import { getMediaInlineStyles, getMediaStyleVars } from '@/features/cms/components/frontend/theme-styles';

export function HomeCmsDefaultContent({
  themeSettings,
  colorSchemes,
  hasCmsContent,
  defaultSlug,
  rendererComponents,
}: {
  themeSettings: Parameters<typeof getMediaStyleVars>[0];
  colorSchemes: React.ComponentProps<typeof CmsPageRenderer>['colorSchemes'];
  hasCmsContent: boolean;
  defaultSlug: string;
  rendererComponents: React.ComponentProps<typeof CmsPageRenderer>['components'];
}): React.JSX.Element {
  return (
    hasCmsContent ? (
      <CmsPageRenderer
        components={rendererComponents}
        colorSchemes={colorSchemes}
        layout={{ fullWidth: Boolean(themeSettings.fullWidth) }}
        hoverEffect={themeSettings.enableAnimations ? themeSettings.hoverEffect : undefined}
        hoverScale={themeSettings.enableAnimations ? themeSettings.hoverScale : undefined}
        mediaVars={getMediaStyleVars(themeSettings)}
        mediaStyles={getMediaInlineStyles(themeSettings)}
      />
    ) : (
      <section className='w-full py-12'>
        <div className='container px-4 md:px-6'>
          <h1 className='text-3xl font-bold'>
            Welcome to {defaultSlug}
          </h1>
        </div>
      </section>
    )
  );
}
