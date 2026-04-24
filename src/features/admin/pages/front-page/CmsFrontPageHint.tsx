import Link from 'next/link';

export function CmsFrontPageHint() {
  return (
    <div className='rounded-xl border border-border/40 bg-card/20 px-4 py-3 text-sm text-gray-300'>
      <div className='font-medium text-white'>StudiQ on HOME</div>
      <div className='mt-1 text-gray-400'>
        Select <span className='font-medium text-white'>StudiQ</span> above for the full app as
        HOME. Keep CMS Home only when you want StudiQ embedded inside the default HOME page
        template zone with CMS content around it.
      </div>
      <div className='mt-3 flex flex-wrap gap-3 text-xs'>
        <Link href='/admin/cms/pages' className='text-blue-300 hover:text-blue-200'>
          Open CMS pages
        </Link>
        <Link href='/admin/app-embeds' className='text-blue-300 hover:text-blue-200'>
          Open App Embeds
        </Link>
      </div>
    </div>
  );
}
