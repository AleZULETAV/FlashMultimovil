import Foundation
import MultipeerConnectivity
import React

/// Debe tener 15 caracteres o menos (límite de Apple para nombres de servicio Bonjour)
/// y coincidir con NSBonjourServices en Info.plist.
private let serviceType = "flashmulti"

/// Puente nativo hacia MultipeerConnectivity: descubre peers cercanos, se conecta,
/// y envía/recibe los mensajes de coordinación (src/protocol/messages.ts).
/// Ver sección 5.1 y 6 de docs/proyecto_flash_multimovil.md.
///
/// Todos los dispositivos anuncian Y buscan al mismo tiempo con el mismo serviceType;
/// la distinción "madre"/"remoto" es solo a nivel de la app (mensajes), no de esta capa.
@objc(PeerNetworkModule)
class PeerNetworkModule: RCTEventEmitter {

  private var peerID: MCPeerID?
  private var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?

  @objc(startSession:resolver:rejecter:)
  func startSession(_ displayName: String, resolver resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    let id = MCPeerID(displayName: displayName)
    let newSession = MCSession(peer: id, securityIdentity: nil, encryptionPreference: .required)
    newSession.delegate = self

    let newAdvertiser = MCNearbyServiceAdvertiser(peer: id, discoveryInfo: nil, serviceType: serviceType)
    newAdvertiser.delegate = self

    let newBrowser = MCNearbyServiceBrowser(peer: id, serviceType: serviceType)
    newBrowser.delegate = self

    peerID = id
    session = newSession
    advertiser = newAdvertiser
    browser = newBrowser

    newAdvertiser.startAdvertisingPeer()
    newBrowser.startBrowsingForPeers()

    resolve(nil)
  }

  @objc(broadcast:resolver:rejecter:)
  func broadcast(_ messageJson: String, resolver resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    guard let session = session, let data = messageJson.data(using: .utf8), !session.connectedPeers.isEmpty else {
      resolve(nil)
      return
    }
    do {
      try session.send(data, toPeers: session.connectedPeers, with: .reliable)
    } catch {
      reject("BROADCAST_FAILED", error.localizedDescription, error)
      return
    }
    resolve(nil)
  }

  @objc(stopSession:rejecter:)
  func stopSession(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    advertiser?.stopAdvertisingPeer()
    browser?.stopBrowsingForPeers()
    session?.disconnect()
    resolve(nil)
  }

  override func supportedEvents() -> [String]! {
    return ["onPeerMessage", "onPeerConnected", "onPeerDisconnected"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

extension PeerNetworkModule: MCSessionDelegate {
  func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
    switch state {
    case .connected:
      sendEvent(withName: "onPeerConnected", body: ["peerId": peerID.displayName])
    case .notConnected:
      sendEvent(withName: "onPeerDisconnected", body: ["peerId": peerID.displayName])
    default:
      break
    }
  }

  func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
    if let json = String(data: data, encoding: .utf8) {
      sendEvent(withName: "onPeerMessage", body: json)
    }
  }

  // Requeridos por el protocolo, no los usamos por ahora.
  func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
  func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
  func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

extension PeerNetworkModule: MCNearbyServiceAdvertiserDelegate {
  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
    invitationHandler(true, session)
  }
}

extension PeerNetworkModule: MCNearbyServiceBrowserDelegate {
  func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
    guard let session = session else { return }
    browser.invitePeer(peerID, to: session, withContext: nil, timeout: 15)
  }

  func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {}
}
