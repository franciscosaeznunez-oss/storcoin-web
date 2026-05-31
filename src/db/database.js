const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const PRODUCTS_FILE = path.join(dataDir, 'products.json');
const CONFIG_FILE = path.join(dataDir, 'config.json');

function readProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
}

function writeProducts(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Inicializar config con defaults si no existe
if (!fs.existsSync(CONFIG_FILE)) {
  writeConfig({
    business_name: 'StorCoin',
    whatsapp: '+54 9 000 000-0000',
    email: 'contacto@storcoin.com',
    city: 'Tu ciudad',
    address: 'Tu dirección',
    schedule: 'Lunes a viernes 8:00 - 18:00',
    hero_subtitle: 'Tu minimarket de confianza',
    min_order: '',
  });
}

// Datos de ejemplo si no hay productos
if (!fs.existsSync(PRODUCTS_FILE)) {
  writeProducts([
    { id: 1, name: 'Aceite girasol 1.5L', category: 'Almacén', price: 1800, offer_price: 1500, is_offer: true, description: 'Caja x 12 unidades', image_url: null, created_at: new Date().toISOString() },
    { id: 2, name: 'Harina 0000 x 1kg', category: 'Almacén', price: 950, offer_price: null, is_offer: false, description: 'Bolsa x 25kg disponible', image_url: null, created_at: new Date().toISOString() },
    { id: 3, name: 'Arroz largo fino 1kg', category: 'Almacén', price: 1100, offer_price: null, is_offer: false, description: 'Caja x 20 unidades', image_url: null, created_at: new Date().toISOString() },
    { id: 4, name: 'Coca-Cola 2.25L', category: 'Bebidas', price: 2200, offer_price: 1900, is_offer: true, description: 'Pack x 6 unidades', image_url: null, created_at: new Date().toISOString() },
    { id: 5, name: 'Agua mineral 1.5L', category: 'Bebidas', price: 800, offer_price: null, is_offer: false, description: 'Pack x 12 unidades', image_url: null, created_at: new Date().toISOString() },
    { id: 6, name: 'Leche entera 1L', category: 'Lácteos', price: 1400, offer_price: null, is_offer: false, description: 'Caja x 12 unidades', image_url: null, created_at: new Date().toISOString() },
    { id: 7, name: 'Yerba mate 500g', category: 'Almacén', price: 2800, offer_price: 2500, is_offer: true, description: 'Caja x 10 unidades', image_url: null, created_at: new Date().toISOString() },
    { id: 8, name: 'Azúcar x 1kg', category: 'Almacén', price: 1200, offer_price: null, is_offer: false, description: 'Bolsa x 25kg disponible', image_url: null, created_at: new Date().toISOString() },
  ]);
}

let nextId = () => {
  const products = readProducts();
  return products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
};

module.exports = { readProducts, writeProducts, readConfig, writeConfig, nextId };
