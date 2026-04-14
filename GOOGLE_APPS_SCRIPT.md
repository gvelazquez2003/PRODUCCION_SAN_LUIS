# Google Apps Script - PRODUCCION SAN LUIS

1. Abre el Google Sheet de PRODUCCION SAN LUIS.
2. Ve a Extensiones > Apps Script.
3. Sustituye el codigo por el contenido de Code.gs de este proyecto.
4. Guarda y despliega como Web App.
5. Copia la URL del deployment y pegala en index.html.

## Hojas requeridas
- REGISTROS RECETAS
- PRODUCTOS
- RECETAS
- DESTINO
- ENTREGADO

## Mapeo de columnas en REGISTROS RECETAS
- Marca Temporal
- Fecha
- Codigos
- Productos
- Unidades
- Receta
- Responsable

## Mapeo de columnas en ENTREGADO
- Marca Temporal
- Fecha
- Codigos
- Productos
- Unidad
- Cantidad
- Destino
- Responsable

## Catalogos
- PRODUCTOS: columna A = codigo, columna B = descripcion, columna C = UM.
- RECETAS: columna A = nombre de receta.
- DESTINO: columna A = nombre de destino.

## Endpoint disponibles
- GET ?action=getCatalogs
- POST action=createReceta
- POST action=createEntregado
