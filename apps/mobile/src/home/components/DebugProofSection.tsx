import React from 'react';
import { Text, View } from 'react-native';

import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { SectionCard } from '../homeScreenPrimitives';

type DebugCheck = {
  label: string;
  status: 'ready' | 'info' | 'missing';
  detail: string;
};

function DebugCheckItem({
  check,
  copy,
}: {
  check: DebugCheck;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
}): React.JSX.Element {
  const statusColors: Record<
    'ready' | 'info' | 'missing',
    { bg: string; border: string; text: string }
  > = {
    ready: { bg: '#ecfdf5', border: '#a7f3d0', text: '#166534' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' },
    missing: { bg: '#fff7ed', border: '#fed7aa', text: '#991b1b' },
  };
  const { bg, border } = statusColors[check.status];

  const texts: Record<'ready' | 'info' | 'missing', string> = {
    ready: copy({ de: 'bereit', en: 'ready', pl: 'gotowe' }),
    info: copy({ de: 'läuft', en: 'in progress', pl: 'w toku' }),
    missing: copy({ de: 'fehlt', en: 'missing', pl: 'brak' }),
  };
  const statusText = texts[check.status];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderRadius: 18,
        borderWidth: 1,
        gap: 4,
        padding: 12,
      }}
    >
      <Text style={{ color: '#0f172a', fontWeight: '700' }}>
        {check.label}: {statusText}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>{check.detail}</Text>
    </View>
  );
}

export function DebugProofSection({
  copy,
  homeDebugProof,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  homeDebugProof: {
    operationLabel: string;
    checks: DebugCheck[];
  } | null;
}): React.JSX.Element | null {
  if (!__DEV__ || homeDebugProof === null) return null;

  return (
    <SectionCard
      title={copy({
        de: 'Entwickler-Prüfung für Startdaten',
        en: 'Developer home checks',
        pl: 'Deweloperskie sprawdzenie danych startu',
      })}
    >
      <Text style={{ color: '#0f172a', fontWeight: '700' }}>
        {copy({ de: 'Modus', en: 'Mode', pl: 'Tryb' })}: {homeDebugProof.operationLabel}
      </Text>
      <View style={{ gap: 10 }}>
        {homeDebugProof.checks.map((check) => (
          <DebugCheckItem key={check.label} check={check} copy={copy} />
        ))}
      </View>
    </SectionCard>
  );
}
