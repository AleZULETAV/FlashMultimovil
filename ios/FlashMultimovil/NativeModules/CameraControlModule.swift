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
    func applyTorch() {
      var swiftError: Error?
      let caught = PNTryCatch {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else {
          swiftError = NSError(domain: "CameraControlModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Este dispositivo no tiene linterna"])
          return
        }
        do {
          try device.lockForConfiguration()
          device.torchMode = on ? .on : .off
          device.unlockForConfiguration()
        } catch {
          swiftError = error
        }
      }
      if let caught = caught {
        reject("NATIVE_EXCEPTION", "\(caught.name.rawValue): \(caught.reason ?? "sin razón")", nil)
        return
      }
      if let swiftError = swiftError {
        reject("CAMERA_ERROR", swiftError.localizedDescription, swiftError)
        return
      }
      resolve(nil)
    }

    // Nunca controlamos la linterna sin haber pedido permiso de cámara explícitamente:
    // solo declarar NSCameraUsageDescription en Info.plist no dispara el aviso del sistema.
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      applyTorch()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        DispatchQueue.main.async {
          if granted {
            applyTorch()
          } else {
            reject("CAMERA_PERMISSION_DENIED", "El usuario no dio permiso de cámara", nil)
          }
        }
      }
    default:
      reject("CAMERA_PERMISSION_DENIED", "Permiso de cámara denegado o restringido. Ve a Ajustes > Privacidad y seguridad > Cámara.", nil)
    }
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
