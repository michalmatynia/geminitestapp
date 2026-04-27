import React from 'react';
import { View, Text } from 'react-native';
import type { KangurDuelSession } from '@kangur/contracts/kangur-duels';
import { formatDifficultyLabel, formatModeLabel, formatOperationLabel } from '../utils/duels-ui';

interface DetailsHeaderProps {
  session: KangurDuelSession;
  copy: (v: Record<string, string>) => string;
  locale: any;
}

export function DetailsHeader({
  session,
  copy,
  locale,
}: DetailsHeaderProps): React.JSX.Element {
  let infoLabel = '';
  if (locale === 'de') {
    infoLabel = `${session.questionCount} Fragen · ${session.timePerQuestionSec}s pro Antwort · ${formatDifficultyLabel(session.difficulty, locale)}`;
  } else if (locale === 'en') {
    infoLabel = `${session.questionCount} questions · ${session.timePerQuestionSec}s per answer · ${formatDifficultyLabel(session.difficulty, locale)}`;
  } else {
    infoLabel = `${session.questionCount} pytań · ${session.timePerQuestionSec}s na odpowiedź · ${formatDifficultyLabel(session.difficulty, locale)}`;
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: `Sitzung ${session.id}`, en: `Session ${session.id}`, pl: `Sesja ${session.id}` })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {formatModeLabel(session.mode, locale)} · {formatOperationLabel(session.operation, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{infoLabel}</Text>
    </View>
  );
}
