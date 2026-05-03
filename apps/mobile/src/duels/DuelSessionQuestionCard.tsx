import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
} from './duels-primitives';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

type DuelSessionQuestionCardProps = {
  copy: DuelCopy;
  duel: DuelSessionState;
};

function SpectatorChoices({
  choices,
  copy,
}: {
  choices: NonNullable<DuelSessionState['currentQuestion']>['choices'];
  copy: DuelCopy;
}): React.JSX.Element {
  return (
    <>
      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: 'Zuschauer senden keine Antworten, können aber Frage und Spieltempo verfolgen.',
          en: 'Spectators do not send answers, but they can follow the question and match pace.',
          pl: 'Widz nie wysyła odpowiedzi, ale może śledzić pytanie i tempo meczu.',
        })}
      </Text>
      <View style={{ gap: 8 }}>
        {choices.map((choice, index) => (
          <View
            key={`spectator-choice-${index}-${String(choice)}`}
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              padding: 12,
            }}
          >
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: `Option ${index + 1}: ${String(choice)}`,
                en: `Option ${index + 1}: ${String(choice)}`,
                pl: `Opcja ${index + 1}: ${String(choice)}`,
              })}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function PlayerChoices({
  choices,
  copy,
  isMutating,
  submitAnswer,
}: {
  choices: NonNullable<DuelSessionState['currentQuestion']>['choices'];
  copy: DuelCopy;
  isMutating: boolean;
  submitAnswer: DuelSessionState['submitAnswer'];
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      {choices.map((choice, index) => (
        <ActionButton
          key={`duel-choice-${index}-${String(choice)}`}
          disabled={isMutating}
          label={copy({
            de: `Antwort: ${String(choice)}`,
            en: `Answer: ${String(choice)}`,
            pl: `Odpowiedź: ${String(choice)}`,
          })}
          onPress={async () => {
            await submitAnswer(choice);
          }}
          stretch
          tone='secondary'
        />
      ))}
    </View>
  );
}

export function DuelSessionQuestionCard({
  copy,
  duel,
}: DuelSessionQuestionCardProps): React.JSX.Element {
  const { session, currentQuestion } = duel;

  if (session?.status !== 'in_progress' || currentQuestion === null) {
    return <></>;
  }

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Aktuelle Frage',
          en: 'Current question',
          pl: 'Aktualne pytanie',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 22 }}>
        {currentQuestion.prompt}
      </Text>
      {duel.isSpectating ? (
        <SpectatorChoices choices={currentQuestion.choices} copy={copy} />
      ) : (
        <PlayerChoices
          choices={currentQuestion.choices}
          copy={copy}
          isMutating={duel.isMutating}
          submitAnswer={duel.submitAnswer}
        />
      )}
    </Card>
  );
}
