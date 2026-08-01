import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import PeerNetwork, { peerNetworkEvents } from '../native/PeerNetwork';
import CameraPreview from '../native/CameraPreview';
import CameraControl from '../native/CameraControl';
import CameraCapture from '../native/CameraCapture';
import type { CoordinationMessage, TriggerMessage } from '../protocol/messages';

const MAX_EXPOSURE_MS = 500;
const EXPOSURE_PRESETS_MS = [100, 200, 300, 500];
const SWEEP_PRESETS_MS = [1000, 2000];
const COLOR_PRESETS = ['#ff0040', '#00ff88', '#2050ff', '#ffaa00', '#ffffff'];

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
  const [exposureResult, setExposureResult] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [tomandoFoto, setTomandoFoto] = useState(false);

  useEffect(() => {
    PeerNetwork.startSession('movil-madre').catch((e: Error) => setSessionError(String(e?.message ?? e)));
    CameraControl.resetToAuto().catch(() => {});

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

  const disparar = (modo: 'torch' | 'flash') => {
    const message: TriggerMessage = { type: 'trigger', delayMs: 300, windowMs: 400, mode: modo };
    PeerNetwork.broadcast(JSON.stringify(message));
  };

  const dispararColor = (color: string) => {
    const message: TriggerMessage = { type: 'trigger', delayMs: 300, windowMs: 1500, mode: 'color', color };
    PeerNetwork.broadcast(JSON.stringify(message));
  };

  const tomarFotoBarrido = (exposureMs: number) => {
    setTomandoFoto(true);
    setPhotoError(null);
    CameraControl.setExposureDuration(exposureMs)
      .then(() => CameraCapture.takePhoto())
      .then((r) => setPhotoPath(r.path))
      .catch((e: Error) => setPhotoError(String(e?.message ?? e)))
      .finally(() => {
        setTomandoFoto(false);
        CameraControl.resetToAuto().catch(() => {});
      });
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

  const probarExposicion = (objetivo: number) => {
    const limitado = Math.min(objetivo, MAX_EXPOSURE_MS);
    CameraControl.setExposureDuration(limitado)
      .then((r) => setExposureResult(`Aplicado: ${r.appliedDurationMs.toFixed(1)} ms (pedido: ${limitado} ms)`))
      .catch((e: Error) => setExposureResult(`Error: ${String(e?.message ?? e)}`));
  };

  const tomarFoto = () => {
    setTomandoFoto(true);
    setPhotoError(null);
    CameraCapture.takePhoto()
      .then((r) => setPhotoPath(r.path))
      .catch((e: Error) => setPhotoError(String(e?.message ?? e)))
      .finally(() => setTomandoFoto(false));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Modo: móvil madre</Text>
      <CameraPreview style={styles.preview} />
      {sessionError && <Text style={styles.error} selectable>Error: {sessionError}</Text>}
      <Text>
        Peers conectados: {connectedPeers.length === 0 ? 'ninguno todavía' : connectedPeers.join(', ')}
      </Text>
      <Button title="Disparar (linterna)" onPress={() => disparar('torch')} />
      <Button title="Disparar (flash real)" onPress={() => disparar('flash')} />

      <Text>Luz de color en el remoto:</Text>
      <View style={styles.presetRow}>
        {COLOR_PRESETS.map((color) => (
          <Pressable
            key={color}
            onPress={() => dispararColor(color)}
            style={[styles.colorSwatch, { backgroundColor: color }]}
          />
        ))}
      </View>

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
          {ventanaSugerida !== null && ventanaSugerida > MAX_EXPOSURE_MS && (
            <Text style={styles.error}>
              La red sugiere más margen del recomendado para exposición ({MAX_EXPOSURE_MS}ms máx.) — considera acercar los teléfonos o mejorar la señal.
            </Text>
          )}
        </View>
      )}
      {latencias && latencias.length === 0 && <Text style={styles.error}>Ningún ping respondió (timeout)</Text>}

      <View style={styles.separator} />

      <Text>Probar exposición extendida (máx. {MAX_EXPOSURE_MS}ms):</Text>
      <View style={styles.presetRow}>
        {EXPOSURE_PRESETS_MS.map((ms) => (
          <Button key={ms} title={`${ms}ms`} onPress={() => probarExposicion(ms)} />
        ))}
      </View>
      {exposureResult && <Text selectable>{exposureResult}</Text>}
      <Button title="Volver a automático" onPress={() => CameraControl.resetToAuto().then(() => setExposureResult('Vuelto a automático'))} />

      <View style={styles.separator} />

      <Text>Modo barrido (exposición larga + foto en un solo paso):</Text>
      <View style={styles.presetRow}>
        {SWEEP_PRESETS_MS.map((ms) => (
          <Button key={ms} title={`${ms}ms`} onPress={() => tomarFotoBarrido(ms)} disabled={tomandoFoto} />
        ))}
      </View>

      <View style={styles.separator} />

      <Button title={tomandoFoto ? 'Tomando foto...' : 'Tomar foto'} onPress={tomarFoto} disabled={tomandoFoto} />
      {photoError && <Text style={styles.error} selectable>Error: {photoError}</Text>}
      {photoPath && (
        <View style={styles.photoContainer}>
          <Text>Última foto: {photoPath}</Text>
          <Image source={{ uri: `file://${photoPath}` }} style={styles.photoPreview} resizeMode="contain" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  preview: { width: '100%', height: 300, backgroundColor: '#000' },
  error: { color: 'red' },
  separator: { height: 24 },
  suggestion: { fontWeight: 'bold' },
  presetRow: { flexDirection: 'row', gap: 8 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  photoPreview: { width: '100%', height: 300, backgroundColor: '#000', marginTop: 8 },
  photoContainer: { width: '100%', alignItems: 'center' },
});
