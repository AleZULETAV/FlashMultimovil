import React from 'react';
import { requireNativeComponent, type ViewProps } from 'react-native';

/**
 * Visor de cámara en vivo, sin capturar fotos todavía.
 * Puente nativo: ios/FlashMultimovil/NativeModules/CameraPreviewView.swift + CameraPreviewViewManager.swift
 */
const NativeCameraPreview = requireNativeComponent<ViewProps>('CameraPreviewViewManager');

export default function CameraPreview(props: ViewProps): React.JSX.Element {
  return <NativeCameraPreview {...props} />;
}
