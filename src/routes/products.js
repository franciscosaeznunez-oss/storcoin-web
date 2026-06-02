const router = require('express').Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

// Público: listar productos
router.get('/', (req, res) => {
  let products = db.readProducts();
  const { category, offer } = req.query;
  if (category) products = products.filter(p => p.category === category);
  if (offer === '1') products = products.filter(p => p.is_offer);
  products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(products);
});

// Público: categorías únicas
router.get('/categories', (req, res) => {
  const products = db.readProducts();
  const cats = [...new Set(products.map(p => p.category))].sort();
  res.json(cats);
});

// Crear producto (admin)
router.post('/', authMiddleware, (req, res) => {
  const { name, category, price, offer_price, is_offer, description, image_url, wholesale_price, min_wholesale_qty } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Nombre, categoría y precio son obligatorios' });
  }
  const products = db.readProducts();
  const product = {
    id: db.nextId(),
    name, category,
    price: parseFloat(price),
    offer_price: offer_price ? parseFloat(offer_price) : null,
    is_offer: !!is_offer,
    description: description || null,
    image_url: image_url || null,
    wholesale_price: wholesale_price ? parseFloat(wholesale_price) : null,
    min_wholesale_qty: min_wholesale_qty ? parseInt(min_wholesale_qty) : null,
    created_at: new Date().toISOString(),
  };
  products.push(product);
  db.writeProducts(products);
  res.status(201).json({ id: product.id });
});

// Editar producto (admin)
router.put('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const products = db.readProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });
  const { name, category, price, offer_price, is_offer, description, image_url, wholesale_price, min_wholesale_qty } = req.body;
  products[idx] = {
    ...products[idx],
    name, category,
    price: parseFloat(price),
    offer_price: offer_price ? parseFloat(offer_price) : null,
    is_offer: !!is_offer,
    description: description || null,
    image_url: image_url || null,
    wholesale_price: wholesale_price ? parseFloat(wholesale_price) : null,
    min_wholesale_qty: min_wholesale_qty ? parseInt(min_wholesale_qty) : null,
  };
  db.writeProducts(products);
  res.json({ ok: true });
});

// Eliminar producto (admin)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const products = db.readProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    products.splice(idx, 1);
    db.writeProducts(products);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;
