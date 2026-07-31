/**
 * Wrapper del módulo nativo de captura de fotos.
 * Implementación real: ios/FlashMultimovil/NativeModules/CameraCaptureModule.swift
 */
import { NativeModules } from 'react-native';

interface CameraCaptureNativeModule {
  /** Toma una foto real con la sesión de cámara activa. Resuelve con la ruta del archivo temporal. */
  takePhoto(): Promise<{ path: string }>;
}

const { CameraCaptureModule: CameraCapture } = NativeModules as { CameraCaptureModule?: CameraCaptureNativeModule };

export default CameraCapture as CameraCaptureNativeModule;
