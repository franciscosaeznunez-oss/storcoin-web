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
  'Almacén': '🛒', 'Bebidas': '🥤', 'Lácteos': '🥛', 'Limpieza': '🧹',
  'Carnes': '🥩', 'Frutas': '🍎', 'Verduras': '🥦', 'Panadería': '🥖',
  'Congelados': '🧊', 'Snacks': '🍪', 'Condimentos': '🧂',
};

function formatPrice(n) {
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function productCard(p) {
  const imgHtml = p.image_url
    ? `<img class="product-img" src="${p.image_url}" alt="${p.name}" loading="lazy" />`
    : `<div class="product-img-placeholder">${CATEGORY_ICONS[p.category] || '📦'}</div>`;
  const offerBadge = p.is_offer ? `<span class="badge-offer">Oferta</span>` : '';
  const priceHtml = p.is_offer && p.offer_price
    ? `<div><span class="product-price-old">${formatPrice(p.price)}</span><br><span class="product-price">${formatPrice(p.offer_price)}</span></div>`
    : `<span class="product-price">${formatPrice(p.price)}</span>`;
  return `
    <div class="product-card">
      ${imgHtml}
      <div class="product-body">
        <span class="product-category">${p.category}</span>
        <span class="product-name">${p.name}</span>
        ${p.description ? `<span class="product-desc">${p.description}</span>` : ''}
      </div>
      <div class="product-footer">
        ${priceHtml}
        ${offerBadge}
      </div>
    </div>`;
}

async function loadConfig() {
  try {
    const res = await fetch(`${API}/api/config`);
    const cfg = await res.json();
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
    const setBtnLink = (id) => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => window.open(waLink, '_blank');
    };
    setBtnLink('hero-wa');
    setBtnLink('header-wa');
    setBtnLink('contact-wa-btn');
  } catch (e) { console.error('Error config:', e); }
}

async function loadOffers() {
  const grid = document.getElementById('offers-grid');
  try {
    const res = await fetch(`${API}/api/products?offer=1`);
    const products = await res.json();
    if (!products.length) {
      grid.innerHTML = '<p class="empty">No hay ofertas por el momento.</p>';
      return;
    }
    grid.innerHTML = products.map(productCard).join('');
  } catch (e) { grid.innerHTML = '<p class="empty">Error al cargar ofertas.</p>'; }
}

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
  grid.innerHTML = filtered.length
    ? filtered.map(productCard).join('')
    : '<p class="empty">No hay productos en esta categoría.</p>';
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

loadCarousel();
loadConfig();
loadOffers();
loadProducts();
