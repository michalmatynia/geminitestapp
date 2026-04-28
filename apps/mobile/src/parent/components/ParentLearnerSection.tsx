import { Pressable, Text, View } from 'react-native';

import { BASE_TONE, INDIGO_TONE, SUCCESS_TONE } from '../../shared/KangurAssessmentUi';
import { KangurMobileCard as Card, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { type KangurLearnerProfile } from '@kangur/contracts/kangur';

interface ParentLearnerSectionProps {
  copy: (text: Record<string, string>) => string;
  learners: KangurLearnerProfile[];
  selectedLearnerId: string | null;
  switchingLearnerId: string | null;
  selectLearner: (id: string) => void;
  selectionError: string | null;
}

export function ParentLearnerSection({
  copy,
  learners,
  selectedLearnerId,
  switchingLearnerId,
  selectLearner,
  selectionError,
}: ParentLearnerSectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lernendenverwaltung',
          en: 'Learner management',
          pl: 'Zarządzanie uczniami',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
        {copy({
          de: 'Lernenden wählen',
          en: 'Choose learner',
          pl: 'Wybierz ucznia',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Bevor du Fortschritt vergleichst, stelle sicher, dass der richtige Lernende aktiv ist.',
          en: 'Before you compare progress, make sure the correct learner is active.',
          pl: 'Zanim porównasz wyniki i postęp, upewnij się, że aktywny jest właściwy uczeń.',
        })}
      </Text>

      {learners.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Dieses Elternkonto hat noch keine Lernprofile.',
            en: 'This parent account does not have any learner profiles yet.',
            pl: 'To konto rodzica nie ma jeszcze żadnych profili uczniów.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {learners.map((learner) => {
            const isActive = learner.id === selectedLearnerId;
            const isPending = learner.id === switchingLearnerId;

            return (
              <Pressable
                accessibilityRole='button'
                disabled={isActive || isPending}
                key={learner.id}
                onPress={() => {
                  selectLearner(learner.id);
                }}
                style={{
                  backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                  borderColor: isActive ? '#60a5fa' : '#cbd5e1',
                  borderRadius: 18,
                  borderWidth: 1,
                  gap: 8,
                  opacity: isPending ? 0.7 : 1,
                  padding: 14,
                }}
              >
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                  {learner.displayName}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pill
                    label={
                      learner.status === 'active'
                        ? copy({
                            de: 'Aktiv',
                            en: 'Active',
                            pl: 'Aktywny',
                          })
                        : copy({
                            de: 'Deaktiviert',
                            en: 'Disabled',
                            pl: 'Wyłączony',
                          })
                    }
                    tone={isActive ? INDIGO_TONE : BASE_TONE}
                  />
                  <Pill
                    label={
                      isActive
                        ? copy({
                            de: 'Jetzt ausgewählt',
                            en: 'Selected now',
                            pl: 'Wybrany teraz',
                          })
                        : isPending
                          ? copy({
                              de: 'Wird gewechselt',
                              en: 'Switching',
                              pl: 'Przełączamy',
                            })
                          : copy({
                              de: 'Tippen zum Wechseln',
                              en: 'Tap to switch',
                              pl: 'Dotknij, aby przełączyć',
                            })
                    }
                    tone={isActive ? SUCCESS_TONE : BASE_TONE}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {Boolean(selectionError) && (
        <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>
          {selectionError}
        </Text>
      )}
    </Card>
  );
}
