import { NavigationCard, NavigationCardGrid, SectionHeader } from '@/shared/ui';

const cmsTools = [
  {
    title: 'Manage Slugs',
    description: 'Create and manage URL slugs for your pages.',
    href: '/admin/cms/slugs',
  },
  {
    title: 'Zones (Domains)',
    description: 'Map domains to their slug sets and defaults.',
    href: '/admin/cms/zones',
  },
  {
    title: 'Manage Pages',
    description: 'Create and manage the content of your pages.',
    href: '/admin/cms/pages',
  },
  {
    title: 'Page Builder',
    description: 'Visual editor for building pages with components.',
    href: '/admin/cms/builder',
  },
  {
    title: 'Themes',
    description: 'Manage color palettes, typography, and spacing presets.',
    href: '/admin/cms/themes',
  },
] as const;

export default function CmsPage(): React.ReactNode {
  return (
    <div className='page-section'>
      <SectionHeader
        title='CMS'
        description='Welcome to the Content Management System.'
        className='mb-6'
      />
      <section aria-labelledby='cms-tools-heading' className='mt-6 space-y-4'>
        <h2 id='cms-tools-heading' className='text-lg font-semibold tracking-tight'>
          CMS tools
        </h2>
        <NavigationCardGrid className='grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
          {cmsTools.map((tool) => (
            <NavigationCard
              key={tool.href}
              href={tool.href}
              title={tool.title}
              description={tool.description}
              className='hover:bg-gray-700/50'
              titleClassName='text-xl font-bold'
              descriptionClassName='mt-2'
              padding='none'
              contentClassName='p-6'
            />
          ))}
        </NavigationCardGrid>
      </section>
    </div>
  );
}
