import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
} from '../../shared/KangurMobileUi';
import { getMasteryTone, renderLessonPracticeLink } from '../lessons-screen-primitives';
import { getKangurMobileLocaleTag } from '../i18n/kangurMobileI18n';

interface CatalogItemLesson {
  id: string;
  emoji: string;
  title: string;
  description: string;
  componentId: string;
}

interface CatalogItemMastery {
  badgeAccent: string;
  statusLabel: string;
  summaryLabel: string;
}

interface CatalogItemCheckpoint {
  lastCompletedAt: string;
  lastScorePercent: number;
  bestScorePercent: number;
}

export interface LessonsCatalogItem {
  lesson: CatalogItemLesson;
  mastery: CatalogItemMastery;
  isFocused: boolean;
  practiceHref: string;
  checkpointSummary?: CatalogItemCheckpoint | null;
}

interface MasteryPillProps {
  label: string;
  badgeAccent: string;
}

const MasteryPill: React.FC<MasteryPillProps> = ({ label, badgeAccent }) => (
  <Pill label={label} tone={getMasteryTone(badgeAccent)} />
);

interface CheckpointSummaryProps {
  summary: CatalogItemCheckpoint;
  locale: string;
  copy: (translations: Record<string, string>) => string;
}

const CheckpointSummary: React.FC<CheckpointSummaryProps> = ({ summary, locale, copy }) => {
  const localeTag: string = (getKangurMobileLocaleTag(locale) as string | undefined) ?? 'en';
  const dateObj = new Date(summary.lastCompletedAt);
  const dateFormatted = dateObj.toLocaleDateString(localeTag, { dateStyle: 'medium' });
  const timeFormatted = dateObj.toLocaleTimeString(localeTag, { timeStyle: 'short' });

  return (
    <InsetPanel gap={6} padding={12} style={{ borderRadius: 18, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Letzter Checkpoint', en: 'Latest checkpoint', pl: 'Ostatni checkpoint' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: `Zuletzt gespeichert ${dateFormatted} ${timeFormatted}`,
          en: `Last saved ${dateFormatted} ${timeFormatted}`,
          pl: `Ostatni zapis ${dateFormatted} ${timeFormatted}`,
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: `Ergebnis ${summary.lastScorePercent}% • bestes ${summary.bestScorePercent}%`,
          en: `Score ${summary.lastScorePercent}% • best ${summary.bestScorePercent}%`,
          pl: `Wynik ${summary.lastScorePercent}% • najlepszy ${summary.bestScorePercent}%`,
        })}
      </Text>
    </InsetPanel>
  );
};

interface CatalogItemProps {
  item: LessonsCatalogItem;
  locale: string;
  copy: (translations: Record<string, string>) => string;
  onOpenCatalogLesson: () => void;
}

const CatalogItem: React.FC<CatalogItemProps> = ({ item, locale, copy, onOpenCatalogLesson }) => {
  const href = {
    pathname: '/lessons' as const,
    params: { focus: item.lesson.componentId },
  };

  return (
    <InsetPanel
      gap={10}
      padding={16}
      style={{
        borderRadius: 22,
        borderColor: item.isFocused ? '#1d4ed8' : '#e2e8f0',
        backgroundColor: item.isFocused ? '#eff6ff' : '#f8fafc',
      }}
    >
      <Link href={href} asChild>
        <Pressable
          accessibilityRole='button'
          onPress={onOpenCatalogLesson}
          style={{ gap: 10 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {item.lesson.emoji} {item.lesson.title}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {item.lesson.description}
              </Text>
            </View>
            <MasteryPill label={item.mastery.statusLabel} badgeAccent={item.mastery.badgeAccent} />
          </View>

          <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>{item.mastery.summaryLabel}</Text>

          {item.checkpointSummary !== null && item.checkpointSummary !== undefined ? (
            <CheckpointSummary summary={item.checkpointSummary} locale={locale} copy={copy} />
          ) : null}
        </Pressable>
      </Link>

      <View style={{ flexDirection: 'column', gap: 8 }}>
        <LinkButton
          href={href}
          label={`${copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })}: ${item.lesson.title}`}
          onPress={onOpenCatalogLesson}
          stretch
          textStyle={{ textAlign: 'left' }}
          tone='primary'
        />
        {renderLessonPracticeLink({
          href: item.practiceHref,
          label: `${copy({ de: 'Training starten', en: 'Start practice', pl: 'Uruchom trening' })}: ${item.lesson.title}`,
          fullWidth: true,
        })}
      </View>
    </InsetPanel>
  );
};

interface LessonsCatalogSectionProps {
  isPreparingLessonsView: boolean;
  copy: (translations: Record<string, string>) => string;
  lessons: LessonsCatalogItem[];
  locale: string;
  onOpenCatalogLesson: () => void;
}

export function LessonsCatalogSection({
  isPreparingLessonsView,
  copy,
  lessons,
  locale,
  onOpenCatalogLesson,
}: LessonsCatalogSectionProps): React.JSX.Element | null {
  if (isPreparingLessonsView) return null;

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Lektionskatalog', en: 'Lesson catalog', pl: 'Katalog lekcji' })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({ de: 'Beginne mit neuen Themen oder kehre zu Bereichen zurück, die Wiederholung brauchen.', en: 'Start with new topics or return to the areas that need review.', pl: 'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.' })}
      </Text>

      <View style={{ gap: 12 }}>
        {lessons.map((item) => (
          <CatalogItem
            key={item.lesson.id}
            item={item}
            locale={locale}
            copy={copy}
            onOpenCatalogLesson={onOpenCatalogLesson}
          />
        ))}
      </View>
    </Card>
  );
}
