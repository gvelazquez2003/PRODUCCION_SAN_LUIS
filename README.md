# PRODUCCION_SAN_LUIS

Proyecto estatico para registrar PRODUCCION SAN LUIS con 3 modulos visuales:
- RECETAS (implementado y conectado a Google Sheets)
- ENTREGADO (estructura lista)
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

2. Configurar hoja PRODUCTOS:
- Fila 1:
  - A1: CODIGO
  - B1: DESCRIPCION
- Desde A2/B2 en adelante: catalogo de productos.

3. Configurar hoja RECETAS:
- Fila 1:
  - A1: RECETA
- Desde A2 en adelante: nombres de recetas.

4. Configurar hoja REGISTROS RECETAS (formato de la imagen):
- A1: Marca Temporal
- B1: Fecha
- C1: Codigos
- D1: Productos
- E1: Receta
- F1: Responsable

5. (Opcional en Google Sheets) Si quieres que se vea y funcione como tabla guiada dentro del propio Sheet:
- Validacion para C2:C con rango PRODUCTOS!A2:A
- Formula en D2 para autollenado de producto segun codigo:
  =ARRAYFORMULA(IF(C2:C="","",IFERROR(VLOOKUP(C2:C,PRODUCTOS!A:B,2,FALSE),"")))
- Validacion para E2:E con rango RECETAS!A2:A

6. Configurar Apps Script:
- Abre Extensiones > Apps Script
- Copia y pega Code.gs de este proyecto
- Deploy > New deployment > Web app
- Execute as: Me
- Access: Anyone / Anyone with the link
- Copia la URL del Web App

7. Conectar frontend con Apps Script:
- En index.html, cambia:
  window.APPS_SCRIPT_URL = '';
- Por la URL de tu Web App.

8. Probar local:
- Usa un servidor estatico y abre index.html
- Entra a modulo RECETAS
- Pulsa Sincronizar catalogos
- Selecciona producto, receta, fecha y responsable
- Guarda y valida fila nueva en REGISTROS RECETAS

9. Despliegue en Vercel:
- Importa esta carpeta como proyecto
- Framework: Other
- Publica

## Notas
- El modulo RECETAS ya guarda en REGISTROS RECETAS con columnas exactas.
- ENTREGADO y MERMA quedaron listos visualmente para que al pasarme columnas y reglas te los conecte igual.
