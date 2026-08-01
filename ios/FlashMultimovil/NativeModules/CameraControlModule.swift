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

  // Hay que retener el delegate mientras dura la captura, o ARC lo libera antes de que responda.
  private var flashDelegate: FlashPulseDelegate?

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
    // A diferencia de la linterna (torchMode, un interruptor directo), el flash real de iOS
    // NO se puede disparar manualmente — solo se activa como parte de una captura de foto
    // con flashMode = .on. Por eso disparamos una foto "de usar y tirar": no nos importa la
    // imagen resultante, solo que el hardware del flash se dispare durante la captura.
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      doFireFlashPulse(resolve: resolve, reject: reject)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        DispatchQueue.main.async {
          if granted {
            self?.doFireFlashPulse(resolve: resolve, reject: reject)
          } else {
            reject("CAMERA_PERMISSION_DENIED", "El usuario no dio permiso de cámara", nil)
          }
        }
      }
    default:
      reject("CAMERA_PERMISSION_DENIED", "Permiso de cámara denegado o restringido. Ve a Ajustes > Privacidad y seguridad > Cámara.", nil)
    }
  }

  private func doFireFlashPulse(resolve: @escaping (Any?) -> Void, reject: @escaping (String?, String?, Error?) -> Void) {
    CameraSessionManager.shared.configureIfNeeded { [weak self] success in
      guard let self = self else { return }
      guard success else {
        reject("CAMERA_ERROR", "No se pudo configurar la sesión de cámara", nil)
        return
      }
      guard CameraSessionManager.shared.photoOutput.supportedFlashModes.contains(.on) else {
        reject("CAMERA_ERROR", "Este dispositivo no tiene flash", nil)
        return
      }
      let settings = AVCapturePhotoSettings()
      settings.flashMode = .on
      let delegate = FlashPulseDelegate { result in
        self.flashDelegate = nil
        switch result {
        case .success:
          resolve(nil)
        case .failure(let error):
          reject("CAMERA_ERROR", error.localizedDescription, error)
        }
      }
      self.flashDelegate = delegate
      CameraSessionManager.shared.photoOutput.capturePhoto(with: settings, delegate: delegate)
    }
  }

  @objc(setExposureDuration:resolver:rejecter:)
  func setExposureDuration(_ durationMs: NSNumber, resolver resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    func applyExposure() {
      guard let device = AVCaptureDevice.default(for: .video) else {
        reject("CAMERA_ERROR", "No se encontró la cámara", nil)
        return
      }
      guard device.isExposureModeSupported(.custom) else {
        reject("CAMERA_ERROR", "Este dispositivo no soporta exposición manual personalizada", nil)
        return
      }

      // La duración pedida se recorta a lo que el hardware realmente soporta
      // (activeFormat.min/maxExposureDuration) — pedir un valor fuera de rango
      // lanza una excepción nativa en vez de simplemente ignorarse.
      let requestedSeconds = durationMs.doubleValue / 1000.0
      let minSeconds = CMTimeGetSeconds(device.activeFormat.minExposureDuration)
      let maxSeconds = CMTimeGetSeconds(device.activeFormat.maxExposureDuration)
      let clampedSeconds = max(minSeconds, min(maxSeconds, requestedSeconds))
      let duration = CMTimeMakeWithSeconds(clampedSeconds, preferredTimescale: 1_000_000)

      var swiftError: Error?
      let caught = PNTryCatch {
        do {
          try device.lockForConfiguration()
          device.setExposureModeCustom(duration: duration, iso: AVCaptureDevice.currentISO) { _ in
            device.unlockForConfiguration()
            DispatchQueue.main.async {
              resolve(["appliedDurationMs": clampedSeconds * 1000])
            }
          }
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
      }
      // Si no hubo excepción ni error, resolve(...) ya se llama dentro del completion handler de arriba.
    }

    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      applyExposure()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        DispatchQueue.main.async {
          if granted {
            applyExposure()
          } else {
            reject("CAMERA_PERMISSION_DENIED", "El usuario no dio permiso de cámara", nil)
          }
        }
      }
    default:
      reject("CAMERA_PERMISSION_DENIED", "Permiso de cámara denegado o restringido. Ve a Ajustes > Privacidad y seguridad > Cámara.", nil)
    }
  }

  @objc(resetToAuto:rejecter:)
  func resetToAuto(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    guard let device = AVCaptureDevice.default(for: .video) else {
      reject("CAMERA_ERROR", "No se encontró la cámara", nil)
      return
    }
    guard device.isExposureModeSupported(.continuousAutoExposure) else {
      reject("CAMERA_ERROR", "Este dispositivo no soporta exposición automática continua", nil)
      return
    }
    var swiftError: Error?
    let caught = PNTryCatch {
      do {
        try device.lockForConfiguration()
        device.exposureMode = .continuousAutoExposure
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

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

/// Delegate mínimo para la captura "de usar y tirar" que dispara el flash real.
/// No nos importa la imagen resultante, solo saber que la captura (y el flash) terminaron.
private class FlashPulseDelegate: NSObject, AVCapturePhotoCaptureDelegate {
  private let completion: (Result<Void, Error>) -> Void

  init(completion: @escaping (Result<Void, Error>) -> Void) {
    self.completion = completion
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    if let error = error {
      completion(.failure(error))
    } else {
      completion(.success(()))
    }
  }
}
