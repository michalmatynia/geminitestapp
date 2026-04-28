import { type Href } from 'expo-router';
import { View } from 'react-native';
import {
  OutlineLink,
  SectionCard,
} from '../homeScreenPrimitives';
import {
  DeferredHomeNavigationExtendedLinks,
  DeferredHomeNavigationSecondaryLinks,
} from '../home-screen-deferred';
import {
  COMPETITION_ROUTE,
  DUELS_ROUTE,
  LEADERBOARD_ROUTE,
  LESSONS_ROUTE,
  PARENT_ROUTE,
  PLAN_ROUTE,
  PRACTICE_ROUTE,
  PROFILE_ROUTE,
  RESULTS_ROUTE,
  TESTS_ROUTE,
} from '../home-screen-constants';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

type HomeNavigationSectionProps = {
  areDeferredHomeNavigationSecondaryReady: boolean;
  areDeferredHomeNavigationExtendedReady: boolean;
  canOpenParentDashboard: boolean;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
};

function HomeNavigationBasicLinks({ copy }: { copy: HomeNavigationSectionProps['copy'] }): React.JSX.Element {
  return (
    <>
      <OutlineLink
        href={LESSONS_ROUTE}
        hint={copy({
          de: 'Öffnet die Lektionen.',
          en: 'Opens lessons.',
          pl: 'Otwiera lekcje.',
        })}
        label={copy({
          de: 'Lektionen',
          en: 'Lessons',
          pl: 'Lekcje',
        })}
      />
      <OutlineLink
        href={PRACTICE_ROUTE}
        hint={copy({
          de: 'Öffnet das Training.',
          en: 'Opens practice.',
          pl: 'Otwiera trening.',
        })}
        label={copy({
          de: 'Training',
          en: 'Practice',
          pl: 'Trening',
        })}
      />
    </>
  );
}

function HomeNavigationSecondaryLinks({
  copy,
  canOpenParentDashboard,
}: {
  copy: HomeNavigationSectionProps['copy'];
  canOpenParentDashboard: boolean;
}): React.JSX.Element {
  return (
    <>
      <OutlineLink
        href={PLAN_ROUTE}
        hint={copy({
          de: 'Öffnet den Tagesplan des Schulers.',
          en: 'Opens the learner daily plan.',
          pl: 'Otwiera plan dnia ucznia.',
        })}
        label={copy({
          de: 'Tagesplan',
          en: 'Daily plan',
          pl: 'Plan dnia',
        })}
      />
      <OutlineLink
        href={RESULTS_ROUTE}
        hint={copy({
          de: 'Öffnet Ergebnisse und den vollständigen Verlauf.',
          en: 'Opens results and full history.',
          pl: 'Otwiera wyniki i pełną historię.',
        })}
        label={copy({
          de: 'Ergebnisse',
          en: 'Results',
          pl: 'Wyniki',
        })}
      />
      {canOpenParentDashboard && (
        <OutlineLink
          href={PARENT_ROUTE}
          hint={copy({
            de: 'Öffnet den Elternbereich.',
            en: 'Opens the parent dashboard.',
            pl: 'Otwiera panel rodzica.',
          })}
          label={copy({
            de: 'Elternbereich',
            en: 'Parent dashboard',
            pl: 'Panel rodzica',
          })}
        />
      )}
    </>
  );
}

function HomeNavigationLink({
  href,
  hint,
  label,
}: {
  href: Href;
  hint: string | undefined;
  label: string;
}): React.JSX.Element {
  return <OutlineLink href={href} hint={hint} label={label} />;
}

function ExtendedLinksPart1({ copy }: { copy: HomeNavigationSectionProps['copy'] }): React.JSX.Element {
  return (
    <>
      <HomeNavigationLink
        href={TESTS_ROUTE}
        hint={copy({
          de: 'Öffnet die Tests.',
          en: 'Opens tests.',
          pl: 'Otwiera testy.',
        })}
        label={copy({
          de: 'Tests',
          en: 'Tests',
          pl: 'Testy',
        })}
      />
      <HomeNavigationLink
        href={COMPETITION_ROUTE}
        hint={copy({
          de: 'Öffnet den Wettbewerb.',
          en: 'Opens the competition.',
          pl: 'Otwiera konkurs.',
        })}
        label={copy({
          de: 'Wettbewerb',
          en: 'Competition',
          pl: 'Konkurs',
        })}
      />
    </>
  );
}

function ExtendedLinksPart2({ copy }: { copy: HomeNavigationSectionProps['copy'] }): React.JSX.Element {
  return (
    <>
      <HomeNavigationLink
        href={PROFILE_ROUTE}
        hint={copy({
          de: 'Öffnet das Profil des Schulers.',
          en: 'Opens the learner profile.',
          pl: 'Otwiera profil ucznia.',
        })}
        label={copy({
          de: 'Profil',
          en: 'Profile',
          pl: 'Profil',
        })}
      />
      <HomeNavigationLink
        href={LEADERBOARD_ROUTE}
        hint={copy({
          de: 'Öffnet die Rangliste der Schuler.',
          en: 'Opens the learner leaderboard.',
          pl: 'Otwiera ranking uczniów.',
        })}
        label={copy({
          de: 'Rangliste',
          en: 'Leaderboard',
          pl: 'Ranking',
        })}
      />
      <HomeNavigationLink
        href={DUELS_ROUTE}
        hint={copy({
          de: 'Öffnet die Duell-Lobby.',
          en: 'Opens the duels lobby.',
          pl: 'Otwiera lobby pojedynków.',
        })}
        label={copy({
          de: 'Duelle',
          en: 'Duels',
          pl: 'Pojedynki',
        })}
      />
    </>
  );
}

function HomeNavigationExtendedLinks({ copy }: { copy: HomeNavigationSectionProps['copy'] }): React.JSX.Element {
  return (
    <>
      <ExtendedLinksPart1 copy={copy} />
      <ExtendedLinksPart2 copy={copy} />
    </>
  );
}

export function HomeNavigationSection({
  areDeferredHomeNavigationSecondaryReady,
  areDeferredHomeNavigationExtendedReady,
  canOpenParentDashboard,
  copy,
}: HomeNavigationSectionProps): React.JSX.Element {
  return (
    <SectionCard
      title={copy({
        de: 'Navigation',
        en: 'Navigation',
        pl: 'Nawigacja',
      })}
    >
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <HomeNavigationBasicLinks copy={copy} />
        {!areDeferredHomeNavigationSecondaryReady ? (
          <DeferredHomeNavigationSecondaryLinks />
        ) : (
          <>
            <HomeNavigationSecondaryLinks copy={copy} canOpenParentDashboard={canOpenParentDashboard} />
            {!areDeferredHomeNavigationExtendedReady ? (
              <DeferredHomeNavigationExtendedLinks />
            ) : (
              <HomeNavigationExtendedLinks copy={copy} />
            )}
          </>
        )}
      </View>
    </SectionCard>
  );
}
