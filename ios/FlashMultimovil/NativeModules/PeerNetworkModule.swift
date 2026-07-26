import Foundation
import MultipeerConnectivity
import React

/// Puente nativo hacia MultipeerConnectivity: descubre peers y envía/recibe
/// los mensajes de coordinación (src/protocol/messages.ts).
/// Ver sección 5.1 de docs/proyecto_flash_multimovil.md.
///
/// TODO: implementar (roadmap, sección 8 del documento de proyecto):
///   - MCSession, MCNearbyServiceAdvertiser, MCNearbyServiceBrowser
///   - emitir evento "onPeerMessage" hacia JS cuando llegue un mensaje (ver PeerNetwork.ts)
@objc(PeerNetworkModule)
class PeerNetworkModule: RCTEventEmitter {

  @objc(startSession:resolver:rejecter:)
  func startSession(_ displayName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO
    resolve(nil)
  }

  @objc(broadcast:resolver:rejecter:)
  func broadcast(_ messageJson: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO
    resolve(nil)
  }

  @objc(stopSession:rejecter:)
  func stopSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO
    resolve(nil)
  }

  override func supportedEvents() -> [String]! {
    return ["onPeerMessage"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
