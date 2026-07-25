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
  /** Extiende manualmente la duración de exposición del móvil madre. */
  setExposureDuration(durationMs: number): Promise<void>;
}

// TODO: una vez creado el puente nativo (.swift + .m), NativeModules.CameraControl
// existirá en runtime. Hasta entonces esto lanza si se llama.
const { CameraControl } = NativeModules as { CameraControl?: CameraControlNativeModule };

export default CameraControl as CameraControlNativeModule;
