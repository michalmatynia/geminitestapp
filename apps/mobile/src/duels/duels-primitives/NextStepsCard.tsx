import { Text, View } from 'react-native';

import { useKangurMobileI18n, type KangurMobileLocalizedValue } from '../../i18n/kangurMobileI18n';
import { useKangurMobileDuelsAssignments, type KangurMobileDuelsAssignmentItem } from '../useKangurMobileDuelsAssignments';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import { LinkButton } from './BaseComponents';

const priorityTones: Record<string, Tone> = {
  high: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  },
  medium: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#b45309',
  },
  low: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  },
};

const priorityLabels: Record<string, KangurMobileLocalizedValue<string>> = {
  high: {
    de: 'Hohe Priorität',
    en: 'High priority',
    pl: 'Priorytet wysoki',
  },
  medium: {
    de: 'Mittlere Priorität',
    en: 'Medium priority',
    pl: 'Priorytet średni',
  },
  low: {
    de: 'Niedrige Priorität',
    en: 'Low priority',
    pl: 'Priorytet niski',
  },
};

function DuelAssignmentRow({
  item,
}: {
  item: KangurMobileDuelsAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  const priorityTone = priorityTones[item.assignment.priority] ?? priorityTones.low;

  const assignmentActionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  const assignmentAction = item.href !== null ? (
    <LinkButton href={item.href} label={assignmentActionLabel} tone='primary' stretch />
  ) : (
    <Pill
      label={`${assignmentActionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
      tone={{
        backgroundColor: '#e2e8f0',
        borderColor: '#cbd5e1',
        textColor: '#475569',
      }}
    />
  );

  const priorityLabel = priorityLabels[item.assignment.priority] ?? priorityLabels.low;

  return (
    <KangurMobileInsetPanel gap={8}>
      <Pill label={copy(priorityLabel)} tone={priorityTone} />

      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${item.assignment.target}`,
          en: `Goal: ${item.assignment.target}`,
          pl: `Cel: ${item.assignment.target}`,
        })}
      </Text>

      {assignmentAction}
    </KangurMobileInsetPanel>
  );
}

function NextStepsList({
  assignments,
}: {
  assignments: KangurMobileDuelsAssignmentItem[];
}): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      {assignments.map((item) => (
        <DuelAssignmentRow key={item.assignment.id} item={item} />
      ))}
    </View>
  );
}

export function NextStepsCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const duelAssignments = useKangurMobileDuelsAssignments();

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {context === 'session'
            ? copy({
                de: 'Im Duell',
                en: 'In duel',
                pl: 'W pojedynku',
              })
            : copy({
                de: 'In der Lobby',
                en: 'In lobby',
                pl: 'W lobby',
              })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {context === 'session'
            ? copy({
                de: 'Plan neben dem Duell',
                en: 'Plan beside the duel',
                pl: 'Plan obok pojedynku',
              })
            : copy({
                de: 'Plan aus der Lobby',
                en: 'Plan from the lobby',
                pl: 'Plan z lobby',
              })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während einer Duellsitzung kannst du schon den nächsten Schritt aus Lektionen und Training vorbereiten, sobald das Match endet.',
                en: 'Even during a duel session, you can line up the next step from lessons and practice for when the match ends.',
                pl: 'Nawet w trakcie sesji pojedynku możesz już ustawić kolejny krok z lekcji i treningu na moment po zakończeniu meczu.',
              })
            : copy({
                de: 'Aus der Lobby heraus kannst du direkt den nächsten Schritt aus deinem Fortschritt öffnen, bevor du wieder nach einem Match suchst.',
                en: 'From the lobby, you can open the next step from your progress before you search for another match.',
                pl: 'Z lobby możesz od razu otworzyć kolejny krok wynikający z postępu, zanim znowu zaczniesz szukać meczu.',
              })}
        </Text>
      </View>

      {duelAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine nächsten Schritte. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
            en: 'There are no next steps yet. Open lessons or complete more practice to build the next plan.',
            pl: 'Nie ma jeszcze kolejnych kroków. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
          })}
        </Text>
      ) : (
        <NextStepsList assignments={duelAssignments.assignmentItems} />
      )}
    </Card>
  );
}
