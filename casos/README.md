# Casos de prueba - Pago de servicios

Los 21 casos completos (precondiciones, datos, pasos, resultado esperado, prioridad y criterio) están en
[`casos-de-prueba.csv`](casos-de-prueba.csv), que se abre directo en Excel.

## Criterios de aceptación

| ID | Criterio | Casos |
| --- | --- | --- |
| AC-01 | Solo un socio autenticado puede pagar | CP-001, 005, 006, 016, 021 |
| AC-02 | Se completan los datos obligatorios del pago | CP-002, 007, 008, 014 |
| AC-03 | El monto es numérico y mayor que cero | CP-002, 004, 009, 010, 011 |
| AC-04 | Un pago exitoso muestra confirmación y deja un movimiento verificable | CP-002, 003, 015, 017, 019 |
| AC-05 | Un pago rechazado no se muestra como exitoso ni cambia el saldo | CP-007 a 014, 018, 020 |

## Cómo se diseñaron

- Partición de equivalencia y valores límite sobre el monto (válido, 0.01, 0, negativo, no numérico, mayor al saldo).
- Tabla de decisión para la cuenta y su verificación.
- Prioridad según el riesgo: primero lo que mueve dinero o toca seguridad.

## Qué se automatizó y por qué

Se automatizaron los casos que protegen el dinero del socio, se repiten en cada regresión y se pueden correr con
datos propios.

| Caso | Web | API | Postman | Motivo |
| --- | :-: | :-: | :-: | --- |
| CP-001 Login válido | Sí | Sí | Sí | Puerta de entrada, es el smoke |
| CP-002 Pago válido | Sí | Sí | Sí | Flujo crítico |
| CP-003 Movimiento y saldo | Defecto | Sí | Sí | Comprueba el efecto real del pago; en web falla (DEF-005) |
| CP-006 Bill Pay sin sesión | Sí | - | - | Control de acceso |
| CP-008 Cuentas no coinciden | Sí | - | - | Evita pagos a cuentas equivocadas |
| CP-010 / CP-011 Monto 0 y negativo | Sí | Sí | Sí | Riesgo financiero, hay defecto |

El resto de casos también está automatizado, salvo CP-018 (doble envío del formulario) y CP-019 (pago desde una segunda
cuenta), que quedan manuales. La columna "Script" del CSV indica dónde está cada uno.

Los defectos se verifican así: DEF-001 con CP-010 y CP-011, DEF-002 con CP-012, DEF-003 con CP-021, DEF-004 con CP-005 y
DEF-005 con CP-003, CP-004 y CP-015 (en web; por API esos casos pasan).
