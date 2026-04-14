# PRODUCCION_SAN_LUIS

Proyecto estatico para registrar PRODUCCION SAN LUIS con 3 modulos visuales:
- RECETAS (implementado y conectado a Google Sheets)
- ENTREGADO (implementado y conectado a Google Sheets)
- MERMA (estructura lista)

## Estructura del proyecto
- index.html
- styles.css
- script.js
- Code.gs
- GOOGLE_APPS_SCRIPT.md
- vercel.json

## Google Sheet base
URL:
https://docs.google.com/spreadsheets/d/1jcWH9UD_-bOeDzm8fpn74d-sP3nLHTwD2BUuoqzMvNs/edit?gid=919776879#gid=919776879

## URL publica (Vercel)
https://produccion-san-luis-eh5tihhef-gustavos-projects-cc77f2e0.vercel.app/

## Paso a paso completo (frontend + Excel + Apps Script)

1. Crear hojas dentro del mismo Spreadsheet:
- REGISTROS RECETAS
- PRODUCTOS
- RECETAS
- DESTINO
- ENTREGADO

2. Configurar hoja PRODUCTOS:
- Fila 1:
  - A1: CODIGO
  - B1: DESCRIPCION
  - C1: UM
- Desde A2/C2 en adelante: catalogo de productos.

3. Configurar hoja RECETAS:
- Fila 1:
  - A1: RECETA
- Desde A2 en adelante: nombres de recetas.

4. Configurar hoja DESTINO:
- Fila 1 puede ser cualquier encabezado (por ejemplo DESTINO).
- Desde A2 en adelante: destinos válidos (ejemplo: Tienda, BC).

5. Configurar hoja REGISTROS RECETAS (formato de la imagen):
- A1: Marca Temporal
- B1: Fecha
- C1: Codigos
- D1: Productos
- E1: Unidades
- F1: Receta
- G1: Responsable

6. Configurar hoja ENTREGADO:
- A1: Marca Temporal
- B1: Fecha
- C1: Codigos
- D1: Productos
- E1: Unidad
- F1: Cantidad
- G1: Destino
- H1: Responsable

7. (Opcional en Google Sheets) Si quieres que se vea y funcione como tabla guiada dentro del propio Sheet:
- Validacion para C2:C con rango PRODUCTOS!A2:A
- Formula en D2 para autollenado de producto segun codigo:
  =ARRAYFORMULA(IF(C2:C="","",IFERROR(VLOOKUP(C2:C,PRODUCTOS!A:B,2,FALSE),"")))
- Validacion para F2:F con rango RECETAS!A2:A
- En ENTREGADO, validacion para G2:G con rango DESTINO!A2:A

8. Configurar Apps Script:
- Abre Extensiones > Apps Script
- Copia y pega Code.gs de este proyecto
- Deploy > New deployment > Web app
- Execute as: Me
- Access: Anyone / Anyone with the link
- Copia la URL del Web App

9. Conectar frontend con Apps Script:
- En index.html, cambia:
  window.APPS_SCRIPT_URL = '';
- Por la URL de tu Web App.

10. Probar local:
- Usa un servidor estatico y abre index.html
- Entra a modulo RECETAS
- Pulsa Sincronizar catalogos
- Selecciona producto, receta, fecha y responsable
- Guarda y valida fila nueva en REGISTROS RECETAS
- Entra a modulo ENTREGADO
- Selecciona fecha, producto, cantidad, destino y responsable
- Guarda y valida fila nueva en ENTREGADO

11. Despliegue en Vercel:
- Importa esta carpeta como proyecto
- Framework: Other
- Publica

## Notas
- El modulo RECETAS ya guarda en REGISTROS RECETAS con columnas exactas, incluyendo Unidades (UM) desde PRODUCTOS.
- El modulo ENTREGADO ya guarda en la hoja ENTREGADO y valida destino contra la hoja DESTINO.
- MERMA queda listo visualmente para conectar cuando definas columnas/reglas finales.
