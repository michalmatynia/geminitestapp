import type { KangurDuelSession, KangurDuelPlayer } from '@kangur/contracts/kangur-duels';
import React from 'react';
import { View } from 'react-native';
import { KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { formatStatusLabel, getStatusTone, formatSeriesTitle } from '../utils/duels-ui';
import { ProgressPill } from './ProgressPill';

interface DuelContext {
  session: KangurDuelSession;
  isSpectating?: boolean;
  spectatorCount?: number;
  player?: KangurDuelPlayer;
}

interface DetailsPillsProps {
  duel: DuelContext;
  copy: (v: Record<string, string>) => string;
  locale: string;
}

export function DetailsPills({ duel, copy, locale }: DetailsPillsProps): React.JSX.Element {
  const { session } = duel;

  const spectatorLabel = duel.spectatorCount !== undefined && duel.spectatorCount > 0
    ? copy({ de: `Zuschauer ${duel.spectatorCount}`, en: `Audience ${duel.spectatorCount}`, pl: `Widownia ${duel.spectatorCount}` })
    : null;

  const seriesLabel = session.series ? formatSeriesTitle(session.series, locale) : null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill label={formatStatusLabel(session.status, locale)} tone={getStatusTone(session.status)} />
      <Pill
        label={session.visibility === 'private' ? copy({ de: 'Privat', en: 'Private', pl: 'Prywatny' }) : copy({ de: 'Öffentlich', en: 'Public', pl: 'Publiczny' })}
        tone={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', textColor: '#475569' }}
      />
      <ProgressPill duel={duel} locale={locale} session={session} />
      {spectatorLabel !== null ? (
        <Pill
          label={spectatorLabel}
          tone={{ backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', textColor: '#6d28d9' }}
        />
      ) : null}
      {seriesLabel !== null ? (
        <Pill label={seriesLabel} tone={{ backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', textColor: '#6d28d9' }} />
      ) : null}
    </View>
  );
}
