import { Text, View } from 'react-native';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
} from '../../shared/KangurMobileUi';
import { createKangurPlanHref } from '../../plan/planHref';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

type ProfileHeroCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  displayName: string;
  authError: string | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  supportsLearnerCredentials: boolean;
  signIn: () => void;
};

function ProfileHeroHeader({ copy }: { copy: ProfileHeroCardProps['copy'] }): React.JSX.Element {
  return (
    <>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Daten und Fortschritt', en: 'Data and progress', pl: 'Dane i postęp' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>{copy({ de: 'Schülerprofil', en: 'Learner profile', pl: 'Profil ucznia' })}</Text>
    </>
  );
}

function ProfileHeroStatus({ copy, displayName, isLoadingAuth, isAuthenticated }: Pick<ProfileHeroCardProps, 'copy' | 'displayName' | 'isLoadingAuth' | 'isAuthenticated'>): React.JSX.Element {
  const isRestoring = isLoadingAuth && !isAuthenticated;
  return (
    <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
      {isRestoring
        ? copy({ de: 'Die Anmeldung und die gespeicherten Statistiken werden wiederhergestellt.', en: 'Restoring sign-in and saved stats.', pl: 'Przywracamy logowanie i zapisane statystyki.' })
        : copy({ de: `Statistiken für ${displayName}.`, en: `Learner stats: ${displayName}.`, pl: `Statystyki ucznia: ${displayName}.` })}
    </Text>
  );
}

function ProfileHeroAuthSection({ copy, isAuthenticated, isLoadingAuth, supportsLearnerCredentials, signIn }: Pick<ProfileHeroCardProps, 'copy' | 'isAuthenticated' | 'isLoadingAuth' | 'supportsLearnerCredentials' | 'signIn'>): React.JSX.Element | null {
  if (!isLoadingAuth && isAuthenticated) return null;

  if (isLoadingAuth) {
    return (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({ de: 'Wir prüfen die gespeicherte Anmeldung. Danach stellen wir Ergebnisse und Fortschritt wieder her.', en: 'Checking saved sign-in. After that we will restore results and progress.', pl: 'Sprawdzamy zapisane logowanie. Po zakończeniu przywrócimy wyniki i postęp.' })}
      </Text>
    );
  }

  if (supportsLearnerCredentials) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Melde dich an, um im Profil Ergebnisse, Fortschritt und Duelle zu sehen.', en: 'Sign in to see results, progress, and duels in the profile.', pl: 'Zaloguj się, aby zobaczyć w profilu wyniki, postęp i pojedynki.' })}</Text>
        <LinkButton href='/' label={copy({ de: 'Zum Login', en: 'Go to sign in', pl: 'Przejdź do logowania' })} style={{ paddingHorizontal: 16 }} tone='brand' verticalPadding={12} />
      </View>
    );
  }

  return <ActionButton label={copy({ de: 'Demo starten', en: 'Start demo', pl: 'Uruchom demo' })} onPress={signIn} tone='primary' />;
}

export function ProfileHeroCard(props: ProfileHeroCardProps): React.JSX.Element {
  return (
    <Card>
      <ProfileHeroHeader copy={props.copy} />
      <ProfileHeroStatus copy={props.copy} displayName={props.displayName} isLoadingAuth={props.isLoadingAuth} isAuthenticated={props.isAuthenticated} />
      <ProfileHeroAuthSection copy={props.copy} isAuthenticated={props.isAuthenticated} isLoadingAuth={props.isLoadingAuth} supportsLearnerCredentials={props.supportsLearnerCredentials} signIn={props.signIn} />
      
      {props.authError !== null && props.authError !== '' && (
        <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>{props.authError}</Text>
      )}
      
      <LinkButton href={createKangurPlanHref()} label={props.copy({ de: 'Tagesplan öffnen', en: 'Open daily plan', pl: 'Otwórz plan dnia' })} style={{ paddingHorizontal: 16 }} verticalPadding={12} />
    </Card>
  );
}
