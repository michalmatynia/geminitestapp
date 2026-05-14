import { AppWindow, GraduationCap, Package, PanelsTopLeft } from 'lucide-react';

import { AdminPageManagerLayout } from '@/shared/ui/admin.public';
import {
  NavigationCard,
  NavigationCardGrid,
} from '@/shared/ui/navigation-and-layout.public';

const pageManagerProjects = [
  {
    title: 'StudiQ',
    description: 'Manage the StudiQ/Kangur learning application pages, CMS builder, lessons, appearance, and settings.',
    href: '/admin/page-manager/studiq',
    icon: <GraduationCap className='size-5' />,
  },
  {
    title: 'Stargater',
    description: 'Manage ecommerce storefront CMS content, discounts, provider settings, and data synchronisation.',
    href: '/admin/page-manager/stargater',
    icon: <Package className='size-5' />,
  },
  {
    title: 'Milkbardesigners',
    description: 'Manage the architecture website content, project catalogue, services, and incoming inquiries.',
    href: '/admin/page-manager/milkbardesigners',
    icon: <PanelsTopLeft className='size-5' />,
  },
] as const;

export function AdminPageManagerHomePage(): React.JSX.Element {
  return (
    <AdminPageManagerLayout
      title='Page Manager'
      current='Overview'
      description='Project-specific page and CMS management for public websites and apps.'
      icon={<AppWindow className='size-4' />}
    >
      <NavigationCardGrid className='grid-cols-1 md:grid-cols-3'>
        {pageManagerProjects.map((project) => (
          <NavigationCard
            key={project.href}
            href={project.href}
            title={project.title}
            description={project.description}
            leading={project.icon}
            padding='none'
            contentClassName='p-6'
            titleClassName='text-xl font-semibold'
            descriptionClassName='mt-2'
          />
        ))}
      </NavigationCardGrid>
    </AdminPageManagerLayout>
  );
}
