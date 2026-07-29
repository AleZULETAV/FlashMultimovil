import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PeerNetwork, { peerNetworkEvents } from '../native/PeerNetwork';
import CameraControl from '../native/CameraControl';
import type { CoordinationMessage } from '../protocol/messages';

/**
 * UI del móvil remoto: se conecta a la sesión y, al recibir un TriggerMessage
 * en modo "torch", enciende la linterna durante la ventana indicada.
 * Ver sección 2.1 y 6 del documento de proyecto.
 */
export default function RemoteModeScreen(): React.JSX.Element {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('(nada todavía)');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const torchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    PeerNetwork.startSession('movil-remoto').catch((e: Error) => setSessionError(String(e?.message ?? e)));

    const onConnected = peerNetworkEvents?.addListener('onPeerConnected', () => setConnected(true));
    const onDisconnected = peerNetworkEvents?.addListener('onPeerDisconnected', () => setConnected(false));
    const onMessage = peerNetworkEvents?.addListener('onPeerMessage', (json: string) => {
      setLastMessage(json);
      try {
        const message = JSON.parse(json) as CoordinationMessage;
        if (message.type === 'trigger' && message.mode === 'torch') {
          if (torchTimeoutRef.current) clearTimeout(torchTimeoutRef.current);
          CameraControl.setTorch(true)
            .then(() => setTorchOn(true))
            .catch((e: Error) => setSessionError(String(e?.message ?? e)));
          torchTimeoutRef.current = setTimeout(() => {
            CameraControl.setTorch(false)
              .then(() => setTorchOn(false))
              .catch((e: Error) => setSessionError(String(e?.message ?? e)));
          }, message.windowMs);
        }
      } catch {
        // Mensaje que no es JSON válido; lo ignoramos, no debería pasar con nuestro protocolo.
      }
    });

    return () => {
      onConnected?.remove();
      onDisconnected?.remove();
      onMessage?.remove();
      if (torchTimeoutRef.current) clearTimeout(torchTimeoutRef.current);
      CameraControl.setTorch(false).catch(() => {});
      PeerNetwork.stopSession();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil remoto</Text>
      {sessionError && <Text style={styles.error} selectable>Error: {sessionError}</Text>}
      <Text>{connected ? 'Conectado al móvil madre' : 'Buscando móvil madre...'}</Text>
      <Text>Linterna: {torchOn ? 'ENCENDIDA' : 'apagada'}</Text>
      <Text>Último mensaje: {lastMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  error: { color: 'red' },
});
