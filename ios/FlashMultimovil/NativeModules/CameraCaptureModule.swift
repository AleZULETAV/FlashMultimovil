import Foundation
import AVFoundation
import React

/// Toma una foto real usando la sesión compartida de CameraSessionManager.
/// Ver roadmap "Capturar una foto real" en docs/proyecto_flash_multimovil.md.
@objc(CameraCaptureModule)
class CameraCaptureModule: NSObject {

  // Hay que retener el delegate mientras dura la captura, o ARC lo libera antes de que responda.
  private var activeDelegate: PhotoCaptureDelegate?

  @objc(takePhoto:rejecter:)
  func takePhoto(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      capture(resolve: resolve, rejecter: reject)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        DispatchQueue.main.async {
          if granted {
            self?.capture(resolve: resolve, rejecter: reject)
          } else {
            reject("CAMERA_PERMISSION_DENIED", "El usuario no dio permiso de cámara", nil)
          }
        }
      }
    default:
      reject("CAMERA_PERMISSION_DENIED", "Permiso de cámara denegado o restringido. Ve a Ajustes > Privacidad y seguridad > Cámara.", nil)
    }
  }

  private func capture(resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String?, String?, Error?) -> Void) {
    CameraSessionManager.shared.configureIfNeeded { [weak self] success in
      guard let self = self else { return }
      guard success else {
        reject("CAMERA_ERROR", "No se pudo configurar la sesión de cámara", nil)
        return
      }

      let settings = AVCapturePhotoSettings()
      let delegate = PhotoCaptureDelegate { result in
        self.activeDelegate = nil
        switch result {
        case .success(let path):
          resolve(["path": path])
        case .failure(let error):
          reject("CAMERA_ERROR", error.localizedDescription, error)
        }
      }
      self.activeDelegate = delegate
      CameraSessionManager.shared.photoOutput.capturePhoto(with: settings, delegate: delegate)
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

/// Delegate que recibe la foto ya procesada y la guarda en un archivo temporal.
private class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
  private let completion: (Result<String, Error>) -> Void

  init(completion: @escaping (Result<String, Error>) -> Void) {
    self.completion = completion
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    if let error = error {
      completion(.failure(error))
      return
    }
    guard let data = photo.fileDataRepresentation() else {
      completion(.failure(NSError(domain: "CameraCaptureModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "No se pudo generar la imagen"])))
      return
    }
    let filename = "flashmultimovil_\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
    let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
    do {
      try data.write(to: url)
      completion(.success(url.path))
    } catch {
      completion(.failure(error))
    }
  }
}
