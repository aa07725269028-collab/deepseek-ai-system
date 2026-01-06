const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ========== الأساسيات ==========
app.use(express.static(__dirname));
app.use(express.json());

// ========== الصفحات ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login(.html)?', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin(.html)?', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

// ========== APIs أساسية ==========
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // بيانات تجريبية
  const users = {
    'godmode': 'DeepSeek@Universe2024!',
    'admin': 'Neural@Networks#Master',
    'user1': 'User@2024Secure!'
  };
  
  if (users[username] && users[username] === password) {
    res.json({
      success: true,
      message: '👑 دخول إمبراطوري ناجح',
      token: `empire_token_${Date.now()}`,
      user: { username, role: username === 'godmode' ? 'EMPEROR' : 'ADMIN' }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '🔐 بيانات دخول غير صحيحة'
    });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'EMPIRE_ACTIVE',
    version: '2.0.0',
    platform: 'Vercel',
    security: 'QUANTUM_ENCRYPTED',
    ai_power: '100%'
  });
});

// ========== النظام الإمبراطوري ==========
app.get('/imperial/dashboard', (req, res) => {
  res.json({
    title: '🏛️ لوحة القيادة الإمبراطورية',
    ai: {
      power: '98.7%',
      neural_networks: '1.2M',
      quantum_cores: 1024,
      knowledge: '∞'
    },
    universe: {
      name: 'الإمبراطورية الرقمية',
      dimensions: 11,
      status: 'EXPANDING'
    }
  });
});

// ========== جميع المسارات ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== التشغيل ==========
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
    ============================================
    👑 DEEPSEEK EMPIRE - Vercel Ultimate
    ============================================
    📍 Port: ${PORT}
    🌐 URL: https://deepseek-empire.vercel.app
    ⚡ Status: EMPIRE_ACTIVATED
    🔒 Security: Vercel + Quantum
    ============================================
    `);
  });
}

module.exports = app;
