# Prueba técnica QA Automation - ParaBank

[![QA Pipeline](https://github.com/jonnathanpena/jardin_azuayo_prueba_qa/actions/workflows/qa-pipeline.yml/badge.svg)](https://github.com/jonnathanpena/jardin_azuayo_prueba_qa/actions/workflows/qa-pipeline.yml)

Solución de la prueba técnica de QA Automation sobre [ParaBank](https://parabank.parasoft.com/parabank/index.htm),
con el caso de pago de servicios desde la banca web.

## Qué se hizo

| Parte | Estado | Dónde |
| --- | --- | --- |
| A. Casos de prueba | Completa (21 casos) | [`casos/`](casos/README.md) y [CSV](casos/casos-de-prueba.csv) |
| B. Automatización web | Completa, Playwright + TypeScript | [`web/`](web) |
| C. Pruebas API | Completa, Playwright y colección Postman | [`api/`](api) |
| D. Pipeline | Completo, GitHub Actions ([run de referencia](https://github.com/jonnathanpena/jardin_azuayo_prueba_qa/actions/runs/43981169957)) | [`.github/workflows/qa-pipeline.yml`](.github/workflows/qa-pipeline.yml), [notas](pipeline/README.md) |
| E. Evidencias y defectos | Completa, 5 defectos documentados | [reporte](evidencias/reporte-ejecucion.md) y [defectos](evidencias/defectos.md) |
| F. Plan JMeter | Completa: plan listo para un entorno autorizado, sin ejecutar carga como pide el enunciado | [`performance/`](performance/README.md) |
| G. Automatización mobile | Completa como guía (Appium); no se ejecutó porque ParaBank no tiene app nativa | [`mobile/`](mobile/estrategia-automatizacion-mobile.md) |

## Pipeline

El workflow corre en cada push, en cada pull request, de lunes a viernes y bajo demanda. El run de referencia es
[43981169957](https://github.com/jonnathanpena/jardin_azuayo_prueba_qa/actions/runs/43981169957): calidad de código, web, API y Postman en verde. El único job que falla es *Verificación de
defectos conocidos*, a propósito: ahí están las pruebas de los defectos abiertos de ParaBank, y el job no bloquea para
que esos fallos se vean sin ocultarlos. El resumen del run y los artefactos (`reportes-web`, `reportes-api`,
`reportes-postman`, `reportes-defectos`) están en la página del run.

## Requisitos

- Node.js 22.12 o superior (ver `.nvmrc`)
- Git
- Opcional: Java 17 y Apache JMeter 5.6.x para el plan de rendimiento, y Postman para abrir la colección

## Instalación

```bash
git clone https://github.com/jonnathanpena/jardin_azuayo_prueba_qa.git
cd jardin_azuayo_prueba_qa
npm ci
npx playwright install --with-deps chromium
cp .env.example .env
```

El `.env` es opcional, los valores por defecto apuntan a la demo pública.

## Cómo ejecutar

| Qué | Comando |
| --- | --- |
| Todas las pruebas (sin los defectos conocidos) | `npm test` |
| Web en escritorio | `npm run test:web` |
| Web en viewport móvil (Pixel 7) | `npm run test:mobile-web` |
| API con Playwright | `npm run test:api` |
| Smoke / regresión | `npm run test:smoke` / `npm run test:regression` |
| Defectos conocidos (fallan mientras el defecto exista) | `npm run test:defects` |
| Postman con Newman | `npm run test:postman` / `npm run test:postman:defects` |
| Reporte HTML | `npm run report` |
| Validar el plan JMeter | `npm run jmx:validate` |
| Lint, tipos y formato | `npm run lint`, `npm run typecheck`, `npm run format:check` |

Variables del `.env`:

| Variable | Por defecto |
| --- | --- |
| `PARABANK_BASE_URL` | `https://parabank.parasoft.com/parabank/` |
| `PARABANK_USERNAME` / `PARABANK_PASSWORD` | `john` / `demo` |
| `PARABANK_USER_PREFIX` | `qa` |

## Estructura

```text
.github/       workflow de GitHub Actions y plantillas
api/           cliente REST, fixtures, pruebas y colección Postman
web/           page objects, fixtures y pruebas web
shared/        configuración, datos y utilidades comunes
casos/         casos de prueba
evidencias/    reporte de ejecución, defectos y capturas
performance/   plan JMeter y análisis
mobile/        estrategia mobile
pipeline/      notas del pipeline
docs/          arquitectura
scripts/       utilidades para el resumen del CI
```

## Decisiones

- Playwright para web y API, así comparten reporte, etiquetas y fixtures.
- Cada worker registra su propio socio y cada prueba API abre una cuenta nueva. La demo es pública y otras personas
  cambian los datos de `john/demo`.
- Además de la confirmación del pago, se verifica el débito y el saldo (en centavos).
- Los defectos están como pruebas `@known-defect`. Validan el comportamiento correcto, fallan mientras el defecto
  exista y corren en un job aparte que no bloquea el pipeline.
- No se ejecutó carga contra la demo pública.

Más detalle en [`docs/arquitectura.md`](docs/arquitectura.md).

## Resultados

| Suite | Resultado |
| --- | --- |
| Web (Chromium 1366x768 y Pixel 7) | 23 de 23 |
| API con Playwright | 8 de 8 |
| Postman / Newman | 25 de 25 aserciones |
| Defectos conocidos | 17 verificaciones fallan (11 Playwright y 6 Postman) y confirman 5 defectos |

El detalle está en [`evidencias/reporte-ejecucion.md`](evidencias/reporte-ejecucion.md) y los defectos en
[`evidencias/defectos.md`](evidencias/defectos.md):

| ID | Defecto | Severidad |
| --- | --- | --- |
| DEF-001 | Se aceptan pagos con monto cero o negativo, y el negativo aumenta el saldo | Crítica |
| DEF-002 | Se aceptan pagos mayores al saldo (sobregiro) | Alta |
| DEF-003 | La API REST entrega datos de cuentas sin autenticación | Crítica |
| DEF-004 | El login web acepta usuarios inexistentes o con contraseña incorrecta | Crítica |
| DEF-005 | Bill Pay web confirma el pago pero no debita la cuenta | Crítica |

## Lo que no se ejecutó

- **Carga con JMeter**: el enunciado lo prohíbe. Solo se validó el plan de forma estática. El
  análisis usa los datos simulados del enunciado.
- **App nativa**: ParaBank no tiene app, así que la parte mobile es una guía con Appium y la ejecución real fue
  emulando un Pixel 7 en el navegador.
- **CP-018 (doble clic en Send Payment)** y **CP-019 (pago desde otra cuenta)**: quedan manuales. El primero depende de
  la red y el segundo aporta poco frente a CP-002.

## Obstáculos

- La demo pública es compartida y se reinicia, y los saldos de `john/demo` cambian solos. Por eso se usan datos propios
  y 1 reintento en CI (0 en las pruebas de defectos).
- El campo teléfono de Bill Pay cambia de `id` y `class` en cada carga, así que se ubica por el atributo `name`.
- En el primer run del pipeline fallaron 5 pruebas web (login con credenciales inválidas y 3 comprobaciones de saldo).
  Se reprodujo a mano y es comportamiento actual de la demo, así que se documentó como DEF-004 y DEF-005 y esas pruebas
  pasaron a `@known-defect`.
- CP-002 fallaba cerca de la mitad de las veces porque el clic en Send Payment se hacía antes de que el formulario
  terminara de cargar. Se corrigió esperando a que la red se calme.
- Solo se prueba en Chromium.

## Autor

Jonnathan Peña - [@jonnathanpena](https://github.com/jonnathanpena)
