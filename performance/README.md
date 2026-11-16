# Plan de rendimiento con JMeter

El plan está armado y validado, pero **no se ejecutó carga contra ParaBank**, como pide el enunciado. Para correrlo hay
que apuntarlo a un entorno propio con `-Jhost=...`.

| Archivo | Contenido |
| --- | --- |
| [`parabank-transacciones.jmx`](parabank-transacciones.jmx) | Plan con un escenario base y cinco escalones incrementales |
| [`data/accounts.csv`](data/accounts.csv) | Cuentas a consultar |
| [`scripts/validate-jmx.mjs`](scripts/validate-jmx.mjs) | Validación estática (`npm run jmx:validate`) |
| [`analisis-datos-simulados.md`](analisis-datos-simulados.md) | Análisis de los datos simulados del enunciado |

## Endpoint elegido

`GET /parabank/services/bank/accounts/{accountId}/transactions`

- **Frecuencia:** se consulta después de cada pago para verificar el movimiento y cada vez que el socio abre la
  actividad de su cuenta.
- **Importancia:** es la prueba que tiene el socio de que su pago se aplicó. Si falla, genera reclamos.
- **Riesgo:** la respuesta crece con el historial y no tiene paginación, así que se degrada con el uso.
- **Seguridad para probar:** es de solo lectura, no cambia saldos ni ensucia datos.

Se descartó `POST /billpay` porque cada iteración crearía movimientos reales.

## Escenarios

| Escenario | Usuarios | Ramp-up | Iteraciones por usuario |
| --- | --- | --- | --- |
| Base | 5 | 10 s | 20 |
| Incremental, escalón 1 | 5 | 10 s | 20 |
| Incremental, escalón 2 | 10 | 10 s | 20 |
| Incremental, escalón 3 | 15 | 10 s | 20 |
| Incremental, escalón 4 | 20 | 10 s | 20 |
| Incremental, escalón 5 | 25 | 10 s | 20 |

La carga incremental es una escalera: cada escalón es un Thread Group con su etiqueta, y arranca cuando termina el
anterior. Así el reporte tiene una fila por escalón y se ve con cuántos usuarios empieza la degradación. Entre
iteraciones hay una espera aleatoria de 0.5 a 1.5 s para simular la lectura del socio.

## Elementos del plan

- Variables y *HTTP Request Defaults* (protocolo, host, puerto y ruta base, todo sobreescribible con `-J`).
- *HTTP Header Manager* con `Accept: application/json` (sin esto ParaBank responde XML).
- *CSV Data Set Config* con `data/accounts.csv`.
- Aserciones: código 200, JSON válido y *Duration Assertion* con el SLA (2000 ms).
- Listeners: Summary Report y Aggregate Report. El *View Results Tree* queda deshabilitado, solo para depurar.

## Parámetros principales (`-J`)

| Propiedad | Por defecto |
| --- | --- |
| `protocol`, `host`, `port`, `basePath` | `https`, `parabank.parasoft.com`, vacío, `/parabank/services/bank` |
| `base.users`, `base.rampup`, `base.loops` | 5, 10, 20 |
| `inc.increment`, `inc.rampup`, `inc.loops` | 5, 10, 20 (usuarios que suma cada escalón) |
| `inc.stepN.users` | opcional, fija los usuarios de un escalón; con 0 se omite |
| `sla.ms` | 2000 |

## Métricas a revisar

| Métrica | Umbral propuesto | Dónde verla |
| --- | --- | --- |
| Tiempo promedio | menor a 800 ms | Aggregate Report, columna Average |
| Percentil 95 | menor a 2000 ms | Aggregate Report, columna 95% Line |
| Throughput | al menos 10 req/s en el escalón 5 | Aggregate Report, columna Throughput |
| Porcentaje de errores | menor a 1 % | Aggregate Report, columna Error % |

Los umbrales de tiempo y errores aplican a cada escalón. Son una propuesta inicial; en un proyecto real se acuerdan con
negocio y operaciones. El punto de quiebre es el primer escalón que incumple un umbral. Si el promedio y el p95 suben,
el throughput deja de crecer y aparecen errores, el sistema está saturado.

## Ejecución

Requisitos: Java 8 o superior y JMeter 5.6.x en el `PATH`.

```bash
# Validación estática, sin carga
npm run jmx:validate

# Ejecución real contra un entorno propio, con dashboard HTML
jmeter -n -t performance/parabank-transacciones.jmx \
  -Jprotocol=http -Jhost=localhost -Jport=8080 \
  -l performance/results/resultados.jtl \
  -e -o performance/results/dashboard
```

La carpeta de `-o` debe estar vacía o no existir. Un ParaBank propio se puede levantar con
`docker run -d -p 8080:8080 parasoft/parabank`.

## Consideraciones

- La demo pública es compartida y se reinicia, así que los resultados no serían representativos y la carga afectaría a
  otras personas.
- Las cuentas del CSV deben existir en el entorno objetivo.
- El generador de carga y el servidor deberían estar en máquinas distintas.
