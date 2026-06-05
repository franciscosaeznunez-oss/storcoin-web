const TOKEN_KEY = 'storcoin_token';
const token = localStorage.getItem(TOKEN_KEY);
if (!token) window.location.href = '/admin/login.html';

const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function authH() { return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

async function authFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authH(), ...(options.headers || {}) } });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/admin/login.html';
  }
  return res;
}

async function authUpload(fd) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: fd,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/admin/login.html';
    return null;
  }
  return res;
}

let allProducts = [];
let deletingId = null;
let currentImageUrl = null;
let isOffer = false;

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sec = link.dataset.section;
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    ['dashboard', 'products', 'banners', 'config'].forEach(s => {
      document.getElementById(`section-${s}`).style.display = s === sec ? 'block' : 'none';
    });
    if (sec === 'dashboard') loadDashboard();
    if (sec === 'products') loadProducts();
    if (sec === 'banners') loadSlides();
    if (sec === 'config') loadConfig();
    document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/admin/login.html';
});

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const [pRes, cRes] = await Promise.all([
      fetch('/api/products', { headers: authH() }),
      fetch('/api/products/categories'),
    ]);
    const products = await pRes.json();
    const categories = await cRes.json();
    document.getElementById('stat-total').textContent = products.length;
    document.getElementById('stat-offers').textContent = products.filter(p => p.is_offer).length;
    document.getElementById('stat-cats').textContent = categories.length;
    const tbody = document.getElementById('recentBody');
    tbody.innerHTML = products.slice(0, 8).map(p => `
      <tr>
        <td>${p.image_url ? `<img class="td-img" src="${p.image_url}" alt="" />` : `<div class="td-img-placeholder">📦</div>`}</td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>$${Number(p.price).toLocaleString('es-AR')}</td>
        <td>${p.is_offer ? '<span class="badge badge-red">Oferta</span>' : '<span class="badge badge-gray">Normal</span>'}</td>
      </tr>`).join('');
  } catch (e) { console.error(e); }
}

// ===== PRODUCTS =====
async function loadProducts() {
  const res = await fetch('/api/products');
  allProducts = await res.json();
  const catRes = await fetch('/api/products/categories');
  const cats = await catRes.json();
  const filterCat = document.getElementById('filterCat');
  filterCat.innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
  renderProductsTable(allProducts);
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsBody');
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#7f8c8d;padding:32px">No hay productos. ¡Agregá el primero!</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${p.image_url ? `<img class="td-img" src="${p.image_url}" alt="" />` : `<div class="td-img-placeholder">📦</div>`}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-green">${p.category}</span></td>
      <td>
        ${p.is_offer && p.offer_price
          ? `<span style="text-decoration:line-through;color:#7f8c8d;font-size:.8rem">$${Number(p.price).toLocaleString('es-AR')}</span><br>
             <strong style="color:#27ae60">$${Number(p.offer_price).toLocaleString('es-AR')}</strong>`
          : `$${Number(p.price).toLocaleString('es-AR')}`}
      </td>
      <td>${p.is_offer ? '<span class="badge badge-red">🔥 Oferta</span>' : '<span class="badge badge-gray">Normal</span>'}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-outline btn-sm" onclick="openEdit(${p.id})">✏️ Editar</button>
          <button class="btn btn-red btn-sm" onclick="confirmDelete(${p.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('searchInput').addEventListener('input', applyFilter);
document.getElementById('filterCat').addEventListener('change', applyFilter);
function applyFilter() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('filterCat').value;
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(q) &&
    (!cat || p.category === cat)
  );
  renderProductsTable(filtered);
}

// ===== MODAL PRODUCT =====
function openModal(title = 'Agregar producto') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('productModal').classList.add('open');
}
function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('uploadPreview').innerHTML = '';
  document.getElementById('productError').textContent = '';
  document.getElementById('pWholesalePrice').value = '';
  document.getElementById('pMinWholesaleQty').value = '';
  currentImageUrl = null;
  isOffer = false;
  setOfferToggle(false);
}

document.getElementById('btnAddProduct').addEventListener('click', () => openModal());
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('productModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('productModal')) closeModal();
});

function openEdit(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('productId').value = p.id;
  document.getElementById('pName').value = p.name;
  document.getElementById('pCategory').value = p.category;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pDesc').value = p.description || '';
  document.getElementById('pOfferPrice').value = p.offer_price || '';
  document.getElementById('pWholesalePrice').value = p.wholesale_price || '';
  document.getElementById('pMinWholesaleQty').value = p.min_wholesale_qty || '';
  currentImageUrl = p.image_url || null;
  if (p.image_url) {
    document.getElementById('uploadPreview').innerHTML = `<img src="${p.image_url}" />`;
  }
  setOfferToggle(!!p.is_offer);
  openModal('Editar producto');
}

// ===== OFFER TOGGLE =====
function setOfferToggle(val) {
  isOffer = val;
  const btn = document.getElementById('offerToggle');
  btn.classList.toggle('on', val);
  document.getElementById('offerSection').classList.toggle('show', val);
}
document.getElementById('offerToggle').addEventListener('click', () => setOfferToggle(!isOffer));

// ===== FILE UPLOAD =====
document.getElementById('uploadArea').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('uploadPreview');
  preview.innerHTML = '<p style="font-size:.85rem;color:#7f8c8d">Subiendo imagen...</p>';
  try {
    const fd = new FormData();
    fd.append('image', file);
    const res = await authUpload(fd);
    if (!res) return;
    let data; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);
    currentImageUrl = data.url;
    preview.innerHTML = `<img src="${data.url}" />`;
  } catch (err) {
    preview.innerHTML = `<p style="color:red;font-size:.85rem">${err.message}</p>`;
  }
});

// ===== SAVE PRODUCT =====
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('saveBtn');
  const errEl = document.getElementById('productError');
  saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; errEl.textContent = '';

  const id = document.getElementById('productId').value;
  const wholesalePrice = document.getElementById('pWholesalePrice').value;
  const minWholesaleQty = document.getElementById('pMinWholesaleQty').value;
  const body = {
    name: document.getElementById('pName').value,
    category: document.getElementById('pCategory').value,
    price: document.getElementById('pPrice').value,
    description: document.getElementById('pDesc').value,
    is_offer: isOffer,
    offer_price: isOffer ? document.getElementById('pOfferPrice').value : null,
    image_url: currentImageUrl,
    wholesale_price: wholesalePrice ? Number(wholesalePrice) : null,
    min_wholesale_qty: minWholesaleQty ? Number(minWholesaleQty) : null,
  };

  try {
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authH(), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar');
    closeModal();
    await loadProducts();
    await loadDashboard();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Guardar';
  }
});

// ===== TOAST ADMIN =====
function showAdminToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  toast.textContent = msg;
  toast.className = `admin-toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== DELETE =====
function confirmDelete(id) {
  deletingId = id;
  document.getElementById('confirmModal').classList.add('open');
}
document.getElementById('confirmCancel').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('open');
  deletingId = null;
});
document.getElementById('confirmOk').addEventListener('click', async () => {
  if (!deletingId) return;
  const idToDelete = deletingId;
  document.getElementById('confirmModal').classList.remove('open');
  allProducts = allProducts.filter(p => p.id !== idToDelete);
  renderProductsTable(allProducts);
  deletingId = null;
  try {
    const res = await authFetch(`/api/products/${idToDelete}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error del servidor');
  } catch (err) {
    await loadProducts();
    showAdminToast('❌ Error al eliminar. Intentá de nuevo.', 'error');
    return;
  }
  await loadProducts();
  await loadDashboard();
  showAdminToast('✅ Producto eliminado correctamente');
});

// ===== LOGO UPLOAD =====
let currentLogoUrl = null;

document.getElementById('logoUploadBtn').addEventListener('click', () => document.getElementById('logoFileInput').click());
document.getElementById('logoFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const wrap = document.getElementById('logoPreviewWrap');
  const errEl = document.getElementById('logoError');
  wrap.innerHTML = '<span style="font-size:.8rem;color:#7f8c8d">Subiendo...</span>';
  errEl.textContent = '';
  try {
    const fd = new FormData(); fd.append('image', file);
    const res = await authUpload(fd);
    if (!res) return;
    let data; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);
    currentLogoUrl = data.url;
    wrap.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:contain" />`;
    document.getElementById('logoRemoveBtn').style.display = 'block';
    await saveLogo(data.url);
  } catch (err) {
    wrap.innerHTML = '🛒';
    errEl.textContent = err.message;
  }
});

document.getElementById('logoRemoveBtn').addEventListener('click', async () => {
  currentLogoUrl = null;
  document.getElementById('logoPreviewWrap').innerHTML = '🛒';
  document.getElementById('logoRemoveBtn').style.display = 'none';
  await saveLogo('');
});

async function saveLogo(url) {
  await fetch('/api/config', {
    method: 'PUT',
    headers: authH(),
    body: JSON.stringify({ logo_url: url }),
  });
}

// ===== CONFIG =====
async function loadConfig() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  const form = document.getElementById('configForm');
  Object.keys(cfg).forEach(key => {
    const el = form.querySelector(`[name="${key}"]`);
    if (el) el.value = cfg[key];
  });
  // Mostrar logo actual
  const wrap = document.getElementById('logoPreviewWrap');
  const removeBtn = document.getElementById('logoRemoveBtn');
  if (cfg.logo_url) {
    currentLogoUrl = cfg.logo_url;
    wrap.innerHTML = `<img src="${cfg.logo_url}" style="width:100%;height:100%;object-fit:contain" />`;
    removeBtn.style.display = 'block';
  } else {
    wrap.innerHTML = '🛒';
    removeBtn.style.display = 'none';
  }
}

document.getElementById('configForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const succ = document.getElementById('configSuccess');
  const err = document.getElementById('configError');
  succ.textContent = ''; err.textContent = '';
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  try {
    const res = await fetch('/api/config', { method: 'PUT', headers: authH(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Error al guardar');
    succ.textContent = '✅ Cambios guardados correctamente';
    setTimeout(() => succ.textContent = '', 3000);
  } catch (ex) {
    err.textContent = ex.message;
  }
});

// ===== BANNERS / SLIDES =====
let allSlides = [];
let currentSlideImageUrl = null;

async function loadSlides() {
  const res = await fetch('/api/slides');
  allSlides = await res.json();
  const tbody = document.getElementById('slidesBody');
  if (!allSlides.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#7f8c8d;padding:32px">No hay banners. ¡Agregá el primero!</td></tr>';
    return;
  }
  tbody.innerHTML = allSlides.map(s => `
    <tr>
      <td>
        ${s.image_url
          ? `<img class="td-img" src="${s.image_url}" alt="" />`
          : `<div class="td-img-placeholder" style="background:${s.bg_color || '#1a5276'};color:#fff;font-size:.7rem;text-align:center">🖼️</div>`}
      </td>
      <td><strong>${s.title || '—'}</strong></td>
      <td style="color:#7f8c8d;font-size:.85rem">${s.subtitle || '—'}</td>
      <td><span class="badge badge-green">${s.button_text || '—'}</span></td>
      <td>
        <div class="td-actions">
          <button class="btn btn-outline btn-sm" onclick="openSlideEdit(${s.id})">✏️ Editar</button>
          <button class="btn btn-red btn-sm" onclick="deleteSlide(${s.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function openSlideModal(title = 'Agregar banner') {
  document.getElementById('slideModalTitle').textContent = title;
  document.getElementById('slideModal').classList.add('open');
}
function closeSlideModal() {
  document.getElementById('slideModal').classList.remove('open');
  document.getElementById('slideForm').reset();
  document.getElementById('slideId').value = '';
  document.getElementById('slideUploadPreview').innerHTML = '';
  document.getElementById('slideError').textContent = '';
  currentSlideImageUrl = null;
}

document.getElementById('btnAddSlide').addEventListener('click', () => openSlideModal());
document.getElementById('slideModalClose').addEventListener('click', closeSlideModal);
document.getElementById('slideModalCancel').addEventListener('click', closeSlideModal);
document.getElementById('slideModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('slideModal')) closeSlideModal();
});

function openSlideEdit(id) {
  const s = allSlides.find(x => x.id === id);
  if (!s) return;
  document.getElementById('slideId').value = s.id;
  document.getElementById('sTitle').value = s.title || '';
  document.getElementById('sSubtitle').value = s.subtitle || '';
  document.getElementById('sBtnText').value = s.button_text || '';
  document.getElementById('sBtnLink').value = s.button_link || '';
  document.getElementById('sBgColor').value = s.bg_color || '#1a5276';
  currentSlideImageUrl = s.image_url || null;
  if (s.image_url) document.getElementById('slideUploadPreview').innerHTML = `<img src="${s.image_url}" />`;
  openSlideModal('Editar banner');
}

document.getElementById('slideUploadArea').addEventListener('click', () => document.getElementById('slideFileInput').click());
document.getElementById('slideFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const prev = document.getElementById('slideUploadPreview');
  prev.innerHTML = '<p style="font-size:.85rem;color:#7f8c8d">Subiendo imagen...</p>';
  try {
    const fd = new FormData(); fd.append('image', file);
    const res = await authUpload(fd);
    if (!res) return;
    let data; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);
    currentSlideImageUrl = data.url;
    prev.innerHTML = `<img src="${data.url}" />`;
  } catch (err) {
    prev.innerHTML = `<p style="color:red;font-size:.85rem">${err.message}</p>`;
  }
});

document.getElementById('slideForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('slideSaveBtn');
  const errEl = document.getElementById('slideError');
  saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; errEl.textContent = '';
  const id = document.getElementById('slideId').value;
  const body = {
    title: document.getElementById('sTitle').value,
    subtitle: document.getElementById('sSubtitle').value,
    button_text: document.getElementById('sBtnText').value,
    button_link: document.getElementById('sBtnLink').value,
    bg_color: document.getElementById('sBgColor').value,
    image_url: currentSlideImageUrl,
  };
  try {
    const url = id ? `/api/slides/${id}` : '/api/slides';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authH(), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar');
    closeSlideModal();
    await loadSlides();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Guardar';
  }
});

async function deleteSlide(id) {
  if (!confirm('¿Eliminar este banner?')) return;
  await authFetch(`/api/slides/${id}`, { method: 'DELETE' });
  await loadSlides();
}

// ===== INIT =====
loadDashboard();
