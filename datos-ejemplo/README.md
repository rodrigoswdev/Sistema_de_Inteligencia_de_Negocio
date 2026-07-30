# Datos de ejemplo para carga

Estos archivos están preparados para el periodo `2026-07` y usan codificación
UTF-8.

## Cómo utilizarlos

1. Inicie sesión como `ADMINISTRADOR` o `ANALISTA_BI`.
2. Abra **Cargas**.
3. Seleccione el módulo que corresponda al archivo.
4. Seleccione el periodo **julio de 2026 (`2026-07`)**.
5. Seleccione el archivo CSV y pulse **Validar y consolidar**.
6. Compruebe que el historial muestre `COMPLETADA`, cero errores y 100% de
   calidad.

No abra y vuelva a guardar los archivos con una configuración regional que
reemplace el punto decimal por coma. Si edita los datos en Excel, guárdelos
como **CSV UTF-8 (delimitado por comas)**.

## Reglas importantes

- La fecha debe usar `AAAA-MM-DD` y pertenecer al periodo seleccionado.
- No cambie los nombres de las columnas.
- Use punto para decimales: `1250.50`.
- No incluya símbolos monetarios dentro de los importes.
- Los códigos identifican dimensiones reutilizables: producto, sucursal,
  canal, cuenta, KPI y unidad.
- En Ventas no repita la combinación `documento + producto_codigo`.
- En Finanzas no repita `fecha + cuenta_codigo + centro_costo_codigo +
  escenario_codigo`.
- En Desempeño no repita `fecha + kpi_codigo + unidad_codigo`.

## Archivos

- `ventas_2026-07.csv`: 10 movimientos comerciales.
- `finanzas_2026-07.csv`: 10 movimientos reales y presupuestados.
- `desempeno_2026-07.csv`: 10 mediciones de KPI.
