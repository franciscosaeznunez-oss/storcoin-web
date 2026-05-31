require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/config', require('./routes/config'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/slides', require('./routes/slides'));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ StorCoin corriendo en http://localhost:${PORT}`);
  console.log(`   Panel admin: http://localhost:${PORT}/admin/login.html`);
});
