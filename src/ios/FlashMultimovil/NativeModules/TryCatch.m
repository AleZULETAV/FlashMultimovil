#import "TryCatch.h"

NSException *PNTryCatch(void (^tryBlock)(void)) {
  @try {
    tryBlock();
    return nil;
  } @catch (NSException *exception) {
    return exception;
  }
}
