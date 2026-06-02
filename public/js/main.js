const API = '';

// ===== CARRUSEL =====
let carouselSlides = [];
let carouselCurrent = 0;
let carouselTimer = null;

async function loadCarousel() {
  try {
    const res = await fetch(`${API}/api/slides`);
    carouselSlides = await res.json();
    if (!carouselSlides.length) {
      document.getElementById('carrusel').style.display = 'none';
      return;
    }
    renderCarousel();
  } catch (e) {
    document.getElementById('carrusel').style.display = 'none';
  }
}

function renderCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsEl = document.getElementById('carouselDots');

  track.innerHTML = carouselSlides.map(slide => {
    const bgStyle = slide.image_url
      ? `background-image: url('${slide.image_url}');`
      : `background-color: ${slide.bg_color || '#1a5276'};`;
    const btnHtml = slide.button_text
      ? `<a href="${slide.button_link || '#'}" class="carousel-slide-btn">${slide.button_text}</a>`
      : '';
    return `
      <div class="carousel-slide" style="${bgStyle}">
        <div class="carousel-slide-overlay"></div>
        <div class="carousel-slide-content">
          <h2>${slide.title || ''}</h2>
          ${slide.subtitle ? `<p>${slide.subtitle}</p>` : ''}
          ${btnHtml}
        </div>
      </div>`;
  }).join('');

  dotsEl.innerHTML = carouselSlides.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></button>`
  ).join('');

  dotsEl.querySelectorAll('.carousel-dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.idx)));
  });

  document.getElementById('carouselPrev').addEventListener('click', () => {
    goToSlide((carouselCurrent - 1 + carouselSlides.length) % carouselSlides.length);
  });
  document.getElementById('carouselNext').addEventListener('click', () => {
    goToSlide((carouselCurrent + 1) % carouselSlides.length);
  });

  startAutoplay();
}

function goToSlide(idx) {
  carouselCurrent = idx;
  document.getElementById('carouselTrack').style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  resetAutoplay();
}

function startAutoplay() {
  carouselTimer = setInterval(() => {
    goToSlide((carouselCurrent + 1) % carouselSlides.length);
  }, 5000);
}

function resetAutoplay() {
  clearInterval(carouselTimer);
  startAutoplay();
}

// ===== CATEGORÍAS =====
const CATEGORY_ICONS = {
  'Abarrote': '🛒', 'Bebidas': '🥤', 'Lácteos': '🥛', 'Limpieza': '🧹',
  'Carnes': '🥩', 'Frutas': '🍎', 'Verduras': '🥦', 'Panadería': '🥖',
  'Congelados': '🧊', 'Snacks': '🍪', 'Condimentos': '🧂',
};

function formatPrice(n) {
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

// ===== CARRITO =====
const CART_KEY = 'storcoin_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.unit_price * item.qty, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  const badge = document.getElementById('cart-badge');
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
  document.getElementById('cart-btn').classList.toggle('has-items', count > 0);
}

function showToast(msg) {
  const toast = document.getElementById('cart-toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function addToCart(product, type) {
  const cart = getCart();
  const unitPrice = type === 'wholesale'
    ? product.wholesale_price
    : (product.is_offer && product.offer_price ? product.offer_price : product.price);
  const minQty = type === 'wholesale' ? (product.min_wholesale_qty || 1) : 1;
  const key = `${product.id}_${type}`;
  const existing = cart.find(i => i.key === key);

  if (existing) {
    existing.qty += 1;
    if (checkWholesaleUpgrade(cart, existing, existing.qty)) {
      saveCart(cart);
      updateCartBadge();
      renderCart();
      return;
    }
  } else {
    cart.push({
      key,
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      category: product.category,
      type,
      qty: minQty,
      unit_price: unitPrice,
      min_qty: minQty,
    });
  }

  saveCart(cart);
  updateCartBadge();
  renderCart();
  showToast(type === 'wholesale' ? '✅ Agregado (mayor)' : '✅ Agregado al carrito');
}

function removeFromCart(key) {
  saveCart(getCart().filter(i => i.key !== key));
  updateCartBadge();
  renderCart();
}

function checkWholesaleUpgrade(cart, item, newQty) {
  if (item.type !== 'retail') return false;
  const product = productsById[item.id];
  if (!product || !product.wholesale_price || !product.min_wholesale_qty) return false;
  if (newQty < product.min_wholesale_qty) return false;

  const wholesaleKey = `${item.id}_wholesale`;
  const existingWholesale = cart.find(i => i.key === wholesaleKey);

  if (existingWholesale) {
    existingWholesale.qty += newQty;
    const idx = cart.indexOf(item);
    cart.splice(idx, 1);
  } else {
    item.key = wholesaleKey;
    item.type = 'wholesale';
    item.unit_price = product.wholesale_price;
    item.min_qty = product.min_wholesale_qty;
    item.qty = newQty;
  }

  showToast(`✨ ¡Precio mayorista aplicado! ${formatPrice(product.wholesale_price)} c/u`);
  return true;
}

function updateQty(key, delta) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty < item.min_qty) {
    removeFromCart(key);
    return;
  }
  item.qty = newQty;
  if (delta > 0 && checkWholesaleUpgrade(cart, item, newQty)) {
    saveCart(cart);
    updateCartBadge();
    renderCart();
    return;
  }
  saveCart(cart);
  updateCartBadge();
  renderCart();
}

function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  if (!cart.length) {
    itemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío</p>';
    totalEl.textContent = '$0';
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.image_url
          ? `<img src="${item.image_url}" alt="${item.name}" />`
          : `<div class="cart-item-img-placeholder">${CATEGORY_ICONS[item.category] || '📦'}</div>`}
      </div>
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-tag ${item.type === 'wholesale' ? 'tag-wholesale' : 'tag-retail'}">
          ${item.type === 'wholesale' ? 'Mayor' : 'Detalle'}
        </span>
        <div class="cart-item-qty">
          <button class="qty-btn" data-key="${item.key}" data-delta="-1">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-key="${item.key}" data-delta="1">+</button>
          ${item.min_qty > 1 ? `<span class="cart-item-min">mín. ${item.min_qty}</span>` : ''}
        </div>
      </div>
      <div class="cart-item-right">
        <span class="cart-item-price">${formatPrice(item.unit_price * item.qty)}</span>
        <button class="cart-item-remove" data-key="${item.key}">✕</button>
      </div>
    </div>
  `).join('');

  totalEl.textContent = formatPrice(getCartTotal());

  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => updateQty(btn.dataset.key, parseInt(btn.dataset.delta)));
  });
  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.key));
  });
}

function openCart() {
  renderCart();
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
}

// ===== CHECKOUT =====
let currentOrderNumber = '';
let siteConfig = {};

function generateOrderNumber() {
  return '#ORD-' + Date.now().toString().slice(-5);
}

function openCheckout() {
  const cart = getCart();
  if (!cart.length) return;

  currentOrderNumber = generateOrderNumber();
  document.getElementById('checkout-order-number').textContent = currentOrderNumber;
  document.getElementById('checkout-order-number2').textContent = currentOrderNumber;
  document.getElementById('customer-name').value = '';
  document.getElementById('customer-phone').value = '';
  document.getElementById('customer-name-error').textContent = '';

  document.getElementById('checkout-items-list').innerHTML = cart.map(item => `
    <div class="checkout-item">
      <span class="checkout-item-name">
        ${item.name}
        <em class="checkout-item-type">${item.type === 'wholesale' ? '(Mayor)' : '(Detalle)'}</em>
        × ${item.qty}
      </span>
      <span class="checkout-item-price">${formatPrice(item.unit_price * item.qty)}</span>
    </div>
  `).join('');

  document.getElementById('checkout-total-display').textContent = formatPrice(getCartTotal());

  const cfg = siteConfig;
  const fields = [
    cfg.bank_holder       && `<div class="bank-row"><span>Nombre</span><strong>${cfg.bank_holder}</strong></div>`,
    cfg.bank_rut          && `<div class="bank-row"><span>RUT</span><strong>${cfg.bank_rut}</strong></div>`,
    cfg.bank_name         && `<div class="bank-row"><span>Banco</span><strong>${cfg.bank_name}</strong></div>`,
    cfg.bank_account_type && `<div class="bank-row"><span>Tipo de cuenta</span><strong>${cfg.bank_account_type}</strong></div>`,
    cfg.bank_account_number && `<div class="bank-row"><span>N° de cuenta</span><strong class="bank-cbu">${cfg.bank_account_number}</strong></div>`,
    cfg.bank_email        && `<div class="bank-row"><span>Email</span><strong>${cfg.bank_email}</strong></div>`,
  ].filter(Boolean);

  document.getElementById('bank-details').innerHTML = fields.length
    ? fields.join('')
    : '<p style="color:#7f8c8d;font-size:.9rem">Datos bancarios no configurados aún.</p>';

  document.getElementById('checkout-step1').style.display = 'block';
  document.getElementById('checkout-step2').style.display = 'none';
  document.getElementById('checkout-overlay').classList.add('open');
  closeCart();
}

function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
}

function buildWhatsAppMessage() {
  const cart = getCart();
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const lines = cart.map(item =>
    `- ${item.name} x${item.qty} (${item.type === 'wholesale' ? 'Mayor' : 'Detalle'}) — ${formatPrice(item.unit_price * item.qty)}`
  ).join('\n');
  const clientInfo = [
    name  && `*Cliente:* ${name}`,
    phone && `*Teléfono:* ${phone}`,
  ].filter(Boolean).join('\n');
  return encodeURIComponent(
    `Hola! Realicé una transferencia para el pedido ${currentOrderNumber}\n\n${clientInfo}\n\n*Detalle del pedido:*\n${lines}\n\n*Total: ${formatPrice(getCartTotal())}*\n\n¡Quedo a la espera de la confirmación! 🙏`
  );
}

// ===== PRODUCT CARD =====
function productCard(p) {
  const imgHtml = p.image_url
    ? `<img class="product-img" src="${p.image_url}" alt="${p.name}" loading="lazy" />`
    : `<div class="product-img-placeholder">${CATEGORY_ICONS[p.category] || '📦'}</div>`;

  const retailPrice = p.is_offer && p.offer_price ? p.offer_price : p.price;
  const offerBadge = p.is_offer ? `<span class="badge-offer">Oferta</span>` : '';

  let pricesHtml, actionsHtml;

  if (p.wholesale_price) {
    pricesHtml = `
      <div class="product-prices">
        <div class="price-block">
          <span class="price-label">Detalle</span>
          <div class="price-value">
            ${p.is_offer && p.offer_price ? `<span class="product-price-old">${formatPrice(p.price)}</span>` : ''}
            <span class="product-price">${formatPrice(retailPrice)}</span>
            ${offerBadge}
          </div>
        </div>
        <div class="price-block price-block-wholesale">
          <span class="price-label">Mayor</span>
          <div class="price-value">
            <span class="product-price product-price-wholesale">${formatPrice(p.wholesale_price)}</span>
            ${p.min_wholesale_qty ? `<span class="price-min-qty">mín. ${p.min_wholesale_qty} u.</span>` : ''}
          </div>
        </div>
      </div>`;
    actionsHtml = `
      <div class="product-actions">
        <button class="btn-add-cart btn-retail" data-id="${p.id}" data-type="retail">+ Detalle</button>
        <button class="btn-add-cart btn-wholesale" data-id="${p.id}" data-type="wholesale">+ Mayor</button>
      </div>`;
  } else {
    pricesHtml = `
      <div class="product-prices single">
        <div class="price-block">
          ${p.is_offer && p.offer_price ? `<span class="product-price-old">${formatPrice(p.price)}</span>` : ''}
          <span class="product-price">${formatPrice(retailPrice)}</span>
          ${offerBadge}
        </div>
      </div>`;
    actionsHtml = `
      <div class="product-actions">
        <button class="btn-add-cart btn-retail btn-full" data-id="${p.id}" data-type="retail">+ Agregar</button>
      </div>`;
  }

  return `
    <div class="product-card">
      ${imgHtml}
      <div class="product-body">
        <span class="product-category">${p.category}</span>
        <span class="product-name">${p.name}</span>
        ${p.description ? `<span class="product-desc">${p.description}</span>` : ''}
      </div>
      ${pricesHtml}
      ${actionsHtml}
    </div>`;
}

// ===== PRODUCTOS MAP =====
const productsById = {};

function attachCardListeners(container) {
  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      const product = productsById[id];
      if (product) addToCart(product, type);
    });
  });
}

// ===== CONFIG =====
async function loadConfig() {
  try {
    const res = await fetch(`${API}/api/config`);
    const cfg = await res.json();
    siteConfig = cfg;
    const wa = cfg.whatsapp || '';
    const waLink = `https://wa.me/${wa.replace(/\D/g, '')}`;
    document.getElementById('hero-title').innerHTML = cfg.business_name || 'StorCoin';
    document.getElementById('hero-sub').textContent = cfg.hero_subtitle || '';
    document.getElementById('hero-min').textContent = cfg.min_order || '';
    document.getElementById('contact-wa-text').textContent = wa;
    document.getElementById('contact-email').textContent = cfg.email || '';
    document.getElementById('contact-city').textContent = cfg.city || '';
    document.getElementById('contact-address').textContent = cfg.address || '';
    document.getElementById('contact-schedule').textContent = cfg.schedule || '';
    document.getElementById('footer-text').textContent = cfg.hero_subtitle || '';
    const heroLogoImg = document.getElementById('hero-logo-img');
    if (heroLogoImg && cfg.logo_url) heroLogoImg.src = cfg.logo_url;
    const setBtnLink = (id) => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => window.open(waLink, '_blank');
    };
    setBtnLink('hero-wa');
    setBtnLink('header-wa');
    setBtnLink('contact-wa-btn');
  } catch (e) { console.error('Error config:', e); }
}

// ===== OFERTAS =====
async function loadOffers() {
  const grid = document.getElementById('offers-grid');
  try {
    const res = await fetch(`${API}/api/products?offer=1`);
    const products = await res.json();
    if (!products.length) {
      grid.innerHTML = '<p class="empty">No hay ofertas por el momento.</p>';
      return;
    }
    products.forEach(p => productsById[p.id] = p);
    grid.innerHTML = products.map(productCard).join('');
    attachCardListeners(grid);
  } catch (e) { grid.innerHTML = '<p class="empty">Error al cargar ofertas.</p>'; }
}

// ===== TODOS LOS PRODUCTOS =====
let allProducts = [];
let activeCategory = 'all';

async function loadProducts() {
  const grid = document.getElementById('all-products-grid');
  const filterDiv = document.getElementById('filter-buttons');
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${API}/api/products`),
      fetch(`${API}/api/products/categories`),
    ]);
    allProducts = await pRes.json();
    allProducts.forEach(p => productsById[p.id] = p);
    const categories = await cRes.json();

    filterDiv.innerHTML = categories.map(cat =>
      `<button class="filter-btn" data-cat="${cat}">${cat}</button>`
    ).join('');

    filterDiv.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.cat;
        renderProducts();
      });
    });

    renderCategories(categories);
    renderProducts();
  } catch (e) { grid.innerHTML = '<p class="empty">Error al cargar productos.</p>'; }
}

function renderProducts() {
  const grid = document.getElementById('all-products-grid');
  const filtered = activeCategory === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === activeCategory);
  if (!filtered.length) {
    grid.innerHTML = '<p class="empty">No hay productos en esta categoría.</p>';
    return;
  }
  grid.innerHTML = filtered.map(productCard).join('');
  attachCardListeners(grid);
}

function renderCategories(categories) {
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = categories.map(cat => `
    <div class="cat-card" data-cat="${cat}">
      <div class="cat-icon">${CATEGORY_ICONS[cat] || '📦'}</div>
      <h3>${cat}</h3>
    </div>`).join('');
  grid.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.cat === card.dataset.cat);
        });
        activeCategory = card.dataset.cat;
        renderProducts();
      }, 400);
    });
  });
}

// ===== EVENT LISTENERS =====
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileNav').classList.toggle('open');
});

document.getElementById('year').textContent = new Date().getFullYear();

document.querySelectorAll('.filter-btn[data-cat="all"]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = 'all';
    renderProducts();
  });
});

document.getElementById('cart-btn').addEventListener('click', openCart);
document.getElementById('cart-close').addEventListener('click', closeCart);
document.getElementById('cart-overlay').addEventListener('click', closeCart);
document.getElementById('cart-checkout-btn').addEventListener('click', openCheckout);

document.getElementById('checkout-close').addEventListener('click', closeCheckout);
document.getElementById('checkout-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('checkout-overlay')) closeCheckout();
});

document.getElementById('btn-ya-transferi').addEventListener('click', () => {
  const name = document.getElementById('customer-name').value.trim();
  const errEl = document.getElementById('customer-name-error');
  if (!name) {
    errEl.textContent = 'Por favor ingresá tu nombre para continuar.';
    document.getElementById('customer-name').focus();
    return;
  }
  errEl.textContent = '';
  document.getElementById('checkout-order-number2').textContent = `${currentOrderNumber} · ${name}`;
  document.getElementById('checkout-step1').style.display = 'none';
  document.getElementById('checkout-step2').style.display = 'block';
});

document.getElementById('btn-whatsapp-order').addEventListener('click', () => {
  const wa = (siteConfig.whatsapp || '').replace(/\D/g, '');
  window.open(`https://wa.me/${wa}?text=${buildWhatsAppMessage()}`, '_blank');
});

document.getElementById('btn-new-order').addEventListener('click', () => {
  saveCart([]);
  updateCartBadge();
  renderCart();
  closeCheckout();
});

// ===== INIT =====
updateCartBadge();
loadCarousel();
loadConfig();
loadOffers();
loadProducts();
