# Arquitectura

Playwright Test ejecuta tanto las pruebas web como las de API, así comparten configuración, datos, reportes,
etiquetas y pipeline. Postman/Newman y JMeter quedan aparte, como artefactos independientes.

```text
shared/   configuración, datos y utilidades (money)
   ^
   |-- web/  tests -> fixtures -> pages / components
   |-- api/  tests -> fixtures -> client
api/postman -> Newman
performance -> JMeter
```

## Capas

| Capa | Carpeta | Para qué sirve |
| --- | --- | --- |
| Pruebas | `web/tests`, `api/tests` | Expresan el caso (CP-0xx): datos, acción y verificación. Sin selectores ni URLs |
| Fixtures | `web/fixtures`, `api/fixtures` | Preparan el estado: un socio por worker, la sesión, una cuenta por prueba |
| Page objects | `web/pages`, `web/components` | Localizadores y acciones de cada pantalla, más las aserciones reutilizables |
| Cliente API | `api/client` | Endpoints tipados; las variantes `...Raw` devuelven la respuesta completa para los casos negativos |
| Compartido | `shared/` | Entorno, fábricas de datos y manejo de dinero en centavos |

## Decisiones

- **Page Object Model**: un cambio en la pantalla se corrige en un solo archivo.
- **Fixtures de Playwright** en lugar de `beforeEach`: el estado se inyecta y se limpia solo.
- **Un socio por worker** guardando el `storageState`: permite paralelismo sin depender de `john/demo`.
- **Cuenta nueva por prueba API**: cada prueba conoce su saldo inicial exacto.
- **Montos en centavos**: evita errores de punto flotante al comparar saldos.
- **Datos con sufijo único** (`RUN_ID`) para identificar lo que crea cada ejecución.
- **Defectos como pruebas `@known-defect`**: la prueba define lo correcto y falla mientras el defecto exista.
- **Aserciones web-first**, sin esperas fijas.

## Selectores

ParaBank no tiene `data-testid`. Se usa primero el rol y el nombre accesible, luego ids estables y, como último
recurso, el atributo `name`. El campo de teléfono de Bill Pay tiene id aleatorio, por eso se ubica por `name`. Los
bloques de resultado y error siempre existen en el DOM (ocultos), así que las verificaciones se hacen sobre elementos
visibles.

## Etiquetas

| Etiqueta | Uso |
| --- | --- |
| `@smoke` | Camino crítico (`npm run test:smoke`) |
| `@regression` | Regresión (`npm run test:regression`) |
| `@negative` | Datos inválidos y reglas de negocio |
| `@mobile` | También corre en el proyecto `web-mobile` |
| `@security` | Control de acceso |
| `@known-defect` | Defecto confirmado, queda fuera de `npm test` (`npm run test:defects`) |

## Reportes

Los reportes se generan en `reports/`: HTML de Playwright, JUnit, JSON y los reportes de Newman. En el CI se suben como
artefactos.
