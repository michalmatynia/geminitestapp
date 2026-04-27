import React from 'react';
import { Text } from 'react-native';
import {
  DeferredHomeAccountDetails,
  DeferredHomeAccountSummary,
  PrimaryButton,
  SectionCard,
} from '../homeScreenPrimitives';
import { HomeLearnerCredentialsSignInSection } from './HomeLearnerCredentialsSignInSection';
import { type getKangurHomeAuthBoundaryViewModel } from '../homeAuthBoundary';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

type HomeAccountSectionProps = {
  areDeferredHomeAccountSummaryReady: boolean;
  areDeferredHomeAccountDetailsReady: boolean;
  areDeferredHomeAccountSignInReady: boolean;
  authBoundary: ReturnType<typeof getKangurHomeAuthBoundaryViewModel> | null;
  authMode: string | null;
  authError: string | null;
  apiBaseUrl: string;
  apiBaseUrlSource: string;
  shouldShowLearnerCredentialsForm: boolean;
  sessionStatus: string;
  signIn: () => void;
  signInWithLearnerCredentials: (loginName: string, password: string) => Promise<void>;
  signOut: () => void;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
};

export function HomeAccountSection({
  areDeferredHomeAccountSummaryReady,
  areDeferredHomeAccountDetailsReady,
  areDeferredHomeAccountSignInReady,
  authBoundary,
  authMode,
  authError,
  apiBaseUrl,
  apiBaseUrlSource,
  shouldShowLearnerCredentialsForm,
  sessionStatus,
  signIn,
  signInWithLearnerCredentials,
  signOut,
  copy,
}: HomeAccountSectionProps): React.JSX.Element {
  let content: React.JSX.Element;

  if (!areDeferredHomeAccountSummaryReady) {
    content = <DeferredHomeAccountSummary />;
  } else {
    content = (
      <>
        <Text accessibilityLiveRegion='polite' style={{ color: '#0f172a' }}>
          {copy({
            de: 'Status',
            en: 'Status',
            pl: 'Status',
          })}
          : {authBoundary?.statusLabel}
        </Text>
        <Text style={{ color: '#475569' }}>
          {copy({
            de: 'Nutzer',
            en: 'User',
            pl: 'Użytkownik',
          })}
          : {authBoundary?.userLabel}
        </Text>
        {!areDeferredHomeAccountDetailsReady ? (
          <DeferredHomeAccountDetails />
        ) : (
          <>
            <Text style={{ color: '#475569' }}>
              {copy({
                de: 'Anmeldemodus',
                en: 'Sign-in mode',
                pl: 'Tryb logowania',
              })}
              : {authMode}
            </Text>
            <Text style={{ color: '#475569' }}>
              API: {apiBaseUrl} ({apiBaseUrlSource})
            </Text>
          </>
        )}
      </>
    );
  }

  let action: React.JSX.Element;
  if (shouldShowLearnerCredentialsForm) {
    action = (
      <HomeLearnerCredentialsSignInSection
        isDeferredReady={areDeferredHomeAccountSignInReady}
        onSignIn={signInWithLearnerCredentials}
      />
    );
  } else if (sessionStatus === 'authenticated') {
    action = (
      <PrimaryButton
        hint={copy({
          de: 'Meldet das aktuelle Konto ab.',
          en: 'Signs out the current account.',
          pl: 'Wylogowuje bieżące konto.',
        })}
        label={copy({
          de: 'Abmelden',
          en: 'Sign out',
          pl: 'Wyloguj',
        })}
        onPress={() => {
          signOut();
        }}
      />
    );
  } else {
    action = (
      <PrimaryButton
        hint={copy({
          de: 'Startet die Demo.',
          en: 'Starts the demo.',
          pl: 'Uruchamia demo.',
        })}
        label={copy({
          de: 'Demo starten',
          en: 'Start demo',
          pl: 'Uruchom demo',
        })}
        onPress={() => {
          signIn();
        }}
      />
    );
  }

  return (
    <SectionCard
      title={copy({
        de: 'Konto und Verbindung',
        en: 'Account and connection',
        pl: 'Konto i połączenie',
      })}
    >
      {content}
      {authError !== null && authError !== '' ? (
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text>
      ) : null}
      {action}
    </SectionCard>
  );
}
