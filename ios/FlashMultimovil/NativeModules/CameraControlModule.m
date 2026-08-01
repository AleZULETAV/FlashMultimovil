#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CameraControlModule, NSObject)

RCT_EXTERN_METHOD(setTorch:(BOOL)on resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(fireFlashPulse:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setExposureDuration:(nonnull NSNumber *)durationMs resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(resetToAuto:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
