import { Pressable, Text, View } from 'react-native';

import type { KangurMobileLocale, useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  LessonCheckpointRow,
  LessonMasteryRow,
  PracticeAssignmentRow,
  PracticeBadgeChip,
  PracticeRecentResultRow,
} from './practice-primitives';
import {
  formatPracticeDuelRecord,
} from './practice-utils';
import type { useKangurMobilePracticeAssignments } from './useKangurMobilePracticeAssignments';
import type { useKangurMobilePracticeBadges } from './useKangurMobilePracticeBadges';
import type { useKangurMobilePracticeDuels } from './useKangurMobilePracticeDuels';
import type { useKangurMobilePracticeLessonMastery } from './useKangurMobilePracticeLessonMastery';
import type { useKangurMobilePracticeRecentResults } from './useKangurMobilePracticeRecentResults';
import type { useKangurPracticeSyncProof } from './useKangurPracticeSyncProof';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeLessonCheckpointsState = ReturnType<typeof useKangurMobileLessonCheckpoints>;
type PracticeLessonMasteryState = ReturnType<typeof useKangurMobilePracticeLessonMastery>;
type PracticeBadgesState = ReturnType<typeof useKangurMobilePracticeBadges>;
type PracticeAssignmentsState = ReturnType<typeof useKangurMobilePracticeAssignments>;
type PracticeRecentResultsState = ReturnType<typeof useKangurMobilePracticeRecentResults>;
type PracticeDuelsState = ReturnType<typeof useKangurMobilePracticeDuels>;
type PracticeSyncProofState = ReturnType<typeof useKangurPracticeSyncProof>;

export function PracticeSyncProofPanel({
  copy,
  locale,
  practiceSyncProof,
}: {
  copy: PracticeCopy;
  locale: KangurMobileLocale;
  practiceSyncProof: PracticeSyncProofState;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#dbeafe',
        backgroundColor: '#eff6ff',
        padding: 12,
        gap: 10,
      }}
    >
      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
        {copy({
          de: 'Entwickler-Prüfung der Synchronisierung',
          en: 'Developer sync checks',
          pl: 'Deweloperskie sprawdzenie synchronizacji',
        })}
      </Text>
      <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: 'Das prüft dieselben Daten für Ergebnisse, Profil, Tagesplan und Rangliste, die nach einer Serie aktualisiert werden.',
          en: 'This checks the same results, profile, daily plan, and leaderboard data used after a run.',
          pl: 'To sprawdza te same dane wyników, profilu, planu dnia i rankingu, których używamy po serii.',
        })}
      </Text>
      {practiceSyncProof.isLoading ? (
        <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
          {copy({
            de: 'Synchronisierungs-Prüfung wird aktualisiert...',
            en: 'Refreshing sync checks...',
            pl: 'Odświeżamy sprawdzenie synchronizacji...',
          })}
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {practiceSyncProof.snapshot.surfaces.map((surface) => (
            <View
              key={surface.label}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: surface.status === 'ready' ? '#86efac' : '#fca5a5',
                backgroundColor: surface.status === 'ready' ? '#f0fdf4' : '#fef2f2',
                padding: 10,
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: surface.status === 'ready' ? '#166534' : '#b91c1c',
                  fontSize: 13,
                  fontWeight: '800',
                }}
              >
                {surface.label}:{' '}
                {surface.status === 'ready'
                  ? copy({
                      de: 'bereit',
                      en: 'ready',
                      pl: 'gotowe',
                    })
                  : copy({
                      de: 'fehlt',
                      en: 'missing',
                      pl: 'brak',
                    })}
              </Text>
              <Text
                style={{
                  color: surface.status === 'ready' ? '#166534' : '#991b1b',
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {surface.detail}
              </Text>
            </View>
          ))}
        </View>
      )}
      {practiceSyncProof.error ? (
        <Text style={{ color: '#991b1b', fontSize: 13, lineHeight: 18 }}>
          {practiceSyncProof.error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole='button'
        onPress={() => {
          void practiceSyncProof.refresh();
        }}
        style={{
          alignSelf: 'flex-start',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: '#93c5fd',
          backgroundColor: '#ffffff',
          paddingHorizontal: 12,
          paddingVertical: 9,
        }}
      >
        <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>
          {translateKangurMobileActionLabel('Refresh proof', locale)}
        </Text>
      </Pressable>
    </View>
  );
}

export function PracticeDuelsPanel({
  copy,
  locale,
  localeTag,
  openDuelSession,
  practiceDuels,
}: {
  copy: PracticeCopy;
  locale: KangurMobileLocale;
  localeTag: string;
  openDuelSession: (sessionId: string) => void;
  practiceDuels: PracticeDuelsState;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Nach dem Training',
          en: 'After practice',
          pl: 'Po treningu',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Schneller Rückweg zu Rivalen',
          en: 'Quick return to rivals',
          pl: 'Szybki powrót do rywali',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Prüfe den aktuellen Duellstand, sieh die letzten Rivalen und starte einen Rückkampf, ohne die Trainingszusammenfassung zu verlassen.',
          en: 'Check the current duel standing, see recent rivals, and start a rematch without leaving the practice summary.',
          pl: 'Sprawdź aktualny stan pojedynków, zobacz ostatnich rywali i wejdź w rewanż bez wychodzenia z podsumowania treningu.',
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Rivalen ${practiceDuels.opponents.length}`,
            en: `Rivals ${practiceDuels.opponents.length}`,
            pl: `Rywale ${practiceDuels.opponents.length}`,
          })}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
        <Pill
          label={
            practiceDuels.currentRank
              ? copy({
                  de: `Deine Position #${practiceDuels.currentRank}`,
                  en: `Your rank #${practiceDuels.currentRank}`,
                  pl: `Twoja pozycja #${practiceDuels.currentRank}`,
                })
              : copy({
                  de: 'Wartet auf Sichtbarkeit',
                  en: 'Waiting for visibility',
                  pl: 'Czeka na widoczność',
                })
          }
          tone={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            textColor: '#047857',
          }}
        />
      </View>

      {practiceDuels.isRestoringAuth || practiceDuels.isLoading ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Der Duellstand nach dem Training wird geladen.',
            en: 'Loading the post-practice duel standing.',
            pl: 'Pobieramy stan pojedynków po treningu.',
          })}
        </Text>
      ) : practiceDuels.error ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
            {practiceDuels.error}
          </Text>
          <ActionButton
            label={copy({
              de: 'Duelle aktualisieren',
              en: 'Refresh duels',
              pl: 'Odśwież pojedynki',
            })}
            onPress={() => {
              void practiceDuels.refresh();
            }}
            tone='primary'
          />
        </View>
      ) : !practiceDuels.isAuthenticated ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rueckspiele zu sehen.',
            en: 'Sign in to see your duel standing, recent rivals, and quick rematches here.',
            pl: 'Zaloguj się, aby zobaczyć tutaj swój stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {practiceDuels.currentEntry ? (
            <InsetPanel
              gap={6}
              padding={12}
              style={{
                borderRadius: 18,
                borderColor: '#bfdbfe',
                backgroundColor: '#eff6ff',
              }}
            >
              <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                {copy({
                  de: 'DEIN DUELLERGEBNIS',
                  en: 'YOUR DUEL RESULT',
                  pl: 'TWÓJ WYNIK W POJEDYNKACH',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                #{practiceDuels.currentRank} {practiceDuels.currentEntry.displayName}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {formatPracticeDuelRecord(practiceDuels.currentEntry, locale)}
              </Text>
            </InsetPanel>
          ) : (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
              })}
            </Text>
          )}

          {practiceDuels.actionError ? (
            <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
              {practiceDuels.actionError}
            </Text>
          ) : null}

          {practiceDuels.opponents.length === 0 ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rueckspiele frei.',
                en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
                pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {practiceDuels.opponents.map((opponent) => (
                <InsetPanel
                  key={opponent.learnerId}
                  gap={6}
                  padding={12}
                  style={{
                    borderRadius: 18,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    {opponent.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                    {copy({
                      de: 'Letztes Duell',
                      en: 'Last duel',
                      pl: 'Ostatni pojedynek',
                    })}{' '}
                    {new Intl.DateTimeFormat(localeTag, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(opponent.lastPlayedAt))}
                  </Text>
                  <KangurMobilePendingActionButton
                    horizontalPadding={12}
                    label={copy({
                      de: 'Schnelles Rueckspiel',
                      en: 'Quick rematch',
                      pl: 'Szybki rewanż',
                    })}
                    onPress={() => {
                      void practiceDuels
                        .createRematch(opponent.learnerId)
                        .then((sessionId) => {
                          if (sessionId) {
                            openDuelSession(sessionId);
                          }
                        });
                    }}
                    pending={practiceDuels.pendingOpponentLearnerId === opponent.learnerId}
                    pendingLabel={copy({
                      de: 'Rueckspiel wird gesendet...',
                      en: 'Sending rematch...',
                      pl: 'Wysyłanie rewanżu...',
                    })}
                    verticalPadding={9}
                  />
                </InsetPanel>
              ))}
            </View>
          )}

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <ActionButton
              centered
              label={copy({
                de: 'Duelle aktualisieren',
                en: 'Refresh duels',
                pl: 'Odśwież pojedynki',
              })}
              onPress={() => {
                void practiceDuels.refresh();
              }}
              stretch
              tone='secondary'
            />

            <LinkButton
              centered
              href='/duels'
              label={copy({
                de: 'Duelle oeffnen',
                en: 'Open duels',
                pl: 'Otwórz pojedynki',
              })}
              stretch
              tone='secondary'
            />
          </View>
        </View>
      )}
    </InsetPanel>
  );
}

export function PracticeLessonMasteryPanel({
  copy,
  lessonFocusSummary,
  lessonMastery,
  strongestLesson,
  weakestLesson,
}: {
  copy: PracticeCopy;
  lessonFocusSummary: string | null;
  lessonMastery: PracticeLessonMasteryState;
  strongestLesson: PracticeLessonMasteryState['strongest'][number] | null;
  weakestLesson: PracticeLessonMasteryState['weakest'][number] | null;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lektionsbeherrschung',
          en: 'Lesson mastery',
          pl: 'Opanowanie lekcji',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Lektionsplan nach dem Training',
          en: 'Post-practice lesson plan',
          pl: 'Plan lekcji po treningu',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Verbinde das frische Trainingsergebnis direkt mit lokal gespeichertem Lektionsstand und entscheide sofort, was wiederholt und was nur gehalten werden soll.',
          en: 'Connect the fresh practice result directly with saved lesson mastery and decide right away what needs review and what only needs maintaining.',
          pl: 'Połącz świeży wynik treningu z zapisanym opanowaniem lekcji i od razu zdecyduj, co powtórzyć, a co tylko podtrzymać.',
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#c7d2fe',
            backgroundColor: '#eef2ff',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
            {copy({
              de: `Verfolgt ${lessonMastery.trackedLessons}`,
              en: `Tracked ${lessonMastery.trackedLessons}`,
              pl: `Śledzone ${lessonMastery.trackedLessons}`,
            })}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#a7f3d0',
            backgroundColor: '#ecfdf5',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#047857', fontSize: 12, fontWeight: '700' }}>
            {copy({
              de: `Beherrscht ${lessonMastery.masteredLessons}`,
              en: `Mastered ${lessonMastery.masteredLessons}`,
              pl: `Opanowane ${lessonMastery.masteredLessons}`,
            })}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#fde68a',
            backgroundColor: '#fffbeb',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
            {copy({
              de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
              en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
              pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
            })}
          </Text>
        </View>
      </View>

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
            en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
            pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonFocusSummary ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {lessonFocusSummary}
            </Text>
          ) : null}

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            {weakestLesson ? (
              <LinkButton
                centered
                href={weakestLesson.lessonHref}
                label={copy({
                  de: `Fokus: ${weakestLesson.title}`,
                  en: `Focus: ${weakestLesson.title}`,
                  pl: `Skup się: ${weakestLesson.title}`,
                })}
                stretch
                tone='primary'
              />
            ) : null}

            {strongestLesson ? (
              <LinkButton
                centered
                href={strongestLesson.lessonHref}
                label={copy({
                  de: `Stärke halten: ${strongestLesson.title}`,
                  en: `Maintain strength: ${strongestLesson.title}`,
                  pl: `Podtrzymaj: ${strongestLesson.title}`,
                })}
                stretch
                tone='secondary'
              />
            ) : null}
          </View>

          {lessonMastery.weakest[0] ? (
            <LessonMasteryRow
              insight={lessonMastery.weakest[0]}
              title={copy({
                de: 'Zum Wiederholen',
                en: 'Needs review',
                pl: 'Do powtórki',
              })}
            />
          ) : null}
          {lessonMastery.strongest[0] ? (
            <LessonMasteryRow
              insight={lessonMastery.strongest[0]}
              title={copy({
                de: 'Stärkste Lektion',
                en: 'Strongest lesson',
                pl: 'Najmocniejsza lekcja',
              })}
            />
          ) : null}
        </View>
      )}
    </InsetPanel>
  );
}

export function PracticeBadgesPanel({
  copy,
  practiceBadges,
  profileHref,
}: {
  copy: PracticeCopy;
  practiceBadges: PracticeBadgesState;
  profileHref: string;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Abzeichen',
          en: 'Badges',
          pl: 'Odznaki',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Abzeichen-Zentrale',
          en: 'Badge hub',
          pl: 'Centrum odznak',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Behalte im Blick, was bereits freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
          en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.',
          pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#c7d2fe',
            backgroundColor: '#eef2ff',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
            {copy({
              de: `Freigeschaltet ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
              en: `Unlocked ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
              pl: `Odblokowane ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
            })}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#fde68a',
            backgroundColor: '#fffbeb',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
            {copy({
              de: `Offen ${practiceBadges.remainingBadges}`,
              en: `Remaining ${practiceBadges.remainingBadges}`,
              pl: `Do zdobycia ${practiceBadges.remainingBadges}`,
            })}
          </Text>
        </View>
      </View>

      {practiceBadges.recentBadges.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
            en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
            pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {copy({
              de: 'Zuletzt freigeschaltet',
              en: 'Recently unlocked',
              pl: 'Ostatnio odblokowane',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {practiceBadges.recentBadges.map((item) => (
              <PracticeBadgeChip key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}

      <LinkButton
        href={profileHref}
        label={copy({
          de: 'Profil und Abzeichen öffnen',
          en: 'Open profile and badges',
          pl: 'Otwórz profil i odznaki',
        })}
        tone='secondary'
      />
    </InsetPanel>
  );
}

export function PracticeResultsPanel({
  copy,
  practiceRecentResults,
  resultsHistoryHref,
}: {
  copy: PracticeCopy;
  practiceRecentResults: PracticeRecentResultsState;
  resultsHistoryHref: string;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Nach dem Training',
          en: 'After practice',
          pl: 'Po treningu',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Ergebniszentrale',
          en: 'Results hub',
          pl: 'Centrum wyników',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Nach der Runde bleiben die letzten Ergebnisse hier griffbereit, damit du direkt wieder ins Training, die passende Lektion oder die Modus-Historie springen kannst.',
          en: 'The latest results stay close here so you can jump right back into practice, the matching lesson, or the mode history.',
          pl: 'Ostatnie wyniki są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.',
        })}
      </Text>

      <LinkButton
        href={resultsHistoryHref}
        label={copy({
          de: 'Vollständigen Verlauf öffnen',
          en: 'Open full history',
          pl: 'Otwórz pełną historię',
        })}
        tone='secondary'
      />

      {practiceRecentResults.isLoading || practiceRecentResults.isRestoringAuth ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Die letzten Ergebnisse werden geladen.',
            en: 'Loading recent results.',
            pl: 'Ładujemy ostatnie wyniki.',
          })}
        </Text>
      ) : !practiceRecentResults.isEnabled ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Melde dich an, um hier Ergebnisse zu sehen.',
            en: 'Sign in to see results here.',
            pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.',
          })}
        </Text>
      ) : practiceRecentResults.error ? (
        <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
          {practiceRecentResults.error}
        </Text>
      ) : practiceRecentResults.recentResultItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt hier noch keine Ergebnisse. Beende einen Lauf, um diesen Bereich zu füllen.',
            en: 'There are no results here yet. Finish a run to fill this section.',
            pl: 'Nie ma tu jeszcze wyników. Ukończ serię, aby wypełnić tę sekcję.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {practiceRecentResults.recentResultItems.map((item) => (
            <PracticeRecentResultRow key={item.result.id} item={item} />
          ))}
        </View>
      )}
    </InsetPanel>
  );
}

export function PracticeAssignmentsPanel({
  copy,
  practiceAssignments,
}: {
  copy: PracticeCopy;
  practiceAssignments: PracticeAssignmentsState;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Nach dem Training',
          en: 'After practice',
          pl: 'Po treningu',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Plan nach dem Training',
          en: 'Post-practice plan',
          pl: 'Plan po treningu',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Wandle diese Runde direkt in die nächsten lokalen Schritte um, ohne den Trainingsfluss zu verlieren.',
          en: 'Turn this run directly into the next local actions without losing the training flow.',
          pl: 'Zamień tę serię od razu w kolejne lokalne kroki, bez gubienia rytmu treningu.',
        })}
      </Text>

      {practiceAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine lokalen Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
            en: 'There are no local tasks yet. Open lessons or complete more practice to build the next plan.',
            pl: 'Nie ma jeszcze lokalnych zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {practiceAssignments.assignmentItems.map((item) => (
            <PracticeAssignmentRow key={item.assignment.id} item={item} />
          ))}
        </View>
      )}
    </InsetPanel>
  );
}

export function PracticeLessonCheckpointsPanel({
  copy,
  lessonCheckpoints,
}: {
  copy: PracticeCopy;
  lessonCheckpoints: PracticeLessonCheckpointsState;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Letzte Lektions-Checkpoints',
          en: 'Recent lesson checkpoints',
          pl: 'Ostatnie checkpointy lekcji',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Weiter mit Lektionen',
          en: 'Continue with lessons',
          pl: 'Kontynuuj lekcje',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Nach der Runde kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen und dann passend weitertrainieren.',
          en: 'After the run you can jump back to the most recently saved lessons and then continue with matching practice.',
          pl: 'Po zakończeniu serii możesz wrócić do ostatnio zapisanych lekcji i potem dalej trenować w pasującym trybie.',
        })}
      </Text>

      {lessonCheckpoints.recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
            en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
            pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonCheckpoints.recentCheckpoints.map((item) => (
            <LessonCheckpointRow key={item.componentId} item={item} />
          ))}
          <LinkButton
            href='/lessons'
            label={copy({
              de: 'Lektionen öffnen',
              en: 'Open lessons',
              pl: 'Otwórz lekcje',
            })}
            tone='secondary'
          />
        </View>
      )}
    </InsetPanel>
  );
}
