'use client';

import Link from 'next/link';
import { type ReactElement, Suspense } from 'react';

import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import {
  Badge,
  Breadcrumbs,
  Button,
  FormSection,
} from '@/features/kangur/shared/ui';

import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';
import { KangurAiTutorNativeGuideSettingsPanel } from './components/KangurAiTutorNativeGuideSettingsPanel';
import { KangurAiTutorSettingsPanel } from './components/KangurAiTutorSettingsPanel';
import { KangurAdminCard } from './components/KangurAdminCard';
import { renderKangurNarratorSettingsPanel } from './components/KangurNarratorSettingsPanel';
import { KangurPageContentSettingsPanel } from './components/KangurPageContentSettingsPanel';
import { KangurParentVerificationSettingsPanel } from './components/KangurParentVerificationSettingsPanel';
import { useKangurSettings } from './hooks/useKangurSettings';
import { getKangurLaunchTarget } from '@/features/kangur/config/routing';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import {
  KANGUR_GRID_RELAXED_CLASSNAME,
  KANGUR_GRID_ROOMY_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const KANGUR_LAUNCH_ROUTE_OPTIONS = [
  {
    value: 'web_mobile_view',
    label: 'Mobile web view',
    description:
      'Opens the standard Kangur page in the browser. Responsive styling handles the mobile layout.',
  },
  {
    value: 'dedicated_app',
    label: 'Dedicated app',
    description:
      'Offers a native Kangur app handoff on supported learner routes and keeps the web shell as fallback.',
  },
] as const;

export function AdminKangurSettingsPage(): ReactElement {
  const {
    engine,
    setEngine,
    voice,
    setVoice,
    agentPersonaId,
    setAgentPersonaId,
    motionPresetId,
    setMotionPresetId,
    dailyMessageLimitInput,
    setDailyMessageLimitInput,
    guestIntroMode,
    setGuestIntroMode,
    homeOnboardingMode,
    setHomeOnboardingMode,
    parentVerificationResendCooldownInput,
    setParentVerificationResendCooldownInput,
    parentVerificationNotificationsEnabled,
    setParentVerificationNotificationsEnabled,
    parentVerificationRequireEmailVerification,
    setParentVerificationRequireEmailVerification,
    parentVerificationRequireCaptcha,
    setParentVerificationRequireCaptcha,
    parentVerificationNotificationsDisabledUntilInput,
    setParentVerificationNotificationsDisabledUntilInput,
    launchRoute,
    setLaunchRoute,
    copyStatus,
    narratorProbe,
    isProbingNarrator,
    isSaving,
    isDirty,
    handleCopyTemplateText,
    handleProbeNarrator,
    handleSave,
    agentPersonas,
    persistedNarratorSettings,
    parentVerificationNotificationsPausedUntil,
    persistedParentVerificationEmailSettings,
    persistedLaunchRouteSettings,
  } = useKangurSettings();
  const activeLaunchTarget = getKangurLaunchTarget(launchRoute);
  const persistedLaunchRouteLabel =
    persistedLaunchRouteSettings.route === 'dedicated_app' ? 'Dedicated app' : 'Mobile web view';
  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Kangur', href: '/admin/kangur' },
    { label: 'Settings' },
  ];

  return (
    <KangurAdminContentShell
      title='Kangur Settings'
      description={
        <div className='flex flex-wrap items-center gap-3'>
          <AdminFavoriteBreadcrumbRow>
            <Breadcrumbs items={breadcrumbs} className='mt-0' />
          </AdminFavoriteBreadcrumbRow>
          <span className='hidden h-4 w-px bg-white/12 md:block' />
          <span className='text-xs text-slate-300/80'>
            Manage launch routing, storefront theme, AI Tutor, narration, and parent verification
            behavior across Kangur.
          </span>
        </div>
      }
      breadcrumbs={breadcrumbs}
      headerLayout='stacked'
      className='mx-0 max-w-none px-0 py-0'
      panelVariant='flat'
      panelClassName='rounded-none'
      showBreadcrumbs={false}
      headerActions={
        <>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/kangur/documentation'>Documentation</Link>
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving}
            data-doc-id='settings_save'
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </>
      }
    >
      <div id='kangur-admin-settings-page' className='space-y-8'>
        <div className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-2`}>
          <FormSection
            title='Storefront Theme'
            description='Edit daily and nightly Kangur themes. Mongo-backed theme settings are the only active Kangur styling source at runtime.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <KangurAdminCard>
              <div className='flex items-center justify-between gap-4'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>
                    Daily &amp; nightly themes
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Customise colours, typography, spacing, and surface tokens for the Kangur
                    storefront. Runtime class overrides are disabled; the Styling Engine theme in
                    Mongo is now the canonical source.
                  </p>
                </div>
                <Button asChild variant='outline' size='sm' className='shrink-0'>
                  <Link href='/admin/kangur/appearance'>Open theme editor</Link>
                </Button>
              </div>
            </KangurAdminCard>
          </FormSection>

          <FormSection
            title='App launch route'
            description='Switch the default Kangur launch target between the responsive website and the dedicated mobile app.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <KangurAdminCard>
              <div className='space-y-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='text-sm font-semibold text-foreground'>Default launch route</div>
                  <Badge variant={launchRoute === 'dedicated_app' ? 'warning' : 'secondary'}>
                    {launchRoute === 'dedicated_app' ? 'Dedicated app' : 'Mobile web view'}
                  </Badge>
                </div>

                <div
                  role='group'
                  aria-label='Kangur launch route'
                  className='grid gap-3 md:grid-cols-2'
                >
                  {KANGUR_LAUNCH_ROUTE_OPTIONS.map((option) => {
                    const isActive = launchRoute === option.value;
                    return (
                      <Button
                        key={option.value}
                        type='button'
                        variant={isActive ? 'secondary' : 'outline'}
                        aria-pressed={isActive}
                        className='h-auto min-h-28 w-full flex-col items-start justify-start gap-3 whitespace-normal px-4 py-4 text-left'
                        onClick={() => setLaunchRoute(option.value)}
                        data-doc-id={`settings_launch_route_${option.value}`}
                      >
                        <div className='flex w-full items-start justify-between gap-3'>
                          <span className='text-sm font-semibold text-foreground'>
                            {option.label}
                          </span>
                          {option.value === 'web_mobile_view' ? (
                            <Badge variant='outline'>Default</Badge>
                          ) : null}
                        </div>
                        <span className='text-xs leading-relaxed text-muted-foreground'>
                          {option.description}
                        </span>
                      </Button>
                    );
                  })}
                </div>

                <div className='rounded-2xl border border-border/60 bg-background/50 px-4 py-3'>
                  <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                    <span className='font-semibold text-foreground'>Primary target</span>
                    <code className='rounded-md bg-background/80 px-2 py-1 text-[11px] text-foreground'>
                      {activeLaunchTarget.href}
                    </code>
                    {activeLaunchTarget.href !== activeLaunchTarget.fallbackHref ? (
                      <>
                        <span className='font-semibold text-foreground'>Fallback web route</span>
                        <code className='rounded-md bg-background/80 px-2 py-1 text-[11px] text-foreground'>
                          {activeLaunchTarget.fallbackHref}
                        </code>
                      </>
                    ) : null}
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    <Button asChild variant='outline' size='sm'>
                      <a href={activeLaunchTarget.href}>Open selected route</a>
                    </Button>
                    {activeLaunchTarget.href !== activeLaunchTarget.fallbackHref ? (
                      <Button asChild variant='ghost' size='sm'>
                        <a href={activeLaunchTarget.fallbackHref}>Open fallback web route</a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </KangurAdminCard>
          </FormSection>

        </div>

        {renderKangurNarratorSettingsPanel({
          engine,
          voice,
          setEngine,
          setVoice,
          copyStatus,
          onCopyTemplateText: () => void handleCopyTemplateText(),
          isProbingNarrator,
          onProbeNarrator: () => {
            void handleProbeNarrator();
          },
          narratorProbe,
          className: SETTINGS_SECTION_CLASS_NAME,
        })}

        <KangurAiTutorSettingsPanel
          agentPersonaId={agentPersonaId}
          setAgentPersonaId={setAgentPersonaId}
          motionPresetId={motionPresetId}
          setMotionPresetId={setMotionPresetId}
          dailyMessageLimitInput={dailyMessageLimitInput}
          setDailyMessageLimitInput={setDailyMessageLimitInput}
          guestIntroMode={guestIntroMode}
          setGuestIntroMode={setGuestIntroMode}
          homeOnboardingMode={homeOnboardingMode}
          setHomeOnboardingMode={setHomeOnboardingMode}
          agentPersonas={agentPersonas}
          className={SETTINGS_SECTION_CLASS_NAME}
        />

        <KangurParentVerificationSettingsPanel
          requireEmailVerification={parentVerificationRequireEmailVerification}
          setRequireEmailVerification={setParentVerificationRequireEmailVerification}
          requireCaptcha={parentVerificationRequireCaptcha}
          setRequireCaptcha={setParentVerificationRequireCaptcha}
          notificationsEnabled={parentVerificationNotificationsEnabled}
          setNotificationsEnabled={setParentVerificationNotificationsEnabled}
          notificationsDisabledUntilInput={parentVerificationNotificationsDisabledUntilInput}
          setNotificationsDisabledUntilInput={setParentVerificationNotificationsDisabledUntilInput}
          resendCooldownInput={parentVerificationResendCooldownInput}
          setResendCooldownInput={setParentVerificationResendCooldownInput}
          notificationsPausedUntil={parentVerificationNotificationsPausedUntil}
          className={SETTINGS_SECTION_CLASS_NAME}
        />

        <div className='space-y-6'>
          <div>
            <div className='text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
              Content &amp; Guidance
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              Refine onboarding copy, page content, and native guide instructions used across Kangur.
            </p>
          </div>
          <KangurAdminCard>
            <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
              <div className='space-y-1'>
                <div className='text-sm font-semibold text-foreground'>AI Tutor content</div>
                <p className='text-sm text-muted-foreground'>
                  Edit the Mongo-backed tutor copy pack in the dedicated AI Tutor content workspace.
                </p>
              </div>
              <Badge variant='outline'>Dedicated page</Badge>
            </div>
            <Button asChild variant='outline' size='sm' className='mt-4'>
              <Link href='/admin/kangur/settings/ai-tutor-content'>Open AI Tutor content</Link>
            </Button>
          </KangurAdminCard>
          <Suspense fallback={<KangurAppLoader visible={true} />}>
            <KangurPageContentSettingsPanel />
          </Suspense>
          <Suspense fallback={<KangurAppLoader visible={true} />}>
            <KangurAiTutorNativeGuideSettingsPanel />
          </Suspense>
        </div>

        <div
          className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]`}
        >
          <FormSection
            title='Operations & Observability'
            description='Quick access to Kangur telemetry, summary health, and log triage surfaces.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} lg:grid-cols-3`}>
              <KangurAdminCard>
                <div className='text-sm font-semibold text-foreground'>Observability dashboard</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Open the dedicated Kangur dashboard with alerts, route health, client telemetry,
                  recent server logs, and the latest performance baseline.
                </p>
                <Button asChild variant='outline' size='sm' className='mt-4'>
                  <Link href='/admin/kangur/observability'>Open observability dashboard</Link>
                </Button>
              </KangurAdminCard>

              <KangurAdminCard>
                <div className='text-sm font-semibold text-foreground'>Kangur system logs</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Jump into System Logs scoped to Kangur events. Saved presets available there:
                  Kangur, Kangur Auth, Kangur Progress, and Kangur TTS.
                </p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Button asChild variant='outline' size='sm'>
                    <Link href='/admin/system/logs?query=kangur.'>Open Kangur logs</Link>
                  </Button>
                  <Button asChild variant='ghost' size='sm'>
                    <Link href='/admin/system/logs?source=kangur.tts.fallback'>TTS fallbacks</Link>
                  </Button>
                </div>
              </KangurAdminCard>

              <KangurAdminCard>
                <div className='text-sm font-semibold text-foreground'>Raw summary and runbook</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Use the summary API for direct payload inspection. Operational steps live in{' '}
                  <span className='font-mono text-xs text-foreground'>
                    docs/kangur/observability-and-operations.md
                  </span>
                  .
                </p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Button asChild variant='outline' size='sm'>
                    <Link href='/api/kangur/observability/summary?range=24h'>
                      Open 24h summary JSON
                    </Link>
                  </Button>
                  <Button asChild variant='ghost' size='sm'>
                    <Link href='/api/kangur/observability/summary?range=7d'>
                      Open 7d summary JSON
                    </Link>
                  </Button>
                </div>
              </KangurAdminCard>
            </div>
          </FormSection>

          <KangurAdminStatusCard
            title='Status'
            statusBadge={
              <Badge variant={isDirty ? 'warning' : 'secondary'}>
                {isDirty ? 'Unsaved changes' : 'All settings in sync'}
              </Badge>
            }
          >
            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              <span>Saved state</span>
              <Badge variant='outline'>{persistedNarratorSettings.engine}</Badge>
              <Badge variant='outline'>
                Parent email cooldown {persistedParentVerificationEmailSettings.resendCooldownSeconds}s
              </Badge>
              <Badge variant='outline'>{persistedLaunchRouteLabel}</Badge>
            </div>
          </KangurAdminStatusCard>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}

export default AdminKangurSettingsPage;
