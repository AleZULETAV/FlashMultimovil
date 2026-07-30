import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import PeerNetwork, { peerNetworkEvents } from '../native/PeerNetwork';
import CameraPreview from '../native/CameraPreview';
import type { CoordinationMessage, TriggerMessage } from '../protocol/messages';

const PING_COUNT = 5;
const PING_TIMEOUT_MS = 3000;

/** Manda un ping y espera su pong correspondiente, resolviendo con el tiempo de ida y vuelta (ms). */
function pingOnce(): Promise<number> {
  return new Promise((resolve, reject) => {
    const sentAt = Date.now();
    const timeout = setTimeout(() => {
      subscription?.remove();
      reject(new Error('timeout esperando pong'));
    }, PING_TIMEOUT_MS);

    const subscription = peerNetworkEvents?.addListener('onPeerMessage', (json: string) => {
      try {
        const msg = JSON.parse(json) as CoordinationMessage;
        if (msg.type === 'pong' && msg.sentAt === sentAt) {
          clearTimeout(timeout);
          subscription?.remove();
          resolve(Date.now() - sentAt);
        }
      } catch {
        // no era JSON válido, ignorar
      }
    });

    PeerNetwork.broadcast(JSON.stringify({ type: 'ping', sentAt }));
  });
}

/**
 * UI del móvil madre: cuenta atrás, disparo, gestión de la sesión de peers,
 * y medición de latencia real (sección 8 del roadmap del documento de proyecto).
 */
export default function MotherModeScreen(): React.JSX.Element {
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [midiendo, setMidiendo] = useState(false);
  const [latencias, setLatencias] = useState<number[] | null>(null);

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

  const medirLatencia = async () => {
    setMidiendo(true);
    setLatencias(null);
    const resultados: number[] = [];
    for (let i = 0; i < PING_COUNT; i++) {
      try {
        const rtt = await pingOnce();
        resultados.push(rtt);
      } catch {
        // timeout en este intento particular; seguimos con el siguiente
      }
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 200));
    }
    setLatencias(resultados);
    setMidiendo(false);
  };

  const promedio = latencias && latencias.length > 0 ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;
  const maximo = latencias && latencias.length > 0 ? Math.max(...latencias) : null;
  const ventanaSugerida = maximo !== null ? Math.ceil((maximo * 2) / 50) * 50 : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil madre</Text>
      <CameraPreview style={styles.preview} />
      {sessionError && <Text style={styles.error} selectable>Error: {sessionError}</Text>}
      <Text>
        Peers conectados: {connectedPeers.length === 0 ? 'ninguno todavía' : connectedPeers.join(', ')}
      </Text>
      <Button title="Disparar (mensaje de prueba)" onPress={disparar} />

      <View style={styles.separator} />

      <Button
        title={midiendo ? 'Midiendo...' : `Medir latencia (${PING_COUNT} pings)`}
        onPress={medirLatencia}
        disabled={midiendo || connectedPeers.length === 0}
      />
      {latencias && latencias.length > 0 && (
        <View>
          <Text>Ida y vuelta: {latencias.join(', ')} ms</Text>
          <Text>Promedio: {promedio} ms — Peor caso: {maximo} ms</Text>
          <Text style={styles.suggestion}>Ventana de seguridad sugerida: {ventanaSugerida} ms</Text>
        </View>
      )}
      {latencias && latencias.length === 0 && <Text style={styles.error}>Ningún ping respondió (timeout)</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  preview: { width: '100%', height: 300, backgroundColor: '#000' },
  error: { color: 'red' },
  separator: { height: 24 },
  suggestion: { fontWeight: 'bold' },
});
