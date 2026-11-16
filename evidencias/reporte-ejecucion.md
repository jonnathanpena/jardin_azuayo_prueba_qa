# Reporte de ejecución

Resultados contra la demo pública de ParaBank el 16/11/2026. Los números salen de los JUnit guardados en
[`reportes/junit/`](reportes/junit) (ejecución local sin reintentos) y del primer run del workflow
[`qa-pipeline.yml`](../.github/workflows/qa-pipeline.yml). No hay datos simulados; el análisis de rendimiento con datos
del enunciado está en [`performance/`](../performance/analisis-datos-simulados.md).

## Resumen

| Suite | Total | Pasaron | Fallaron | Bloqueadas |
| --- | ---: | ---: | ---: | ---: |
| Web (Chromium 1366x768 y Pixel 7) | 23 | 23 | 0 | 0 |
| API con Playwright | 8 | 8 | 0 | 0 |
| API con Postman (aserciones, carpetas 01 a 03) | 25 | 25 | 0 | 0 |
| Defectos conocidos con Playwright (web y API) | 11 | 0 | 11 | 0 |
| Defectos conocidos con Postman (aserciones, carpeta 04) | 17 | 11 | 6 | 0 |

La suite principal tiene 56 verificaciones y todas pasan. Las suites de defectos fallan a propósito: validan el
comportamiento correcto y confirman 5 defectos (ver [`defectos.md`](defectos.md)). Las 11 aserciones de Postman que
pasan en esa carpeta son la preparación de datos y el saldo sin cambios en el pago de monto 0. CP-018 y CP-019 son
manuales y no se ejecutaron.

## Primer run en GitHub Actions

Run [43969231133](https://github.com/jonnathanpena/jardin_azuayo_prueba_qa/actions/runs/43969231133), commit `483052a`.

| Job | Resultado | Duración |
| --- | --- | --- |
| Calidad de código | OK | 59 s |
| Pruebas web | Falló: 5 pruebas, 23 pasaron | 1 min 44 s |
| Pruebas API (Playwright) | OK, 8/8 | 19 s |
| Pruebas API (Postman) | OK, 25/25 aserciones | 18 s |
| Defectos conocidos | Falla por diseño: 6 pruebas de Playwright y 6 aserciones de Postman | 1 min 44 s |
| Resumen | OK | 12 s |

Las 5 pruebas web que fallaron (CP-003, CP-004, CP-015 y las dos variantes de CP-005) se reprodujeron igual en local y
en la demo con curl: es comportamiento de la aplicación, son los defectos DEF-004 y DEF-005. Se pasaron a la suite
`@known-defect`, que corre en un job aparte que no bloquea el pipeline.

## Detalle por caso

### Web (Chromium y mobile)

| Caso | Escenario | Chromium | Mobile |
| --- | --- | :-: | :-: |
| CP-001 | Inicio de sesión válido | Pasó | Pasó |
| CP-001b | Inicio de sesión con el usuario de demostración | Pasó | - |
| CP-002 | Pago básico con datos válidos | Pasó | Pasó |
| CP-005c | Credenciales vacías | Pasó | - |
| CP-006 | Bill Pay sin sesión | Pasó | - |
| CP-007 | Formulario vacío | Pasó | - |
| CP-008 | Cuenta de verificación distinta | Pasó | - |
| CP-009 | Formatos no numéricos | Pasó (3) | - |
| CP-014 | Cada campo obligatorio vacío | Pasó (9) | - |
| CP-016 | Cerrar sesión invalida el acceso | Pasó | - |
| CP-020 | Monto no interpretable | Pasó | - |

### API (Playwright)

Pasaron CP-001, CP-002/003, CP-004, CP-005, CP-013, CP-015, CP-017 y CP-020.

### Postman / Newman

14 peticiones y 25 aserciones sin fallos en las carpetas 01 a 03.

### Defectos conocidos

| Caso | Herramienta | Resultado obtenido | Defecto |
| --- | --- | --- | --- |
| CP-010 | Web | "Bill Payment Complete" con monto $0.00 | DEF-001 |
| CP-011 | Web | "Bill Payment Complete" con monto $-50.00 | DEF-001 |
| CP-010 | API | HTTP 200 con monto 0 | DEF-001 |
| CP-011 | API | HTTP 200 con monto -50.00 | DEF-001 |
| CP-010 | Postman | HTTP 200, el saldo no cambia | DEF-001 |
| CP-011 | Postman | HTTP 200, el saldo sube de 100.00 a 150.00 | DEF-001 |
| CP-012 | API | HTTP 200 al pagar 1100.00 con saldo 100.00 | DEF-002 |
| CP-012 | Postman | HTTP 200, el saldo baja de 150.00 a -999849.00 | DEF-002 |
| CP-021 | API | HTTP 200 sin credenciales | DEF-003 |
| CP-021 | Postman | HTTP 200 en lugar de 401/403 | DEF-003 |
| CP-005 | Web | Un usuario inexistente o con contraseña incorrecta entra a "Accounts Overview" | DEF-004 |
| CP-003 | Web | El pago se confirma, pero el saldo no baja y no hay movimientos | DEF-005 |
| CP-004 | Web | Igual que CP-003 con monto 0.01 | DEF-005 |
| CP-015 | Web | Igual que CP-003: el saldo no cambia | DEF-005 |

## Intermitencia en CP-002

Durante el diagnóstico, CP-002 falló en cerca de la mitad de las corridas locales: el clic en Send Payment no enviaba
la petición porque el formulario carga datos por AJAX y la prueba llenaba y enviaba en menos de 100 ms. Se corrigió
esperando a que la red se calme (`waitForLoadState('networkidle')`) antes de llenar el formulario en
`BillPayPage.fillForm`. Con ese ajuste pasó 10 de 10 veces.

## Artefactos y capturas

El workflow publica estos artefactos en cada run:

| Artefacto | Contenido |
| --- | --- |
| `reportes-web` | HTML de Playwright, JUnit, JSON, capturas, videos y trazas |
| `reportes-api` | HTML, JUnit y JSON de las pruebas API |
| `reportes-postman` | Reporte htmlextra y JUnit de Newman |
| `reportes-defectos` | Reportes de las pruebas `@known-defect` |

En el repositorio hay una copia ligera: los JUnit en [`reportes/junit/`](reportes/junit) y las capturas en
[`capturas/`](capturas):

| Captura | Caso |
| --- | --- |
| `CP-002-pago-exitoso-desktop.png` y `CP-002-pago-exitoso-mobile.png` | Confirmación del pago en escritorio y en Pixel 7 |
| `CP-007-formulario-vacio.png` | Mensajes de campo obligatorio |
| `CP-008-cuenta-verificacion-distinta.png` | Mensaje "The account numbers do not match." |
| `CP-020-monto-no-interpretable.png` | Error genérico ante el monto `10abc` |
| `DEF-001-web-cp010-monto-cero-aceptado.png` | Pago de $0.00 aceptado |
| `DEF-001-web-cp011-monto-negativo-aceptado.png` | Pago de $-50.00 aceptado |
| `DEF-004-web-cp005-usuario-inexistente-acepta-login.png` | Login web con usuario inexistente |
| `DEF-005-web-cp003-pago-sin-debito.png` | Cuenta sin débito ni movimientos tras un pago confirmado |
