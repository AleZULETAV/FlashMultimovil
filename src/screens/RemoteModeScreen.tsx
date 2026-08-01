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
  const [lastFlash, setLastFlash] = useState<string | null>(null);
  const torchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    PeerNetwork.startSession('movil-remoto').catch((e: Error) => setSessionError(String(e?.message ?? e)));

    const onConnected = peerNetworkEvents?.addListener('onPeerConnected', () => setConnected(true));
    const onDisconnected = peerNetworkEvents?.addListener('onPeerDisconnected', () => setConnected(false));
    const onMessage = peerNetworkEvents?.addListener('onPeerMessage', (json: string) => {
      setLastMessage(json);

      let message: CoordinationMessage;
      try {
        message = JSON.parse(json) as CoordinationMessage;
      } catch (e) {
        setSessionError(`Mensaje no es JSON válido: ${String(e)}`);
        return;
      }

      if (message.type === 'ping') {
        PeerNetwork.broadcast(JSON.stringify({ type: 'pong', sentAt: message.sentAt }));
        return;
      }

      if (message.type === 'trigger' && message.mode === 'flash') {
        setLastFlash('disparando...');
        CameraControl.fireFlashPulse()
          .then(() => setLastFlash(`disparado a las ${new Date().toLocaleTimeString()}`))
          .catch((e: Error) => setLastFlash(`error: ${String(e?.message ?? e)}`));
        return;
      }

      if (message.type === 'trigger' && message.mode === 'torch') {
        if (torchTimeoutRef.current) clearTimeout(torchTimeoutRef.current);
        try {
          CameraControl.setTorch(true)
            .then(() => setTorchOn(true))
            .catch((e: Error) => setSessionError(`setTorch(true) rechazado: ${String(e?.message ?? e)}`));
        } catch (e) {
          setSessionError(`setTorch(true) lanzó de inmediato: ${String(e)}`);
        }
        torchTimeoutRef.current = setTimeout(() => {
          try {
            CameraControl.setTorch(false)
              .then(() => setTorchOn(false))
              .catch((e: Error) => setSessionError(`setTorch(false) rechazado: ${String(e?.message ?? e)}`));
          } catch (e) {
            setSessionError(`setTorch(false) lanzó de inmediato: ${String(e)}`);
          }
        }, message.windowMs);
      }
    });

    return () => {
      onConnected?.remove();
      onDisconnected?.remove();
      onMessage?.remove();
      if (torchTimeoutRef.current) clearTimeout(torchTimeoutRef.current);
      try {
        CameraControl.setTorch(false).catch(() => {});
      } catch {
        // ignorar en limpieza
      }
      PeerNetwork.stopSession();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil remoto</Text>
      <Text style={styles.debug}>CameraControl disponible: {CameraControl ? 'sí' : 'NO (esto es el problema)'}</Text>
      {sessionError && <Text style={styles.error} selectable>Error: {sessionError}</Text>}
      <Text>{connected ? 'Conectado al móvil madre' : 'Buscando móvil madre...'}</Text>
      <Text>Linterna: {torchOn ? 'ENCENDIDA' : 'apagada'}</Text>
      <Text>Flash real: {lastFlash ?? '(ninguno todavía)'}</Text>
      <Text>Último mensaje: {lastMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  debug: { color: '#888', fontSize: 12 },
  error: { color: 'red' },
});
