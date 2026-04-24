import { View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
} from './duels-primitives';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

type DuelSessionActionsCardProps = {
  copy: DuelCopy;
  duel: DuelSessionState;
  hasWaitingSession: boolean;
  isFinishedSession: boolean;
  onOpenLobby: () => void;
};

function RefreshButton({
  duel,
  copy,
}: {
  duel: DuelSessionState;
  copy: DuelCopy;
}): React.JSX.Element {
  const label = duel.isSpectating
    ? copy({
        de: 'Öffentliches Duell aktualisieren',
        en: 'Refresh public duel',
        pl: 'Odśwież publiczny pojedynek',
      })
    : copy({
        de: 'Duellstatus aktualisieren',
        en: 'Refresh duel state',
        pl: 'Odśwież stan pojedynku',
      });

  return (
    <ActionButton
      disabled={duel.isMutating}
      label={label}
      onPress={duel.refresh}
      stretch
      tone='secondary'
    />
  );
}

function ExitButton({
  duel,
  copy,
  hasWaitingSession,
  onOpenLobby,
}: {
  duel: DuelSessionState;
  copy: DuelCopy;
  hasWaitingSession: boolean;
  onOpenLobby: () => void;
}): React.JSX.Element {
  if (duel.isSpectating) {
    return (
      <ActionButton
        label={copy({
          de: 'Zurück zur Lobby',
          en: 'Back to lobby',
          pl: 'Wróć do lobby',
        })}
        onPress={onOpenLobby}
        stretch
      />
    );
  }

  const label = hasWaitingSession
    ? copy({ de: 'Duell absagen', en: 'Cancel duel', pl: 'Anuluj pojedynek' })
    : copy({ de: 'Duell verlassen', en: 'Leave duel', pl: 'Opuść pojedynek' });

  return (
    <ActionButton
      disabled={duel.isMutating}
      label={label}
      onPress={async () => {
        const didLeave = await duel.leaveSession();
        if (didLeave) {
          onOpenLobby();
        }
      }}
      stretch
    />
  );
}

export function DuelSessionActionsCard({
  copy,
  duel,
  hasWaitingSession,
  isFinishedSession,
  onOpenLobby,
}: DuelSessionActionsCardProps): React.JSX.Element {
  if (isFinishedSession) {
    return <></>;
  }

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <RefreshButton copy={copy} duel={duel} />
        <ExitButton
          copy={copy}
          duel={duel}
          hasWaitingSession={hasWaitingSession}
          onOpenLobby={onOpenLobby}
        />
      </View>
    </Card>
  );
}
