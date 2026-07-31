import UIKit
import AVFoundation

/// Vista nativa que muestra el feed en vivo de la cámara, usando la sesión
/// compartida de CameraSessionManager (la misma que usa la captura de fotos real).
/// Ver sección "Visor de cámara" del roadmap en docs/proyecto_flash_multimovil.md.
class CameraPreviewView: UIView {
  private var previewLayer: AVCaptureVideoPreviewLayer?

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
      setupPreview()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        if granted {
          self?.setupPreview()
        }
      }
    default:
      // Permiso denegado/restringido: la vista se queda negra a propósito,
      // en vez de tronar. El usuario puede habilitarlo desde Ajustes.
      break
    }
  }

  private func setupPreview() {
    CameraSessionManager.shared.configureIfNeeded { [weak self] success in
      guard let self = self, success else { return }
      let layer = AVCaptureVideoPreviewLayer(session: CameraSessionManager.shared.session)
      layer.videoGravity = .resizeAspectFill
      layer.frame = self.bounds
      self.layer.addSublayer(layer)
      self.previewLayer = layer
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }
}
