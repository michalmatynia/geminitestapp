'use client';

import Link from 'next/link';
import { type ReactElement, Suspense } from 'react';

import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  FormSection,
} from '@/features/kangur/shared/ui';

import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';
import { KangurAiTutorNativeGuideSettingsPanel } from './components/KangurAiTutorNativeGuideSettingsPanel';
import { KangurAiTutorSettingsPanel } from './components/KangurAiTutorSettingsPanel';
import { KangurClassOverridesSettingsPanel } from './components/KangurClassOverridesSettingsPanel';
import { KangurNarratorSettingsPanel } from './components/KangurNarratorSettingsPanel';
import { KangurPageContentSettingsPanel } from './components/KangurPageContentSettingsPanel';
import { KangurParentVerificationSettingsPanel } from './components/KangurParentVerificationSettingsPanel';
import { useKangurSettings } from './hooks/useKangurSettings';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import {
  KANGUR_GRID_RELAXED_CLASSNAME,
  KANGUR_GRID_ROOMY_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const SETTINGS_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-card/40 shadow-sm';

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
  } = useKangurSettings();
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
            Manage storefront theme, class overrides, AI Tutor, narration, and parent verification
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
            description='Edit daily and nightly Kangur themes. Changes auto-save to Mongo and apply immediately to the live app.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
              <div className='flex items-center justify-between gap-4'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>
                    Daily &amp; nightly themes
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Customise colours, typography, and spacing for both the day and night variants of
                    the Kangur storefront. Includes a reset-to-default option per theme.
                  </p>
                </div>
                <Button asChild variant='outline' size='sm' className='shrink-0'>
                  <Link href='/admin/kangur/appearance'>Open theme editor</Link>
                </Button>
              </div>
            </Card>
          </FormSection>

          <FormSection
            title='Class Overrides'
            description='Attach extra Tailwind classes to Kangur shells and root surfaces through Mongo.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <Suspense fallback={<KangurAppLoader visible={true} />}>
              <KangurClassOverridesSettingsPanel />
            </Suspense>
          </FormSection>
        </div>

        <KangurNarratorSettingsPanel
          engine={engine}
          voice={voice}
          setEngine={setEngine}
          setVoice={setVoice}
          copyStatus={copyStatus}
          onCopyTemplateText={() => void handleCopyTemplateText()}
          isProbingNarrator={isProbingNarrator}
          onProbeNarrator={() => {
            void handleProbeNarrator();
          }}
          narratorProbe={narratorProbe}
          className={SETTINGS_SECTION_CLASS_NAME}
        />

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
          <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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
          </Card>
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
              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
                <div className='text-sm font-semibold text-foreground'>Observability dashboard</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Open the dedicated Kangur dashboard with alerts, route health, client telemetry,
                  recent server logs, and the latest performance baseline.
                </p>
                <Button asChild variant='outline' size='sm' className='mt-4'>
                  <Link href='/admin/kangur/observability'>Open observability dashboard</Link>
                </Button>
              </Card>

              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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
              </Card>

              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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
              </Card>
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
            </div>
          </KangurAdminStatusCard>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}

export default AdminKangurSettingsPage;
