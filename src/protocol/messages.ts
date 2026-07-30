/**
 * Mensajes del protocolo de coordinación entre el móvil madre y los móviles remotos.
 * Ver sección 6 de docs/proyecto_flash_multimovil.md.
 *
 * Todos los mensajes se envían serializados como JSON sobre MCSession.send
 * (puente nativo: src/native/PeerNetwork.ts -> ios/.../NativeModules/PeerNetworkModule.swift).
 */

export type LightMode = 'torch' | 'flash';

/** Enviado por el móvil madre a todos los peers conectados. */
export interface TriggerMessage {
  type: 'trigger';
  /** Milisegundos relativos desde que se recibe el mensaje hasta el disparo. NO usar timestamps absolutos. */
  delayMs: number;
  /** Duración que debe mantenerse la luz encendida (ventana de seguridad). */
  windowMs: number;
  mode: LightMode;
}

/** Enviado por cada móvil remoto al terminar su parte (encender/disparar luz). */
export interface AckMessage {
  type: 'ack';
  peerId: string;
}

/** Enviado por el móvil madre cuando ya se capturó la foto, para que los remotos apaguen la luz. */
export interface DoneMessage {
  type: 'done';
}

/** Enviado por el móvil madre para medir la latencia real de la red. */
export interface PingMessage {
  type: 'ping';
  sentAt: number;
}

/** Respuesta automática de cualquier peer que reciba un ping, con el mismo sentAt. */
export interface PongMessage {
  type: 'pong';
  sentAt: number;
}

export type CoordinationMessage = TriggerMessage | AckMessage | DoneMessage | PingMessage | PongMessage;

// TODO: decidir formato exacto de reconexión si un peer se desconecta a mitad de sesión
// (pregunta abierta en la sección 9 del documento de proyecto).
