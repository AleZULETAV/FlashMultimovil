import UIKit
import AVFoundation

/// Vista nativa que muestra el feed en vivo de la cámara (sin capturar fotos todavía).
/// Ver sección "Visor de cámara" del roadmap en docs/proyecto_flash_multimovil.md.
class CameraPreviewView: UIView {
  private let session = AVCaptureSession()
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private let sessionQueue = DispatchQueue(label: "CameraPreviewView.sessionQueue")

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
    checkPermissionAndSetup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    backgroundColor = .black
    checkPermissionAndSetup()
  }

  private func checkPermissionAndSetup() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      setupSession()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        if granted {
          self?.setupSession()
        }
      }
    default:
      // Permiso denegado/restringido: la vista se queda negra a propósito,
      // en vez de tronar. El usuario puede habilitarlo desde Ajustes.
      break
    }
  }

  private func setupSession() {
    sessionQueue.async { [weak self] in
      guard let self = self else { return }
      self.session.beginConfiguration()
      self.session.sessionPreset = .high

      guard
        let device = AVCaptureDevice.default(for: .video),
        let input = try? AVCaptureDeviceInput(device: device),
        self.session.canAddInput(input)
      else {
        self.session.commitConfiguration()
        return
      }
      self.session.addInput(input)
      self.session.commitConfiguration()
      self.session.startRunning()

      DispatchQueue.main.async {
        let layer = AVCaptureVideoPreviewLayer(session: self.session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = self.bounds
        self.layer.addSublayer(layer)
        self.previewLayer = layer
      }
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }

  deinit {
    session.stopRunning()
  }
}
