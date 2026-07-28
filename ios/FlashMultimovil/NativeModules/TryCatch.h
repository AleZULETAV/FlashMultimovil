#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Ejecuta tryBlock y, si lanza una NSException (algo que Swift no puede atrapar
/// directamente con do/catch), la devuelve en vez de dejar que tumbe el proceso.
/// Devuelve nil si tryBlock terminó sin lanzar nada.
NSException *_Nullable PNTryCatch(void (^_Nonnull tryBlock)(void));

NS_ASSUME_NONNULL_END
