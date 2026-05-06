import { Text, View } from 'react-native';

import { KangurMobileCard as Card } from '../../shared/KangurMobileUi';
import { TabButton } from '../parent-dashboard-primitives';

interface ParentTabsSectionProps {
  copy: (text: Record<string, string>) => string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeTabDescription: string;
}

export function ParentTabsSection({
  copy,
  activeTab,
  setActiveTab,
  activeTabDescription,
}: ParentTabsSectionProps): React.JSX.Element {
  const tabs = [
    { id: 'progress', label: copy({ de: 'Fortschritt', en: 'Progress', pl: 'Postęp' }) },
    { id: 'results', label: copy({ de: 'Ergebnisse', en: 'Results', pl: 'Wyniki' }) },
    { id: 'assignments', label: copy({ de: 'Aufgaben', en: 'Assignments', pl: 'Zadania' }) },
    { id: 'monitoring', label: copy({ de: 'Überwachung', en: 'Monitoring', pl: 'Monitorowanie' }) },
    { id: 'aiTutor', label: 'AI Tutor' },
  ];

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
        {tabs.map((tab) => (
          <TabButton
            active={activeTab === tab.id}
            key={tab.id}
            label={tab.label}
            onPress={() => {
              setActiveTab(tab.id);
            }}
          />
        ))}
      </View>
    </Card>
  );
}

