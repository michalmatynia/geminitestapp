import {
  getKangurPortableLessonBody,
  getKangurPracticeOperationForLessonComponent,
} from '@kangur/core';
import { Link, type Href, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { useKangurMobileLessons } from './useKangurMobileLessons';

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

function Card({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: '#ffffff',
        padding: 18,
        gap: 12,
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const getMasteryTone = (badgeAccent: string): Tone => {
  if (badgeAccent === 'emerald') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }

  if (badgeAccent === 'amber') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  if (badgeAccent === 'rose') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }

  return {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    textColor: '#64748b',
  };
};

export function KangurLessonsScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const rawFocusParam = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const { focusToken, lessons, selectedLesson } = useKangurMobileLessons(
    typeof rawFocusParam === 'string' ? rawFocusParam : null,
  );
  const selectedLessonBody = selectedLesson
    ? getKangurPortableLessonBody(selectedLesson.lesson.componentId)
    : null;
  const selectedPracticeOperation = selectedLesson
    ? getKangurPracticeOperationForLessonComponent(selectedLesson.lesson.componentId)
    : null;
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  useEffect(() => {
    setActiveSectionIndex(0);
  }, [selectedLesson?.lesson.id]);

  const activeSection =
    selectedLessonBody?.sections[Math.min(activeSectionIndex, selectedLessonBody.sections.length - 1)] ??
    null;
  const selectedPracticeHref: Href | null = selectedPracticeOperation
    ? {
        pathname: '/practice',
        params: {
          operation: selectedPracticeOperation,
        },
      }
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
      >
        <View style={{ gap: 14 }}>
          <Link href='/' asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>Back</Text>
            </Pressable>
          </Link>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              Nauka i powtorki
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              Lekcje
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              To pierwszy mobilny katalog lekcji. Rekomendacje i zadania z profilu moga juz
              otwierac konkretne tematy przez parametr focus.
            </Text>
          </Card>

          {selectedLesson ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Wybrana lekcja
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
                {selectedLesson.lesson.emoji} {selectedLesson.lesson.title}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {selectedLesson.lesson.description}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                  label={selectedLesson.mastery.statusLabel}
                  tone={getMasteryTone(selectedLesson.mastery.badgeAccent)}
                />
                <Pill
                  label='Widok z rekomendacji'
                  tone={{
                    backgroundColor: '#eef2ff',
                    borderColor: '#c7d2fe',
                    textColor: '#4338ca',
                  }}
                />
              </View>
              <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                {selectedLesson.mastery.summaryLabel}
              </Text>
              {selectedLessonBody ? (
                <View style={{ gap: 12 }}>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {selectedLessonBody.introduction}
                  </Text>

                  <View style={{ gap: 8 }}>
                    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                      Sekcje lekcji
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {selectedLessonBody.sections.map((section, index) => (
                        <Pressable
                          key={section.id}
                          accessibilityRole='button'
                          onPress={() => {
                            setActiveSectionIndex(index);
                          }}
                          style={{
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor:
                              index === activeSectionIndex ? '#1d4ed8' : '#e2e8f0',
                            backgroundColor:
                              index === activeSectionIndex ? '#eff6ff' : '#f8fafc',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: index === activeSectionIndex ? '#1d4ed8' : '#475569',
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            {index + 1}. {section.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {activeSection ? (
                    <View
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: '#f8fafc',
                        padding: 14,
                        gap: 10,
                      }}
                    >
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                          Krok {activeSectionIndex + 1} z {selectedLessonBody.sections.length}
                        </Text>
                        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                          {activeSection.title}
                        </Text>
                      </View>

                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {activeSection.description}
                      </Text>

                      {activeSection.example ? (
                        <View
                          style={{
                            borderRadius: 18,
                            backgroundColor: '#fff7ed',
                            borderWidth: 1,
                            borderColor: '#fdba74',
                            padding: 12,
                            gap: 6,
                          }}
                        >
                          <Text style={{ color: '#c2410c', fontSize: 12, fontWeight: '700' }}>
                            {activeSection.example.label}
                          </Text>
                          <Text style={{ color: '#9a3412', fontSize: 20, fontWeight: '800' }}>
                            {activeSection.example.equation}
                          </Text>
                          <Text style={{ color: '#7c2d12', fontSize: 13, lineHeight: 18 }}>
                            {activeSection.example.explanation}
                          </Text>
                        </View>
                      ) : null}

                      {activeSection.reminders && activeSection.reminders.length > 0 ? (
                        <View style={{ gap: 6 }}>
                          {activeSection.reminders.map((reminder) => (
                            <Text
                              key={reminder}
                              style={{ color: '#334155', fontSize: 13, lineHeight: 18 }}
                            >
                              - {reminder}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <Pressable
                          accessibilityRole='button'
                          disabled={activeSectionIndex === 0}
                          onPress={() => {
                            setActiveSectionIndex((current) => Math.max(0, current - 1));
                          }}
                          style={{
                            borderRadius: 999,
                            backgroundColor:
                              activeSectionIndex === 0 ? '#e2e8f0' : '#ffffff',
                            borderWidth: 1,
                            borderColor: '#cbd5e1',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text
                            style={{
                              color: activeSectionIndex === 0 ? '#94a3b8' : '#0f172a',
                              fontWeight: '700',
                            }}
                          >
                            Previous
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole='button'
                          disabled={activeSectionIndex >= selectedLessonBody.sections.length - 1}
                          onPress={() => {
                            setActiveSectionIndex((current) =>
                              Math.min(selectedLessonBody.sections.length - 1, current + 1),
                            );
                          }}
                          style={{
                            borderRadius: 999,
                            backgroundColor:
                              activeSectionIndex >= selectedLessonBody.sections.length - 1
                                ? '#e2e8f0'
                                : '#0f172a',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                activeSectionIndex >= selectedLessonBody.sections.length - 1
                                  ? '#94a3b8'
                                  : '#ffffff',
                              fontWeight: '700',
                            }}
                          >
                            Next
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  <View
                    style={{
                      borderRadius: 18,
                      backgroundColor: '#eef2ff',
                      borderWidth: 1,
                      borderColor: '#c7d2fe',
                      padding: 14,
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
                      Co dalej
                    </Text>
                    <Text style={{ color: '#3730a3', fontSize: 14, lineHeight: 20 }}>
                      {selectedLessonBody.practiceNote}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  Wlasciwa tresc tej lekcji nie jest jeszcze przeniesiona do React Native. Ten
                  ekran zamyka za to luke nawigacyjna i pokazuje prawidlowy stan opanowania.
                </Text>
              )}
              <Link href='/lessons' asChild>
                <Pressable
                  accessibilityRole='button'
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Show all lessons</Text>
                </Pressable>
              </Link>
              {selectedPracticeOperation ? (
                <Link href={selectedPracticeHref!} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      backgroundColor: '#1d4ed8',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                      Start practice
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </Card>
          ) : focusToken ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Brak dopasowania
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                Nie znaleziono lekcji dla "{focusToken}"
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Pokazujemy pelny katalog, aby mozna bylo przejsc dalej recznie.
              </Text>
            </Card>
          ) : null}

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              Katalog lekcji
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              Zacznij od nowych tematow albo wroc do obszarow wymagajacych powtorki.
            </Text>

            <View style={{ gap: 12 }}>
              {lessons.map((item) => {
                const masteryTone = getMasteryTone(item.mastery.badgeAccent);
                const href: Href = {
                  pathname: '/lessons',
                  params: {
                    focus: item.lesson.componentId,
                  },
                };

                return (
                  <Link href={href} key={item.lesson.id} asChild>
                    <Pressable
                      accessibilityRole='button'
                      style={{
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: item.isFocused ? '#1d4ed8' : '#e2e8f0',
                        backgroundColor: item.isFocused ? '#eff6ff' : '#f8fafc',
                        padding: 16,
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                            {item.lesson.emoji} {item.lesson.title}
                          </Text>
                          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                            {item.lesson.description}
                          </Text>
                        </View>
                        <Pill label={item.mastery.statusLabel} tone={masteryTone} />
                      </View>

                      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                        {item.mastery.summaryLabel}
                      </Text>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
