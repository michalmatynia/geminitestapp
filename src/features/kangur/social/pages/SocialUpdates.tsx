'use client';

import { CalendarClock, ExternalLink } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurSocialPosts } from '@/features/kangur/social/hooks/useKangurSocialPosts';
import {
  KangurEmptyState,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_INLINE_CENTER_ROW_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_RELAXED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { cn } from '@/features/kangur/shared/utils';

import {
  KANGUR_SOCIAL_BILINGUAL_SEPARATOR,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';

const SOCIAL_UPDATES_MAIN_ID = 'kangur-social-updates-main';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getPostTitle = (post: KangurSocialPost): string =>
  post.titlePl.trim() || post.titleEn.trim() || 'New Kangur update';

const getPostExcerpt = (post: KangurSocialPost): string => {
  const sections = resolvePostSections(post);
  const combined = sections.map((section) => section.body.trim()).filter(Boolean).join(' ');
  if (!combined) return 'Latest product updates from Kangur and StudiQ.';
  return combined.length > 180 ? `${combined.slice(0, 177).trimEnd()}...` : combined;
};

const resolvePostSections = (post: KangurSocialPost): Array<{ label?: string; body: string }> => {
  const pl = post.bodyPl.trim();
  const en = post.bodyEn.trim();
  if (pl || en) {
    return [
      ...(pl ? [{ label: 'PL', body: pl }] : []),
      ...(en ? [{ label: 'EN', body: en }] : []),
    ];
  }

  const combined = post.combinedBody.trim();
  if (!combined) return [];
  const split = combined
    .split(KANGUR_SOCIAL_BILINGUAL_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
  if (split.length <= 1) return [{ body: combined }];
  return split.map((body, index) => ({
    label: split.length === 2 ? (index === 0 ? 'PL' : 'EN') : `Part ${index + 1}`,
    body,
  }));
};

function useSocialUpdatesViewTracking(input: {
  isLoading: boolean;
  latestPost: KangurSocialPost | null;
}): void {
  const { isLoading, latestPost } = input;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    trackKangurClientEvent('kangur_social_updates_view', {
      hasPost: Boolean(latestPost),
      postId: latestPost?.id ?? null,
      hasLinkedinUrl: Boolean(latestPost?.linkedinUrl),
    });
  }, [isLoading, latestPost]);
}

function SocialUpdatesLinkedInLink(props: {
  postId: string;
  url: string;
}): React.JSX.Element {
  const { postId, url } = props;

  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className={`mt-auto ${KANGUR_INLINE_CENTER_ROW_CLASSNAME} text-sm font-semibold [color:var(--kangur-page-text)] hover:underline`}
      onClick={() =>
        trackKangurClientEvent('kangur_social_updates_link_click', {
          postId,
          url,
        })
      }
    >
      View on LinkedIn
      <ExternalLink aria-hidden='true' className='h-4 w-4' />
    </a>
  );
}

function SocialUpdatesPostImage(props: {
  imageAssets: KangurSocialPost['imageAssets'];
  className: string;
}): React.JSX.Element | null {
  const firstImage = props.imageAssets?.[0];
  if (!firstImage?.url) {
    return null;
  }

  return (
    <div className='overflow-hidden rounded-2xl border [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,transparent)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_94%,var(--kangur-page-background))]'>
      <img
        src={firstImage.url}
        alt={firstImage.filename ?? firstImage.id ?? 'Kangur update image'}
        className={props.className}
        loading='lazy'
      />
    </div>
  );
}

function SocialUpdatesPostSections(props: {
  post: KangurSocialPost;
}): React.JSX.Element {
  const sections = resolvePostSections(props.post);

  return (
    <div className='space-y-4 text-sm [color:var(--kangur-page-text)]'>
      {sections.length === 0 ? (
        <p>Latest product updates from Kangur and StudiQ.</p>
      ) : (
        sections.map((section, index, all) => (
          <div key={`${section.label ?? 'section'}-${index}`} className='space-y-2'>
            {section.label ? (
              <div className='text-xs font-semibold uppercase tracking-[0.3em] [color:var(--kangur-page-muted-text)]'>
                {section.label}
              </div>
            ) : null}
            <p className='whitespace-pre-line'>{section.body}</p>
            {index < all.length - 1 ? (
              <div className='border-t border-dashed [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,transparent)]' />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function SocialUpdatesLatestPostCard(props: {
  post: KangurSocialPost;
}): React.JSX.Element {
  const { post } = props;

  return (
    <KangurInfoCard padding='lg' className={KANGUR_STACK_RELAXED_CLASSNAME}>
      <SocialUpdatesPostImage imageAssets={post.imageAssets} className='h-52 w-full object-cover' />
      <div className='text-xs uppercase tracking-[0.2em] [color:var(--kangur-page-muted-text)]'>
        Latest update · {formatDate(post.publishedAt ?? post.updatedAt)}
      </div>
      <div className='text-xl font-semibold [color:var(--kangur-page-text)]'>
        {getPostTitle(post)}
      </div>
      <SocialUpdatesPostSections post={post} />
      {post.linkedinUrl ? <SocialUpdatesLinkedInLink postId={post.id} url={post.linkedinUrl} /> : null}
    </KangurInfoCard>
  );
}

function SocialUpdatesArchiveCard(props: {
  post: KangurSocialPost;
}): React.JSX.Element {
  const { post } = props;

  return (
    <KangurInfoCard padding='md' className='flex h-full flex-col gap-4'>
      <SocialUpdatesPostImage imageAssets={post.imageAssets} className='h-36 w-full object-cover' />
      <div className='space-y-2'>
        <div className='text-xs uppercase tracking-[0.2em] [color:var(--kangur-page-muted-text)]'>
          {formatDate(post.publishedAt ?? post.updatedAt)}
        </div>
        <div className='text-lg font-semibold [color:var(--kangur-page-text)]'>
          {getPostTitle(post)}
        </div>
        <p className='text-sm [color:var(--kangur-page-muted-text)]'>{getPostExcerpt(post)}</p>
      </div>
      {post.linkedinUrl ? <SocialUpdatesLinkedInLink postId={post.id} url={post.linkedinUrl} /> : null}
    </KangurInfoCard>
  );
}

function SocialUpdatesArchive(props: {
  archivePosts: KangurSocialPost[];
}): React.JSX.Element | null {
  const { archivePosts } = props;
  if (archivePosts.length === 0) {
    return null;
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
            Recent updates archive
          </div>
          <div className='text-xs [color:var(--kangur-page-muted-text)]'>
            Earlier published StudiQ and Kangur posts.
          </div>
        </div>
        <div className='text-xs uppercase tracking-[0.2em] [color:var(--kangur-page-muted-text)]'>
          {archivePosts.length} more
        </div>
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        {archivePosts.map((post) => (
          <SocialUpdatesArchiveCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function SocialUpdatesBody(props: {
  archivePosts: KangurSocialPost[];
  latestPost: KangurSocialPost | null;
}): React.JSX.Element {
  const { archivePosts, latestPost } = props;

  if (!latestPost) {
    return (
      <KangurEmptyState
        title='No public updates yet'
        description='Check back soon for the latest Kangur and StudiQ progress updates.'
        icon={<CalendarClock aria-hidden='true' className='h-5 w-5' />}
      />
    );
  }

  return (
    <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
      <SocialUpdatesLatestPostCard post={latestPost} />
      <SocialUpdatesArchive archivePosts={archivePosts} />
    </div>
  );
}

export default function SocialUpdates(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { openLoginModal } = useKangurLoginModal();
  const routeNavigator = useKangurRouteNavigator();
  const postsQuery = useKangurSocialPosts({ scope: 'public', limit: 8 });
  const posts = postsQuery.data ?? [];
  const latestPost = posts[0] ?? null;
  const archivePosts = posts.slice(1);

  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'SocialUpdates' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );

  useSocialUpdatesViewTracking({
    isLoading: postsQuery.isLoading,
    latestPost,
  });

  useKangurRoutePageReady({
    pageKey: 'SocialUpdates',
    ready: true,
  });

  return (
    <KangurStandardPageLayout
      tone='play'
      id='kangur-social-updates-page'
      skipLinkTargetId={SOCIAL_UPDATES_MAIN_ID}
      navigation={<KangurTopNavigationController navigation={navigation} />}
      containerProps={{
        as: 'section',
        id: SOCIAL_UPDATES_MAIN_ID,
        className: cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME),
      }}
    >
      <KangurPageIntroCard
        title='Kangur Social Updates'
        description='Most recent Kangur and StudiQ improvements, ready to share on LinkedIn.'
        showBackButton
        onBack={() =>
          routeNavigator.replace(basePath, {
            pageKey: 'Game',
            sourceId: 'kangur-social:back',
          })
        }
      />

      <SocialUpdatesBody archivePosts={archivePosts} latestPost={latestPost} />
    </KangurStandardPageLayout>
  );
}
