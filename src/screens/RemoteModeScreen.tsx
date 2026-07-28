import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
// import PeerNetwork from '../native/PeerNetwork'; // desactivado para la prueba de aislamiento

/**
 * UI del móvil remoto: se conecta a la sesión y muestra el último mensaje recibido.
 * Ver sección 6 del documento de proyecto.
 */
export default function RemoteModeScreen(): React.JSX.Element {
  const [connected] = useState(false);
  const [lastMessage] = useState<string>('(nada todavía)');
  const [sessionError] = useState<string | null>(null);

  useEffect(() => {
    // PRUEBA DE AISLAMIENTO FINAL: ninguna llamada al módulo nativo en absoluto.
    // PeerNetwork.startSession('movil-remoto').catch((e: Error) => setSessionError(String(e?.message ?? e)));

    return () => {
      // PeerNetwork.stopSession();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil remoto</Text>
      {sessionError && <Text style={{ color: 'red' }} selectable>Error: {sessionError}</Text>}
      <Text>{connected ? 'Conectado al móvil madre' : 'Buscando móvil madre...'}</Text>
      <Text>Último mensaje: {lastMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
});
