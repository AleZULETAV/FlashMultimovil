#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PeerNetworkModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startSession:(NSString *)displayName resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(broadcast:(NSString *)messageJson resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopSession:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
