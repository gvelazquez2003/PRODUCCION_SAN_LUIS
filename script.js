'use strict';

const CURRENT_APPS_SCRIPT_URL = '';
const APPS_SCRIPT_URL = String(window.APPS_SCRIPT_URL || CURRENT_APPS_SCRIPT_URL || '').trim();

const state = {
  products: [],
  recetas: [],
  destinos: [],
  motivosMerma: [],
  recetaItems: [],
  entregadoItems: [],
  mermaItems: [],
};

const elements = {
  views: () => document.querySelectorAll('.view'),
  viewTriggers: () => document.querySelectorAll('[data-view-target]'),
  envWarning: document.getElementById('env-warning'),
  syncCatalogsBtn: document.getElementById('sync-catalogs'),
  syncCatalogsEntregadoBtn: document.getElementById('sync-catalogs-entregado'),
  syncCatalogsMermaBtn: document.getElementById('sync-catalogs-merma'),

  recetasForm: document.getElementById('recetas-form'),
  recetaItemProductoSelect: document.getElementById('receta-item-producto-select'),
  recetaItemRecetaSelect: document.getElementById('receta-item-receta-select'),
  addRecetaItemBtn: document.getElementById('add-receta-item'),
  recetasItemsBody: document.getElementById('recetas-items-body'),
  recetasItemsWrap: document.getElementById('recetas-items-wrap'),
  recetasItemsEmpty: document.getElementById('recetas-items-empty'),
  recetasItemsTable: document.getElementById('recetas-items-table'),

  entregadoForm: document.getElementById('entregado-form'),
  entregadoItemProductoSelect: document.getElementById('entregado-item-producto-select'),
  entregadoItemCantidad: document.getElementById('entregado-item-cantidad'),
  entregadoItemDestinoSelect: document.getElementById('entregado-item-destino-select'),
  addEntregadoItemBtn: document.getElementById('add-entregado-item'),
  entregadoItemsBody: document.getElementById('entregado-items-body'),
  entregadoItemsWrap: document.getElementById('entregado-items-wrap'),
  entregadoItemsEmpty: document.getElementById('entregado-items-empty'),
  entregadoItemsTable: document.getElementById('entregado-items-table'),

  mermaForm: document.getElementById('merma-form'),
  mermaItemProductoSelect: document.getElementById('merma-item-producto-select'),
  mermaItemCantidad: document.getElementById('merma-item-cantidad'),
  mermaItemMotivoSelect: document.getElementById('merma-item-motivo-select'),
  addMermaItemBtn: document.getElementById('add-merma-item'),
  mermaItemsBody: document.getElementById('merma-items-body'),
  mermaItemsWrap: document.getElementById('merma-items-wrap'),
  mermaItemsEmpty: document.getElementById('merma-items-empty'),
  mermaItemsTable: document.getElementById('merma-items-table'),

  toast: document.getElementById('toast'),
};

init();

function init() {
  setupNavigation();
  setupCatalogSync();
  setupRecetasForm();
  setupEntregadoForm();
  setupMermaForm();
  toggleEnvWarning(!APPS_SCRIPT_URL);

  if (elements.recetasForm) {
    elements.recetasForm.dataset.requestId = createRequestId();
  }
  if (elements.entregadoForm) {
    elements.entregadoForm.dataset.requestId = createRequestId();
  }
  if (elements.mermaForm) {
    elements.mermaForm.dataset.requestId = createRequestId();
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
  elements.syncCatalogsMermaBtn?.addEventListener('click', () => fetchCatalogs(true));
}

function setupRecetasForm() {
  const form = elements.recetasForm;
  if (!form) return;

  elements.addRecetaItemBtn?.addEventListener('click', addRecetaItem);

  elements.recetasItemsTable?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-receta-item]');
    if (!button) return;
    const itemId = String(button.dataset.removeRecetaItem || '');
    if (!itemId) return;
    state.recetaItems = state.recetaItems.filter((item) => item.id !== itemId);
    renderRecetaItems();
  });

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

    if (!state.recetaItems.length) {
      showToast('Agrega al menos un producto para RECETAS.', 'error');
      return;
    }

    const payload = collectRecetaPayload(form);

    const submitBtn = form.querySelector('button[type="submit"]');
    try {
      toggleLoading(submitBtn, true, 'Guardar registro');
      await postData('createReceta', payload);
      showToast('Registro de receta guardado correctamente.', 'success');
      clearRecetaItems();
      resetRecetaLineInputs();
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

  elements.addEntregadoItemBtn?.addEventListener('click', addEntregadoItem);

  elements.entregadoItemsTable?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-entregado-item]');
    if (!button) return;
    const itemId = String(button.dataset.removeEntregadoItem || '');
    if (!itemId) return;
    state.entregadoItems = state.entregadoItems.filter((item) => item.id !== itemId);
    renderEntregadoItems();
  });

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

    if (!state.entregadoItems.length) {
      showToast('Agrega al menos un producto para ENTREGADO.', 'error');
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
      clearEntregadoItems();
      resetEntregadoLineInputs();
      form.dataset.requestId = createRequestId();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el registro ENTREGADO.', 'error');
    } finally {
      toggleLoading(submitBtn, false, 'Guardar entregado');
    }
  });
}

function setupMermaForm() {
  const form = elements.mermaForm;
  if (!form) return;

  elements.addMermaItemBtn?.addEventListener('click', addMermaItem);

  elements.mermaItemsTable?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-merma-item]');
    if (!button) return;
    const itemId = String(button.dataset.removeMermaItem || '');
    if (!itemId) return;
    state.mermaItems = state.mermaItems.filter((item) => item.id !== itemId);
    renderMermaItems();
  });

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

    if (!state.mermaItems.length) {
      showToast('Agrega al menos un producto para MERMA.', 'error');
      return;
    }

    let payload;
    try {
      payload = collectMermaPayload(form);
    } catch (error) {
      showToast(error.message || 'Verifica los datos del formulario MERMA.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    try {
      toggleLoading(submitBtn, true, 'Guardar merma');
      await postData('createMerma', payload);
      showToast('Registro de merma guardado correctamente.', 'success');
      clearMermaItems();
      resetMermaLineInputs();
      form.dataset.requestId = createRequestId();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el registro MERMA.', 'error');
    } finally {
      toggleLoading(submitBtn, false, 'Guardar merma');
    }
  });
}

function collectRecetaPayload(form) {
  const data = new FormData(form);
  return {
    fecha: String(data.get('fecha') || '').trim(),
    responsable: String(data.get('responsable') || '').trim(),
    items: state.recetaItems.map((item) => ({
      codigo: item.codigo,
      receta: item.receta,
    })),
    requestId: getOrCreateRequestId(form),
  };
}

function collectEntregadoPayload(form) {
  const data = new FormData(form);
  const responsable = String(data.get('responsable') || '').trim();
  const fecha = String(data.get('fecha') || '').trim();

  return {
    fecha,
    responsable,
    items: state.entregadoItems.map((item) => ({
      codigo: item.codigo,
      cantidad: item.cantidad,
      destino: item.destino,
    })),
    requestId: getOrCreateRequestId(form),
  };
}

function collectMermaPayload(form) {
  const data = new FormData(form);
  const responsable = String(data.get('responsable') || '').trim();
  const fecha = String(data.get('fecha') || '').trim();

  return {
    fecha,
    responsable,
    items: state.mermaItems.map((item) => ({
      codigo: item.codigo,
      cantidad: item.cantidad,
      motivoMerma: item.motivoMerma,
    })),
    requestId: getOrCreateRequestId(form),
  };
}

function addRecetaItem() {
  const code = String(elements.recetaItemProductoSelect?.value || '').trim();
  const receta = String(elements.recetaItemRecetaSelect?.value || '').trim();

  if (!code) {
    showToast('Selecciona un producto para agregar.', 'error');
    return;
  }
  if (!receta) {
    showToast('Selecciona una receta para el producto.', 'error');
    return;
  }

  const product = state.products.find((item) => item.code === code);
  if (!product) {
    showToast('Producto no encontrado en catalogo.', 'error');
    return;
  }

  state.recetaItems.push({
    id: createLineItemId(),
    codigo: product.code,
    producto: product.producto,
    unidad: product.unidad,
    receta,
  });

  renderRecetaItems();
  resetRecetaLineInputs();
}

function addEntregadoItem() {
  const code = String(elements.entregadoItemProductoSelect?.value || '').trim();
  const cantidad = Number(elements.entregadoItemCantidad?.value || '');
  const destino = String(elements.entregadoItemDestinoSelect?.value || '').trim();

  if (!code) {
    showToast('Selecciona un producto para agregar.', 'error');
    return;
  }

  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
    showToast('La cantidad debe ser un numero entero mayor a cero.', 'error');
    return;
  }

  if (!destino) {
    showToast('Selecciona un destino valido.', 'error');
    return;
  }

  const product = state.products.find((item) => item.code === code);
  if (!product) {
    showToast('Producto no encontrado en catalogo.', 'error');
    return;
  }

  state.entregadoItems.push({
    id: createLineItemId(),
    codigo: product.code,
    producto: product.producto,
    unidad: product.unidad,
    cantidad,
    destino,
  });

  renderEntregadoItems();
  resetEntregadoLineInputs();
}

function addMermaItem() {
  const code = String(elements.mermaItemProductoSelect?.value || '').trim();
  const cantidad = Number(elements.mermaItemCantidad?.value || '');
  const motivoMerma = String(elements.mermaItemMotivoSelect?.value || '').trim();

  if (!code) {
    showToast('Selecciona un producto para agregar.', 'error');
    return;
  }

  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
    showToast('La cantidad debe ser un numero entero mayor a cero.', 'error');
    return;
  }

  if (!motivoMerma) {
    showToast('Selecciona un motivo de merma valido.', 'error');
    return;
  }

  const product = state.products.find((item) => item.code === code);
  if (!product) {
    showToast('Producto no encontrado en catalogo.', 'error');
    return;
  }

  state.mermaItems.push({
    id: createLineItemId(),
    codigo: product.code,
    producto: product.producto,
    unidad: product.unidad,
    cantidad,
    motivoMerma,
  });

  renderMermaItems();
  resetMermaLineInputs();
}

function renderRecetaItems() {
  if (!elements.recetasItemsBody || !elements.recetasItemsWrap || !elements.recetasItemsEmpty) return;

  if (!state.recetaItems.length) {
    elements.recetasItemsBody.innerHTML = '';
    elements.recetasItemsWrap.classList.add('hidden');
    elements.recetasItemsEmpty.classList.remove('hidden');
    return;
  }

  elements.recetasItemsBody.innerHTML = state.recetaItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.codigo)}</td>
      <td>${escapeHtml(item.producto)}</td>
      <td>${escapeHtml(item.unidad)}</td>
      <td>${escapeHtml(item.receta)}</td>
      <td><button type="button" class="btn btn--ghost btn--small" data-remove-receta-item="${escapeHtml(item.id)}">Quitar</button></td>
    </tr>
  `).join('');

  elements.recetasItemsWrap.classList.remove('hidden');
  elements.recetasItemsEmpty.classList.add('hidden');
}

function renderEntregadoItems() {
  if (!elements.entregadoItemsBody || !elements.entregadoItemsWrap || !elements.entregadoItemsEmpty) return;

  if (!state.entregadoItems.length) {
    elements.entregadoItemsBody.innerHTML = '';
    elements.entregadoItemsWrap.classList.add('hidden');
    elements.entregadoItemsEmpty.classList.remove('hidden');
    return;
  }

  elements.entregadoItemsBody.innerHTML = state.entregadoItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.codigo)}</td>
      <td>${escapeHtml(item.producto)}</td>
      <td>${escapeHtml(item.unidad)}</td>
      <td>${escapeHtml(item.cantidad)}</td>
      <td>${escapeHtml(item.destino)}</td>
      <td><button type="button" class="btn btn--ghost btn--small" data-remove-entregado-item="${escapeHtml(item.id)}">Quitar</button></td>
    </tr>
  `).join('');

  elements.entregadoItemsWrap.classList.remove('hidden');
  elements.entregadoItemsEmpty.classList.add('hidden');
}

function renderMermaItems() {
  if (!elements.mermaItemsBody || !elements.mermaItemsWrap || !elements.mermaItemsEmpty) return;

  if (!state.mermaItems.length) {
    elements.mermaItemsBody.innerHTML = '';
    elements.mermaItemsWrap.classList.add('hidden');
    elements.mermaItemsEmpty.classList.remove('hidden');
    return;
  }

  elements.mermaItemsBody.innerHTML = state.mermaItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.codigo)}</td>
      <td>${escapeHtml(item.producto)}</td>
      <td>${escapeHtml(item.unidad)}</td>
      <td>${escapeHtml(item.cantidad)}</td>
      <td>${escapeHtml(item.motivoMerma)}</td>
      <td><button type="button" class="btn btn--ghost btn--small" data-remove-merma-item="${escapeHtml(item.id)}">Quitar</button></td>
    </tr>
  `).join('');

  elements.mermaItemsWrap.classList.remove('hidden');
  elements.mermaItemsEmpty.classList.add('hidden');
}

function clearRecetaItems() {
  state.recetaItems = [];
  renderRecetaItems();
}

function clearEntregadoItems() {
  state.entregadoItems = [];
  renderEntregadoItems();
}

function clearMermaItems() {
  state.mermaItems = [];
  renderMermaItems();
}

function resetRecetaLineInputs() {
  if (elements.recetaItemProductoSelect) elements.recetaItemProductoSelect.selectedIndex = 0;
  if (elements.recetaItemRecetaSelect) elements.recetaItemRecetaSelect.selectedIndex = 0;
}

function resetEntregadoLineInputs() {
  if (elements.entregadoItemProductoSelect) elements.entregadoItemProductoSelect.selectedIndex = 0;
  if (elements.entregadoItemCantidad) elements.entregadoItemCantidad.value = '';
  if (elements.entregadoItemDestinoSelect) elements.entregadoItemDestinoSelect.selectedIndex = 0;
}

function resetMermaLineInputs() {
  if (elements.mermaItemProductoSelect) elements.mermaItemProductoSelect.selectedIndex = 0;
  if (elements.mermaItemCantidad) elements.mermaItemCantidad.value = '';
  if (elements.mermaItemMotivoSelect) elements.mermaItemMotivoSelect.selectedIndex = 0;
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

function createLineItemId() {
  return `itm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    const motivosMerma = Array.isArray(data?.data?.motivosMerma) ? data.data.motivosMerma : [];

    state.products = products;
    state.recetas = recetas;
    state.destinos = destinos;
    state.motivosMerma = motivosMerma;

    renderProductOptions();
    renderRecetaOptions();
    renderDestinoOptions();
    renderMotivosMermaOptions();

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

  renderProductSelect(elements.recetaItemProductoSelect, optionRows);
  renderProductSelect(elements.entregadoItemProductoSelect, optionRows);
  renderProductSelect(elements.mermaItemProductoSelect, optionRows);
}

function renderProductSelect(select, optionRows) {
  if (!select) return;
  select.innerHTML = [
    '<option value="" selected disabled>Selecciona producto</option>',
    ...optionRows,
  ].join('');
}

function renderRecetaOptions() {
  if (!elements.recetaItemRecetaSelect) return;
  const options = [
    '<option value="" selected disabled>Selecciona receta</option>',
    ...state.recetas.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
  ];
  elements.recetaItemRecetaSelect.innerHTML = options.join('');
}

function renderDestinoOptions() {
  if (!elements.entregadoItemDestinoSelect) return;
  const options = [
    '<option value="" selected disabled>Selecciona destino</option>',
    ...state.destinos.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
  ];
  elements.entregadoItemDestinoSelect.innerHTML = options.join('');
}

function renderMotivosMermaOptions() {
  if (!elements.mermaItemMotivoSelect) return;
  const options = [
    '<option value="" selected disabled>Selecciona motivo</option>',
    ...state.motivosMerma.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
  ];
  elements.mermaItemMotivoSelect.innerHTML = options.join('');
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
