'use client';

import { CalendarClock, ExternalLink } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurSocialPosts } from '@/features/kangur/ui/hooks/useKangurSocialPosts';
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

export default function SocialUpdates(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { openLoginModal } = useKangurLoginModal();
  const routeNavigator = useKangurRouteNavigator();
  const postsQuery = useKangurSocialPosts({ scope: 'public', limit: 1 });
  const posts = postsQuery.data ?? [];
  const latestPost = posts[0] ?? null;
  const latestPostSections = latestPost ? resolvePostSections(latestPost) : [];

  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'SocialUpdates' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onCreateAccount: () => openLoginModal(null, { authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );

  useKangurRoutePageReady({
    pageKey: 'SocialUpdates',
    ready: true,
  });

  useEffect(() => {
    if (postsQuery.isLoading) return;
    trackKangurClientEvent('kangur_social_updates_view', {
      hasPost: Boolean(latestPost),
      postId: latestPost?.id ?? null,
      hasLinkedinUrl: Boolean(latestPost?.linkedinUrl),
    });
  }, [latestPost, postsQuery.isLoading]);

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

      {!latestPost ? (
        <KangurEmptyState
          title='No public updates yet'
          description='Check back soon for the latest Kangur and StudiQ progress updates.'
          icon={<CalendarClock className='h-5 w-5' />}
        />
      ) : (
        <KangurInfoCard padding='lg' className={KANGUR_STACK_RELAXED_CLASSNAME}>
          {latestPost.imageAssets?.[0]?.url ? (
            <div className='overflow-hidden rounded-2xl border border-white/10 bg-black/10'>
              <img
                src={latestPost.imageAssets[0].url}
                alt={
                  latestPost.imageAssets[0].filename ??
                  latestPost.imageAssets[0].id ??
                  'Kangur update image'
                }
                className='h-52 w-full object-cover'
                loading='lazy'
              />
            </div>
          ) : null}
          <div className='text-xs uppercase tracking-[0.2em] text-white/60'>
            {formatDate(latestPost.publishedAt ?? latestPost.updatedAt)}
          </div>
          <div className='text-xl font-semibold text-white'>{getPostTitle(latestPost)}</div>
          <div className='space-y-4 text-sm text-white/80'>
            {latestPostSections.length === 0 ? (
              <p>Latest product updates from Kangur and StudiQ.</p>
            ) : (
              latestPostSections.map((section, index, all) => (
                <div key={`${section.label ?? 'section'}-${index}`} className='space-y-2'>
                  {section.label ? (
                    <div className='text-xs font-semibold uppercase tracking-[0.3em] text-white/50'>
                      {section.label}
                    </div>
                  ) : null}
                  <p className='whitespace-pre-line'>{section.body}</p>
                  {index < all.length - 1 ? (
                    <div className='border-t border-dashed border-white/20' />
                  ) : null}
                </div>
              ))
            )}
          </div>
          {latestPost.linkedinUrl ? (
            <a
              href={latestPost.linkedinUrl}
              target='_blank'
              rel='noreferrer'
              className={`mt-auto ${KANGUR_INLINE_CENTER_ROW_CLASSNAME} text-sm font-semibold text-white hover:underline`}
              onClick={() =>
                trackKangurClientEvent('kangur_social_updates_link_click', {
                  postId: latestPost.id,
                  url: latestPost.linkedinUrl,
                })
              }
            >
              View on LinkedIn
              <ExternalLink className='h-4 w-4' />
            </a>
          ) : null}
        </KangurInfoCard>
      )}
    </KangurStandardPageLayout>
  );
}
