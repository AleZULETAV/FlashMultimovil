import React, { useState } from 'react';
import { SafeAreaView, View, Button, StyleSheet } from 'react-native';
import MotherModeScreen from './screens/MotherModeScreen';
import RemoteModeScreen from './screens/RemoteModeScreen';

type Mode = 'unset' | 'mother' | 'remote';

export default function App(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('unset');

  if (mode === 'mother') return <MotherModeScreen />;
  if (mode === 'remote') return <RemoteModeScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttons}>
        <Button title="Soy el móvil madre" onPress={() => setMode('mother')} />
        <Button title="Soy un móvil remoto" onPress={() => setMode('remote')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  buttons: { gap: 12 },
});
