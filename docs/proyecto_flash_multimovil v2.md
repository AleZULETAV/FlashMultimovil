# Flash sincronizado multi-móvil — documento de proyecto

Última actualización: 24 de julio de 2026

## Resumen

Idea central: usar dos o más móviles conectados en red para que, cuando el móvil "madre" toma una foto, los móviles "remotos" aporten luz (linterna sostenida y/o flash real) de forma sincronizada, funcionando como un sistema de iluminación remota sin necesidad de flashes de estudio dedicados.

Ambos dispositivos de prueba son Apple: **iPhone 12 (móvil madre)** y **iPhone 13 (móvil remoto)**. Esto simplifica bastante la arquitectura de red, como se detalla más abajo.

---

## 1. Concepto y motivación

- Los sistemas de flash remoto profesional (disparadores de radio tipo PocketWizard, sincronización por radio o por simpatía) requieren sincronización de microsegundos porque el destello de un flash de xenón dura 1-2ms y debe coincidir con la ventana exacta en que el obturador está abierto.
- La idea adaptada a móviles: en vez de perseguir esa precisión, aprovechar que el flash de un móvil es un LED, no un tubo de xenón, lo que abre dos estrategias distintas.

## 2. Fundamentos técnicos que lo hacen viable

### 2.1 Modo linterna sostenida (fill light)

- Un LED se puede mantener encendido en modo continuo ("torch"), no solo en pulso instantáneo.
- Si el móvil remoto enciende su linterna *antes* de que el móvil madre dispare y la mantiene encendida durante toda la ventana de exposición, ya no se necesita sincronización de microsegundos, solo estar encendido en algún punto de una ventana de ~200-500ms.
- **Limitación conocida**: el modo torch entrega mucho menos brillo que el pulso de flash real, porque el fabricante limita la corriente para que el LED no se sobrecaliente en uso continuo. El pulso de flash usa una corriente mucho más alta pero solo por una fracción de segundo.

### 2.2 Técnica "open flash" (flash real + obturador extendido)

- Técnica ya usada en fotografía nocturna/light painting: se abre el obturador en modo bulba y se dispara el flash manualmente en cualquier momento dentro de esa ventana. Como el sensor integra toda la luz que entra durante la exposición, no importa el instante exacto del destello, solo que ocurra dentro de la ventana abierta.
- Aplicado a este proyecto: el móvil madre extiende su tiempo de obturación (con AVFoundation, ver sección 5.2) lo suficiente como para que la ronda de coordinación por red (aviso → confirmación → disparo) quepa cómoda dentro de esa ventana, sin necesitar sincronización de reloj de precisión.
- Margen disponible: la latencia típica de una red local entre dos iPhones (WiFi/MultipeerConnectivity) ronda 1-20ms. Con un obturador de 200-500ms hay margen de sobra.
- Las dos técnicas (2.1 y 2.2) no son excluyentes: se pueden combinar — linterna sostenida como luz de relleno constante, y flash real disparado "a ciegas" dentro de la ventana para un golpe de luz más potente en el momento clave.

## 3. Estado del arte (investigación previa)

No se encontró ninguna app que combine exactamente estas tres piezas (móvil madre + red local + flash/torch remoto sincronizado con el obturador, pensado para fotografía). Sí existen piezas sueltas:

| App | Qué hace | Qué le falta para ser esto |
|---|---|---|
| Profoto Camera | Sincroniza flashes de estudio profesionales con el obturador del móvil | Necesita hardware de flash dedicado, no usa otros móviles |
| Sync N Shoot | Conecta varios móviles y dispara sus cámaras a la vez desde un solo dispositivo | Pensada para multi-ángulo, no para usar unos móviles como fuente de luz |
| FlashBeats | Sincroniza la linterna de un número ilimitado de móviles en red, al ritmo de la música | Pensada para luces de fiesta, no como herramienta fotográfica |

Conclusión: el hueco de mercado es real. Vale la pena documentarlo bien porque es un ángulo original.

## 4. Configuración de hardware para pruebas

- **Móvil madre**: iPhone 12
- **Móvil remoto**: iPhone 13
- Ambos Apple → se puede usar el framework nativo de Apple para redes P2P sin gestionar manualmente un hotspot (ver 5.1).

## 5. Arquitectura elegida

### 5.1 Red: `MultipeerConnectivity`

- Framework de Apple diseñado justo para este caso: descubre y conecta dispositivos cercanos automáticamente por WiFi/Bluetooth, sin que la app tenga que crear y gestionar un hotspot manualmente.
- Piezas clave: `MCSession` (comunicación entre peers conectados), `MCNearbyServiceAdvertiser` / `MCNearbyServiceBrowser` (anunciarse y descubrir peers), `MCPeerID` (identifica cada dispositivo).
- Documentación oficial: https://developer.apple.com/documentation/multipeerconnectivity
- **Nota para el futuro**: si algún día se quiere soportar Android, `MultipeerConnectivity` deja de servir (es exclusivo de plataformas Apple) y habría que pasar a sockets UDP sobre un hotspot manual. No es el caso ahora, pero conviene no acoplar todo el protocolo de mensajes a la API de Apple, para dejar la puerta abierta.

### 5.2 Cámara y flash: `AVFoundation`

- No hace falta construir una cámara desde cero. `AVFoundation` ya expone control fino sobre exposición y linterna.
- Piezas clave:
  - `AVCaptureDevice.setExposureModeCustom(duration:iso:completionHandler:)` — controla manualmente la duración de la exposición (el "obturador extendido" de la sección 2.2). Documentación: https://developer.apple.com/documentation/avfoundation/avcapturedevice/setexposuremodecustom(duration:iso:completionhandler:)
  - Control de `torchMode` en `AVCaptureDevice` — para encender/apagar la linterna del móvil remoto en modo continuo.
  - Requiere `lockForConfiguration()` / `unlockForConfiguration()` antes de cambiar estos parámetros.
  - Disponible en cualquier iPhone (no exclusivo de modelos Pro).

## 6. Protocolo de coordinación (boceto)

Flujo acordado hasta ahora:

1. Móvil madre crea la sesión (`MCSession`) y el iPhone 13 se conecta como peer.
2. Móvil madre envía un mensaje de aviso: "disparo en T + X ms" (tiempo relativo, no timestamp absoluto, para no depender de que los relojes estén sincronizados).
3. Según la técnica activa:
   - Modo linterna: el remoto enciende el torch al recibir el aviso y lo mantiene encendido durante toda la ventana.
   - Modo flash real: el remoto dispara su flash en algún punto dentro de la ventana, mientras el móvil madre mantiene el obturador abierto con exposición manual extendida.
4. Móvil madre captura la foto.
5. Móvil madre envía confirmación de "ya se disparó" y el remoto apaga la linterna/finaliza.

Pendiente de definir: formato exacto del mensaje (JSON simple debería bastar), manejo de reconexión si un peer se desconecta a mitad de sesión, y qué pasa si hay más de un móvil remoto (broadcast a todos los peers de la sesión).

## 7. Entorno de desarrollo

Restricción de partida: el desarrollo se hace desde una **laptop con Windows 11**, sin Mac física disponible. `Xcode` solo corre en macOS, así que en algún punto del pipeline tiene que aparecer una Mac (física, en la nube, o virtual). Hay tres rutas viables, de más simple/cara a más elaborada/gratis:

### Opción A — Mac propia (nueva o usada)

- Apple acaba de descontinuar la configuración más barata del Mac mini; el modelo base ahora arranca en ~799 USD (512GB, chip M4). Un Mac mini usado (M1/M2) sigue siendo perfectamente capaz para esto y se consigue mucho más barato.
- Sin costos recurrentes una vez comprado. Conexión directa por cable con los iPhones, sin intermediarios.

### Opción B — Mac en la nube (renta por día/mes)

- Servicios como MacinCloud u otros proveedores boutique dan acceso remoto a un Mac (algunos con Apple Silicon real, otros con VM Intel — conviene verificar antes de pagar). Precios orientativos: desde ~3-15 USD/día o ~25-60 USD/mes.
- Se puede conectar el iPhone físico a la Mac remota vía herramientas de reenvío USB por red, para pruebas y depuración reales.
- Buena opción para probar el concepto sin comprometerse a comprar hardware.

### Opción C — Pipeline gratuito con GitHub Actions + Sideloadly/SideStore (sin Mac en absoluto)

Estrategia propuesta por el usuario (documento "Estrategia de Desarrollo sin Mac en Windows"), validada como técnicamente viable:

```
[ PC Windows / VS Code ] --(git push)--> [ Repositorio GitHub ]
                                                  │
                                     (GitHub Actions / runner macOS)
                                                  │
                                          Compilación → .ipa
                                                  │
                                                  ▼
[ iPhone 12 & 13 ] <--(Wi-Fi / Cable)-- [ Sideloadly / SideStore ]
```

- **IDE/framework**: Visual Studio Code en Windows, con **React Native o Flutter** para la lógica de red y UI (JS/TS o Dart), y **módulos nativos en Swift** como puente hacia `AVFoundation` y `MultipeerConnectivity`. Esto es un cambio respecto a la sección 5, que asumía Swift puro — ver pregunta abierta en la sección 9.
- **Compilación (CI/CD)**: GitHub Actions (o Codemagic) con un runner macOS oficial en la nube compila el proyecto con `xcodebuild` al hacer `git push`, sin necesitar una Mac local. Resultado: un `.ipa` descargable.
  - **Importante sobre el costo**: los runners macOS de GitHub Actions son gratuitos e ilimitados solo en **repositorios públicos**. En repos privados, los minutos de macOS consumen la cuota gratuita mensual (2000 min) a una tasa 10x, es decir, en la práctica solo ~200 minutos gratis de macOS al mes. Para este proyecto, conviene usar un repo público si no hay problema en que el código sea visible.
- **Firma e instalación**: `Sideloadly` (Windows) firma el `.ipa` e instala en el iPhone 12 y 13 usando una cuenta de Apple ID gratuita — no necesita Mac ni Xcode para este paso, replica directamente el protocolo que usa Xcode contra los servidores de Apple.
  - Certificados de una cuenta gratuita caducan cada 7 días. `Sideloadly` puede renovarlos automáticamente por Wi-Fi (con la app abierta en segundo plano en la PC) una vez que el dispositivo fue emparejado por cable la primera vez.
  - Alternativa: `SideStore`, que corre en el propio iPhone y se renueva solo en segundo plano usando un túnel VPN local (WireGuard), sin depender de que la PC esté encendida. Solo necesita una computadora una vez, durante la instalación inicial.
- **Caveat honesto**: este flujo de sideloading (Sideloadly/SideStore/AltStore) no es un mecanismo oficialmente soportado por Apple para distribución — opera reutilizando la infraestructura de certificados de desarrollador gratuitos de forma no convencional. Es ampliamente usado por la comunidad de desarrolladores hobbistas y es de bajo riesgo para pruebas personales como esta, pero conviene saber que no es la ruta "oficial" (esa sería un Apple Developer Program de pago + TestFlight).

**Recomendación práctica**: la Opción C es la más barata (0 USD) y ya viene bastante detallada, pero tiene más piezas moviéndose (framework híbrido + CI + sideloading). Si en el camino se vuelve frustrante depurar la capa nativa a través de puentes React Native/Flutter sin poder ver nada localmente en Xcode, la Opción B (Mac en la nube por un par de días) es la válvula de escape más rápida.

## 8. Roadmap / próximos pasos

- [x] Decidir framework (Swift nativo vs. React Native/Flutter + módulos nativos) — se eligió React Native + módulos nativos en Swift.
- [x] Configurar repositorio en GitHub (público, para minutos de macOS gratis en CI) con el workflow de GitHub Actions que genere el `.ipa`.
- [x] Prueba de despliegue: instalar el ejecutable base vía `Sideloadly` en el iPhone 12 y el iPhone 13.
- [x] Implementar sesión `MultipeerConnectivity` mínima: el iPhone 12 y el iPhone 13 se descubren, conectan y mandan mensajes de prueba. Funcionando de forma confiable.
- [x] Implementar control de torch remoto: al recibir un mensaje, el iPhone 13 enciende/apaga su linterna. Funcionando.
- [x] Medir la latencia real de red entre ambos dispositivos: implementado un ping/pong con 5 intentos que calcula ida-y-vuelta promedio/peor caso y sugiere una ventana de seguridad (sección "Medir latencia" en la pantalla madre).
- [x] Primer visor de cámara en vivo (sin capturar fotos todavía), usando un View Manager nativo (`CameraPreviewView`/`CameraPreviewViewManager`) — visible en la pantalla madre.
- [ ] Implementar exposición manual extendida en el iPhone 12 usando `setExposureModeCustom`.
- [ ] Primera prueba de campo end-to-end: móvil madre dispara, remoto enciende linterna dentro de la ventana, se revisa la foto resultante.
- [ ] Explorar la variante de "flash real dentro de la ventana" una vez que la variante de linterna funcione de forma confiable.
- [ ] Diseño visual: interfaz estilo Y2K/Sony Cybershot (ver sección 11).
- [ ] Soporte Android + redes mixtas iOS/Android (ver sección 9, decisión pospuesta a propósito).

## 9. Preguntas abiertas / decisiones pendientes

- ¿Formato exacto del mensaje de coordinación? **Resuelto**: JSON plano sobre `MCSession.send`, con `type` como discriminador (`trigger`, `ack`, `done`, `ping`, `pong`). Ver `src/protocol/messages.ts`.
- ¿Cómo se maneja un remoto que se desconecta a mitad de una sesión de disparo? Todavía sin resolver — pendiente para cuando se hagan pruebas de campo más largas.
- **Android + redes mixtas (iPhone + Android en la misma sesión) — decisión tomada, pospuesta a propósito.** `MultipeerConnectivity` es exclusivo de Apple: un iPhone y un Android nunca van a poder hablar por ahí, sin importar la implementación. Para soportar esto de verdad hay que reemplazar la capa de red por algo basado en estándares abiertos que ambos sistemas implementan:
  - Descubrimiento: mDNS/Bonjour (nativo en iOS) ↔ `NsdManager` (Android) — mismo protocolo estándar de fondo, si interoperan.
  - Canal de datos: sockets TCP normales en vez del canal propietario de `MCSession`.
  - Se decidió terminar de validar el concepto con los dos iPhones primero (más barato descubrir problemas de diseño ahora que después de duplicar la complejidad en dos plataformas). `src/protocol/messages.ts` y la lógica de las pantallas ya están escritos de forma independiente del transporte, así que el trabajo futuro es principalmente reemplazar `PeerNetworkModule` en iOS y construir su equivalente en Android (Kotlin), sin tocar el resto.
- ¿Qué ventana de seguridad usar por defecto? **Ya se puede medir**: la pantalla madre tiene un botón "Medir latencia" que hace 5 pings/pongs reales y sugiere una ventana (2x el peor caso observado, redondeado a 50ms). Falta decidir si ese valor sugerido se usa automáticamente o se deja fijo a mano.
- ¿Swift nativo o React Native/Flutter con puente nativo? **Resuelto**: React Native + módulos nativos en Swift (puente clásico vía `RCT_EXTERN_MODULE`, no Turbo Modules "nativos").
- ¿El repositorio del proyecto puede ser público? **Resuelto**: sí, es público.
- **Lección aprendida sobre `RCT_EXTERN_MODULE`**: cuando la clase Swift hereda de una clase concreta de React (`RCTEventEmitter`, `RCTViewManager`, etc.), la superclase declarada en `RCT_EXTERN_MODULE(Nombre, Superclase)` del archivo `.m` debe ser **`NSObject`**, nunca la superclase real — usar la superclase real ahí provoca un choque de propiedades duplicadas en tiempo de ejecución (crash instantáneo, sin mensaje claro). Ya aplicado en `PeerNetworkModule.m` y `CameraPreviewViewManager.m`.
- **Lección aprendida sobre nombres de módulos**: React Native NO recorta automáticamente el sufijo "Module" del nombre de la clase al registrar el módulo hacia JS — si la clase se llama `PeerNetworkModule`, hay que buscarlo en JS como `NativeModules.PeerNetworkModule`, no `NativeModules.PeerNetwork`. Nos costó varias rondas de depuración no saber esto.

## 11. Diseño visual (nueva sección)

Dirección elegida: estética **Y2K / cámaras Sony Cybershot de inicios de los 2000** — pantallas LCD pequeñas, cuerpos plateados/translúcidos, tipografías digitales.

Flujo de trabajo (el usuario nunca ha hecho una interfaz, diseña en Photoshop):

1. Diseñar en Photoshop (colores, botones, textura del "cuerpo de cámara", ícono del LCD).
2. Exportar cada imagen en PNG, en 3 tamaños (`nombre.png`, `nombre@2x.png`, `nombre@3x.png`) por las distintas densidades de pantalla — React Native elige el correcto solo.
3. Fuentes: conseguir el archivo `.ttf`/`.otf` de una tipografía digital/LCD, vincularla al proyecto (proceso de "link" de fuentes de React Native).
4. Sonidos (clic del obturador, sonidos de menú): librería `react-native-sound`, archivos `.mp3`/`.wav`.
5. Animaciones: `Animated` (incluido en React Native) para cosas simples; `react-native-reanimated` si se necesita algo más elaborado más adelante.

Orden sugerido: primero maquetar la interfaz estática calcando el diseño de Photoshop, y añadir sonido/animación encima después — no todo junto.

## 12. Referencias

- MultipeerConnectivity — Apple Developer Documentation: https://developer.apple.com/documentation/multipeerconnectivity
- AVCaptureDevice.setExposureModeCustom — Apple Developer Documentation: https://developer.apple.com/documentation/avfoundation/avcapturedevice/setexposuremodecustom(duration:iso:completionhandler:)
- Facturación de GitHub Actions (minutos gratis, multiplicador de macOS): https://docs.github.com/es/billing/concepts/product-billing/github-actions
- Sideloadly: https://sideloadly.io/index.html
- SideStore — FAQ: https://docs.sidestore.io/docs/faq
