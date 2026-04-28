import { Text } from 'react-native';
import { type Href } from 'expo-router';
import { Card, LinkButton } from '../../shared/KangurMobileUi';
import { createKangurPlanHref } from '../plan/planHref';

interface ResultsHeaderProps {
  copy: (v: Record<string, string>) => string;
}

export function ResultsHeader({ copy }: ResultsHeaderProps): React.JSX.Element {
  const planHref = createKangurPlanHref();
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'In den Ergebnissen',
          en: 'In results',
          pl: 'W wynikach',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
        {copy({
          de: 'Ergebniszentrale',
          en: 'Results hub',
          pl: 'Centrum wyników',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Ein Ort für letzte Ergebnisse, Trefferquote und die Verteilung auf Arithmetik, Zeit und Logik.',
          en: 'One place for recent results, accuracy, and how they split across arithmetic, time, and logic.',
          pl: 'Jedno miejsce dla ostatnich wyników, skuteczności i tego, jak rozkładają się na arytmetykę, czas i logikę.',
        })}
      </Text>
      <LinkButton
        href={planHref as Href}
        label={copy({
          de: 'Tagesplan öffnen',
          en: 'Open daily plan',
          pl: 'Otwórz plan dnia',
        })}
        style={{ paddingHorizontal: 16 }}
        verticalPadding={12}
      />
    </Card>
  );
}
