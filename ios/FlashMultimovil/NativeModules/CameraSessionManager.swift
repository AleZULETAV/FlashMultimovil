import AVFoundation

/// Sesión de captura compartida entre CameraPreviewView (el visor) y CameraCaptureModule
/// (la captura real de fotos) — ambos necesitan usar la MISMA sesión activa, no una cada uno.
final class CameraSessionManager: NSObject {
  static let shared = CameraSessionManager()

  let session = AVCaptureSession()
  let photoOutput = AVCapturePhotoOutput()
  private var isConfigured = false
  private let sessionQueue = DispatchQueue(label: "CameraSessionManager.sessionQueue")

  private override init() {
    super.init()
  }

  /// Configura la sesión (input de video + output de fotos) la primera vez que se llama;
  /// las siguientes llamadas solo confirman que ya está lista.
  func configureIfNeeded(completion: @escaping (Bool) -> Void) {
    sessionQueue.async {
      if self.isConfigured {
        if !self.session.isRunning {
          self.session.startRunning()
        }
        DispatchQueue.main.async { completion(true) }
        return
      }

      self.session.beginConfiguration()
      self.session.sessionPreset = .photo

      guard
        let device = AVCaptureDevice.default(for: .video),
        let input = try? AVCaptureDeviceInput(device: device),
        self.session.canAddInput(input)
      else {
        self.session.commitConfiguration()
        DispatchQueue.main.async { completion(false) }
        return
      }
      self.session.addInput(input)

      guard self.session.canAddOutput(self.photoOutput) else {
        self.session.commitConfiguration()
        DispatchQueue.main.async { completion(false) }
        return
      }
      self.session.addOutput(self.photoOutput)
      self.session.commitConfiguration()
      self.isConfigured = true
      self.session.startRunning()

      DispatchQueue.main.async { completion(true) }
    }
  }
}
