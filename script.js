'use strict';

const CURRENT_APPS_SCRIPT_URL = '';
const APPS_SCRIPT_URL = String(window.APPS_SCRIPT_URL || CURRENT_APPS_SCRIPT_URL || '').trim();

const state = {
  products: [],
  recetas: [],
};

const elements = {
  views: () => document.querySelectorAll('.view'),
  viewTriggers: () => document.querySelectorAll('[data-view-target]'),
  envWarning: document.getElementById('env-warning'),
  syncCatalogsBtn: document.getElementById('sync-catalogs'),
  recetasForm: document.getElementById('recetas-form'),
  recetaProductoSelect: document.getElementById('receta-producto-select'),
  recetaCodigo: document.getElementById('receta-codigo'),
  recetaProducto: document.getElementById('receta-producto'),
  recetaNombreSelect: document.getElementById('receta-nombre-select'),
  toast: document.getElementById('toast'),
};

init();

function init() {
  setupNavigation();
  setupRecetasForm();
  setupCatalogSync();
  toggleEnvWarning(!APPS_SCRIPT_URL);
  if (elements.recetasForm) {
    elements.recetasForm.dataset.requestId = createRequestId();
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

  elements.recetaProductoSelect?.addEventListener('change', () => {
    const selectedCode = elements.recetaProductoSelect.value;
    const product = state.products.find((item) => item.code === selectedCode);
    if (!product) {
      setProductFields('', '');
      return;
    }
    setProductFields(product.code, product.producto);
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
      toggleLoading(submitBtn, true);
      await postData('createReceta', payload);
      showToast('Registro guardado correctamente.', 'success');
      form.reset();
      setProductFields('', '');
      form.dataset.requestId = createRequestId();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el registro.', 'error');
    } finally {
      toggleLoading(submitBtn, false);
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

function setProductFields(code, productName) {
  if (elements.recetaCodigo) elements.recetaCodigo.value = code;
  if (elements.recetaProducto) elements.recetaProducto.value = productName;
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

    state.products = products;
    state.recetas = recetas;

    renderProductOptions();
    renderRecetaOptions();

    if (showToastOnSuccess) {
      showToast('Catalogos sincronizados.', 'success');
    }
  } catch (error) {
    const normalized = normalizeNetworkError(error);
    showToast(normalized.message, 'error');
  }
}

function renderProductOptions() {
  if (!elements.recetaProductoSelect) return;
  const options = [
    '<option value="" selected disabled>Selecciona producto</option>',
    ...state.products.map(
      (item) => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.code)} - ${escapeHtml(item.producto)}</option>`
    ),
  ];
  elements.recetaProductoSelect.innerHTML = options.join('');
}

function renderRecetaOptions() {
  if (!elements.recetaNombreSelect) return;
  const options = [
    '<option value="" selected disabled>Selecciona receta</option>',
    ...state.recetas.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
  ];
  elements.recetaNombreSelect.innerHTML = options.join('');
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

function toggleLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? 'Guardando...' : 'Guardar registro';
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
