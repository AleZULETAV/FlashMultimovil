import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import PeerNetwork, { peerNetworkEvents } from '../native/PeerNetwork';
import type { TriggerMessage } from '../protocol/messages';

/**
 * UI del móvil madre: cuenta atrás, disparo, gestión de la sesión de peers.
 * Por ahora "disparar" solo manda un TriggerMessage de prueba, sin tocar la cámara todavía.
 */
export default function MotherModeScreen(): React.JSX.Element {
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    PeerNetwork.startSession('movil-madre').catch((e: Error) => setSessionError(String(e?.message ?? e)));

    const onConnected = peerNetworkEvents?.addListener('onPeerConnected', (e: { peerId: string }) => {
      setConnectedPeers((prev) => Array.from(new Set([...prev, e.peerId])));
    });
    const onDisconnected = peerNetworkEvents?.addListener('onPeerDisconnected', (e: { peerId: string }) => {
      setConnectedPeers((prev) => prev.filter((id) => id !== e.peerId));
    });

    return () => {
      onConnected?.remove();
      onDisconnected?.remove();
      PeerNetwork.stopSession();
    };
  }, []);

  const disparar = () => {
    const message: TriggerMessage = { type: 'trigger', delayMs: 300, windowMs: 400, mode: 'torch' };
    PeerNetwork.broadcast(JSON.stringify(message));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil madre</Text>
      {sessionError && <Text style={{ color: 'red' }} selectable>Error: {sessionError}</Text>}
      <Text>
        Peers conectados: {connectedPeers.length === 0 ? 'ninguno todavía' : connectedPeers.join(', ')}
      </Text>
      <Button title="Disparar (mensaje de prueba)" onPress={disparar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
});
