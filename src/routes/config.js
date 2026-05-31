const router = require('express').Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.get('/', (req, res) => {
  res.json(db.readConfig());
});

router.put('/', authMiddleware, (req, res) => {
  const current = db.readConfig();
  db.writeConfig({ ...current, ...req.body });
  res.json({ ok: true });
});

module.exports = router;
