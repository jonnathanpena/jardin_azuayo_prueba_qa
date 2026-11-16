# Colección Postman

| Archivo | Contenido |
| --- | --- |
| `ParaBank-BillPay.postman_collection.json` | Colección v2.1 con las peticiones encadenadas y sus `pm.test` |
| `ParaBank.postman_environment.json` | Entorno de la demo pública (`apiUrl`, `username`, `password`) |

## Carpetas

| Carpeta | Qué valida | Casos |
| --- | --- | --- |
| `01-preparacion` | Login, cuentas del cliente, creación de una cuenta CHECKING y saldo inicial | CP-001 |
| `02-pago-servicios-positivos` | Pago válido, saldo descontado, débito en el historial y búsqueda por monto | CP-002, CP-003, CP-017 |
| `03-pago-servicios-negativos` | Login inválido, cuenta inexistente y monto no numérico | CP-005, CP-013, CP-020 |
| `04-defectos-conocidos` | Monto 0, monto negativo, sobregiro y consulta sin autenticación | CP-010, CP-011, CP-012, CP-021 |

La carpeta 04 tiene las reglas que ParaBank no cumple (ver [`defectos.md`](../../evidencias/defectos.md)). Se ejecuta
aparte para que un defecto conocido no bloquee la suite principal.

## Ejecución

```bash
npm run test:postman          # carpetas 01, 02 y 03
npm run test:postman:defects  # carpetas 01 y 04
```

En Postman: importar los dos archivos, elegir el entorno de la demo pública y correr la colección desde el Collection
Runner, siempre empezando por `01-preparacion`.

## Decisiones

- Cada ejecución crea su propia cuenta, porque otras personas mueven el saldo de `john` en la demo.
- Los saldos se comparan en centavos para evitar errores de coma flotante.
- Los casos negativos validan `>= 400` y no un código exacto, porque el servicio no publica un contrato de errores.
