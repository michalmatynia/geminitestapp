import React from 'react';
import { Text, View } from 'react-native';

import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import {
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { StatusPill, OutlineLink } from '../shared/KangurAssessmentUi';
import {
  KangurMobileActionButton,
  KangurMobileCard,
  KangurMobileInsetPanel,
} from '../shared/KangurMobileUi';
import { useKangurMobileAiTutor } from './useKangurMobileAiTutor';

type KangurMobileAiTutorCardProps = {
  context: KangurAiTutorConversationContext;
  gameTarget?: 'competition' | 'practice';
};

type ResponseAction = ReturnType<typeof useKangurMobileAiTutor>['responseActions'][number];

const resolveCopy = (locale: KangurMobileLocale): {
  openPractice: string;
} => ({
  de: 'Open:',
  en: 'Open:',
  pl: 'Otwórz:',
}[locale]);

const TutorHeader = ({ name, availabilityLabel, availabilityTone, usageLabel }: {
  name: string;
  availabilityLabel: string;
  availabilityTone: { backgroundColor: string; borderColor: string; textColor: string };
  usageLabel: string | null;
}): React.JSX.Element => (
  <View style={{ gap: 8 }}>
    <Text accessibilityRole='header' style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
      {`${name} · AI Tutor`}
    </Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <StatusPill label={availabilityLabel} tone={availabilityTone} />
      {usageLabel !== null && (
        <StatusPill
          label={usageLabel}
          tone={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', textColor: '#475569' }}
        />
      )}
    </View>
  </View>
);

const TutorGuide = ({ guideEntry, responseMessage, isLoading, copy }: {
  guideEntry: KangurAiTutorNativeGuideEntry | null;
  responseMessage: string | null;
  isLoading: boolean;
  copy: (v: { de: string; en: string; pl: string }) => string;
}): React.JSX.Element => {
  if (guideEntry !== null) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>{guideEntry.title}</Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {responseMessage ?? guideEntry.shortDescription}
        </Text>
        {responseMessage === null && (
          <Text style={{ color: '#334155', fontSize: 14, lineHeight: 20 }}>
            {guideEntry.fullDescription}
          </Text>
        )}
      </View>
    );
  }

  const loadingMsg = copy({
    de: 'Der Tutor lädt die Hinweise für diesen Schritt.',
    en: 'AI Tutor is loading guidance for this step.',
    pl: 'AI Tutor ładuje wskazówki do tego kroku.',
  });
  const waitingMsg = copy({
    de: 'Der Tutor passt die Hinweise für diesen Schritt an, sobald mehr Kontext verfügbar ist.',
    en: 'AI Tutor will adapt guidance for this step once more context is available.',
    pl: 'AI Tutor dopasuje wskazówki do tego kroku, gdy pojawi się więcej kontekstu.',
  });

  return (
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {isLoading ? loadingMsg : waitingMsg}
    </Text>
  );
};

const ActionHint = ({
  copy,
  locale,
}: {
  copy: (v: { de: string; en: string; pl: string }) => string;
  locale: KangurMobileLocale;
}): React.JSX.Element => {
  const prefix = resolveCopy(locale);
  const websiteLabel = copy({ de: 'Sie haben keine weiteren Aktionen.', en: 'No actions available.', pl: 'Brak dodatkowych akcji.' });
  return <Text style={{ color: '#64748b', fontSize: 12 }}>{`${prefix} ${websiteLabel}`}</Text>;
};

const ResponseActionsPanel = ({
  actions,
  locale,
  copy,
}: {
  actions: ResponseAction[];
  locale: KangurMobileLocale;
  copy: (v: { de: string; en: string; pl: string }) => string;
}): React.JSX.Element => {
  if (actions.length === 0) {
    return <ActionHint copy={copy} locale={locale} />;
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Weitere Wege',
          en: 'More options',
          pl: 'Więcej opcji',
        })}
      </Text>
      {actions.map((action) => (
        <OutlineLink
          href={action.href}
          hint={action.reason ?? undefined}
          label={action.label}
          key={action.id}
        />
      ))}
    </View>
  );
};

type AvailabilityInfo = {
  tone: { backgroundColor: string; borderColor: string; textColor: string };
  label: string;
};

const resolveAvailabilityInfo = (
  state: string,
  copy: (v: { de: string; en: string; pl: string }) => string,
): AvailabilityInfo => {
  if (state === 'available') {
    return {
      tone: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' },
      label: copy({ de: 'Aktywny', en: 'Ready', pl: 'Aktywny' }),
    };
  }
  if (state === 'restoring_sign_in') {
    return {
      tone: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' },
      label: copy({ de: 'Przywracamy logowanie', en: 'Restoring sign-in', pl: 'Przywracamy logowanie' }),
    };
  }
  if (state === 'signed_out') {
    return {
      tone: { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' },
      label: copy({ de: 'Zaloguj się', en: 'Sign in', pl: 'Zaloguj się' }),
    };
  }
  return {
    tone: { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' },
    label: copy({ de: 'Niedostępny', en: 'Unavailable now', pl: 'Teraz niedostępny' }),
  };
};

const TutorWebsiteHelp = ({
  target,
  showLocaleOpen,
  copy,
}: {
  target: NonNullable<ReturnType<typeof useKangurMobileAiTutor>['websiteHelpTarget']>;
  showLocaleOpen: string;
  copy: (v: { de: string; en: string; pl: string }) => string;
}): React.JSX.Element => (
  <View>
    <OutlineLink
      href={target.href}
      hint={copy({
        de: 'Hilfeseite öffnen.',
        en: 'Opens help content.',
        pl: 'Otwiera stronę pomocy.',
      })}
      label={copy({
        de: `${showLocaleOpen} ${target.label}`,
        en: `${showLocaleOpen} ${target.label}`,
        pl: `${showLocaleOpen} ${target.label}`,
      })}
    />
  </View>
);

const TutorStarterHints = ({
  hints,
  copy,
}: {
  hints: string[];
  copy: (v: { de: string; en: string; pl: string }) => string;
}): React.JSX.Element => (
  <KangurMobileInsetPanel gap={8} padding={16}>
    <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
      {copy({ de: 'Wskazówki startowe', en: 'Starter hints', pl: 'Wskazówki startowe' })}
    </Text>
    {hints.slice(0, 2).map((hint) => (
      <Text key={hint} style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
        {`• ${hint}`}
      </Text>
    ))}
  </KangurMobileInsetPanel>
);

const TutorQuickActions = ({
  actions,
  canSendMessages,
  isSending,
  sendQuickAction,
}: {
  actions: ReturnType<typeof useKangurMobileAiTutor>['quickActions'];
  canSendMessages: boolean;
  isSending: boolean;
  sendQuickAction: (id: string) => Promise<void>;
}): React.JSX.Element => (
  <View style={{ flexDirection: 'column', gap: 8 }}>
    {actions.map((action) => (
      <KangurMobileActionButton
        accessibilityLabel={action.label}
        centered
        disabled={!canSendMessages || isSending}
        key={action.id}
        label={action.label}
        minHeight={44}
        onPress={() => {
          void sendQuickAction(action.id);
        }}
        tone='secondary'
      />
    ))}
  </View>
);

const formatUsageLabel = (usage: NonNullable<ReturnType<typeof useKangurMobileAiTutor>['usage']> | null): string | null => {
  if (usage === null) return null;
  return usage.dailyMessageLimit === null
    ? `Today ${usage.messageCount}`
    : `Today ${usage.messageCount}/${usage.dailyMessageLimit}`;
};

export function KangurMobileAiTutorCard({
  context,
  gameTarget = 'practice',
}: KangurMobileAiTutorCardProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const tutor = useKangurMobileAiTutor({ context, gameTarget });

  const { tone: availabilityTone, label: availabilityLabel } = resolveAvailabilityInfo(
    tutor.availabilityState,
    copy,
  );

  const usageLabel = formatUsageLabel(tutor.usage);
  const showLocaleOpen = resolveCopy(locale);

  return (
    <KangurMobileCard gap={12} padding={20}>
      <TutorHeader
        name={tutor.tutorName}
        availabilityLabel={availabilityLabel}
        availabilityTone={availabilityTone}
        usageLabel={usageLabel}
      />

      <TutorGuide
        guideEntry={tutor.guideEntry}
        responseMessage={tutor.responseMessage}
        isLoading={tutor.isLoading}
        copy={copy}
      />

      {tutor.websiteHelpTarget !== null && (
        <TutorWebsiteHelp
          target={tutor.websiteHelpTarget}
          showLocaleOpen={showLocaleOpen}
          copy={copy}
        />
      )}

      {tutor.responseActions.length > 0 && (
        <KangurMobileInsetPanel gap={8} padding={16}>
          <ResponseActionsPanel copy={copy} locale={locale} actions={tutor.responseActions} />
        </KangurMobileInsetPanel>
      )}

      {tutor.guideEntry?.hints !== undefined && tutor.guideEntry.hints.length > 0 && (
        <TutorStarterHints hints={tutor.guideEntry.hints} copy={copy} />
      )}

      {tutor.quickActions.length > 0 && (
        <TutorQuickActions
          actions={tutor.quickActions}
          canSendMessages={tutor.canSendMessages}
          isSending={tutor.isSending}
          sendQuickAction={tutor.sendQuickAction}
        />
      )}
    </KangurMobileCard>
  );
}

