import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { ChoiceButton } from './practice-primitives';
import { formatPracticeAnswerFeedback, formatPracticeProgressLabel } from './practice-utils';
import { type QuestionDisplayProps } from './types';
import type { KangurQuestionChoice } from '@kangur/contracts/kangur';

export function PracticeQuestionDisplay({
  currentQuestion,
  selectedChoice,
  isChoiceCorrect,
  currentIndex,
  questionsLength,
  locale,
  handleChoicePress,
  onNext,
}: QuestionDisplayProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {formatPracticeProgressLabel(currentIndex + 1, questionsLength, locale)}
      </Text>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${((currentIndex + 1) / questionsLength) * 100}%`, backgroundColor: '#1d4ed8' }} />
      </View>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>{currentQuestion.question}</Text>
      <View style={{ gap: 10 }}>
        {currentQuestion.choices.map((choice: KangurQuestionChoice) => {
          const isSelected = selectedChoice !== null && String(selectedChoice) === String(choice);
          const isCorrect = String(choice) === String(currentQuestion.answer);
          let state: 'idle' | 'correct' | 'incorrect' | 'neutral' = 'idle';
          if (selectedChoice !== null) {
            if (isCorrect) {
              state = 'correct';
            } else if (isSelected) {
              state = 'incorrect';
            } else {
              state = 'neutral';
            }
          }
          return <ChoiceButton key={String(choice)} label={String(choice)} onPress={() => handleChoicePress(choice)} state={state} />;
        })}
      </View>
      {selectedChoice !== null ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: isChoiceCorrect ? '#166534' : '#b91c1c', fontSize: 14 }}>{formatPracticeAnswerFeedback(isChoiceCorrect, String(currentQuestion.answer), locale)}</Text>
          <Pressable onPress={onNext} style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#0f172a', padding: 12 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>{currentIndex >= questionsLength - 1 ? 'Beenden' : 'Weiter'}</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
