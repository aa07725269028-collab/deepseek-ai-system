// server.js - ملف واحد كامل
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send('<h1>🚀 نظام DeepSeek يعمل!</h1>');
});

app.listen(PORT, () => {
    console.log(`✅ النظام يعمل: http://localhost:${PORT}`);
});
