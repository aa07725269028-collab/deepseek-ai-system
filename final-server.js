const express = require('express');
const security = require('./security');
const app = express();

// فحص الأمان
security.checkSecurity();

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>🚀 DeepSeek AI System</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                h1 { color: green; }
            </style>
        </head>
        <body>
            <h1>✅ DeepSeek AI System يعمل بنجاح!</h1>
            <p>الإصدار: 1.0.0</p>
            <p>🔒 مستوى الأمان: عالي</p>
        </body>
        </html>
    `);
});

// API أساسي
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        version: '1.0.0',
        security: 'high'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ================================
    🚀 DeepSeek AI System
    📍 http://localhost:${PORT}
    🔒 Security: Enabled
    ================================
    `);
});
