/**
 * Wrapper del módulo nativo de cámara (AVFoundation).
 * Implementación real: ios/FlashMultimovil/NativeModules/CameraControlModule.swift
 * Ver sección 5.2 de docs/proyecto_flash_multimovil.md.
 */
import { NativeModules } from 'react-native';

interface CameraControlNativeModule {
  /** Enciende o apaga la linterna en modo continuo (técnica "fill light", sección 2.1). */
  setTorch(on: boolean): Promise<void>;
  /** Dispara un pulso de flash real (técnica "open flash", sección 2.2). */
  fireFlashPulse(): Promise<void>;
  /** Extiende manualmente la duración de exposición del móvil madre. Resuelve con la duración realmente aplicada (puede recortarse a lo que soporte el hardware). */
  setExposureDuration(durationMs: number): Promise<{ appliedDurationMs: number }>;
}

const { CameraControlModule: CameraControl } = NativeModules as { CameraControlModule?: CameraControlNativeModule };

export default CameraControl as CameraControlNativeModule;
