const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USER) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const match = await bcrypt.compare(password, process.env.ADMIN_PASS_HASH);
  if (!match) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

module.exports = router;
