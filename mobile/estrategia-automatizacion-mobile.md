# Automatización mobile

ParaBank no tiene app nativa (no hay APK ni IPA), así que esta parte es una guía de cómo se automatizaría la app móvil
de banca de una cooperativa. Nada de Appium se ejecutó. Lo que sí se ejecuta es la emulación de un Pixel 7 en el
navegador (ver el final).

## Herramienta elegida

**Appium 2 con WebdriverIO y TypeScript.**

- Un solo framework para Android (UiAutomator2) e iOS (XCUITest).
- Es el mismo lenguaje del repositorio, así que se reutilizan los datos de `shared/`, ESLint y Prettier.
- Prueba el binario que se entrega, sin tocar el código de la app.
- Se integra con BrowserStack, Sauce Labs y GitHub Actions.

Otras opciones que consideré:

| Herramienta | Por qué no |
| --- | --- |
| Espresso / XCUITest | Son dos bases de código y lenguajes distintos (Kotlin y Swift) |
| Detox | Solo sirve para apps en React Native |
| Maestro | Menos control para lógica de datos y aserciones complejas |

## Pasos para automatizar la app

1. **Elegir los flujos.** Para empezar, login y pago de servicios (CP-001 y CP-002 de [`casos/`](../casos/README.md)).
2. **Preparar el entorno.** Node 22, JDK 17, Android Studio con un emulador, Xcode con un simulador (iOS solo en macOS)
   y Appium 2 con sus drivers:

   ```bash
   npm install -g appium@2
   appium driver install uiautomator2
   appium driver install xcuitest
   appium
   ```

3. **Definir las capabilities**, que le dicen a Appium qué dispositivo y qué app usar. Ejemplo para Android:

   ```json
   {
     "platformName": "Android",
     "appium:automationName": "UiAutomator2",
     "appium:deviceName": "Pixel_7_API_34",
     "appium:app": "./apps/app-debug.apk"
   }
   ```

   Para iOS cambian `platformName` (`iOS`), `automationName` (`XCUITest`) y la ruta de la app (`.app` o `.ipa`).

4. **Ubicar los elementos con Appium Inspector.** Se conecta a la sesión y muestra el árbol de la pantalla. Conviene
   acordar con desarrollo un `accessibilityId` por control, porque es estable en ambas plataformas. Se evita el XPath.
5. **Escribir las pantallas** con el mismo patrón de Page Object que en web (Screen Object):

   ```ts
   export class LoginScreen {
     async login(username: string, password: string) {
       await $('~login-username').setValue(username);
       await $('~login-password').setValue(password);
       await $('~login-submit').click();
     }
   }
   ```

6. **Escribir las pruebas** con aserciones sobre lo que muestra la pantalla, por ejemplo:

   ```ts
   await expect($('~billpay-result-title')).toHaveText('Bill Payment Complete');
   ```

7. **Preparar los datos por API** antes de cada prueba (socio y cuenta), para que la UI solo pruebe la UI.
8. **Ejecutar** con `npx wdio run wdio.conf.ts`, primero en emuladores y después en dispositivos reales.
9. **Reportar** con JUnit para el pipeline y capturas en cada fallo.

Los identificadores del ejemplo (`login-username`, `billpay-result-title`, la ruta del APK) son inventados; se
reemplazan por los de la app real.

## Casos propios de mobile

- Rotar la pantalla mientras se llena el formulario.
- Mandar la app a segundo plano durante el pago.
- Perder la conexión al confirmar (no debe duplicarse el pago).
- Teclado numérico en el monto y que el teclado no tape el botón de enviar.
- Biometría y expiración de sesión.

## Dispositivos y CI

- Pull request: smoke en un emulador Android dentro de GitHub Actions.
- Nocturna y release: regresión en una granja de dispositivos reales (BrowserStack o Sauce Labs), con al menos un
  Android reciente, un iPhone y un equipo de pantalla pequeña.

Riesgos: pruebas inestables por animaciones (esperas por estado del elemento y animaciones desactivadas en el
emulador), localizadores frágiles (acordar los `accessibilityId`) y costo de los dispositivos reales (usarlos solo en
nocturna y release).

## Lo que sí se ejecuta: mobile web

El proyecto `web-mobile` de [`playwright.config.ts`](../playwright.config.ts) emula un Pixel 7 (viewport, user-agent y
eventos táctiles) y corre las pruebas marcadas con `@mobile`:

```bash
npm run test:mobile-web
```

Valida que el pago funcione desde un navegador móvil, pero no reemplaza las pruebas en una app nativa ni en
dispositivos reales.
