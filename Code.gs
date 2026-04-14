const CONFIG = {
  spreadsheetId: '1jcWH9UD_-bOeDzm8fpn74d-sP3nLHTwD2BUuoqzMvNs',
  mainSheetName: 'REGISTROS RECETAS',
  entregadoSheetName: 'ENTREGADO',
  productsSheetName: 'PRODUCTOS',
  recetasSheetName: 'RECETAS',
  destinoSheetName: 'DESTINO',
  timeZone: 'America/Caracas',
  columns: {
    timestamp: 1,
    fecha: 2,
    codigo: 3,
    producto: 4,
    unidad: 5,
    receta: 6,
    responsable: 7,
  },
};

function doGet(e) {
  const action = String(e?.parameter?.action || '').toLowerCase();

  try {
    if (action === 'getcatalogs') {
      const products = getProducts_();
      const recetas = getRecetas_();
      const destinos = getDestinos_();
      return buildResponse_(true, { products, recetas, destinos }, 'Catalogos sincronizados.');
    }

    if (!action || action === 'ping') {
      return buildResponse_(true, { ok: true }, 'Servicio disponible.');
    }

    return buildResponse_(false, null, 'Accion GET no soportada.');
  } catch (error) {
    return buildResponse_(false, null, normalizeErrorMessage_(error));
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(5000)) {
      throw new Error('Hay muchas solicitudes en curso. Intenta nuevamente en 5 segundos.');
    }

    const body = parseBody_(e);
    const action = String(body.action || '').toLowerCase();
    const payload = body.payload || {};

    switch (action) {
      case 'createreceta': {
        const result = createReceta_(payload);
        return buildResponse_(true, result, 'Registro guardado en REGISTROS RECETAS.');
      }
      case 'createentregado': {
        const result = createEntregado_(payload);
        return buildResponse_(true, result, 'Registro guardado en ENTREGADO.');
      }
      default:
        return buildResponse_(false, null, 'Accion POST no soportada.');
    }
  } catch (error) {
    return buildResponse_(false, null, normalizeErrorMessage_(error));
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
    }
  }
}

function createReceta_(payload) {
  validateRequired_(payload, ['fecha', 'responsable']);

  const items = normalizeRecetaItems_(payload);
  if (!items.length) {
    throw new Error('Debes enviar al menos un producto en RECETAS.');
  }

  const productsByCode = getProductsByCode_();
  const recetaNames = getRecetas_();
  const recetaMap = recetaNames.reduce((acc, name) => {
    acc[normalizeText_(name)] = name;
    return acc;
  }, {});

  const sheet = getOrCreateMainSheet_();
  const timestamp = buildLocalTimestamp_();
  const fecha = String(payload.fecha || '').trim();
  const responsable = String(payload.responsable || '').trim();

  const rows = items.map((item, index) => {
    validateRequired_(item, ['codigo', 'receta']);

    const product = productsByCode[normalizeText_(item.codigo)];
    if (!product) {
      throw new Error(`El codigo del item ${index + 1} no existe en la hoja PRODUCTOS.`);
    }

    const receta = recetaMap[normalizeText_(item.receta)];
    if (!receta) {
      throw new Error(`La receta del item ${index + 1} no existe en la hoja RECETAS.`);
    }

    return [
      timestamp,
      fecha,
      product.code,
      product.producto,
      product.unidad,
      receta,
      responsable,
    ];
  });

  const lastRow = batchAppendRows_(sheet, rows);
  return { rowInserted: lastRow, rowsInserted: rows.length };
}

function createEntregado_(payload) {
  validateRequired_(payload, ['fecha', 'responsable']);

  const items = normalizeEntregadoItems_(payload);
  if (!items.length) {
    throw new Error('Debes enviar al menos un producto en ENTREGADO.');
  }

  const productsByCode = getProductsByCode_();
  const destinos = getDestinos_();
  const destinoMap = destinos.reduce((acc, name) => {
    acc[normalizeText_(name)] = name;
    return acc;
  }, {});

  const sheet = getOrCreateEntregadoSheet_();
  const timestamp = buildLocalTimestamp_();
  const fecha = String(payload.fecha || '').trim();
  const responsable = String(payload.responsable || '').trim();

  const rows = items.map((item, index) => {
    validateRequired_(item, ['codigo', 'destino', 'cantidad']);

    const product = productsByCode[normalizeText_(item.codigo)];
    if (!product) {
      throw new Error(`El codigo del item ${index + 1} no existe en la hoja PRODUCTOS.`);
    }

    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error(`La cantidad del item ${index + 1} debe ser un numero entero mayor a cero.`);
    }

    const destino = destinoMap[normalizeText_(item.destino)];
    if (!destino) {
      throw new Error(`El destino del item ${index + 1} no existe en la hoja DESTINO.`);
    }

    return [
      timestamp,
      fecha,
      product.code,
      product.producto,
      product.unidad,
      cantidad,
      destino,
      responsable,
    ];
  });

  const lastRow = batchAppendRows_(sheet, rows);
  return { rowInserted: lastRow, rowsInserted: rows.length };
}

function getProducts_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.productsSheetName);
  if (!sheet) {
    throw new Error('No se encontro la hoja PRODUCTOS.');
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  return rows
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      code: String(row[0]).trim(),
      producto: String(row[1]).trim(),
      unidad: String(row[2] || '').trim() || 'UND',
    }));
}

function getProductsByCode_() {
  return getProducts_().reduce((acc, item) => {
    acc[normalizeText_(item.code)] = item;
    return acc;
  }, {});
}

function getRecetas_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.recetasSheetName);
  if (!sheet) {
    throw new Error('No se encontro la hoja RECETAS.');
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  return rows
    .map((row) => String(row[0] || '').trim())
    .filter((name) => Boolean(name));
}

function getDestinos_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.destinoSheetName);
  if (!sheet) {
    throw new Error('No se encontro la hoja DESTINO.');
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const unique = new Map();
  rows.forEach((row) => {
    const name = String(row[0] || '').trim();
    if (!name) return;
    const key = normalizeText_(name);
    if (!unique.has(key)) {
      unique.set(key, name);
    }
  });

  return Array.from(unique.values());
}

function parseBody_(e) {
  if (!e?.postData?.contents) {
    throw new Error('Cuerpo POST vacio.');
  }
  return JSON.parse(e.postData.contents);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId);
}

function getOrCreateMainSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.mainSheetName);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.mainSheetName);
  }

  ensureMainSheetLayout_(sheet);
  return sheet;
}

function getOrCreateEntregadoSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.entregadoSheetName);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.entregadoSheetName);
  }

  ensureEntregadoSheetLayout_(sheet);
  return sheet;
}

function ensureMainSheetLayout_(sheet) {
  const oldHeaders = [
    'Marca Temporal',
    'Fecha',
    'Codigos',
    'Productos',
    'Receta',
    'Responsable',
  ];

  const headers = [
    'Marca Temporal',
    'Fecha',
    'Codigos',
    'Productos',
    'Unidades',
    'Receta',
    'Responsable',
  ];

  const currentRaw = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const current = currentRaw.map((value) => String(value || '').trim());
  const isOldLayout =
    oldHeaders.every((header, index) => current[index] === header) &&
    current[oldHeaders.length] === '';

  if (isOldLayout) {
    migrateOldRecetasLayout_(sheet);
  }

  const range = sheet.getRange(1, 1, 1, headers.length);
  const updatedCurrent = range.getValues()[0];
  const needsUpdate = headers.some((header, index) => String(updatedCurrent[index] || '').trim() !== header);

  if (needsUpdate) {
    range.setValues([headers]);
    range.setFontWeight('bold');
  }

  sheet.setFrozenRows(1);
}

function migrateOldRecetasLayout_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const totalRows = lastRow - 1;
  const currentColG = sheet.getRange(2, CONFIG.columns.responsable, totalRows, 1).getValues();
  const hasColGData = currentColG.some((row) => String(row[0] || '').trim() !== '');
  if (hasColGData) return;

  const oldRecetaResponsable = sheet.getRange(2, 5, totalRows, 2).getValues();
  const migrated = oldRecetaResponsable.map((row) => ['', row[0], row[1]]);
  sheet.getRange(2, 5, totalRows, 3).setValues(migrated);
}

function ensureEntregadoSheetLayout_(sheet) {
  const headers = [
    'Marca Temporal',
    'Fecha',
    'Codigos',
    'Productos',
    'Unidad',
    'Cantidad',
    'Destino',
    'Responsable',
  ];

  const range = sheet.getRange(1, 1, 1, headers.length);
  const current = range.getValues()[0];
  const needsUpdate = headers.some((header, index) => String(current[index] || '').trim() !== header);

  if (needsUpdate) {
    range.setValues([headers]);
    range.setFontWeight('bold');
  }

  sheet.setFrozenRows(1);
}

function validateRequired_(payload, fields) {
  fields.forEach((field) => {
    const value = payload[field];
    const normalized = typeof value === 'string' ? value.trim() : value;
    payload[field] = normalized;

    if (normalized === undefined || normalized === null || normalized === '') {
      throw new Error(`El campo ${field} es obligatorio.`);
    }
  });
}

function normalizeText_(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeErrorMessage_(error) {
  return String(error && error.message ? error.message : error || 'Error interno de Apps Script.');
}

function normalizeRecetaItems_(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length) {
    return items.map((item) => ({
      codigo: String(item?.codigo || '').trim(),
      receta: String(item?.receta || '').trim(),
    }));
  }

  if (payload.codigo || payload.receta) {
    return [{
      codigo: String(payload.codigo || '').trim(),
      receta: String(payload.receta || '').trim(),
    }];
  }

  return [];
}

function normalizeEntregadoItems_(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length) {
    return items.map((item) => ({
      codigo: String(item?.codigo || '').trim(),
      cantidad: item?.cantidad,
      destino: String(item?.destino || '').trim(),
    }));
  }

  if (payload.codigo || payload.cantidad || payload.destino) {
    return [{
      codigo: String(payload.codigo || '').trim(),
      cantidad: payload.cantidad,
      destino: String(payload.destino || '').trim(),
    }];
  }

  return [];
}

function batchAppendRows_(sheet, rows) {
  if (!rows.length) {
    return sheet.getLastRow();
  }

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  return startRow + rows.length - 1;
}

function buildResponse_(success, data, message) {
  return ContentService.createTextOutput(
    JSON.stringify({ success, data, message })
  ).setMimeType(ContentService.MimeType.JSON);
}

function buildLocalTimestamp_() {
  return Utilities.formatDate(new Date(), CONFIG.timeZone, 'd/M/yyyy HH:mm:ss');
}
