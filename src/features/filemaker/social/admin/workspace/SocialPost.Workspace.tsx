'use client';

import React from 'react';

import { SocialPostContentTypeSelector } from './SocialPost.ContentTypeSelector';
import { SocialPostPipeline } from './SocialPost.Pipeline';
import { SocialArticleAggregatorPanel } from './SocialPost.ArticleAggregatorPanel';
import { useSocialPostContext } from './SocialPostContext';

export function SocialPostWorkspace(): React.JSX.Element {
  const { activePost } = useSocialPostContext();
  const contentType = activePost?.contentType ?? 'social-pipeline';

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-end px-1'>
        <SocialPostContentTypeSelector />
      </div>
      {contentType === 'article-aggregator' ? (
        <SocialArticleAggregatorPanel />
      ) : (
        <SocialPostPipeline />
      )}
    </div>
  );
}
