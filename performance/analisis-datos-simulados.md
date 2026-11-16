# Análisis de los datos simulados

Los valores los entrega el enunciado como datos simulados. No vienen de una ejecución del plan
[`parabank-transacciones.jmx`](parabank-transacciones.jmx).

| Métrica | 5 usuarios | 10 usuarios |
| --- | --- | --- |
| Tiempo promedio | 450 ms | 1800 ms |
| Errores | 0 % | 8 % |

Contra los umbrales del [plan](README.md#métricas-a-revisar), con 5 usuarios todo está dentro de lo esperado. Con 10 el
promedio es 2.25 veces el umbral de 800 ms y los errores son 8 veces el 1 % aceptado.

## Riesgos que veo

1. **No escala de forma lineal.** Al duplicar los usuarios el promedio se multiplica por cuatro. Parece que algún
   recurso se satura: pool de conexiones a la base de datos, hilos del servidor o bloqueos.
2. **Los errores aparecen con la degradación.** Un 8 % significa que más o menos 1 de cada 12 consultas falla. Con un
   promedio de 1.8 s es probable que el p95 pase el SLA de 2 s y que parte de los errores sean timeouts o 5xx por
   saturación.
3. **El impacto es mayor que lo que muestran los números.** Si el socio no puede ver su movimiento después de pagar,
   puede reintentar el pago (riesgo de pago duplicado) o llamar al call center.
4. **El promedio esconde la cola.** Hace falta ver p90, p95 y p99, y cómo se distribuyen los errores en el tiempo.

## Qué investigaría

- Clasificar los errores por código HTTP, mensaje y momento de la rampa, desde el `.jtl`.
- Revisar CPU, memoria, hilos y pool de conexiones del servidor durante la prueba.
- Revisar el plan de ejecución de la consulta de movimientos y sus índices.
- Evaluar paginación en el endpoint.
- Repetir el escenario incremental con más escalones para ubicar el punto de quiebre.

## Decisión

No aprobaría el despliegue. Con 10 usuarios incumple tanto el tiempo de respuesta como la tasa de errores, y se trata de
una operación financiera. Lo reconsideraría si en dos ejecuciones seguidas del escenario incremental el promedio es
menor a 800 ms, el p95 menor a 2 s y los errores menores a 1 %.
