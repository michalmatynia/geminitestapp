import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
  MessageCard,
} from './duels-primitives';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

type DuelSessionWaitingRoomCardProps = {
  canShareInvite: boolean;
  copy: DuelCopy;
  duel: DuelSessionState;
  inviteeName: string;
  inviteShareError: string | null;
  onHandleInviteShare: () => Promise<void>;
};

function WaitingRoomHeader({
  duel,
  copy,
}: {
  duel: DuelSessionState;
  copy: DuelCopy;
}): React.JSX.Element {
  const title = duel.isSpectating
    ? copy({
        de: 'Warteraum des öffentlichen Duells',
        en: 'Public duel waiting room',
        pl: 'Poczekalnia publicznego pojedynku',
      })
    : copy({
        de: 'Duell-Warteraum',
        en: 'Duel waiting room',
        pl: 'Poczekalnia pojedynku',
      });

  const subtitle = duel.isSpectating
    ? copy({
        de: 'Du beobachtest die Wartephase. Sobald die benötigten Spieler beigetreten sind, beginnt die aktive Runde automatisch.',
        en: 'You are watching the waiting phase. Once the required players join, the active round will begin automatically.',
        pl: 'Obserwujesz etap oczekiwania. Gdy wymagani gracze dołączą, aktywna runda zacznie się automatycznie.',
      })
    : copy({
        de: 'Wir warten, bis alle Spieler beitreten. Wenn die zweite Person in der Lobby erscheint, startet das Duell automatisch.',
        en: 'Waiting for all players to join. When the second player appears in the lobby, the duel will start automatically.',
        pl: 'Czekamy, aż wszyscy gracze dołączą. Gdy druga osoba pojawi się w lobby, pojedynek wystartuje automatycznie.',
      });

  return (
    <>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{subtitle}</Text>
    </>
  );
}

function ShareInviteSection({
  copy,
  inviteeName,
  inviteShareError,
  onHandleInviteShare,
}: {
  copy: DuelCopy;
  inviteeName: string;
  inviteShareError: string | null;
  onHandleInviteShare: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <MessageCard
        title={copy({
          de: 'Einladung teilen',
          en: 'Share invite',
          pl: 'Udostępnij zaproszenie',
        })}
        description={copy({
          de: `Sende ${inviteeName} einen direkten Link, damit das private Duell sofort ohne Suche in der Lobby geöffnet werden kann.`,
          en: `Send a direct link to ${inviteeName} so the private duel opens right away without searching in the lobby.`,
          pl: `Wyślij bezpośredni link do ${inviteeName}, aby prywatny pojedynek otworzył się od razu bez szukania go w lobby.`,
        })}
      />
      <ActionButton
        label={copy({
          de: 'Einladungslink teilen',
          en: 'Share invite link',
          pl: 'Udostępnij link zaproszenia',
        })}
        onPress={onHandleInviteShare}
        stretch
        tone='secondary'
      />
      {inviteShareError !== null ? (
        <MessageCard
          title={copy({
            de: 'Einladung konnte nicht geteilt werden',
            en: 'Could not share the invite',
            pl: 'Nie udało się udostępnić zaproszenia',
          })}
          description={inviteShareError}
          tone='error'
        />
      ) : null}
    </View>
  );
}

export function DuelSessionWaitingRoomCard({
  canShareInvite,
  copy,
  duel,
  inviteeName,
  inviteShareError,
  onHandleInviteShare,
}: DuelSessionWaitingRoomCardProps): React.JSX.Element {
  const { session } = duel;

  if (session === null) {
    return <></>;
  }

  return (
    <Card>
      <WaitingRoomHeader copy={copy} duel={duel} />
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Minimale Spielerzahl zum Start: ${session.minPlayersToStart ?? 2}`,
          en: `Minimum players to start: ${session.minPlayersToStart ?? 2}`,
          pl: `Minimalna liczba graczy do startu: ${session.minPlayersToStart ?? 2}`,
        })}
      </Text>
      {canShareInvite ? (
        <ShareInviteSection
          copy={copy}
          inviteeName={inviteeName}
          inviteShareError={inviteShareError}
          onHandleInviteShare={onHandleInviteShare}
        />
      ) : null}
    </Card>
  );
}
