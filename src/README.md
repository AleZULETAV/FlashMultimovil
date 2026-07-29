# Flash sincronizado multi-móvil

App de React Native (TypeScript) + módulos nativos en Swift para usar dos o más iPhones como un
sistema de flash/luz remota sincronizada al tomar una foto.

Documento completo del proyecto (concepto, decisiones de arquitectura, roadmap, preguntas
abiertas): [`docs/proyecto_flash_multimovil.md`](docs/proyecto_flash_multimovil.md).

## Desarrollo sin Mac (Windows)

Este proyecto se desarrolla desde Windows, sin Mac física. La compilación de iOS corre en un
runner macOS de GitHub Actions (`.github/workflows/build-ios.yml`) y la instalación en los
iPhones de prueba se hace con [Sideloadly](https://sideloadly.io) o
[SideStore](https://sidestore.io) usando un Apple ID gratuito. Detalles y alternativas
(Mac propia / Mac en la nube) en la sección 7 del documento del proyecto.

## Estructura

```
.
├── .github/workflows/build-ios.yml   # CI: compila el .ipa (sin firmar) en cada push
├── docs/                              # documentación del proyecto
├── ios/
│   └── FlashMultimovil/
│       └── NativeModules/            # puente Swift <-> React Native (AVFoundation, MultipeerConnectivity)
├── src/
│   ├── protocol/messages.ts          # mensajes del protocolo de coordinación
│   ├── native/                       # wrappers TS de los módulos nativos
│   ├── screens/                      # UI: modo madre / modo remoto
│   └── App.tsx
└── App.tsx                           # solo reexporta src/App.tsx (punto de entrada de RN)
```

## Cómo correr localmente

```bash
npm install
npx react-native start
```

Para compilar y correr en un iPhone conectado se necesita macOS + Xcode; en Windows, usar el
pipeline de CI + Sideloadly descrito arriba.

## Estado

Proyecto en fase de andamiaje. Ver la sección "Roadmap / próximos pasos" del documento del
proyecto para la lista de tareas pendientes.
