const CONFIG = {
  spreadsheetId: '1jcWH9UD_-bOeDzm8fpn74d-sP3nLHTwD2BUuoqzMvNs',
  mainSheetName: 'REGISTROS RECETAS',
  productsSheetName: 'PRODUCTOS',
  recetasSheetName: 'RECETAS',
  timeZone: Session.getScriptTimeZone() || 'America/Caracas',
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
      return buildResponse_(true, { products, recetas }, 'Catalogos sincronizados.');
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
  validateRequired_(payload, ['fecha', 'codigo', 'producto', 'receta', 'responsable']);

  const productsByCode = getProductsByCode_();
  const normalizedCode = normalizeText_(payload.codigo);
  const product = productsByCode[normalizedCode];

  if (!product) {
    throw new Error('El codigo no existe en la hoja PRODUCTOS.');
  }

  const recetaNames = getRecetas_();
  const recetaExists = recetaNames.some((name) => normalizeText_(name) === normalizeText_(payload.receta));
  if (!recetaExists) {
    throw new Error('La receta seleccionada no existe en la hoja RECETAS.');
  }

  const sheet = getOrCreateMainSheet_();
  const timestamp = new Date();
  const row = [
    timestamp,
    payload.fecha,
    product.code,
    product.producto,
    product.unidad,
    String(payload.receta || '').trim(),
    String(payload.responsable || '').trim(),
  ];

  sheet.appendRow(row);
  return { rowInserted: sheet.getLastRow() };
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

function buildResponse_(success, data, message) {
  return ContentService.createTextOutput(
    JSON.stringify({ success, data, message })
  ).setMimeType(ContentService.MimeType.JSON);
}
