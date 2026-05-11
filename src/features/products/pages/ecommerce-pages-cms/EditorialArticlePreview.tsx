'use client';

import { type EditorialArticleState } from './editorial-articles-cms.client';

export function EditorialArticlePreview({
  article,
}: {
  article: EditorialArticleState;
}): React.JSX.Element {
  const hasImage = article.imageUrl.trim().length > 0;
  return (
    <div className='relative min-h-72 overflow-hidden rounded-md border bg-muted/30 p-5 text-white'>
      {hasImage ? (
        <img
          alt=''
          className='absolute inset-0 h-full w-full object-cover'
          src={article.imageUrl}
        />
      ) : (
        <div className='absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950' />
      )}
      <div className='absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/75' />
      <div className='relative z-10 flex h-full min-h-60 flex-col justify-end'>
        <span className='mb-4 w-fit rounded border border-white/25 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide'>
          {article.tag.trim().length > 0 ? article.tag : 'Article tag'}
        </span>
        <h3 className='text-2xl font-semibold leading-tight'>
          {article.title.trim().length > 0 ? article.title : 'Article title'}
        </h3>
        <p className='mt-3 line-clamp-4 text-sm leading-6 text-white/70'>
          {article.excerpt.trim().length > 0 ? article.excerpt : 'Short article form'}
        </p>
      </div>
      {!article.visible ? (
        <div className='absolute inset-x-3 top-3 rounded bg-black/70 px-2 py-1 text-center text-xs uppercase tracking-wide text-white'>
          Hidden
        </div>
      ) : null}
    </div>
  );
}
