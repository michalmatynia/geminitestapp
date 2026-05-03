import { View, Text, Pressable } from 'react-native';
import type React from 'react';
import { type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import type { useKangurPracticeSyncProof } from './useKangurPracticeSyncProof';
import type { 
  KangurPracticeSyncProofSnapshot, 
  KangurPracticeSyncProofSurface 
} from './practiceSyncProofSurfaces';

type PracticeCopy = (value: Record<string, string>) => string;
type PracticeSyncProofState = ReturnType<typeof useKangurPracticeSyncProof>;

interface PracticeSyncProofPanelProps {
  copy: PracticeCopy;
  locale: KangurMobileLocale;
  practiceSyncProof: PracticeSyncProofState;
}

export function PracticeSyncProofPanel({
  copy,
  locale,
  practiceSyncProof,
}: PracticeSyncProofPanelProps): React.JSX.Element {
  const snapshot = practiceSyncProof.snapshot as KangurPracticeSyncProofSnapshot;

  return (
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#eff6ff', padding: 12, gap: 10 }}>
      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
        {copy({ de: 'Entwickler-Prüfung der Synchronisierung', en: 'Developer sync checks', pl: 'Deweloperskie sprawdzenie synchronizacji' })}
      </Text>
      <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
        {copy({ de: 'Das prüft dieselben Daten für Ergebnisse, Profil, Tagesplan und Rangliste.', en: 'Checks same sync data.', pl: 'Sprawdza dane synchronizacji.' })}
      </Text>
      {practiceSyncProof.isLoading ? (
        <Text style={{ color: '#1e3a8a', fontSize: 13 }}>{copy({ de: 'Laden...', en: 'Loading...', pl: 'Ładowanie...' })}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {snapshot.surfaces.map((surface: KangurPracticeSyncProofSurface) => (
            <View key={surface.label} style={{ borderRadius: 14, borderWidth: 1, borderColor: surface.status === 'ready' ? '#86efac' : '#fca5a5', backgroundColor: surface.status === 'ready' ? '#f0fdf4' : '#fef2f2', padding: 10, gap: 4 }}>
              <Text style={{ color: surface.status === 'ready' ? '#166534' : '#b91c1c', fontSize: 13, fontWeight: '800' }}>
                {surface.label}: {surface.status === 'ready' ? copy({ de: 'bereit', en: 'ready', pl: 'gotowe' }) : copy({ de: 'fehlt', en: 'missing', pl: 'brak' })}
              </Text>
              <Text style={{ color: surface.status === 'ready' ? '#166534' : '#991b1b', fontSize: 13 }}>{surface.detail}</Text>
            </View>
          ))}
        </View>
      )}
      {practiceSyncProof.error !== null ? <Text style={{ color: '#991b1b', fontSize: 13 }}>{practiceSyncProof.error}</Text> : null}
      <Pressable onPress={() => { void practiceSyncProof.refresh(); }} style={{ alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 9 }}>
        <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>{translateKangurMobileActionLabel('Refresh proof', locale)}</Text>
      </Pressable>
    </View>
  );
}
