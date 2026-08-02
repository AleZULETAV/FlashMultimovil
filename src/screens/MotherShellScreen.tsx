import React, { useEffect, useState } from 'react';
import { View, Image, Pressable, StyleSheet, Alert, StatusBar } from 'react-native';
import CameraPreview from '../native/CameraPreview';
import CameraControl from '../native/CameraControl';
import CameraCapture from '../native/CameraCapture';
import PeerNetwork, { peerNetworkEvents } from '../native/PeerNetwork';
import type { TriggerMessage } from '../protocol/messages';

/**
 * Interfaz real del móvil madre, estilo Y2K / Sony Cybershot.
 * Ver sección 11 de docs/proyecto_flash_multimovil.md.
 *
 * El mockup (camera_shell.png) se diseñó exactamente a la resolución nativa @3x
 * del iPhone 12/13 (1125x2436 px = 375x812 puntos), así que todas las coordenadas
 * de abajo son (px del mockup / 3) y deberían coincidir pixel a pixel en esos dos
 * teléfonos. En otros tamaños de pantalla se vería reescalado, no es un problema
 * ahora porque solo probamos en iPhone 12 y 13.
 */

type WheelMode = 'camera' | 'flash' | 'torch' | 'sweep';

const SHELL_WIDTH = 375;
const SHELL_HEIGHT = 812;

const SCREEN_RECT = { left: 28, top: 44, width: 318, height: 552 };
const LEFT_BUTTON = { left: 8, top: 627, width: 38, height: 45 };
const MENU_BUTTON = { left: 156, top: 627, width: 38, height: 45 };
const DISP_BUTTON = { left: 206, top: 627, width: 38, height: 45 };
const SHUTTER = { left: 28, top: 640, width: 137, height: 137, borderRadius: 68.5 };

// Tamaño y posición de la rueda de modos — edita left/top/width/height aquí.
const WHEEL = { left: 242, top: 675, width: 115, height: 115 };

// Posición de cada ícono dentro de la rueda, como fracción de su ancho/alto (0 a 1).
// No hace falta tocar esto al cambiar el tamaño de WHEEL — se recalculan solas.
const WHEEL_ZONE_RATIO = 0.32; // qué tan grande es cada zona de toque, relativo al ancho de la rueda
const WHEEL_ZONES: { mode: WheelMode; leftRatio: number; topRatio: number }[] = [
  { mode: 'flash', leftRatio: 0.336, topRatio: 0 }, // rayo, arriba
  { mode: 'camera', leftRatio: 0, topRatio: 0.336 }, // cámara, izquierda
  { mode: 'torch', leftRatio: 0.679, topRatio: 0.336 }, // linterna, derecha
  { mode: 'sweep', leftRatio: 0.336, topRatio: 0.679 }, // personas en movimiento, abajo
];
const wheelZoneSize = WHEEL.width * WHEEL_ZONE_RATIO;

export default function MotherShellScreen(): React.JSX.Element {
  const [mode, setMode] = useState<WheelMode>('camera');
  const [fullScreen, setFullScreen] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    PeerNetwork.startSession('movil-madre').catch((e: Error) => Alert.alert('Error de red', String(e?.message ?? e)));
    const onConnected = peerNetworkEvents?.addListener('onPeerConnected', () => setConnected(true));
    const onDisconnected = peerNetworkEvents?.addListener('onPeerDisconnected', () => setConnected(false));
    return () => {
      onConnected?.remove();
      onDisconnected?.remove();
      PeerNetwork.stopSession();
    };
  }, []);

  const disparar = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'camera') {
        const r = await CameraCapture.takePhoto();
        setPhotoPath(r.path);
      } else if (mode === 'torch' || mode === 'flash') {
        const message: TriggerMessage = { type: 'trigger', delayMs: 300, windowMs: 400, mode };
        PeerNetwork.broadcast(JSON.stringify(message));
        if (mode === 'torch') {
          await CameraControl.setExposureDuration(400).catch(() => {});
        }
        const r = await CameraCapture.takePhoto();
        setPhotoPath(r.path);
        await CameraControl.resetToAuto().catch(() => {});
      } else if (mode === 'sweep') {
        await CameraControl.setExposureDuration(1500);
        const r = await CameraCapture.takePhoto();
        setPhotoPath(r.path);
        await CameraControl.resetToAuto().catch(() => {});
      }
    } catch (e) {
      Alert.alert('Error al disparar', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar hidden />
        <CameraPreview style={StyleSheet.absoluteFill} />
        <Pressable
          style={styles.exitFullScreenButton}
          onPress={() => setFullScreen(false)}
        >
          <View style={styles.exitFullScreenDot} />
        </Pressable>
        <Pressable style={styles.fullScreenShutter} onPress={disparar} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CameraPreview style={[styles.preview, SCREEN_RECT]} />

      <Image
        source={require('../assets/images/camera_shell.png')}
        style={styles.shell}
        resizeMode="stretch"
      />

      {/* Botón izquierdo: rollo / laboratorio fotográfico */}
      <Pressable
        style={({ pressed }) => [styles.hitZone, LEFT_BUTTON, pressed && styles.pressed]}
        onPress={() => Alert.alert('Rollo', 'Próximamente: aquí se va a ver el laboratorio fotográfico con las fotos tomadas.')}
      />

      {/* Botón MENU */}
      <Pressable
        style={({ pressed }) => [styles.hitZone, MENU_BUTTON, pressed && styles.pressed]}
        onPress={() => Alert.alert('Menú', 'Próximamente: opciones (ej. que el remoto también guarde/muestre su ángulo).')}
      />

      {/* Botón DISP: por ahora, pantalla completa */}
      <Pressable
        style={({ pressed }) => [styles.hitZone, DISP_BUTTON, pressed && styles.pressed]}
        onPress={() => setFullScreen(true)}
      />

      {/* Disparador (la cruceta original) */}
      <Pressable
        style={({ pressed }) => [styles.hitZone, SHUTTER, pressed && styles.pressedShutter]}
        onPress={disparar}
        disabled={busy}
      />

      {/* Rueda de modos */}
      <View style={WHEEL} pointerEvents="box-none">
        <Image
          source={require('../assets/images/mode_wheel.png')}
          style={styles.wheelImage}
          resizeMode="contain"
        />
        {WHEEL_ZONES.map((zone) => (
          <Pressable
            key={zone.mode}
            style={({ pressed }) => [
              styles.wheelZone,
              {
                left: zone.leftRatio * WHEEL.width,
                top: zone.topRatio * WHEEL.height,
                width: wheelZoneSize,
                height: wheelZoneSize,
                borderRadius: wheelZoneSize / 2,
              },
              mode === zone.mode && styles.wheelZoneSelected,
              pressed && styles.pressed,
            ]}
            onPress={() => setMode(zone.mode)}
          />
        ))}
      </View>

      {photoPath && (
        <Image source={{ uri: `file://${photoPath}` }} style={styles.lastPhotoThumb} resizeMode="cover" />
      )}

      <View style={[styles.connectionDot, connected ? styles.connectionDotOn : styles.connectionDotOff]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: SHELL_WIDTH, height: SHELL_HEIGHT, backgroundColor: '#000', alignSelf: 'center' },
  shell: { position: 'absolute', left: 0, top: 0, width: SHELL_WIDTH, height: SHELL_HEIGHT },
  preview: { position: 'absolute', backgroundColor: '#000' },
  hitZone: { position: 'absolute' },
  pressed: { opacity: 0.5 },
  pressedShutter: { opacity: 0.6, transform: [{ scale: 0.96 }] },
  wheelImage: { width: '100%', height: '100%' },
  wheelZone: {
    position: 'absolute',
  },
  wheelZoneSelected: { borderWidth: 2, borderColor: '#0f0' },
  lastPhotoThumb: {
    position: 'absolute',
    left: 8,
    top: 580,
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  fullScreenContainer: { flex: 1, backgroundColor: '#000' },
  exitFullScreenButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitFullScreenDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  fullScreenShutter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
  },
  connectionDot: {
    position: 'absolute',
    right: 12,
    top: 615,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionDotOn: { backgroundColor: '#0f0' },
  connectionDotOff: { backgroundColor: '#555' },
});
