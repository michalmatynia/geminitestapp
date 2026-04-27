import { Text, View } from 'react-native';

import { BASE_TONE } from '../../shared/KangurAssessmentUi';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { TabButton } from '../parent-dashboard-primitives';

interface ParentTabsSectionProps {
  copy: (text: Record<string, string>) => string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeTabDescription: string;
}

export function ParentTabsSection({
  copy,
  activeTab,
  setActiveTab,
  activeTabDescription,
}: ParentTabsSectionProps) {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Eltern-Tabs',
          en: 'Parent tabs',
          pl: 'Zakładki rodzica',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
        {copy({
          de: 'Ansicht auswählen',
          en: 'Choose a view',
          pl: 'Wybierz widok',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {activeTabDescription}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <TabButton
          active={activeTab === 'progress'}
          label={copy({
            de: 'Fortschritt',
            en: 'Progress',
            pl: 'Postęp',
          })}
          onPress={() => {
            setActiveTab('progress');
          }}
        />
        <TabButton
          active={activeTab === 'results'}
          label={copy({
            de: 'Ergebnisse',
            en: 'Results',
            pl: 'Wyniki',
          })}
          onPress={() => {
            setActiveTab('results');
          }}
        />
        <TabButton
          active={activeTab === 'assignments'}
          label={copy({
            de: 'Aufgaben',
            en: 'Assignments',
            pl: 'Zadania',
          })}
          onPress={() => {
            setActiveTab('assignments');
          }}
        />
        <TabButton
          active={activeTab === 'monitoring'}
          label={copy({
            de: 'Überwachung',
            en: 'Monitoring',
            pl: 'Monitorowanie',
          })}
          onPress={() => {
            setActiveTab('monitoring');
          }}
        />
        <TabButton
          active={activeTab === 'aiTutor'}
          label='AI Tutor'
          onPress={() => {
            setActiveTab('aiTutor');
          }}
        />
      </View>
    </Card>
  );
}
