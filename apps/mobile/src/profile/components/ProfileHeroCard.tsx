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

export function ProfileHeroCard({
  copy,
  displayName,
  authError,
  isAuthenticated,
  isLoadingAuth,
  supportsLearnerCredentials,
  signIn,
}: ProfileHeroCardProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Daten und Fortschritt',
          en: 'Data and progress',
          pl: 'Dane i postęp',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
        {copy({
          de: 'Schülerprofil',
          en: 'Learner profile',
          pl: 'Profil ucznia',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
        {isLoadingAuth && !isAuthenticated
          ? copy({
              de: 'Die Anmeldung und die gespeicherten Statistiken werden wiederhergestellt.',
              en: 'Restoring sign-in and saved stats.',
              pl: 'Przywracamy logowanie i zapisane statystyki.',
            })
          : copy({
              de: `Statistiken für ${displayName}.`,
              en: `Learner stats: ${displayName}.`,
              pl: `Statystyki ucznia: ${displayName}.`,
            })}
      </Text>

      {isLoadingAuth && !isAuthenticated ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Wir prüfen die gespeicherte Anmeldung. Danach stellen wir Ergebnisse und Fortschritt wieder her.',
            en: 'Checking saved sign-in. After that we will restore results and progress.',
            pl: 'Sprawdzamy zapisane logowanie. Po zakończeniu przywrócimy wyniki i postęp.',
          })}
        </Text>
      ) : !isAuthenticated ? (
        supportsLearnerCredentials ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Melde dich an, um im Profil Ergebnisse, Fortschritt und Duelle zu sehen.',
                en: 'Sign in to see results, progress, and duels in the profile.',
                pl: 'Zaloguj się, aby zobaczyć w profilu wyniki, postęp i pojedynki.',
              })}
            </Text>
            <LinkButton
              href='/'
              label={copy({
                de: 'Zum Login',
                en: 'Go to sign in',
                pl: 'Przejdź do logowania',
              })}
              style={{ paddingHorizontal: 16 }}
              tone='brand'
              verticalPadding={12}
            />
          </View>
        ) : (
          <ActionButton
            label={copy({
              de: 'Demo starten',
              en: 'Start demo',
              pl: 'Uruchom demo',
            })}
            onPress={signIn}
            tone='primary'
          />
        )
      ) : null}
      {authError ? (
        <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>
          {authError}
        </Text>
      ) : null}
      <LinkButton
        href={createKangurPlanHref()}
        label={copy({
          de: 'Tagesplan öffnen',
          en: 'Open daily plan',
          pl: 'Otwórz plan dnia',
        })}
        style={{ paddingHorizontal: 16 }}
        verticalPadding={12}
      />
    </Card>
  );
}
