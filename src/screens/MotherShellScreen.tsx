import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, StyleSheet, Alert, StatusBar, Animated, PanResponder, type GestureResponderEvent } from 'react-native';
import Sound from 'react-native-sound';
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
const WHEEL = { left: 245, top: 640, width: 137, height: 137 };
const WHEEL_CENTER = { x: WHEEL.width / 2, y: WHEEL.height / 2 };

// Posición angular de cada ícono en la imagen SIN rotar (0° = arriba, aumenta en sentido horario).
const MODE_ANGLES: Record<WheelMode, number> = { flash: 0, torch: 90, sweep: 180, camera: 270 };
const DEFAULT_MODE: WheelMode = 'camera';

/** Ángulo (0-360, sentido horario, 0=arriba) del punto (x,y) respecto al centro de la rueda. */
function angleFromCenter(x: number, y: number): number {
  const dx = x - WHEEL_CENTER.x;
  const dy = y - WHEEL_CENTER.y;
  const raw = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return ((raw % 360) + 360) % 360;
}

/** Rotación de la rueda necesaria para que el ícono de ese modo quede arriba, alineado con el indicador fijo. */
function targetRotationFor(mode: WheelMode): number {
  return (360 - MODE_ANGLES[mode]) % 360;
}

/** De todos los modos, cuál queda más cerca de estar arriba dada la rotación actual (puede ser cualquier número, no solo 0-360). */
function nearestMode(rotationDeg: number): WheelMode {
  const norm = ((rotationDeg % 360) + 360) % 360;
  let best: WheelMode = DEFAULT_MODE;
  let bestDiff = Infinity;
  (Object.keys(MODE_ANGLES) as WheelMode[]).forEach((m) => {
    const target = targetRotationFor(m);
    const diff = Math.min(Math.abs(norm - target), 360 - Math.abs(norm - target));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  });
  return best;
}

export default function MotherShellScreen(): React.JSX.Element {
  const [mode, setMode] = useState<WheelMode>(DEFAULT_MODE);
  const [fullScreen, setFullScreen] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  const rotation = useRef(new Animated.Value(targetRotationFor(DEFAULT_MODE))).current;
  const currentRotationRef = useRef(targetRotationFor(DEFAULT_MODE));
  const lastAngleRef = useRef(0);
  const soundRef = useRef<Sound | null>(null);

  useEffect(() => {
    PeerNetwork.startSession('movil-madre').catch((e: Error) => Alert.alert('Error de red', String(e?.message ?? e)));
    const onConnected = peerNetworkEvents?.addListener('onPeerConnected', () => setConnected(true));
    const onDisconnected = peerNetworkEvents?.addListener('onPeerDisconnected', () => setConnected(false));

    // "Playback" para que el clic se escuche aunque el teléfono esté en silencio (el interruptor
    // físico); mixWithOthers=true para no cortar música de fondo si el usuario tiene algo sonando.
    Sound.setCategory('Playback', true);
    soundRef.current = new Sound('wheel_sound.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('No se pudo cargar wheel_sound.mp3', error);
      }
    });

    return () => {
      onConnected?.remove();
      onDisconnected?.remove();
      PeerNetwork.stopSession();
      soundRef.current?.release();
    };
  }, []);

  const playWheelSound = () => {
    const sound = soundRef.current;
    if (!sound) return;
    sound.stop(() => sound.play());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        lastAngleRef.current = angleFromCenter(locationX, locationY);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newAngle = angleFromCenter(locationX, locationY);
        let delta = newAngle - lastAngleRef.current;
        // Camino más corto, evita un salto brusco al cruzar 0°/360°.
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        currentRotationRef.current += delta;
        rotation.setValue(currentRotationRef.current);
        lastAngleRef.current = newAngle;
      },
      onPanResponderRelease: () => {
        const selected = nearestMode(currentRotationRef.current);
        const target = targetRotationFor(selected);
        // Ajustamos el objetivo a la vuelta más cercana a donde ya estamos (evita "desenrollar" varias vueltas de golpe).
        const base = Math.round((currentRotationRef.current - target) / 360) * 360;
        const finalAngle = base + target;
        currentRotationRef.current = finalAngle;
        Animated.spring(rotation, { toValue: finalAngle, useNativeDriver: true, friction: 6 }).start();
        playWheelSound();
        setMode(selected);
      },
    })
  ).current;

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
        // Antes solo extendíamos la exposición en modo torch — pero el flash real también
        // necesita margen: el remoto tarda en recibir el mensaje y disparar, y si el obturador
        // ya se cerró para entonces, la luz nunca llega a la foto.
        await CameraControl.setExposureDuration(400).catch(() => {});
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
        <Pressable style={styles.exitFullScreenButton} onPress={() => setFullScreen(false)}>
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

      <Image source={require('../assets/images/camera_shell.png')} style={styles.shell} resizeMode="stretch" />

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

      {/* Rueda de modos: se arrastra en círculo, encaja en el modo más cercano al soltar. */}
      <View style={WHEEL} {...panResponder.panHandlers}>
        <Animated.Image
          source={require('../assets/images/mode_wheel.png')}
          style={[
            styles.wheelImage,
            {
              transform: [
                {
                  rotate: rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                    extrapolate: 'extend',
                  }),
                },
              ],
            },
          ]}
          resizeMode="contain"
        />
        {/* Indicador fijo: marca cuál ícono está seleccionado (el que quede justo debajo). */}
        <View style={styles.wheelPointer} />
      </View>

      {photoPath && <Image source={{ uri: `file://${photoPath}` }} style={styles.lastPhotoThumb} resizeMode="cover" />}

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
  wheelPointer: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0f0',
  },
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
