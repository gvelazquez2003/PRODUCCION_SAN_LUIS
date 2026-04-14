'use strict';

const CURRENT_APPS_SCRIPT_URL = '';
const APPS_SCRIPT_URL = String(window.APPS_SCRIPT_URL || CURRENT_APPS_SCRIPT_URL || '').trim();

const state = {
  products: [],
  recetas: [],
  destinos: [],
};

const elements = {
  views: () => document.querySelectorAll('.view'),
  viewTriggers: () => document.querySelectorAll('[data-view-target]'),
  envWarning: document.getElementById('env-warning'),
  syncCatalogsBtn: document.getElementById('sync-catalogs'),
  syncCatalogsEntregadoBtn: document.getElementById('sync-catalogs-entregado'),

  recetasForm: document.getElementById('recetas-form'),
  recetaProductoSelect: document.getElementById('receta-producto-select'),
  recetaCodigo: document.getElementById('receta-codigo'),
  recetaProducto: document.getElementById('receta-producto'),
  recetaNombreSelect: document.getElementById('receta-nombre-select'),

  entregadoForm: document.getElementById('entregado-form'),
  entregadoProductoSelect: document.getElementById('entregado-producto-select'),
  entregadoCodigo: document.getElementById('entregado-codigo'),
  entregadoProducto: document.getElementById('entregado-producto'),
  entregadoUnidad: document.getElementById('entregado-unidad'),
  entregadoDestinoSelect: document.getElementById('entregado-destino-select'),

  toast: document.getElementById('toast'),
};

init();

function init() {
  setupNavigation();
  setupCatalogSync();
  setupRecetasForm();
  setupEntregadoForm();
  toggleEnvWarning(!APPS_SCRIPT_URL);

  if (elements.recetasForm) {
    elements.recetasForm.dataset.requestId = createRequestId();
  }
  if (elements.entregadoForm) {
    elements.entregadoForm.dataset.requestId = createRequestId();
  }

  fetchCatalogs();
}

function setupNavigation() {
  elements.viewTriggers().forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const target = trigger.dataset.viewTarget;
      if (!target) return;
      elements.views().forEach((view) => {
        view.classList.toggle('active', view.dataset.view === target);
      });
    });
  });
}

function setupCatalogSync() {
  elements.syncCatalogsBtn?.addEventListener('click', () => fetchCatalogs(true));
  elements.syncCatalogsEntregadoBtn?.addEventListener('click', () => fetchCatalogs(true));

  elements.recetaProductoSelect?.addEventListener('change', () => {
    const selectedCode = String(elements.recetaProductoSelect.value || '').trim();
    const product = state.products.find((item) => item.code === selectedCode);
    if (!product) {
      setRecetaProductFields('', '');
      return;
    }
    setRecetaProductFields(product.code, product.producto);
  });

  elements.entregadoProductoSelect?.addEventListener('change', () => {
    const selectedCode = String(elements.entregadoProductoSelect.value || '').trim();
    const product = state.products.find((item) => item.code === selectedCode);
    if (!product) {
      setEntregadoProductFields('', '', '');
      return;
    }
    setEntregadoProductFields(product.code, product.producto, product.unidad);
  });
}

function setupRecetasForm() {
  const form = elements.recetasForm;
  if (!form) return;

  form.addEventListener('input', () => {
    form.dataset.requestId = createRequestId();
  });

  form.addEventListener('change', () => {
    form.dataset.requestId = createRequestId();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
      return;
    }

    const payload = collectRecetaPayload(form);
    if (!payload) {
      showToast('Selecciona un producto valido del catalogo.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    try {
      toggleLoading(submitBtn, true, 'Guardar registro');
      await postData('createReceta', payload);
      showToast('Registro de receta guardado correctamente.', 'success');
      form.reset();
      setRecetaProductFields('', '');
      form.dataset.requestId = createRequestId();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el registro de receta.', 'error');
    } finally {
      toggleLoading(submitBtn, false, 'Guardar registro');
    }
  });
}

function setupEntregadoForm() {
  const form = elements.entregadoForm;
  if (!form) return;

  form.addEventListener('input', () => {
    form.dataset.requestId = createRequestId();
  });

  form.addEventListener('change', () => {
    form.dataset.requestId = createRequestId();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
      return;
    }

    let payload;
    try {
      payload = collectEntregadoPayload(form);
    } catch (error) {
      showToast(error.message || 'Verifica los datos del formulario ENTREGADO.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    try {
      toggleLoading(submitBtn, true, 'Guardar entregado');
      await postData('createEntregado', payload);
      showToast('Registro de entregado guardado correctamente.', 'success');
      form.reset();
      setEntregadoProductFields('', '', '');
      form.dataset.requestId = createRequestId();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el registro ENTREGADO.', 'error');
    } finally {
      toggleLoading(submitBtn, false, 'Guardar entregado');
    }
  });
}

function collectRecetaPayload(form) {
  const data = new FormData(form);
  const code = String(data.get('codigo') || '').trim();
  const producto = String(data.get('producto') || '').trim();
  if (!code || !producto) return null;

  return {
    fecha: String(data.get('fecha') || '').trim(),
    codigo: code,
    producto,
    receta: String(data.get('receta') || '').trim(),
    responsable: String(data.get('responsable') || '').trim(),
    requestId: getOrCreateRequestId(form),
  };
}

function collectEntregadoPayload(form) {
  const data = new FormData(form);
  const codigo = String(data.get('codigo') || '').trim();
  const producto = String(data.get('producto') || '').trim();
  const unidad = String(data.get('unidad') || '').trim();
  const destino = String(data.get('destino') || '').trim();
  const responsable = String(data.get('responsable') || '').trim();
  const fecha = String(data.get('fecha') || '').trim();
  const cantidad = Number(data.get('cantidad'));

  if (!codigo || !producto || !unidad) {
    throw new Error('Selecciona un producto valido del catalogo PRODUCTOS.');
  }

  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser un numero entero mayor a cero.');
  }

  if (!destino) {
    throw new Error('Selecciona un destino valido.');
  }

  return {
    fecha,
    codigo,
    producto,
    unidad,
    cantidad,
    destino,
    responsable,
    requestId: getOrCreateRequestId(form),
  };
}

function getOrCreateRequestId(form) {
  if (!form.dataset.requestId) {
    form.dataset.requestId = createRequestId();
  }
  return form.dataset.requestId;
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function setRecetaProductFields(code, productName) {
  if (elements.recetaCodigo) elements.recetaCodigo.value = code;
  if (elements.recetaProducto) elements.recetaProducto.value = productName;
}

function setEntregadoProductFields(code, productName, unidad) {
  if (elements.entregadoCodigo) elements.entregadoCodigo.value = code;
  if (elements.entregadoProducto) elements.entregadoProducto.value = productName;
  if (elements.entregadoUnidad) elements.entregadoUnidad.value = unidad;
}

async function fetchCatalogs(showToastOnSuccess = false) {
  if (!APPS_SCRIPT_URL) {
    return;
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getCatalogs`, { cache: 'no-store' });
    const data = await readResponseData(response);
    if (!data.success) {
      throw new Error(data.message || 'No se pudieron sincronizar los catalogos.');
    }

    const products = Array.isArray(data?.data?.products) ? data.data.products : [];
    const recetas = Array.isArray(data?.data?.recetas) ? data.data.recetas : [];
    const destinos = Array.isArray(data?.data?.destinos) ? data.data.destinos : [];

    state.products = products;
    state.recetas = recetas;
    state.destinos = destinos;

    renderProductOptions();
    renderRecetaOptions();
    renderDestinoOptions();

    if (showToastOnSuccess) {
      showToast('Catalogos sincronizados.', 'success');
    }
  } catch (error) {
    const normalized = normalizeNetworkError(error);
    showToast(normalized.message, 'error');
  }
}

function renderProductOptions() {
  const optionRows = state.products.map(
    (item) => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.code)} - ${escapeHtml(item.producto)}</option>`
  );

  renderProductSelect(elements.recetaProductoSelect, optionRows);
  renderProductSelect(elements.entregadoProductoSelect, optionRows);
}

function renderProductSelect(select, optionRows) {
  if (!select) return;
  select.innerHTML = [
    '<option value="" selected disabled>Selecciona producto</option>',
    ...optionRows,
  ].join('');
}

function renderRecetaOptions() {
  if (!elements.recetaNombreSelect) return;
  const options = [
    '<option value="" selected disabled>Selecciona receta</option>',
    ...state.recetas.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
  ];
  elements.recetaNombreSelect.innerHTML = options.join('');
}

function renderDestinoOptions() {
  if (!elements.entregadoDestinoSelect) return;
  const options = [
    '<option value="" selected disabled>Selecciona destino</option>',
    ...state.destinos.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
  ];
  elements.entregadoDestinoSelect.innerHTML = options.join('');
}

async function postData(action, payload) {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Configura primero la URL del Apps Script.');
  }

  let response;
  try {
    response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    });
  } catch (error) {
    throw normalizeNetworkError(error);
  }

  const data = await readResponseData(response);
  if (!data.success) {
    throw new Error(data.message || 'Operacion fallida.');
  }
  return data;
}

async function readResponseData(response) {
  const raw = await response.text();
  const text = raw.trim();
  if (!text) return { success: response.ok };
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text);
  }
}

function normalizeNetworkError(error) {
  if (error instanceof TypeError && /Failed to fetch/i.test(error.message || '')) {
    return new Error('No se pudo conectar con Apps Script. Revisa URL y permisos del despliegue.');
  }
  return error instanceof Error ? error : new Error('Error de red desconocido.');
}

function toggleLoading(button, loading, idleText) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? 'Guardando...' : String(idleText || 'Guardar');
}

function toggleEnvWarning(show) {
  elements.envWarning?.classList.toggle('hidden', !show);
}

let toastTimeout;
function showToast(message, type = 'info') {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.className = `toast show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3200);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
