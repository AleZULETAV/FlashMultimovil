/**
 * Wrapper del módulo nativo de red (MultipeerConnectivity).
 * Implementación real: ios/FlashMultimovil/NativeModules/PeerNetworkModule.swift
 * Ver sección 5.1 de docs/proyecto_flash_multimovil.md.
 */
import { NativeModules, NativeEventEmitter } from 'react-native';
import type { CoordinationMessage } from '../protocol/messages';

interface PeerNetworkNativeModule {
  /** Empieza a anunciarse/buscar peers cercanos. */
  startSession(displayName: string): Promise<void>;
  /** Envía un mensaje (ya serializado a JSON) a todos los peers conectados. */
  broadcast(messageJson: string): Promise<void>;
  stopSession(): Promise<void>;
}

const { PeerNetworkModule: PeerNetwork } = NativeModules as { PeerNetworkModule?: PeerNetworkNativeModule };

/** Emite el evento 'onPeerMessage' con el JSON recibido; parsear a CoordinationMessage. */
export const peerNetworkEvents = PeerNetwork
  ? new NativeEventEmitter(NativeModules.PeerNetworkModule)
  : undefined;

export type { CoordinationMessage };
export default PeerNetwork as PeerNetworkNativeModule;
