const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const SLIDES_FILE = path.join(__dirname, '../../data/slides.json');

function readSlides() {
  if (!fs.existsSync(SLIDES_FILE)) return [];
  return JSON.parse(fs.readFileSync(SLIDES_FILE, 'utf8'));
}

function writeSlides(slides) {
  fs.writeFileSync(SLIDES_FILE, JSON.stringify(slides, null, 2));
}

function nextId() {
  const slides = readSlides();
  return slides.length ? Math.max(...slides.map(s => s.id)) + 1 : 1;
}

// Semilla con 2 slides de ejemplo si no existe
if (!fs.existsSync(SLIDES_FILE)) {
  writeSlides([
    {
      id: 1,
      title: 'Entregas a todo el país',
      subtitle: 'Pedí por mayor y recibí en tu negocio',
      button_text: 'Ver productos',
      button_link: '#productos',
      bg_color: '#1a5276',
      image_url: null,
      order: 0,
    },
    {
      id: 2,
      title: '🔥 Ofertas semanales',
      subtitle: 'Descuentos exclusivos para compradores mayoristas',
      button_text: 'Ver ofertas',
      button_link: '#ofertas',
      bg_color: '#145a32',
      image_url: null,
      order: 1,
    },
  ]);
}

router.get('/', (req, res) => {
  const slides = readSlides().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(slides);
});

router.post('/', authMiddleware, (req, res) => {
  const slides = readSlides();
  const slide = { id: nextId(), ...req.body, order: slides.length };
  slides.push(slide);
  writeSlides(slides);
  res.status(201).json({ id: slide.id });
});

router.put('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const slides = readSlides();
  const idx = slides.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Slide no encontrado' });
  slides[idx] = { ...slides[idx], ...req.body, id };
  writeSlides(slides);
  res.json({ ok: true });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  writeSlides(readSlides().filter(s => s.id !== id));
  res.json({ ok: true });
});

module.exports = router;
