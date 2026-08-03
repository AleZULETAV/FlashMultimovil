#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CameraCaptureModule, NSObject)

RCT_EXTERN_METHOD(takePhoto:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
