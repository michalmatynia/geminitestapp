import { Text, View } from 'react-native';

export default function HomeScreen(): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#fffaf2',
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Kangur Mobile</Text>
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#475569' }}>
        Native app scaffold. Next step: wire auth, shared API client, and the first Kangur screens.
      </Text>
    </View>
  );
}
