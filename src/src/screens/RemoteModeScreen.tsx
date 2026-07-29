import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PeerNetwork, { peerNetworkEvents } from '../native/PeerNetwork';

/**
 * UI del móvil remoto: se conecta a la sesión y muestra el último mensaje recibido.
 * Ver sección 6 del documento de proyecto.
 */
export default function RemoteModeScreen(): React.JSX.Element {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('(nada todavía)');
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    PeerNetwork.startSession('movil-remoto').catch((e: Error) => setSessionError(String(e?.message ?? e)));

    const onConnected = peerNetworkEvents?.addListener('onPeerConnected', () => setConnected(true));
    const onDisconnected = peerNetworkEvents?.addListener('onPeerDisconnected', () => setConnected(false));
    const onMessage = peerNetworkEvents?.addListener('onPeerMessage', (json: string) => setLastMessage(json));

    return () => {
      onConnected?.remove();
      onDisconnected?.remove();
      onMessage?.remove();
      PeerNetwork.stopSession();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil remoto</Text>
      {sessionError && <Text style={styles.error} selectable>Error: {sessionError}</Text>}
      <Text>{connected ? 'Conectado al móvil madre' : 'Buscando móvil madre...'}</Text>
      <Text>Último mensaje: {lastMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  error: { color: 'red' },
});
