# Pipeline de CI

Workflow: [`.github/workflows/qa-pipeline.yml`](../.github/workflows/qa-pipeline.yml)

## Cuándo corre

- En cada `pull_request` y en cada `push` a `main`.
- Manualmente (`workflow_dispatch`), con la opción de cambiar `base_url` para apuntar a otro ParaBank.
- De lunes a viernes a las 06:00 UTC, para detectar caídas o cambios de la demo aunque no haya commits.

Una ejecución nueva sobre la misma rama cancela la anterior (`concurrency`).

## Jobs

```text
static --+-- api ------------+
         +-- postman --------+-- summary
         +-- web ------------+
         +-- known-defects --+
```

| Job | Qué hace | Bloquea |
| --- | --- | --- |
| `static` | ESLint, TypeScript, Prettier y validación estática del `.jmx` | Sí |
| `api` | Pruebas API con Playwright | Sí |
| `postman` | Colección Postman con Newman, carpetas 01 a 03 | Sí |
| `web` | Pruebas web en Chromium (escritorio y Pixel 7) | Sí |
| `known-defects` | Pruebas `@known-defect` y carpeta 04 de Postman | No (`continue-on-error`) |
| `summary` | Baja los reportes y publica una tabla de resultados en el run | - |

### Por qué `known-defects` no bloquea

Esas pruebas verifican el comportamiento correcto y fallan mientras el defecto exista. Un defecto ya reportado en
[`evidencias/defectos.md`](../evidencias/defectos.md) es un hallazgo conocido, no una regresión. Si bloqueara, nada se
podría integrar hasta que ParaBank lo arregle y los fallos nuevos se mezclarían con los conocidos. El run queda en
verde, pero el job conserva su marca de fallo. Los fallos no se ocultan: el job sigue mostrando cada prueba que falla.

Al final de ese job, `npm run ci:defects` ([`scripts/defects-report.mjs`](../scripts/defects-report.mjs)) cruza los JUnit
con el catálogo [`defectos.json`](defectos.json) y publica en el resumen la lista de defectos abiertos, con un
`warning` por cada uno. Si las pruebas de un defecto pasan, aparece como "Posible corrección": se confirma con otra
ejecución y entonces se retira `@known-defect` y su entrada del catálogo.

## Artefactos

| Artefacto | Contenido |
| --- | --- |
| `reportes-web` | HTML de Playwright con capturas, video y trace de los fallos |
| `reportes-api` | HTML, JUnit y JSON |
| `reportes-postman` | Reporte htmlextra y JUnit |
| `reportes-defectos` | Reportes de las pruebas `@known-defect` |

Para ver el reporte de Playwright: descargar el artefacto, descomprimirlo y correr
`npx playwright show-report <carpeta>/playwright-html`.

## Decisiones

- Un job por tipo de prueba: corren en paralelo y un fallo de API no oculta el resultado de web.
- `npm ci` con caché y la versión de Node de `.nvmrc`.
- Solo Chromium, que es el alcance de la prueba.
- 1 reintento en CI por la inestabilidad de la demo pública. Las pruebas de defectos corren con `--retries=0`.
- Permisos mínimos (`contents: read`) y sin secretos: `john/demo` son credenciales públicas.
