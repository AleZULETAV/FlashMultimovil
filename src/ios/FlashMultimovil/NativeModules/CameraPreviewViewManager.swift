import UIKit
import React

/// Expone CameraPreviewView a React Native como un componente de vista normal.
/// Se usa desde JS con requireNativeComponent('CameraPreviewViewManager') —
/// ver src/native/CameraPreview.tsx.
@objc(CameraPreviewViewManager)
class CameraPreviewViewManager: RCTViewManager {
  override func view() -> UIView! {
    return CameraPreviewView()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
