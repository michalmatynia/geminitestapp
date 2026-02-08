
import Link from 'next/link';

import { SectionHeader } from '@/shared/ui';

export default function CmsPage(): React.ReactNode {
  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='CMS'
        description='Welcome to the Content Management System.'
        className='mb-6'
      />
      <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Link href='/admin/cms/slugs' className='block p-6 bg-gray-800 rounded-lg hover:bg-gray-700'>
          <h2 className='text-xl font-bold'>Manage Slugs</h2>
          <p className='mt-2 text-gray-400'>Create and manage URL slugs for your pages.</p>
        </Link>
        <Link href='/admin/cms/zones' className='block p-6 bg-gray-800 rounded-lg hover:bg-gray-700'>
          <h2 className='text-xl font-bold'>Zones (Domains)</h2>
          <p className='mt-2 text-gray-400'>Map domains to their slug sets and defaults.</p>
        </Link>
        <Link href='/admin/cms/pages' className='block p-6 bg-gray-800 rounded-lg hover:bg-gray-700'>
          <h2 className='text-xl font-bold'>Manage Pages</h2>
          <p className='mt-2 text-gray-400'>Create and manage the content of your pages.</p>
        </Link>
        <Link href='/admin/cms/builder' className='block p-6 bg-gray-800 rounded-lg hover:bg-gray-700'>
          <h2 className='text-xl font-bold'>Page Builder</h2>
          <p className='mt-2 text-gray-400'>Visual editor for building pages with components.</p>
        </Link>
        <Link href='/admin/cms/themes' className='block p-6 bg-gray-800 rounded-lg hover:bg-gray-700'>
          <h2 className='text-xl font-bold'>Themes</h2>
          <p className='mt-2 text-gray-400'>Manage color palettes, typography, and spacing presets.</p>
        </Link>
      </div>
    </div>
  );
}
