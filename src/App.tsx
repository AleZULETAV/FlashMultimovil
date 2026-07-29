import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Button, Text, ScrollView, StyleSheet } from 'react-native';
import MotherModeScreen from './screens/MotherModeScreen';
import RemoteModeScreen from './screens/RemoteModeScreen';

type Mode = 'unset' | 'mother' | 'remote';

/**
 * Capturador de errores fatales: en vez de dejar que la app truene (SIGABRT),
 * mostramos el mensaje y el stack directo en pantalla. Solo para depuración
 * mientras armamos los módulos nativos — quitar antes de una versión "real".
 */
function useGlobalErrorCapture(): string | null {
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    const g = globalThis as unknown as {
      ErrorUtils?: { setGlobalHandler: (fn: (error: Error, isFatal?: boolean) => void) => void };
    };
    g.ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
      setFatalError(`${isFatal ? '[FATAL] ' : ''}${error.name}: ${error.message}\n\n${error.stack ?? '(sin stack)'}`);
    });
  }, []);

  return fatalError;
}

export default function App(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('unset');
  const fatalError = useGlobalErrorCapture();

  if (fatalError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <ScrollView>
          <Text style={styles.errorTitle}>Error capturado:</Text>
          <Text selectable style={styles.errorText}>{fatalError}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'mother') return <MotherModeScreen />;
  if (mode === 'remote') return <RemoteModeScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={{ color: '#888', fontSize: 12 }}>Build: v8-diagnostico</Text>
      <View style={styles.buttons}>
        <Button title="Soy el móvil madre" onPress={() => setMode('mother')} />
        <Button title="Soy un móvil remoto" onPress={() => setMode('remote')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#fff' },
  buttons: { gap: 12 },
  errorContainer: { flex: 1, padding: 16, backgroundColor: '#300' },
  errorTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  errorText: { color: '#fdd', fontSize: 13 },
});
