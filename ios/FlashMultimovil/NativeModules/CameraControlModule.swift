import Foundation
import AVFoundation
import React

/// Puente nativo hacia AVFoundation para control de linterna y exposición manual.
/// Ver sección 5.2 de docs/proyecto_flash_multimovil.md.
///
/// TODO: implementar cada método (roadmap, sección 8 del documento de proyecto):
///   - setTorch: AVCaptureDevice.torchMode
///   - fireFlashPulse: destello real dentro de la ventana de exposición
///   - setExposureDuration: AVCaptureDevice.setExposureModeCustom(duration:iso:completionHandler:)
@objc(CameraControlModule)
class CameraControlModule: NSObject {

  @objc(setTorch:resolver:rejecter:)
  func setTorch(_ on: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO
    resolve(nil)
  }

  @objc(fireFlashPulse:rejecter:)
  func fireFlashPulse(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO
    resolve(nil)
  }

  @objc(setExposureDuration:resolver:rejecter:)
  func setExposureDuration(_ durationMs: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO
    resolve(nil)
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
