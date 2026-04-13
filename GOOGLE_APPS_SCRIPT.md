# Google Apps Script - PRODUCCION SAN LUIS

1. Abre el Google Sheet de PRODUCCION SAN LUIS.
2. Ve a Extensiones > Apps Script.
3. Sustituye el codigo por el contenido de Code.gs de este proyecto.
4. Guarda y despliega como Web App.
5. Copia la URL del deployment y pegala en index.html.

## Hojas requeridas
- REGISTROS
- PRODUCTOS
- RECETAS

## Mapeo de columnas en REGISTROS
- Marca Temporal
- Fecha
- Codigos
- Productos
- Receta
- Responsable

## Catalogos
- PRODUCTOS: columna A = codigo, columna B = producto.
- RECETAS: columna A = nombre de receta.

## Endpoint disponibles
- GET ?action=getCatalogs
- POST action=createReceta
