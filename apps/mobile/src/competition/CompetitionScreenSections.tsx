import React from 'react';
import { Text, View } from 'react-native';
import { type KangurMobileLocale, type KangurMobileCopy } from '../i18n/kangurMobileI18n';
import {
  BASE_TONE,
  INDIGO_TONE,
  OutlineLink,
  PrimaryButton,
  SectionCard,
  StatusPill,
  SUCCESS_TONE,
  WARNING_TONE,
} from './competition-primitives';
import {
  formatCompetitionModeDescription,
  formatCompetitionModeTitle,
  formatCompetitionTierLabel,
  formatModeToken,
  formatQuestionCount,
} from './competition-utils';
import type { KangurMobileCompetitionMode } from './useKangurMobileCompetition';

import { type Href } from 'expo-router';

// ...

type CompetitionHeaderSectionProps = {
  copy: KangurMobileCopy;
  modesCount: number;
  questionCount: number;
  routes: {
    tests: Href;
    results: Href;
    plan: Href;
  };
};

export function CompetitionHeaderSection({
  copy,
  modesCount,
  questionCount,
  routes,
}: CompetitionHeaderSectionProps): React.JSX.Element {
// ...

  const headerTitle = copy({
    de: 'Kangur-Wettbewerb',
    en: 'Kangaroo competition',
    pl: 'Konkurs Kangur',
  });

  const headerDesc = copy({
    de: 'Wähle eine Runde des Wettbewerbs 2024 und löse die Fragen in deinem eigenen Tempo.',
    en: 'Choose a 2024 competition round and solve the tasks at your own pace.',
    pl: 'Wybierz rundę konkursu z 2024 roku i rozwiązuj zadania we własnym tempie.',
  });

  return (
    <SectionCard title={headerTitle}>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {headerDesc}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <StatusPill
          label={copy({
            de: `Runden ${modesCount}`,
            en: `Rounds ${modesCount}`,
            pl: `Rundy ${modesCount}`,
          })}
          tone={INDIGO_TONE}
        />
        <StatusPill
          label={copy({
            de: `Fragen ${questionCount}`,
            en: `Questions ${questionCount}`,
            pl: `Pytania ${questionCount}`,
          })}
          tone={BASE_TONE}
        />
      </View>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <OutlineLink
          href={routes.tests}
          hint={copy({ de: 'Öffnet die Tests.', en: 'Opens tests.', pl: 'Otwiera testy.' })}
          label={copy({ de: 'Zu den Tests', en: 'Go to tests', pl: 'Przejdź do testów' })}
        />
        <OutlineLink
          href={routes.results}
          hint={copy({ de: 'Öffnet die Ergebnisse.', en: 'Opens results.', pl: 'Otwiera wyniki.' })}
          label={copy({ de: 'Ergebnisse öffnen', en: 'Open results', pl: 'Otwórz wyniki' })}
        />
        <OutlineLink
          href={routes.plan}
          hint={copy({ de: 'Öffnet den Tagesplan.', en: 'Opens the daily plan.', pl: 'Otwiera plan dnia.' })}
          label={copy({ de: 'Zum Tagesplan', en: 'Go to daily plan', pl: 'Przejdź do planu dnia' })}
        />
      </View>
    </SectionCard>
  );
}

type CompetitionMissingModeSectionProps = {
  copy: KangurMobileCopy;
  modeToken: string | null;
  onOpenFull: () => void;
};

export function CompetitionMissingModeSection({
  copy,
  modeToken,
  onOpenFull,
}: CompetitionMissingModeSectionProps): React.JSX.Element {
  const token = modeToken ?? '';
  return (
    <SectionCard
      title={copy({
        de: 'Wettbewerbskürzel',
        en: 'Competition shortcut',
        pl: 'Skrót konkursu',
      })}
    >
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: `Der Link zu "${formatModeToken(token)}" passt gerade zu keiner Wettbewerbsrunde.`,
          en: `The shortcut for "${formatModeToken(token)}" does not match any competition round right now.`,
          pl: `Skrót do „${formatModeToken(token)}” nie pasuje teraz do żadnej rundy konkursu.`,
        })}
      </Text>
      <PrimaryButton
        label={copy({
          de: 'Vollen Wettbewerb öffnen',
          en: 'Open full competition',
          pl: 'Otwórz pełny konkurs',
        })}
        onPress={onOpenFull}
        tone={BASE_TONE}
      />
    </SectionCard>
  );
}

type CompetitionModeCardProps = {
  copy: KangurMobileCopy;
  item: {
    mode: KangurMobileCompetitionMode;
    questionCount: number;
    pointTier: string;
  };
  locale: KangurMobileLocale;
  onPress: () => void;
  isStart?: boolean;
};

export function CompetitionModeCard({
  copy,
  item,
  locale,
  onPress,
  isStart = false,
}: CompetitionModeCardProps): React.JSX.Element {
  return (
    <SectionCard title={formatCompetitionModeTitle(item.mode, locale)}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <StatusPill
          label={formatQuestionCount(item.questionCount, locale)}
          tone={SUCCESS_TONE}
        />
        <StatusPill
          label={formatCompetitionTierLabel(item.pointTier as any, locale)}
          tone={WARNING_TONE}
        />
      </View>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {formatCompetitionModeDescription(item.mode, locale)}
      </Text>
      <PrimaryButton
        label={isStart ? copy({
          de: 'Runde starten',
          en: 'Start this round',
          pl: 'Uruchom rundę',
        }) : copy({
          de: 'Zurück zur Auswahl',
          en: 'Back to setup',
          pl: 'Wróć do wyboru',
        })}
        onPress={onPress}
        tone={isStart ? undefined : BASE_TONE}
      />
    </SectionCard>
  );
}
