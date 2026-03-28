import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileAiTutor } from './useKangurMobileAiTutor';

type KangurMobileAiTutorCardProps = {
  context: KangurAiTutorConversationContext;
  gameTarget?: 'competition' | 'practice';
};

function StatusPill({
  backgroundColor,
  borderColor,
  label,
  textColor,
}: {
  backgroundColor: string;
  borderColor: string;
  label: string;
  textColor: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor,
        borderColor,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole='button'
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: disabled ? '#e2e8f0' : '#eef2ff',
        borderColor: disabled ? '#cbd5e1' : '#c7d2fe',
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 44,
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: disabled ? '#64748b' : '#4338ca',
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LinkButton({
  href,
  label,
}: {
  href: NonNullable<ReturnType<typeof useKangurMobileAiTutor>['responseActions'][number]['href']>;
  label: string;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole='button'
        style={{
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 999,
          borderWidth: 1,
          justifyContent: 'center',
          minHeight: 44,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

export function KangurMobileAiTutorCard({
  context,
  gameTarget = 'practice',
}: KangurMobileAiTutorCardProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const tutor = useKangurMobileAiTutor({
    context,
    gameTarget,
  });
  const responseActionItems: React.JSX.Element[] = [];

  for (const action of tutor.responseActions) {
    if (action.href) {
      responseActionItems.push(<LinkButton href={action.href} key={action.id} label={action.label} />);
      continue;
    }

    responseActionItems.push(
      <View key={action.id} style={{ gap: 4 }}>
        <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>{action.label}</Text>
        {action.reason ? (
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{action.reason}</Text>
        ) : null}
      </View>,
    );
  }
  let websiteHelpTargetContent = null;
  let nextStepSection = null;

  if (tutor.websiteHelpTarget) {
    if (tutor.websiteHelpTarget.href) {
      websiteHelpTargetContent = (
        <LinkButton
          href={tutor.websiteHelpTarget.href}
          label={
            locale === 'de'
              ? `Öffne: ${tutor.websiteHelpTarget.label}`
              : locale === 'en'
                ? `Open: ${tutor.websiteHelpTarget.label}`
                : `Przejdź: ${tutor.websiteHelpTarget.label}`
          }
        />
      );
    } else {
      websiteHelpTargetContent = (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
          {tutor.websiteHelpTarget.label}
        </Text>
      );
    }
  }

  if (tutor.responseActions.length > 0 || tutor.websiteHelpTarget) {
    nextStepSection = (
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
          {copy({
            de: 'Kolejny krok',
            en: 'Next step',
            pl: 'Kolejny krok',
          })}
        </Text>
        {responseActionItems}
        {websiteHelpTargetContent}
      </View>
    );
  }

  const availabilityTone =
    tutor.availabilityState === 'available'
      ? {
          backgroundColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          textColor: '#047857',
        }
      : tutor.availabilityState === 'restoring_sign_in'
        ? {
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }
        : {
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          };

  const availabilityLabel =
    tutor.availabilityState === 'available'
      ? copy({
          de: 'Aktywny',
          en: 'Ready',
          pl: 'Aktywny',
        })
      : tutor.availabilityState === 'restoring_sign_in'
        ? copy({
            de: 'Przywracamy logowanie',
            en: 'Restoring sign-in',
            pl: 'Przywracamy logowanie',
          })
        : tutor.availabilityState === 'signed_out'
          ? copy({
              de: 'Zaloguj się',
              en: 'Sign in',
              pl: 'Zaloguj się',
            })
          : copy({
              de: 'Teraz niedostępny',
              en: 'Unavailable now',
              pl: 'Teraz niedostępny',
            });

  const usageLabel = tutor.usage
    ? tutor.usage.dailyMessageLimit === null
      ? copy({
          de: `Dzisiaj ${tutor.usage.messageCount}`,
          en: `Today ${tutor.usage.messageCount}`,
          pl: `Dzisiaj ${tutor.usage.messageCount}`,
        })
      : copy({
          de: `Dzisiaj ${tutor.usage.messageCount}/${tutor.usage.dailyMessageLimit}`,
          en: `Today ${tutor.usage.messageCount}/${tutor.usage.dailyMessageLimit}`,
          pl: `Dzisiaj ${tutor.usage.messageCount}/${tutor.usage.dailyMessageLimit}`,
        })
    : null;

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 3,
        gap: 12,
        padding: 20,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }}
    >
      <View style={{ gap: 8 }}>
        <Text
          accessibilityRole='header'
          style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}
        >
          {`${tutor.tutorName} · AI Tutor`}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <StatusPill {...availabilityTone} label={availabilityLabel} />
          {usageLabel ? (
            <StatusPill
              backgroundColor='#f8fafc'
              borderColor='#cbd5e1'
              label={usageLabel}
              textColor='#475569'
            />
          ) : null}
        </View>
      </View>

      {tutor.guideEntry ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
            {tutor.guideEntry.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {tutor.responseMessage ?? tutor.guideEntry.shortDescription}
          </Text>
          {!tutor.responseMessage ? (
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 20 }}>
              {tutor.guideEntry.fullDescription}
            </Text>
          ) : null}
        </View>
      ) : tutor.isLoading ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Der Tutor lädt die Hinweise für diesen Schritt.',
            en: 'AI Tutor is loading guidance for this step.',
            pl: 'AI Tutor ładuje wskazówki do tego kroku.',
          })}
        </Text>
      ) : (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Der Tutor dopasuje wskazówki do tego kroku, sobald mehr Kontext verfügbar ist.',
            en: 'AI Tutor will adapt guidance for this step once more context is available.',
            pl: 'AI Tutor dopasuje wskazówki do tego kroku, gdy pojawi się więcej kontekstu.',
          })}
        </Text>
      )}

      {tutor.guideEntry?.hints?.length ? (
        <View
          style={{
            backgroundColor: '#f8fafc',
            borderColor: '#cbd5e1',
            borderRadius: 20,
            borderWidth: 1,
            gap: 8,
            padding: 16,
          }}
        >
          <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
            {copy({
              de: 'Wskazówki startowe',
              en: 'Starter hints',
              pl: 'Wskazówki startowe',
            })}
          </Text>
          {tutor.guideEntry.hints.slice(0, 2).map((hint) => (
            <Text key={hint} style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
              {`• ${hint}`}
            </Text>
          ))}
        </View>
      ) : null}

      {tutor.availabilityMessage ? (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
          {tutor.availabilityMessage}
        </Text>
      ) : null}

      {tutor.interactionHint ? (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
          {tutor.interactionHint}
        </Text>
      ) : null}

      {tutor.quickActions.length > 0 ? (
        <View style={{ flexDirection: 'column', gap: 8 }}>
          {tutor.quickActions.map((action) => (
            <ActionButton
              disabled={!tutor.canSendMessages || tutor.isSending}
              key={action.id}
              label={action.label}
              onPress={() => {
                void tutor.sendQuickAction(action.id);
              }}
            />
          ))}
        </View>
      ) : null}

      {nextStepSection}
    </View>
  );
}
