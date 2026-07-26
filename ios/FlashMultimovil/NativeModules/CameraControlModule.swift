import Foundation
import AVFoundation

/// Puente nativo hacia AVFoundation para control de linterna y exposición manual.
/// Ver sección 5.2 de docs/proyecto_flash_multimovil.md.
///
/// TODO: implementar cada método (roadmap, sección 8 del documento de proyecto):
///   - setTorch: AVCaptureDevice.torchMode
///   - fireFlashPulse: destello real dentro de la ventana de exposición
///   - setExposureDuration: AVCaptureDevice.setExposureModeCustom(duration:iso:completionHandler:)
///
/// Nota: usamos closures de Swift puro ((Any?) -> Void, etc.) en vez de los typealias
/// RCTPromiseResolveBlock/RCTPromiseRejectBlock, porque esos typealias de Objective-C
/// no siempre son visibles desde Swift según cómo esté configurado el pod de React.
/// Son equivalentes a nivel binario, así que el puente en el .m sigue funcionando igual.
@objc(CameraControlModule)
class CameraControlModule: NSObject {

  @objc(setTorch:resolver:rejecter:)
  func setTorch(_ on: Bool, resolver resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    // TODO
    resolve(nil)
  }

  @objc(fireFlashPulse:rejecter:)
  func fireFlashPulse(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    // TODO
    resolve(nil)
  }

  @objc(setExposureDuration:resolver:rejecter:)
  func setExposureDuration(_ durationMs: NSNumber, resolver resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    // TODO
    resolve(nil)
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
